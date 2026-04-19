"use client";

import { Sparkles } from "lucide-react";
import type { SuggestionBatch, SuggestionType } from "@/types";

/**
 * Purely client-side heuristic: looks at the last 3 batches' suggestion
 * types to guess what kind of meeting this is. Returns null when there
 * isn't enough signal (fewer than 2 batches).
 */
export function inferMeetingType(batches: SuggestionBatch[]): string | null {
  if (batches.length < 2) return null;

  const recent = batches.slice(-3);
  const counts: Record<SuggestionType, number> = {
    QUESTION_TO_ASK: 0,
    TALKING_POINT: 0,
    FACT_CHECK: 0,
    DIRECT_ANSWER: 0,
    CLARIFYING_INFO: 0,
  };
  for (const batch of recent) {
    for (const s of batch.suggestions) {
      counts[s.type] = (counts[s.type] ?? 0) + 1;
    }
  }

  // First-match-wins, order matters.
  if (counts.FACT_CHECK >= 2 && counts.QUESTION_TO_ASK >= 2) return "Sales call";
  if (counts.CLARIFYING_INFO >= 2 && counts.FACT_CHECK >= 1)
    return "Technical discussion";
  if (counts.DIRECT_ANSWER >= 2 || counts.TALKING_POINT >= 2)
    return "Interview (candidate)";
  if (counts.QUESTION_TO_ASK >= 2 && counts.TALKING_POINT >= 2)
    return "Negotiation";
  if (counts.TALKING_POINT >= 2 && counts.QUESTION_TO_ASK >= 2) return "Brainstorm";
  return "General meeting";
}

export function MeetingTypePill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
      title="Inferred from recent suggestion mix"
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
