"use client";

import { useCallback } from "react";
import { ensureValidApiKey } from "@/lib/apiKeyValidation";
import { API_KEY_HEADER } from "@/lib/groq";
import {
  fetchWithTimeout,
  isLikelyTransientNetworkError,
  isTransientStatus,
  parseApiErrorMessage,
  sleep,
} from "@/lib/http";
import { createLogger } from "@/lib/logger";
import { buildSmartChatTranscript } from "@/lib/session";
import { uid } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { ChatApiRequest, ChatMessage } from "@/types";

interface SendArgs {
  content: string;
  linkedSuggestionId?: string;
  displayContent?: string;
  systemPromptOverride?: string;
}

interface UseChatResult {
  send: (args: SendArgs) => Promise<void>;
}

const CHAT_TIMEOUT_MS = 35_000;
const CHAT_READ_IDLE_TIMEOUT_MS = 8_000;
const CHAT_FORCE_FINALIZE_TIMEOUT_MS = 45_000;
const TRANSIENT_RETRY_DELAY_MS = 1_250;
const MAX_TRANSIENT_ATTEMPTS = 2;
const log = createLogger("hook:useChat");

interface SseEvent {
  event: string;
  data: string;
}

function parseSseEventBlock(raw: string): SseEvent | null {
  const lines = raw.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

function extractSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  let working = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let boundary = working.indexOf("\n\n");
  while (boundary >= 0) {
    const raw = working.slice(0, boundary).trim();
    working = working.slice(boundary + 2);
    if (raw) {
      const evt = parseSseEventBlock(raw);
      if (evt) events.push(evt);
    }
    boundary = working.indexOf("\n\n");
  }
  return { events, rest: working };
}

async function readWithIdleTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`stream idle timeout (${timeoutMs}ms)`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function useChat(): UseChatResult {
  const send = useCallback(
    async ({ content, linkedSuggestionId, displayContent, systemPromptOverride }: SendArgs) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      log.info("send called", { chars: trimmed.length, hasOverride: Boolean(systemPromptOverride) });
      const visible = (displayContent ?? trimmed).trim();
      if (!visible) return;

      const {
        chatMessages,
        transcriptChunks,
        addChatMessage,
        appendToMessage,
        finalizeMessage,
        showApiKeyDialog,
        setChatStreaming,
        setLastChatFirstTokenMs,
      } = useSessionStore.getState();

      const { apiKey, chatSystemPrompt } = useSettingsStore.getState();

      const validation = await ensureValidApiKey();
      if (!validation.ok) {
        log.warn("api key validation failed before chat send", {
          status: validation.status,
          message: validation.message,
        });
        showApiKeyDialog(validation.message, "send");
        return;
      }

      const userMsg: ChatMessage = {
        id: uid("m-"),
        role: "user",
        content: visible,
        timestamp: Date.now(),
        linkedSuggestionId,
      };
      addChatMessage(userMsg);

      // Keep chat UX clean: UI can show one text while the model receives
      // a dedicated system prompt override for expansion mode.
      const outgoingMessages = [
        ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: trimmed },
      ];

      const payload: ChatApiRequest = {
        messages: outgoingMessages,
        transcript: buildSmartChatTranscript(transcriptChunks),
        systemPrompt: systemPromptOverride ?? chatSystemPrompt,
      };

      const assistantId = uid("m-");
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        streaming: true,
      };
      addChatMessage(assistantMsg);
      setChatStreaming(true);
      let streamTerminated = false;
      let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      const appendIfActive = (text: string) => {
        if (streamTerminated) return;
        appendToMessage(assistantId, text);
      };

      const terminateStream = (appendText?: string) => {
        if (streamTerminated) return;
        streamTerminated = true;
        if (appendText) appendToMessage(assistantId, appendText);
        if (activeReader) {
          void activeReader.cancel("chat stream terminated").catch(() => {});
          activeReader = null;
        }
        finalizeMessage(assistantId);
        setChatStreaming(false);
      };

      const forceFinalizeTimer = setTimeout(() => {
        if (streamTerminated) return;
        terminateStream("\n\n[error: stream finalize timeout on client]");
        log.error("forced client-side stream finalize timeout", {
          timeoutMs: CHAT_FORCE_FINALIZE_TIMEOUT_MS,
        });
      }, CHAT_FORCE_FINALIZE_TIMEOUT_MS);

      const t0 = Date.now();

      try {
        for (let attempt = 1; attempt <= MAX_TRANSIENT_ATTEMPTS; attempt += 1) {
          const isLastAttempt = attempt === MAX_TRANSIENT_ATTEMPTS;
          log.debug("chat request attempt", { attempt });
          try {
            const res = await fetchWithTimeout("/api/chat", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                [API_KEY_HEADER]: apiKey,
              },
              body: JSON.stringify(payload),
              timeoutMs: CHAT_TIMEOUT_MS,
            });
            if (streamTerminated) return;

            if (!res.ok || !res.body) {
              const msg = await parseApiErrorMessage(res, res.statusText || "Request failed.");
              log.warn("chat request returned non-ok", {
                status: res.status,
                attempt,
                message: msg,
              });
              if (!isLastAttempt) {
                await sleep(TRANSIENT_RETRY_DELAY_MS);
                continue;
              }
              terminateStream(`HTTP ${res.status}: ${msg}`);
              return;
            }

            const reader = res.body.getReader();
            activeReader = reader;
            const decoder = new TextDecoder();
            let receivedAny = false;
            let errorSeen = false;
            let doneSeen = false;
            let streamErrorText: string | null = null;
            try {
              let sseBuffer = "";

              const handleEvent = (evt: SseEvent) => {
                if (streamTerminated) return;
                if (evt.event === "token") {
                  let text = "";
                  try {
                    const parsed = JSON.parse(evt.data) as { text?: unknown };
                    if (typeof parsed.text === "string") text = parsed.text;
                  } catch {
                    // malformed token payload; ignore
                  }
                  if (!text) return;
                  if (!receivedAny) {
                    setLastChatFirstTokenMs(Date.now() - t0);
                  }
                  appendIfActive(text);
                  receivedAny = true;
                  return;
                }

                if (evt.event === "error") {
                  let status = 500;
                  let message = "Unknown stream error.";
                  try {
                    const parsed = JSON.parse(evt.data) as {
                      status?: unknown;
                      message?: unknown;
                    };
                    if (typeof parsed.status === "number") status = parsed.status;
                    if (typeof parsed.message === "string" && parsed.message.length > 0) {
                      message = parsed.message;
                    }
                  } catch {
                    if (evt.data.trim()) message = evt.data.trim();
                  }
                  streamErrorText = `HTTP ${status}: ${message}`;
                  errorSeen = true;
                  doneSeen = true;
                  return;
                }

                if (evt.event === "done") {
                  doneSeen = true;
                }
              };

              while (true) {
                if (streamTerminated) break;
                let done = false;
                let value: Uint8Array | undefined;
                try {
                  const read = await readWithIdleTimeout(
                    reader,
                    CHAT_READ_IDLE_TIMEOUT_MS
                  );
                  done = read.done;
                  value = read.value;
                } catch (idleErr) {
                  const msg =
                    idleErr instanceof Error ? idleErr.message : String(idleErr);
                  if (receivedAny) {
                    log.warn("stream idle timeout after partial content", { message: msg });
                    break;
                  }
                  throw idleErr;
                }
                if (done) break;
                if (!value) continue;
                sseBuffer += decoder.decode(value, { stream: true });
                const { events, rest } = extractSseEvents(sseBuffer);
                sseBuffer = rest;
                for (const evt of events) {
                  handleEvent(evt);
                  if (doneSeen) break;
                }
                if (doneSeen) break;
              }
              sseBuffer += decoder.decode();
              const { events, rest } = extractSseEvents(sseBuffer);
              for (const evt of events) {
                handleEvent(evt);
              }
              const tailEvent = parseSseEventBlock(rest.trim());
              if (tailEvent) handleEvent(tailEvent);

              if (!doneSeen && !errorSeen && receivedAny) {
                // Stream closed without explicit done marker; treat as successful completion.
                log.warn("stream ended without done marker after tokens");
                doneSeen = true;
              }
              if (!receivedAny && !errorSeen) {
                log.warn("SSE stream finished with no token/error events");
                streamErrorText = "HTTP 502: Empty SSE stream (no token events received).";
              }
            } catch (streamErr) {
              if (streamTerminated) return;
              const msg =
                streamErr instanceof Error ? streamErr.message : "Stream read failed.";
              streamErrorText = receivedAny
                ? `[stream error after partial content: ${msg}]`
                : `[stream error before any content: ${msg}]`;
              log.error("stream read/parsing error", { message: msg });
            }

            if (streamErrorText) {
              // User-requested behavior: only append error after frontend attempt 2.
              // Retry once silently when no content was streamed yet.
              if (!isLastAttempt && !receivedAny) {
                log.warn("chat attempt failed before first token; retrying", {
                  attempt,
                  error: streamErrorText,
                });
                await sleep(TRANSIENT_RETRY_DELAY_MS);
                continue;
              }
              terminateStream(`\n\n${streamErrorText}`);
              return;
            }

            return;
          } catch (err) {
            if (!isLastAttempt) {
              log.warn("chat request failed; retrying", {
                attempt,
                message: err instanceof Error ? err.message : String(err),
              });
              await sleep(TRANSIENT_RETRY_DELAY_MS);
              continue;
            }
            const msg = err instanceof Error ? err.message : "Chat request failed.";
            log.error("chat request failed", { message: msg, attempt });
            terminateStream(`\n\n[error: ${msg}]`);
            return;
          }
        }
      } finally {
        clearTimeout(forceFinalizeTimer);
        terminateStream();
      }
    },
    []
  );

  return { send };
}
