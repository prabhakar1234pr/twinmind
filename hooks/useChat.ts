"use client";

import { useCallback } from "react";
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

export function useChat(): UseChatResult {
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
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                if (chunk) {
                  if (!receivedAny) {
                    setLastChatFirstTokenMs(Date.now() - t0);
                  }
                  appendToMessage(assistantId, chunk);
                  receivedAny = true;
                }
              }
              if (!receivedAny) {
                appendToMessage(
                  assistantId,
                  "\n\nHTTP 200: Empty response stream (no tokens received)."
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
