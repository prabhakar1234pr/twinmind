"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useChat } from "@/hooks/useChat";
import { useSuggestions } from "@/hooks/useSuggestions";
import { fillTemplate } from "@/lib/prompts";
import { buildChatTranscript } from "@/lib/session";
import { cn, uid } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { Suggestion, TranscriptChunk } from "@/types";
import { inferMeetingType, MeetingTypePill } from "./MeetingTypePill";
import { SuggestionBatch } from "./SuggestionBatch";
import { SuggestionSkeletonBatch } from "./SuggestionSkeleton";

/**
 * Hardcoded sales-call transcript used by the "Try with sample transcript"
 * button. Four chunks, 30s apart, ending at "now". Kept in the order the
 * prospect would actually have said them.
 */
const SAMPLE_CHUNKS: Array<Pick<TranscriptChunk, "text" | "durationSec">> = [
  {
    text: "Prospect: Thanks for jumping on. We're evaluating three vendors right now, including Notion and Airtable, and you're the third.",
    durationSec: 30,
  },
  {
    text: "Prospect: Our biggest concern is honestly data sovereignty \u2014 our CEO flagged it last week, she wants everything in EU regions.",
    durationSec: 30,
  },
  {
    text: "Prospect: Our budget decision needs to be finalized before end of Q3, so roughly six weeks from now.",
    durationSec: 30,
  },
  {
    text: "Prospect: What's the pricing for a 50-seat workspace with EU hosting? Your pricing page only shows USD.",
    durationSec: 30,
  },
];

function loadSampleTranscript() {
  const now = Date.now();
  const { addTranscriptChunk } = useSessionStore.getState();
  SAMPLE_CHUNKS.forEach((chunk, i) => {
    // Oldest chunk at now - 30s * (length - 1 - i); last chunk at now.
    const offsetSec = (SAMPLE_CHUNKS.length - 1 - i) * 30;
    addTranscriptChunk({
      id: uid("t-"),
      text: chunk.text,
      durationSec: chunk.durationSec,
      timestamp: now - offsetSec * 1000,
    });
  });
}

export function SuggestionsPanel() {
  const batches = useSessionStore((s) => s.suggestionBatches);
  const transcriptChunks = useSessionStore((s) => s.transcriptChunks);
  const isGenerating = useSessionStore((s) => s.isGeneratingSuggestions);
  const error = useSessionStore((s) => s.suggestionError);
  const activeSuggestion = useSessionStore((s) => s.activeSuggestion);
  const setActiveSuggestion = useSessionStore((s) => s.setActiveSuggestion);
  const expansionPrompt = useSettingsStore((s) => s.expansionPrompt);
  const apiKey = useSettingsStore((s) => s.apiKey);

  const { refreshNow } = useSuggestions();
  const { send } = useChat();

  const handleSelect = async (s: Suggestion) => {
    setActiveSuggestion(s);
    const currentChunks = useSessionStore.getState().transcriptChunks;
    const content = fillTemplate(expansionPrompt, {
      suggestionType: s.type,
      suggestionPreview: s.preview,
      suggestionFullContext: s.fullContext,
      transcript: buildChatTranscript(currentChunks),
    });
    await send({ content, linkedSuggestionId: s.id });
  };

  const meetingType = useMemo(() => inferMeetingType(batches), [batches]);
  const hasApiKey = apiKey.trim().length > 0;

  const reversed = [...batches].reverse();
  const isEmpty = reversed.length === 0;
  const showFirstBatchSkeleton =
    isEmpty && transcriptChunks.length > 0 && isGenerating;
  const showSampleButton =
    isEmpty && transcriptChunks.length === 0 && !isGenerating;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-sm font-semibold">Live suggestions</h2>
          <span className="text-[11px] text-muted-foreground">
            3 per batch, newest on top
          </span>
          {meetingType && <MeetingTypePill label={meetingType} />}
        </div>
        <button
          onClick={() => void refreshNow()}
          disabled={isGenerating}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs hover:bg-muted disabled:opacity-50"
          title="Regenerate suggestions now"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")}
          />
          Refresh
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {error && (
          <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {showFirstBatchSkeleton ? (
          <SuggestionSkeletonBatch />
        ) : isEmpty ? (
          <div className="pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isGenerating
                ? "Generating first suggestions…"
                : "Start recording to see live suggestions. They refresh every ~30 seconds."}
            </p>
            {showSampleButton && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasApiKey) return;
                    loadSampleTranscript();
                  }}
                  disabled={!hasApiKey}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors",
                    hasApiKey
                      ? "hover:border-primary/40 hover:bg-muted"
                      : "cursor-not-allowed opacity-60"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Try with sample transcript
                </button>
                {!hasApiKey && (
                  <span className="text-[11px] text-muted-foreground">
                    Add your Groq key first
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          reversed.map((batch, idx) => (
            <SuggestionBatch
              key={batch.id}
              batch={batch}
              activeSuggestionId={activeSuggestion?.id ?? null}
              onSelect={handleSelect}
              isNewest={idx === 0}
            />
          ))
        )}
        {isGenerating && reversed.length > 0 && (
          <div className="text-center text-xs text-muted-foreground">
            Generating next batch…
          </div>
        )}
      </div>
    </div>
  );
}
