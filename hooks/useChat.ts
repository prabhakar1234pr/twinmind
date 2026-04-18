"use client";

import { useCallback } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import { buildChatTranscript } from "@/lib/session";
import { uid } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { ChatApiRequest, ChatMessage } from "@/types";

interface SendArgs {
  content: string;
  linkedSuggestionId?: string;
}

interface UseChatResult {
  send: (args: SendArgs) => Promise<void>;
}

export function useChat(): UseChatResult {
  const send = useCallback(async ({ content, linkedSuggestionId }: SendArgs) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const {
      chatMessages,
      transcriptChunks,
      addChatMessage,
      appendToMessage,
      finalizeMessage,
      setChatStreaming,
    } = useSessionStore.getState();

    const { apiKey, chatSystemPrompt, chatModel } = useSettingsStore.getState();

    const userMsg: ChatMessage = {
      id: uid("m-"),
      role: "user",
      content: trimmed,
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

    const outgoingMessages = [...chatMessages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const payload: ChatApiRequest = {
      messages: outgoingMessages,
      transcript: buildChatTranscript(transcriptChunks),
      systemPrompt: chatSystemPrompt,
      chatModel,
    };

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
        appendToMessage(
          assistantId,
          `Error from Groq: ${text.slice(0, 240) || res.statusText}`
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) appendToMessage(assistantId, chunk);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Chat request failed.";
      appendToMessage(assistantId, `\n\n[error: ${msg}]`);
    } finally {
      finalizeMessage(assistantId);
      setChatStreaming(false);
    }
  }, []);

  return { send };
}
