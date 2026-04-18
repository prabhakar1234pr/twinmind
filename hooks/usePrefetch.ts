"use client";

import { useEffect, useRef } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import { fillTemplate } from "@/lib/prompts";
import { buildChatTranscript } from "@/lib/session";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { ChatApiRequest, Suggestion } from "@/types";

async function fetchAnswer(
  suggestion: Suggestion,
  transcript: string,
  apiKey: string,
  chatModel: string,
  chatSystemPrompt: string,
  expansionPrompt: string
): Promise<string> {
  const content = fillTemplate(expansionPrompt, {
    suggestionFullContext: suggestion.fullContext,
  });

  const payload: ChatApiRequest = {
    messages: [{ role: "user", content }],
    transcript,
    systemPrompt: chatSystemPrompt,
    chatModel,
  };

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [API_KEY_HEADER]: apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) return "";

  // Accumulate the full streaming response silently
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
  }
  return full;
}

export function usePrefetch() {
  const lastPrefetchedBatchId = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = useSessionStore.subscribe((state) => {
      const batches = state.suggestionBatches;
      if (batches.length === 0) return;

      const latest = batches[batches.length - 1];
      if (latest.id === lastPrefetchedBatchId.current) return;
      lastPrefetchedBatchId.current = latest.id;

      const { apiKey, chatModel, chatSystemPrompt, expansionPrompt } =
        useSettingsStore.getState();
      if (!apiKey) return;

      const { transcriptChunks, addPrefetchingId, removePrefetchingId, setPrefetchedAnswer } =
        useSessionStore.getState();
      const transcript = buildChatTranscript(transcriptChunks);

      // Fire all 3 in parallel — don't await, let them run in background
      for (const suggestion of latest.suggestions) {
        addPrefetchingId(suggestion.id);
        fetchAnswer(suggestion, transcript, apiKey, chatModel, chatSystemPrompt, expansionPrompt)
          .then((content) => {
            if (content) setPrefetchedAnswer(suggestion.id, content);
          })
          .catch(() => {
            // Silently discard — handleSelect will fall back to live streaming
          })
          .finally(() => {
            removePrefetchingId(suggestion.id);
          });
      }
    });

    return unsubscribe;
  }, []);
}
