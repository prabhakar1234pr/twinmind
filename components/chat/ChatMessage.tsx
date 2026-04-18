"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage as Msg } from "@/types";

export function ChatMessage({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.content || (message.streaming ? "\u2026" : "")}
        {message.streaming && message.content && (
          <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse bg-current align-baseline" />
        )}
      </div>
    </div>
  );
}
