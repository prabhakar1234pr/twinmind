"use client";

import { cn, formatRelative } from "@/lib/utils";
import type { Suggestion } from "@/types";
import { SuggestionTypeBadge } from "./SuggestionTypeBadge";

interface Props {
  suggestion: Suggestion;
  isActive: boolean;
  isPrefetching: boolean;
  isPrefetched: boolean;
  onClick: () => void;
}

export function SuggestionCard({ suggestion, isActive, isPrefetching, isPrefetched, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md",
        isActive && "ring-2 ring-primary"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <SuggestionTypeBadge type={suggestion.type} />
        <div className="flex items-center gap-1.5">
          {isPrefetching && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"
              title="Preparing answer…"
            />
          )}
          {isPrefetched && !isPrefetching && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              title="Answer ready — instant response"
            />
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatRelative(suggestion.timestamp)}
          </span>
        </div>
      </div>
      <p className="text-sm leading-snug text-foreground">
        {suggestion.preview}
      </p>
    </button>
  );
}
