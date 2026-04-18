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

export function useTranscription(): UseTranscriptionResult {
  const [queueSize, setQueueSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  const queueRef = useRef<Array<{ blob: Blob; durationSec: number }>>([]);

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const job = queueRef.current.shift();
        setQueueSize(queueRef.current.length);
        if (!job) continue;

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
          setError(msg);
        }
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  const enqueue = useCallback(
    (blob: Blob, durationSec: number) => {
      queueRef.current.push({ blob, durationSec });
      setQueueSize(queueRef.current.length);
      void drain();
    },
    [drain]
  );

  return { enqueue, queueSize, error };
}
