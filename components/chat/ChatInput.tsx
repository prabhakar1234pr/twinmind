"use client";

import { SendHorizonal } from "lucide-react";
import { useState, KeyboardEvent } from "react";

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex shrink-0 items-end gap-2 border-t border-border bg-background px-3 py-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        rows={2}
        placeholder="Ask anything about the conversation\u2026"
        className="min-h-[42px] max-h-36 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring scrollbar-thin"
      />
      <button
        onClick={submit}
        disabled={disabled || value.trim().length === 0}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
        aria-label="Send"
      >
        <SendHorizonal className="h-4 w-4" />
      </button>
    </div>
  );
}
