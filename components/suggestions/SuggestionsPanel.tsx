"use client";

import { RefreshCw } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useSuggestions } from "@/hooks/useSuggestions";
import { fillTemplate } from "@/lib/prompts";
import { buildChatTranscriptFromWindow } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { Suggestion } from "@/types";
import { SuggestionBatch } from "./SuggestionBatch";
import { SuggestionSkeletonBatch } from "./SuggestionSkeleton";


export function SuggestionsPanel() {
  const batches = useSessionStore((s) => s.suggestionBatches);
  const transcriptChunks = useSessionStore((s) => s.transcriptChunks);
  const isGenerating = useSessionStore((s) => s.isGeneratingSuggestions);
  const error = useSessionStore((s) => s.suggestionError);
  const isWaitingForTranscriptFlush = useSessionStore(
    (s) => s.isWaitingForTranscriptFlush
  );
  const activeSuggestion = useSessionStore((s) => s.activeSuggestion);
  const setActiveSuggestion = useSessionStore((s) => s.setActiveSuggestion);
  const expansionPrompt = useSettingsStore((s) => s.expansionPrompt);
  const expansionContextWindowChunks = useSettingsStore(
    (s) => s.expansionContextWindowChunks
  );

  const { refreshNow } = useSuggestions();
  const { send } = useChat();

  const handleSelect = async (s: Suggestion) => {
    setActiveSuggestion(s);
    const currentChunks = useSessionStore.getState().transcriptChunks;
    const content = fillTemplate(expansionPrompt, {
      suggestionType: s.type,
      suggestionPreview: s.preview,
      suggestionFullContext: s.fullContext,
      transcript: buildChatTranscriptFromWindow(
        currentChunks,
        expansionContextWindowChunks
      ),
    });
    await send({
      content: s.preview,
      linkedSuggestionId: s.id,
      displayContent: `[${s.type}] ${s.preview}`,
      systemPromptOverride: content,
    });
  };

  const reversed = [...batches].reverse();
  const isEmpty = reversed.length === 0;
  const showFirstBatchSkeleton =
    isEmpty && transcriptChunks.length > 0 && isGenerating;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-sm font-semibold">Live suggestions</h2>
          <span className="text-[11px] text-muted-foreground">
            3 per batch, newest on top
          </span>
        </div>
        <button
          onClick={() => void refreshNow()}
          disabled={isGenerating || isWaitingForTranscriptFlush}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs hover:bg-muted disabled:opacity-50"
          title="Regenerate suggestions now"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              (isGenerating || isWaitingForTranscriptFlush) && "animate-spin"
            )}
          />
          {isWaitingForTranscriptFlush ? "Waiting for transcript…" : "Refresh"}
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
        {isWaitingForTranscriptFlush && (
          <div className="text-center text-xs text-muted-foreground">
            Waiting for transcript flush before refresh…
          </div>
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
