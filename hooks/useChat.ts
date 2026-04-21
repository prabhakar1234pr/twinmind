"use client";

import { useCallback, useRef } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import {
  fetchWithTimeout,
  isLikelyTransientNetworkError,
  isTransientStatus,
  parseApiErrorMessage,
  sleep,
} from "@/lib/http";
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
const TRANSIENT_RETRY_DELAY_MS = 1_250;
const MAX_TRANSIENT_ATTEMPTS = 2;

interface SseEvent {
  event: string;
  data: string;
}

function extractSseEvents(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  let working = buffer;
  let boundary = working.indexOf("\n\n");
  while (boundary >= 0) {
    const raw = working.slice(0, boundary).trim();
    working = working.slice(boundary + 2);
    if (raw) {
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
      events.push({ event, data: dataLines.join("\n") });
    }
    boundary = working.indexOf("\n\n");
  }
  return { events, rest: working };
}

export function useChat(): UseChatResult {
  const validatedKeyRef = useRef<string | null>(null);
  const send = useCallback(
    async ({ content, linkedSuggestionId, displayContent, systemPromptOverride }: SendArgs) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const visible = (displayContent ?? trimmed).trim();
      if (!visible) return;

      const {
        chatMessages,
        transcriptChunks,
        addChatMessage,
        appendToMessage,
        finalizeMessage,
        setChatStreaming,
        setLastChatFirstTokenMs,
      } = useSessionStore.getState();

      const { apiKey, chatSystemPrompt } = useSettingsStore.getState();

      const userMsg: ChatMessage = {
        id: uid("m-"),
        role: "user",
        content: visible,
        timestamp: Date.now(),
        linkedSuggestionId,
      };
      addChatMessage(userMsg);

      if (!apiKey) {
        const err: ChatMessage = {
          id: uid("m-"),
          role: "assistant",
          content: "No API key set. Open Settings to add your Groq key.",
          timestamp: Date.now(),
        };
        addChatMessage(err);
        return;
      }

      if (validatedKeyRef.current !== apiKey) {
        try {
          const keyRes = await fetchWithTimeout("/api/key-test", {
            method: "POST",
            headers: { [API_KEY_HEADER]: apiKey },
            timeoutMs: 10_000,
          });
          if (!keyRes.ok) {
            const keyMsg = await parseApiErrorMessage(
              keyRes,
              "API key test failed."
            );
            addChatMessage({
              id: uid("m-"),
              role: "assistant",
              content: `HTTP ${keyRes.status}: ${keyMsg}`,
              timestamp: Date.now(),
            });
            validatedKeyRef.current = null;
            return;
          }
          validatedKeyRef.current = apiKey;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "API key test failed.";
          addChatMessage({
            id: uid("m-"),
            role: "assistant",
            content: msg,
            timestamp: Date.now(),
          });
          validatedKeyRef.current = null;
          return;
        }
      }

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

      const t0 = Date.now();

      try {
        for (let attempt = 1; attempt <= MAX_TRANSIENT_ATTEMPTS; attempt += 1) {
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

            if (!res.ok || !res.body) {
              const msg = await parseApiErrorMessage(res, res.statusText || "Request failed.");
              if (
                isTransientStatus(res.status) &&
                attempt < MAX_TRANSIENT_ATTEMPTS
              ) {
                await sleep(TRANSIENT_RETRY_DELAY_MS);
                continue;
              }
              appendToMessage(
                assistantId,
                `HTTP ${res.status}: ${msg.slice(0, 220)}`
              );
              return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let receivedAny = false;
            try {
              let sseBuffer = "";
              let doneSeen = false;
              let errorSeen = false;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (!value) continue;
                sseBuffer += decoder.decode(value, { stream: true });
                const { events, rest } = extractSseEvents(sseBuffer);
                sseBuffer = rest;

                for (const evt of events) {
                  if (evt.event === "token") {
                    let text = "";
                    try {
                      const parsed = JSON.parse(evt.data) as { text?: unknown };
                      if (typeof parsed.text === "string") text = parsed.text;
                    } catch {
                      // keep text empty; malformed event payload
                    }
                    if (!text) continue;
                    if (!receivedAny) {
                      setLastChatFirstTokenMs(Date.now() - t0);
                    }
                    appendToMessage(assistantId, text);
                    receivedAny = true;
                  } else if (evt.event === "error") {
                    let status: number | null = null;
                    let message = "Unknown stream error.";
                    try {
                      const parsed = JSON.parse(evt.data) as {
                        status?: unknown;
                        message?: unknown;
                      };
                      if (typeof parsed.status === "number") status = parsed.status;
                      if (typeof parsed.message === "string" && parsed.message) {
                        message = parsed.message;
                      }
                    } catch {
                      if (evt.data.trim()) message = evt.data.trim();
                    }
                    appendToMessage(
                      assistantId,
                      `\n\nHTTP ${status ?? 500}: ${message}`
                    );
                    errorSeen = true;
                    doneSeen = true;
                    break;
                  } else if (evt.event === "done") {
                    doneSeen = true;
                    break;
                  }
                }
                if (doneSeen) break;
              }
              if (!receivedAny && !errorSeen) {
                appendToMessage(
                  assistantId,
                  "\n\nHTTP 502: Empty SSE stream (no token events received)."
                );
              }
            } catch (streamErr) {
              const prefix = receivedAny
                ? "\n\n[stream error after partial content]"
                : "\n\n[stream error before any content]";
              appendToMessage(assistantId, prefix);
              console.error("[useChat] stream error:", streamErr);
            }
            return;
          } catch (err) {
            if (
              isLikelyTransientNetworkError(err) &&
              attempt < MAX_TRANSIENT_ATTEMPTS
            ) {
              await sleep(TRANSIENT_RETRY_DELAY_MS);
              continue;
            }
            const msg = err instanceof Error ? err.message : "Chat request failed.";
            appendToMessage(assistantId, `\n\n[error: ${msg}]`);
            return;
          }
        }
      } finally {
        finalizeMessage(assistantId);
        setChatStreaming(false);
      }
    },
    []
  );

  return { send };
}
