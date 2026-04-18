"use client";

import { formatClockTime } from "@/lib/utils";
import type { TranscriptChunk } from "@/types";

export function TranscriptEntry({ chunk }: { chunk: TranscriptChunk }) {
  return (
    <div className="border-b border-border/60 px-4 py-3 text-sm">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {formatClockTime(chunk.timestamp)}
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
        {chunk.text}
      </p>
    </div>
  );
}
