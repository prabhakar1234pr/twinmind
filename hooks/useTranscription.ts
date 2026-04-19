"use client";

import { useCallback, useRef, useState } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import { uid } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { TranscribeApiResponse } from "@/types";

interface UseTranscriptionResult {
  enqueue: (blob: Blob, durationSec: number) => void;
  queueSize: number;
  error: string | null;
}

const MIN_BLOB_BYTES = 2_000;
const RATE_LIMIT_RETRY_MS = 10_000;

interface Job {
  blob: Blob;
  durationSec: number;
  attempts: number;
}

export function useTranscription(): UseTranscriptionResult {
  const [queueSize, setQueueSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const queueRef = useRef<Array<Job>>([]);

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current.shift();
        setQueueSize(queueRef.current.length);
        if (!job) continue;

        // Silently drop chunks that are too small to transcribe — these are
        // expected at record start / stop boundaries and aren't worth bothering
        // the user with.
        if (job.blob.size < MIN_BLOB_BYTES) {
          console.log(`[useTranscription] dropping tiny blob (${job.blob.size}b)`);
          continue;
        }

        const { apiKey, whisperModel } = useSettingsStore.getState();
        if (!apiKey) {
          setError("No API key set. Open Settings to add your Groq key.");
          continue;
        }

        const form = new FormData();
        const file = new File([job.blob], "chunk.webm", {
          type: job.blob.type || "audio/webm",
        });
        form.append("audio", file);
        form.append("model", whisperModel);

        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { [API_KEY_HEADER]: apiKey },
            body: form,
          });

          if (!res.ok) {
            const msg = await res.text();
            if (res.status === 429 && job.attempts < 1) {
              // Re-enqueue at the front and wait before trying again.
              queueRef.current.unshift({ ...job, attempts: job.attempts + 1 });
              setQueueSize(queueRef.current.length);
              setError("Whisper rate limit. Retrying in 10 seconds…");
              await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_MS));
              continue;
            }
            if (res.status === 422) {
              // "audio too short" / "audio too short to transcribe" — log and drop.
              console.log(`[useTranscription] server rejected (422): ${msg.slice(0, 200)}`);
              continue;
            }
            setError(`Transcription failed: ${msg.slice(0, 160)}`);
            continue;
          }

          const data = (await res.json()) as TranscribeApiResponse;
          const text = (data.text ?? "").trim();
          if (!text) continue;

          useSessionStore.getState().addTranscriptChunk({
            id: uid("t-"),
            text,
            timestamp: Date.now(),
            durationSec: job.durationSec,
          });
          setError(null);
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Network error while transcribing.";
          // Expected benign errors from Whisper on sub-threshold audio.
          if (/too short|audio_too_short|file too small/i.test(msg)) {
            console.log(`[useTranscription] benign error dropped: ${msg}`);
            continue;
          }
          setError(msg);
        }
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  const enqueue = useCallback(
    (blob: Blob, durationSec: number) => {
      queueRef.current.push({ blob, durationSec, attempts: 0 });
      setQueueSize(queueRef.current.length);
      void drain();
    },
    [drain]
  );

  return { enqueue, queueSize, error };
}
