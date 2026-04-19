"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { MobileTabBar, type AppTab } from "@/components/layout/MobileTabBar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SuggestionsPanel } from "@/components/suggestions/SuggestionsPanel";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("suggestions");
  const [suggestionsBadge, setSuggestionsBadge] = useState(0);
  const [chatBadge, setChatBadge] = useState(0);
  const activeTabRef = useRef<AppTab>("suggestions");

  const handleTabChange = (tab: AppTab) => {
    activeTabRef.current = tab;
    setActiveTab(tab);
    if (tab === "suggestions") setSuggestionsBadge(0);
    if (tab === "chat") setChatBadge(0);
  };

  useEffect(() => {
    setHydrated(true);
    const hasKey = useSettingsStore.getState().apiKey.trim().length > 0;
    if (!hasKey) setSettingsOpen(true);
  }, []);

  // Auto-switch to chat when suggestion clicked; badge when on another tab
  useEffect(() => {
    let prevChatLen = useSessionStore.getState().chatMessages.length;
    let prevBatchLen = useSessionStore.getState().suggestionBatches.length;

    const unsub = useSessionStore.subscribe((state) => {
      if (state.chatMessages.length > prevChatLen) {
        prevChatLen = state.chatMessages.length;
        const lastMsg = state.chatMessages[state.chatMessages.length - 1];
        if (lastMsg?.role === "user" && activeTabRef.current !== "chat") {
          handleTabChange("chat");
        } else if (lastMsg?.role !== "user") {
          setChatBadge((b) => b + 1);
        }
      }
      if (state.suggestionBatches.length > prevBatchLen) {
        prevBatchLen = state.suggestionBatches.length;
        if (activeTabRef.current !== "suggestions") {
          setSuggestionsBadge((b) => b + 3);
        }
      }
    });

    return unsub;
  }, []);

  // Warn on accidental tab close so the user doesn't lose an in-progress session.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const s = useSessionStore.getState();
      if (!s.transcriptChunks.length && !s.chatMessages.length && !s.suggestionBatches.length) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  // Spacebar toggles recording — a bit of ergonomic polish for the demo.
  // Ignored when an input/textarea/contenteditable is focused so normal
  // typing (settings modal, chat composer) still works. Modifiers are
  // rejected so browser shortcuts like space-to-scroll-with-Shift keep
  // their expected behaviour.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " && e.code !== "Space") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          active.isContentEditable
        ) {
          return;
        }
      }

      e.preventDefault();
      useSessionStore.getState().requestRecordingToggle();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading&hellip;
      </div>
    );
  }

  // All 3 panels are always mounted so recording/suggestion hooks keep running.
  // Visibility is controlled purely by CSS at each breakpoint:
  //
  //  < sm  (< 640px)   : one panel visible at a time, driven by activeTab
  //  sm–lg (640–1024px): Transcript hidden, Suggestions + Chat side-by-side
  //  lg+   (≥ 1024px)  : full 3-column layout

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Transcript */}
        <section
          className={cn(
            "flex-col bg-background",
            activeTab === "transcript" ? "flex flex-1" : "hidden",
            "sm:hidden",
            "lg:flex lg:flex-none lg:basis-[28%] lg:border-r lg:border-border"
          )}
        >
          <TranscriptPanel onNeedApiKey={() => setSettingsOpen(true)} />
        </section>

        {/* Suggestions */}
        <section
          className={cn(
            "flex-col bg-muted/30",
            activeTab === "suggestions" ? "flex flex-1" : "hidden",
            "sm:flex sm:flex-1 sm:border-r sm:border-border",
            "lg:flex-none lg:basis-[44%]"
          )}
        >
          <SuggestionsPanel />
        </section>

        {/* Chat */}
        <section
          className={cn(
            "flex-col bg-background",
            activeTab === "chat" ? "flex flex-1" : "hidden",
            "sm:flex sm:flex-1",
            "lg:flex-none lg:basis-[28%]"
          )}
        >
          <ChatPanel />
        </section>
      </div>

      <MobileTabBar
        active={activeTab}
        onChange={handleTabChange}
        suggestionsBadge={suggestionsBadge}
        chatBadge={chatBadge}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
