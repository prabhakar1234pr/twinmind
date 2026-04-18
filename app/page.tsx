"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileTabBar, type AppTab } from "@/components/layout/MobileTabBar";
import { ThreeColumnLayout } from "@/components/layout/ThreeColumnLayout";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SuggestionsPanel } from "@/components/suggestions/SuggestionsPanel";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

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

  // Auto-switch to chat when a suggestion is clicked (new user message added)
  // Show badge when on a different tab
  useEffect(() => {
    let prevChatLen = useSessionStore.getState().chatMessages.length;
    let prevBatchLen = useSessionStore.getState().suggestionBatches.length;

    const unsub = useSessionStore.subscribe((state) => {
      // New chat message → switch to chat or badge
      if (state.chatMessages.length > prevChatLen) {
        prevChatLen = state.chatMessages.length;
        if (activeTabRef.current !== "chat") {
          // Only auto-switch if it's a user message (suggestion was clicked)
          const lastMsg = state.chatMessages[state.chatMessages.length - 1];
          if (lastMsg?.role === "user") {
            handleTabChange("chat");
          } else {
            setChatBadge((b) => b + 1);
          }
        }
      }

      // New suggestion batch → badge if not on suggestions tab
      if (state.suggestionBatches.length > prevBatchLen) {
        prevBatchLen = state.suggestionBatches.length;
        if (activeTabRef.current !== "suggestions") {
          setSuggestionsBadge((b) => b + 3);
        }
      }
    });

    return unsub;
  }, []);

  // Warn on tab close if session has unsaved data
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const s = useSessionStore.getState();
      if (
        s.transcriptChunks.length === 0 &&
        s.chatMessages.length === 0 &&
        s.suggestionBatches.length === 0
      ) return;
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

  const transcriptPanel = (
    <TranscriptPanel onNeedApiKey={() => setSettingsOpen(true)} />
  );
  const suggestionsPanel = <SuggestionsPanel />;
  const chatPanel = <ChatPanel />;

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      {/* ── Desktop: 3-column ── */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <ThreeColumnLayout
          left={transcriptPanel}
          middle={suggestionsPanel}
          right={chatPanel}
        />
      </div>

      {/* ── Mobile / narrow: single panel + tab bar ── */}
      {/* All 3 panels are always in the DOM so recording/suggestion hooks stay alive */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "h-full flex-col",
              activeTab === "transcript" ? "flex" : "hidden"
            )}
          >
            {transcriptPanel}
          </div>
          <div
            className={cn(
              "h-full flex-col",
              activeTab === "suggestions" ? "flex" : "hidden"
            )}
          >
            {suggestionsPanel}
          </div>
          <div
            className={cn(
              "h-full flex-col",
              activeTab === "chat" ? "flex" : "hidden"
            )}
          >
            {chatPanel}
          </div>
        </div>

        <MobileTabBar
          active={activeTab}
          onChange={handleTabChange}
          suggestionsBadge={suggestionsBadge}
          chatBadge={chatBadge}
        />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
