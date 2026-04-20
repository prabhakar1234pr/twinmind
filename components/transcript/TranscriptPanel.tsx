"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useTranscription } from "@/hooks/useTranscription";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { MicButton } from "./MicButton";
import { TranscriptEntry } from "./TranscriptEntry";


interface Props {
  onNeedApiKey: () => void;
}

export function TranscriptPanel({ onNeedApiKey }: Props) {
  const chunks = useSessionStore((s) => s.transcriptChunks);
  const hasApiKey = useSettingsStore((s) => s.apiKey.trim().length > 0);
  const { enqueue, error: transcribeError, queueSize } = useTranscription();

  const handleChunk = useCallback(
    (blob: Blob, durationSec: number) => {
      enqueue(blob, durationSec);
    },
    [enqueue]
  );

  const { isRecording, start, stop, flushChunk, error: micError } = useAudioRecorder(
    {
      onChunk: handleChunk,
      chunkIntervalMs: 30_000,
    }
  );

  const toggle = useCallback(async () => {
    if (isRecording) { stop(); return; }
    if (!hasApiKey) { onNeedApiKey(); return; }
    await start();
  }, [isRecording, stop, hasApiKey, onNeedApiKey, start]);

  // Sync recording state to store so header mic button can read it
  const setIsRecordingStore = useSessionStore((s) => s.setIsRecording);
  useEffect(() => {
    setIsRecordingStore(isRecording);
  }, [isRecording, setIsRecordingStore]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chunks.length]);

  // Respond to external toggle requests from header mic button on narrow screens
  const toggleSeq = useSessionStore((s) => s.recordingToggleSeq);
  const prevSeqRef = useRef(toggleSeq);
  useEffect(() => {
    if (toggleSeq !== prevSeqRef.current) {
      prevSeqRef.current = toggleSeq;
      void toggle();
    }
  }, [toggleSeq, toggle]);

  // External "refresh" requests flush the active chunk immediately so the
  // latest spoken words can be transcribed before suggestions are regenerated.
  const flushSeq = useSessionStore((s) => s.transcriptFlushSeq);
  const prevFlushRef = useRef(flushSeq);
  useEffect(() => {
    if (flushSeq !== prevFlushRef.current) {
      prevFlushRef.current = flushSeq;
      flushChunk();
    }
  }, [flushSeq, flushChunk]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Transcript</h2>
        {queueSize > 0 && (
          <span className="text-xs text-muted-foreground">
            transcribing {queueSize}&hellip;
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 border-b border-border py-5">
        <MicButton
          isRecording={isRecording}
          onClick={toggle}
          disabled={false}
          disabledReason={!hasApiKey ? "Add your Groq API key first" : undefined}
        />
        {(micError || transcribeError) && (
          <p className="mx-4 mt-1 max-w-[90%] rounded-md bg-destructive/10 px-3 py-1.5 text-center text-xs text-destructive">
            {micError ?? transcribeError}
          </p>
        )}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"
      >
        {chunks.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Start recording to see the live transcript.
            <br />
            Chunks commit every 30 seconds.
          </div>
        ) : (
          chunks.map((c) => <TranscriptEntry key={c.id} chunk={c} />)
        )}
      </div>
    </div>
  );
}
