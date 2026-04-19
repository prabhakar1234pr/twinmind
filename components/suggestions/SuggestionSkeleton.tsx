"use client";

/**
 * Placeholder card rendered while the first suggestion batch is generating.
 * Matches the rough shape/height of a real SuggestionCard so the panel
 * doesn't reflow when the real batch arrives.
 */
export function SuggestionSkeleton() {
  return (
    <div className="w-full rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-10 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function SuggestionSkeletonBatch() {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span className="opacity-60">Generating&hellip;</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        <SuggestionSkeleton />
        <SuggestionSkeleton />
        <SuggestionSkeleton />
      </div>
    </div>
  );
}
