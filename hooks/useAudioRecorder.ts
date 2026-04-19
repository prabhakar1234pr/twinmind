"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type OnChunk = (blob: Blob, durationSec: number) => void;

interface UseAudioRecorderArgs {
  chunkIntervalMs?: number;
  /**
   * If true, also capture system audio via getDisplayMedia and mix it with
   * the mic input. When false, mic only.
   */
  captureSystemAudio?: boolean;
  onChunk: OnChunk;
}

interface UseAudioRecorderResult {
  isRecording: boolean;
  error: string | null;
  /** True when the current recording includes a system-audio track. */
  hasSystemAudio: boolean;
  start: () => Promise<void>;
  stop: () => void;
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
 * Ask the browser for the mic and (optionally) a system-audio share via
 * getDisplayMedia, then mix them into a single MediaStream using the Web
 * Audio API so a single MediaRecorder can capture both sides of the call.
 *
 * Returns the mixed stream plus the source streams so callers can clean up
 * every track when stopping.
 */
async function acquireMixedStream(captureSystemAudio: boolean): Promise<{
  stream: MediaStream;
  tracks: MediaStreamTrack[];
  audioContext: AudioContext | null;
  hasSystemAudio: boolean;
}> {
  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  if (!captureSystemAudio) {
    return {
      stream: micStream,
      tracks: micStream.getTracks(),
      audioContext: null,
      hasSystemAudio: false,
    };
  }

  // getDisplayMedia always requires a video track. We request both, keep the
  // audio, stop the video right away. The user MUST check "Share audio" in the
  // picker — if they don't, we fall back silently to mic-only.
  let displayStream: MediaStream | null = null;
  try {
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: { width: 1, height: 1, frameRate: 1 },
    });
  } catch (err) {
    // User cancelled the picker or denied permission. Not a hard error —
    // carry on with mic only so the recording still works.
    console.warn("[useAudioRecorder] system-audio capture declined:", err);
    return {
      stream: micStream,
      tracks: micStream.getTracks(),
      audioContext: null,
      hasSystemAudio: false,
    };
  }

  // Stop the video track immediately — we only wanted audio.
  displayStream.getVideoTracks().forEach((t) => t.stop());
  const displayAudioTracks = displayStream.getAudioTracks();
  if (displayAudioTracks.length === 0) {
    // User ticked "share screen" but not "share audio". Fall back.
    console.warn(
      "[useAudioRecorder] display stream has no audio track — did you tick 'Share audio'?"
    );
    displayAudioTracks.forEach((t) => t.stop());
    return {
      stream: micStream,
      tracks: micStream.getTracks(),
      audioContext: null,
      hasSystemAudio: false,
    };
  }

  // Mix the two streams via Web Audio API.
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();

  const micSource = audioContext.createMediaStreamSource(micStream);
  micSource.connect(destination);

  const displayOnlyAudio = new MediaStream(displayAudioTracks);
  const displaySource = audioContext.createMediaStreamSource(displayOnlyAudio);
  displaySource.connect(destination);

  return {
    stream: destination.stream,
    tracks: [...micStream.getTracks(), ...displayAudioTracks],
    audioContext,
    hasSystemAudio: true,
  };
}

/**
 * Restart-based chunking: we stop() and start() the recorder every
 * `chunkIntervalMs`. Each stop emits a complete, self-contained audio blob
 * with a valid container header — Whisper can decode every chunk on its own.
 * `timeslice` would emit partial blobs that fail to decode.
 */
export function useAudioRecorder({
  chunkIntervalMs = 30_000,
  captureSystemAudio = false,
  onChunk,
}: UseAudioRecorderArgs): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSystemAudio, setHasSystemAudio] = useState(false);

  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mixedStreamRef = useRef<MediaStream | null>(null);
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
    mixedStreamRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
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

    let acquired: Awaited<ReturnType<typeof acquireMixedStream>>;
    try {
      acquired = await acquireMixedStream(captureSystemAudio);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Microphone permission was denied.";
      setError(msg);
      return;
    }

    tracksRef.current = acquired.tracks;
    audioContextRef.current = acquired.audioContext;
    mixedStreamRef.current = acquired.stream;
    setHasSystemAudio(acquired.hasSystemAudio);

    const makeRecorder = () => {
      const stream = mixedStreamRef.current;
      if (!stream) throw new Error("No active stream to record");
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunkBufferRef.current.push(e.data);
      };
      rec.onstop = () => {
        finalizeChunk();
        if (!stoppingFinalRef.current && mixedStreamRef.current) {
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
  }, [captureSystemAudio, chunkIntervalMs, finalizeChunk]);

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
    setHasSystemAudio(false);
  }, [cleanupStream]);

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

  return { isRecording, error, hasSystemAudio, start, stop };
}
