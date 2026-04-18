"use client";

import { cn, formatRelative } from "@/lib/utils";
import type { Suggestion } from "@/types";
import { SuggestionTypeBadge } from "./SuggestionTypeBadge";

interface Props {
  suggestion: Suggestion;
  isActive: boolean;
  onClick: () => void;
}

export function SuggestionCard({ suggestion, isActive, onClick }: Props) {
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
        <span className="text-[10px] text-muted-foreground">
          {formatRelative(suggestion.timestamp)}
        </span>
      </div>
      <p className="text-sm leading-snug text-foreground">
        {suggestion.preview}
      </p>
    </button>
  );
}
