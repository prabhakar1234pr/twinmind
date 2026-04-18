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
import { useAutoSave, createDbSession } from "@/hooks/useAutoSave";
import { FinishSessionOverlay } from "@/components/session/FinishSessionOverlay";

export default function RecordPage() {
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);
  useAutoSave(dbSessionId);

  // Create a DB session row on mount
  useEffect(() => {
    createDbSession().then((id) => { if (id) setDbSessionId(id); }).catch(() => {});
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
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

  // Warn on accidental tab close
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
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onFinishSession={dbSessionId ? () => setFinishing(true) : undefined}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Transcript */}
        <section
          className={cn(
            "flex-col bg-background",
            // Mobile: visible only on transcript tab
            activeTab === "transcript" ? "flex flex-1" : "hidden",
            // sm–lg: always hidden (hooks still run; mic button moved to header)
            "sm:hidden",
            // lg+: left column
            "lg:flex lg:flex-none lg:basis-[28%] lg:border-r lg:border-border"
          )}
        >
          <TranscriptPanel onNeedApiKey={() => setSettingsOpen(true)} />
        </section>

        {/* Suggestions */}
        <section
          className={cn(
            "flex-col bg-muted/30",
            // Mobile: visible only on suggestions tab
            activeTab === "suggestions" ? "flex flex-1" : "hidden",
            // sm–lg: always visible, takes half the space
            "sm:flex sm:flex-1 sm:border-r sm:border-border",
            // lg+: middle column
            "lg:flex-none lg:basis-[44%]"
          )}
        >
          <SuggestionsPanel />
        </section>

        {/* Chat */}
        <section
          className={cn(
            "flex-col bg-background",
            // Mobile: visible only on chat tab
            activeTab === "chat" ? "flex flex-1" : "hidden",
            // sm–lg: always visible, takes half the space
            "sm:flex sm:flex-1",
            // lg+: right column
            "lg:flex-none lg:basis-[28%]"
          )}
        >
          <ChatPanel />
        </section>
      </div>

      {/* Tab bar: phone only (hidden at sm+) */}
      <MobileTabBar
        active={activeTab}
        onChange={handleTabChange}
        suggestionsBadge={suggestionsBadge}
        chatBadge={chatBadge}
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {finishing && dbSessionId && (
        <FinishSessionOverlay
          dbSessionId={dbSessionId}
          onCancel={() => setFinishing(false)}
        />
      )}
    </>
  );
}
