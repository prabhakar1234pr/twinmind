"use client";

import { RefreshCw } from "lucide-react";
import { useSuggestions } from "@/hooks/useSuggestions";
import { usePrefetch } from "@/hooks/usePrefetch";
import { useChat } from "@/hooks/useChat";
import { fillTemplate } from "@/lib/prompts";
import { uid } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { Suggestion } from "@/types";
import { SuggestionBatch } from "./SuggestionBatch";

const REPLAY_CHUNK = 24;  // chars per tick during fast-replay
const REPLAY_DELAY = 8;   // ms between ticks — fast but visibly streaming

export function SuggestionsPanel() {
  const batches = useSessionStore((s) => s.suggestionBatches);
  const isGenerating = useSessionStore((s) => s.isGeneratingSuggestions);
  const error = useSessionStore((s) => s.suggestionError);
  const activeSuggestion = useSessionStore((s) => s.activeSuggestion);
  const setActiveSuggestion = useSessionStore((s) => s.setActiveSuggestion);
  const prefetchedAnswers = useSessionStore((s) => s.prefetchedAnswers);
  const prefetchingIds = useSessionStore((s) => s.prefetchingIds);
  const expansionPrompt = useSettingsStore((s) => s.expansionPrompt);

  const { refreshNow } = useSuggestions();
  const { send } = useChat();

  // Start background prefetch whenever a new batch lands
  usePrefetch();

  const handleSelect = async (s: Suggestion) => {
    setActiveSuggestion(s);

    const content = fillTemplate(expansionPrompt, {
      suggestionFullContext: s.fullContext,
    });

    const cached = prefetchedAnswers[s.id];
    if (cached) {
      // Fast-replay: inject user message + stream cached text char-by-char
      const {
        addChatMessage,
        appendToMessage,
        finalizeMessage,
        setChatStreaming,
      } = useSessionStore.getState();

      const userMsgId = uid("m-");
      addChatMessage({
        id: userMsgId,
        role: "user",
        content,
        timestamp: Date.now(),
        linkedSuggestionId: s.id,
      });

      const assistantId = uid("m-");
      addChatMessage({
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        streaming: true,
      });
      setChatStreaming(true);

      // Stream cached text in chunks to look like fast streaming
      let offset = 0;
      const replay = () => {
        if (offset >= cached.length) {
          finalizeMessage(assistantId);
          setChatStreaming(false);
          return;
        }
        appendToMessage(assistantId, cached.slice(offset, offset + REPLAY_CHUNK));
        offset += REPLAY_CHUNK;
        setTimeout(replay, REPLAY_DELAY);
      };
      setTimeout(replay, REPLAY_DELAY);
      return;
    }

    // Cache miss (prefetch still in-flight or failed) → live streaming fallback
    await send({ content, linkedSuggestionId: s.id });
  };

  const reversed = [...batches].reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold">Live suggestions</h2>
          <span className="text-[11px] text-muted-foreground">
            3 per batch, newest on top
          </span>
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
        {reversed.length === 0 ? (
          <div className="pt-8 text-center text-sm text-muted-foreground">
            {isGenerating
              ? "Generating first suggestions\u2026"
              : "Start recording to see live suggestions. They refresh every ~30 seconds."}
          </div>
        ) : (
          reversed.map((batch, idx) => (
            <SuggestionBatch
              key={batch.id}
              batch={batch}
              activeSuggestionId={activeSuggestion?.id ?? null}
              prefetchedIds={Object.keys(prefetchedAnswers)}
              prefetchingIds={prefetchingIds}
              onSelect={handleSelect}
              isNewest={idx === 0}
            />
          ))
        )}
        {isGenerating && reversed.length > 0 && (
          <div className="text-center text-xs text-muted-foreground">
            Generating next batch\u2026
          </div>
        )}
      </div>
    </div>
  );
}
