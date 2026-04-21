"use client";

import { useCallback, useEffect, useRef } from "react";
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
const MANUAL_REFRESH_TRANSCRIPT_WAIT_MS = 4_000;
const SUGGESTIONS_TIMEOUT_MS = 22_000;
const TRANSIENT_RETRY_DELAY_MS = 1_250;
const MAX_TRANSIENT_ATTEMPTS = 2;
const log = createLogger("hook:useSuggestions");

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

    const { apiKey, suggestionPrompt, contextWindowChunks } =
      useSettingsStore.getState();

    const validation = await ensureValidApiKey();
    if (!validation.ok) {
      log.warn("api key validation failed before suggestions", {
        status: validation.status,
        message: validation.message,
      });
      setSuggestionError(validation.message);
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
      };

      for (let attempt = 1; attempt <= MAX_TRANSIENT_ATTEMPTS; attempt += 1) {
        try {
          log.debug("suggestions request attempt", { attempt });
          const res = await fetchWithTimeout("/api/suggestions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              [API_KEY_HEADER]: apiKey,
            },
            body: JSON.stringify(payload),
            timeoutMs: SUGGESTIONS_TIMEOUT_MS,
          });

          if (!res.ok) {
            const msg = await parseApiErrorMessage(res, "Suggestion request failed.");
            log.warn("suggestions request returned non-ok", {
              status: res.status,
              attempt,
              message: msg,
            });
            if (res.status === 429) {
              backoffUntilRef.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
              setSuggestionError(`HTTP ${res.status}: ${msg.slice(0, 220)}`);
              return;
            }
            if (
              isTransientStatus(res.status) &&
              attempt < MAX_TRANSIENT_ATTEMPTS
            ) {
              await sleep(TRANSIENT_RETRY_DELAY_MS);
              continue;
            }
            setSuggestionError(`HTTP ${res.status}: ${msg.slice(0, 220)}`);
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
          log.info("suggestions generated successfully", {
            count: batch.suggestions.length,
            elapsedMs: Date.now() - t0,
          });
          return;
        } catch (err) {
          if (
            isLikelyTransientNetworkError(err) &&
            attempt < MAX_TRANSIENT_ATTEMPTS
          ) {
            log.warn("transient network error while generating suggestions", {
              attempt,
              message: err instanceof Error ? err.message : String(err),
            });
            await sleep(TRANSIENT_RETRY_DELAY_MS);
            continue;
          }
          const msg =
            err instanceof Error ? err.message : "Failed to fetch suggestions.";
          log.error("suggestions request failed", { message: msg, attempt });
          setSuggestionError(msg);
          return;
        }
      }
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
    const store = useSessionStore.getState();
    const beforeCount = store.transcriptChunks.length;
    const isRecording = store.isRecording;
    if (isRecording) {
      useSessionStore.getState().setIsWaitingForTranscriptFlush(true);
      useSessionStore.getState().requestTranscriptFlush();
      const startedAt = Date.now();
      while (Date.now() - startedAt < MANUAL_REFRESH_TRANSCRIPT_WAIT_MS) {
        await new Promise((r) => setTimeout(r, 150));
        const afterCount = useSessionStore.getState().transcriptChunks.length;
        if (afterCount > beforeCount) break;
      }
      useSessionStore.getState().setIsWaitingForTranscriptFlush(false);
    }

    seenChunkCountRef.current =
      useSessionStore.getState().transcriptChunks.length;
    // Manual refresh clears any active backoff so the user can retry immediately.
    backoffUntilRef.current = 0;
    await generate();
  }, [generate]);

  return { refreshNow };
}
