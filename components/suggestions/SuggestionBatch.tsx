"use client";

import { formatClockTime } from "@/lib/utils";
import type { Suggestion, SuggestionBatch as Batch } from "@/types";
import { SuggestionCard } from "./SuggestionCard";

interface Props {
  batch: Batch;
  activeSuggestionId: string | null;
  prefetchedIds: string[];
  prefetchingIds: string[];
  onSelect: (s: Suggestion) => void;
  isNewest: boolean;
}

export function SuggestionBatch({ batch, activeSuggestionId, prefetchedIds, prefetchingIds, onSelect, isNewest }: Props) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>
          {isNewest ? "Latest " : ""}
          {formatClockTime(batch.timestamp)}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        {batch.suggestions.map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            isActive={s.id === activeSuggestionId}
            isPrefetching={prefetchingIds.includes(s.id)}
            isPrefetched={prefetchedIds.includes(s.id)}
            onClick={() => onSelect(s)}
          />
        ))}
      </div>
    </div>
  );
}
