"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn, formatRelative } from "@/lib/utils";
import type { Suggestion } from "@/types";
import { SuggestionTypeBadge } from "./SuggestionTypeBadge";

interface Props {
  suggestion: Suggestion;
  isActive: boolean;
  onClick: () => void;
}

export function SuggestionCard({ suggestion, isActive, onClick }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const text = `[${suggestion.type}] ${suggestion.preview}\n\n${suggestion.fullContext}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context). Silently ignore —
      // the card click still works.
    }
  };

  return (
    <div
      className={cn(
        "group relative w-full rounded-lg border border-border bg-card text-left shadow-sm transition-all",
        "hover:border-primary/40 hover:shadow-md",
        isActive && "ring-2 ring-primary"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-lg p-3 text-left"
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <SuggestionTypeBadge type={suggestion.type} />
          <span className="text-[10px] text-muted-foreground">
            {formatRelative(suggestion.timestamp)}
          </span>
        </div>
        <p className="pr-6 text-sm leading-snug text-foreground">
          {suggestion.preview}
        </p>
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy suggestion"}
        title={copied ? "Copied!" : "Copy suggestion"}
        className={cn(
          "absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground backdrop-blur transition-all",
          "hover:bg-muted hover:text-foreground",
          copied
            ? "opacity-100 text-emerald-600 dark:text-emerald-400"
            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {copied && (
        <span className="pointer-events-none absolute right-2 top-9 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background shadow-md">
          Copied!
        </span>
      )}
    </div>
  );
}
