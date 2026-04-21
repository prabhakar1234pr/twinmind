"use client";

import { cn } from "@/lib/utils";
import {
  SUGGESTION_TYPES,
  type ChatMessage as Msg,
  type SuggestionType,
} from "@/types";
import { MarkdownContent } from "./MarkdownContent";

function parseSuggestionPrefix(content: string): { type: SuggestionType; text: string } | null {
  const m = content.match(/^\[([A-Z_]+)\]\s*(.+)$/s);
  if (!m) return null;
  const type = m[1] as SuggestionType;
  if (!SUGGESTION_TYPES.includes(type)) return null;
  return { type, text: m[2].trim() };
}

function formatSuggestionType(type: SuggestionType): string {
  const lower = type.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function ChatMessage({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  const suggestionPrefixed = isUser ? parseSuggestionPrefix(message.content) : null;
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "min-w-0 max-w-[88%] overflow-hidden rounded-2xl px-3.5 py-2.5 break-words [overflow-wrap:anywhere]",
          isUser
            ? "bg-primary text-primary-foreground text-sm leading-relaxed whitespace-pre-wrap"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <>
            {suggestionPrefixed ? (
              <div className="space-y-1.5">
                <span className="inline-flex items-center rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/95">
                  {formatSuggestionType(suggestionPrefixed.type)}
                </span>
                <p>{suggestionPrefixed.text}</p>
              </div>
            ) : (
              message.content
            )}
            {message.streaming && (
              <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-current align-baseline" />
            )}
          </>
        ) : (
          <MarkdownContent
            content={message.content || ""}
            streaming={message.streaming}
          />
        )}
      </div>
    </div>
  );
}
