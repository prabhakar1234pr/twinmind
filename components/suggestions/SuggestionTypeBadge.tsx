"use client";

import { cn } from "@/lib/utils";
import type { SuggestionType } from "@/types";

const LABELS: Record<SuggestionType, string> = {
  QUESTION_TO_ASK: "Question",
  TALKING_POINT: "Talking point",
  FACT_CHECK: "Fact-check",
  DIRECT_ANSWER: "Answer",
  CLARIFYING_INFO: "Clarify",
};

const STYLES: Record<SuggestionType, string> = {
  QUESTION_TO_ASK: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  TALKING_POINT:
    "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  FACT_CHECK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DIRECT_ANSWER:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CLARIFYING_INFO:
    "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
};

export function SuggestionTypeBadge({ type }: { type: SuggestionType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        STYLES[type]
      )}
    >
      {LABELS[type]}
    </span>
  );
}
