"use client";

import { useCallback } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
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
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            [API_KEY_HEADER]: apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          if (res.status === 429) {
            appendToMessage(
              assistantId,
              "Groq rate limit reached. Wait ~30 seconds and retry this message."
            );
          } else if (res.status === 401) {
            appendToMessage(
              assistantId,
              "Groq rejected the API key. Open Settings and verify it."
            );
          } else {
            appendToMessage(
              assistantId,
              `Error from Groq: ${text.slice(0, 240) || res.statusText}`
            );
          }
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
        } catch (streamErr) {
          const prefix = receivedAny
            ? "\n\n— connection interrupted. Message may be incomplete."
            : "\n\nConnection interrupted before any content arrived.";
          appendToMessage(assistantId, prefix);
          console.error("[useChat] stream error:", streamErr);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Chat request failed.";
        appendToMessage(assistantId, `\n\n[error: ${msg}]`);
      } finally {
        finalizeMessage(assistantId);
        setChatStreaming(false);
      }
    },
    []
  );

  return { send };
}
