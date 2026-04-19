"use client";

import { useCallback, useEffect, useRef } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import { buildSuggestionTranscript } from "@/lib/session";
import { uid } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type {
  Suggestion,
  SuggestionBatch,
  SuggestionsApiRequest,
  SuggestionsApiResponse,
} from "@/types";

interface UseSuggestionsResult {
  refreshNow: () => Promise<void>;
}

const RATE_LIMIT_BACKOFF_MS = 60_000;

export function useSuggestions(): UseSuggestionsResult {
  const lastBatchAtRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  const seenChunkCountRef = useRef<number>(0);
  const backoffUntilRef = useRef<number>(0);

  const generate = useCallback(async () => {
    if (inFlightRef.current) return;

    const {
      transcriptChunks,
      suggestionBatches,
      addSuggestionBatch,
      setGeneratingSuggestions,
      setSuggestionError,
      setLastSuggestionLatencyMs,
    } = useSessionStore.getState();

    const { apiKey, suggestionPrompt, contextWindowChunks, chatModel } =
      useSettingsStore.getState();

    if (!apiKey) {
      setSuggestionError("No API key set. Open Settings to add your Groq key.");
      return;
    }
    if (transcriptChunks.length === 0) return;

    if (Date.now() < backoffUntilRef.current) return;

    const transcript = buildSuggestionTranscript(
      transcriptChunks,
      contextWindowChunks
    );
    if (transcript.trim().length < 10) return;

    const previousSuggestions: Suggestion[] = suggestionBatches
      .slice(-2)
      .flatMap((b) => b.suggestions);

    inFlightRef.current = true;
    setGeneratingSuggestions(true);
    setSuggestionError(null);

    const t0 = Date.now();

    try {
      const payload: SuggestionsApiRequest = {
        transcript,
        previousSuggestions,
        suggestionPrompt,
        chatModel,
      };

      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [API_KEY_HEADER]: apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const raw = await res.text();
        if (res.status === 429) {
          backoffUntilRef.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
          setSuggestionError(
            "Rate limit reached. Pausing suggestions for 60 seconds."
          );
        } else if (res.status === 422) {
          setSuggestionError("Not enough transcript yet — keep recording.");
        } else if (res.status === 401) {
          setSuggestionError("Groq rejected the API key. Check Settings.");
        } else if (res.status >= 500) {
          setSuggestionError(
            "Suggestion generation failed. Click Refresh to retry."
          );
        } else {
          setSuggestionError(raw.slice(0, 240) || `HTTP ${res.status}`);
        }
        return;
      }

      const data = (await res.json()) as SuggestionsApiResponse;
      const now = Date.now();
      const batch: SuggestionBatch = {
        id: uid("b-"),
        timestamp: now,
        transcriptSnapshot: transcript,
        suggestions: data.suggestions.map((s) => ({
          id: uid("s-"),
          timestamp: now,
          ...s,
        })),
      };

      addSuggestionBatch(batch);
      lastBatchAtRef.current = now;
      setLastSuggestionLatencyMs(Date.now() - t0);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch suggestions.";
      setSuggestionError(`Connection issue: ${msg}. Retrying shortly.`);
    } finally {
      inFlightRef.current = false;
      setGeneratingSuggestions(false);
    }
  }, []);

  // Auto-trigger: eager first batch + interval-based refresh.
  useEffect(() => {
    const interval = setInterval(() => {
      const { transcriptChunks } = useSessionStore.getState();
      const { autoRefresh, refreshIntervalSec, apiKey } =
        useSettingsStore.getState();

      if (!autoRefresh || !apiKey) return;
      if (transcriptChunks.length === 0) return;
      if (Date.now() < backoffUntilRef.current) return;

      const now = Date.now();
      const sinceLast = now - lastBatchAtRef.current;
      const chunkCount = transcriptChunks.length;

      const firstBatch = lastBatchAtRef.current === 0;
      const intervalElapsed = sinceLast >= refreshIntervalSec * 1000;
      const newChunkArrived = chunkCount > seenChunkCountRef.current;

      if (firstBatch && newChunkArrived) {
        seenChunkCountRef.current = chunkCount;
        void generate();
      } else if (intervalElapsed && newChunkArrived) {
        seenChunkCountRef.current = chunkCount;
        void generate();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [generate]);

  const refreshNow = useCallback(async () => {
    seenChunkCountRef.current =
      useSessionStore.getState().transcriptChunks.length;
    // Manual refresh clears any active backoff so the user can retry immediately.
    backoffUntilRef.current = 0;
    await generate();
  }, [generate]);

  return { refreshNow };
}
