"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type OnChunk = (blob: Blob, durationSec: number) => void;

interface UseAudioRecorderArgs {
  chunkIntervalMs?: number;
  onChunk: OnChunk;
}

interface UseAudioRecorderResult {
  isRecording: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  flushChunk: () => void;
}

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

/**
 * Restart-based chunking: we stop() and start() the recorder every
 * `chunkIntervalMs`. Each stop emits a complete, self-contained audio blob
 * with a valid container header — Whisper can decode every chunk on its own.
 * `timeslice` would emit partial blobs that fail to decode.
 */
export function useAudioRecorder({
  chunkIntervalMs = 30_000,
  onChunk,
}: UseAudioRecorderArgs): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkBufferRef = useRef<BlobPart[]>([]);
  const chunkStartRef = useRef<number>(Date.now());
  const mimeRef = useRef<string>("");
  const stoppingFinalRef = useRef<boolean>(false);

  const finalizeChunk = useCallback(() => {
    const parts = chunkBufferRef.current;
    chunkBufferRef.current = [];
    const startedAt = chunkStartRef.current;
    chunkStartRef.current = Date.now();

    if (parts.length === 0) return;
    const blob = new Blob(parts, { type: mimeRef.current || "audio/webm" });
    if (blob.size < 2_000) return;
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    onChunk(blob, durationSec);
  }, [onChunk]);

  const cleanupStream = useCallback(() => {
    tracksRef.current.forEach((t) => t.stop());
    tracksRef.current = [];
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone not available in this browser.");
      return;
    }

    const mime = pickMimeType();
    if (!mime) {
      setError("No supported audio MIME type found.");
      return;
    }
    mimeRef.current = mime;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      tracksRef.current = micStream.getTracks();
      streamRef.current = micStream;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Microphone permission was denied.";
      setError(msg);
      return;
    }

    const makeRecorder = () => {
      const stream = streamRef.current;
      if (!stream) throw new Error("No active stream to record");
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunkBufferRef.current.push(e.data);
      };
      rec.onstop = () => {
        finalizeChunk();
        if (!stoppingFinalRef.current && streamRef.current) {
          const next = makeRecorder();
          recorderRef.current = next;
          next.start();
        }
      };
      return rec;
    };

    stoppingFinalRef.current = false;
    chunkStartRef.current = Date.now();
    const first = makeRecorder();
    recorderRef.current = first;
    first.start();

    intervalRef.current = setInterval(() => {
      const rec = recorderRef.current;
      if (rec && rec.state === "recording") {
        rec.stop();
      }
    }, chunkIntervalMs);

    setIsRecording(true);
  }, [chunkIntervalMs, finalizeChunk]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stoppingFinalRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    recorderRef.current = null;
    cleanupStream();
    setIsRecording(false);
  }, [cleanupStream]);

  const flushChunk = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      rec.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stoppingFinalRef.current = true;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  return { isRecording, error, start, stop, flushChunk };
}
