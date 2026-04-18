"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage as Msg } from "@/types";
import { MarkdownContent } from "./MarkdownContent";

export function ChatMessage({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground text-sm leading-relaxed whitespace-pre-wrap"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <>
            {message.content}
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
