"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { useSessionStore } from "@/store/sessionStore";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

export function ChatPanel() {
  const messages = useSessionStore((s) => s.chatMessages);
  const isStreaming = useSessionStore((s) => s.isChatStreaming);
  const { send } = useChat();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastLen = messages[messages.length - 1]?.content.length ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, lastLen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Chat</h2>
        <span className="text-[11px] text-muted-foreground">
          Full transcript as context
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-thin px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="pt-8 text-center text-sm text-muted-foreground">
            Click any suggestion for a detailed answer, or type your own
            question about the conversation.
          </div>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}
      </div>

      <ChatInput onSend={(content) => void send({ content })} disabled={isStreaming} />
    </div>
  );
}
