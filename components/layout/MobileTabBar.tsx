"use client";

import { MessageSquare, Mic, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTab = "transcript" | "suggestions" | "chat";

interface Props {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  suggestionsBadge: number;
  chatBadge: number;
}

const TABS: { id: AppTab; label: string; Icon: React.ElementType }[] = [
  { id: "transcript", label: "Mic", Icon: Mic },
  { id: "suggestions", label: "Suggestions", Icon: Sparkles },
  { id: "chat", label: "Chat", Icon: MessageSquare },
];

export function MobileTabBar({ active, onChange, suggestionsBadge, chatBadge }: Props) {
  const badge = (id: AppTab) => {
    if (id === "suggestions") return suggestionsBadge;
    if (id === "chat") return chatBadge;
    return 0;
  };

  return (
    <nav className="flex shrink-0 border-t border-border bg-background sm:hidden">
      {TABS.map(({ id, label, Icon }) => {
        const count = badge(id);
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
