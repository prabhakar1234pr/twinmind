"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ThreeColumnLayout } from "@/components/layout/ThreeColumnLayout";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SuggestionsPanel } from "@/components/suggestions/SuggestionsPanel";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const hasKey = useSettingsStore.getState().apiKey.trim().length > 0;
    if (!hasKey) setSettingsOpen(true);
  }, []);

  // Warn on tab close if session has unsaved data.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const s = useSessionStore.getState();
      if (
        s.transcriptChunks.length === 0 &&
        s.chatMessages.length === 0 &&
        s.suggestionBatches.length === 0
      ) {
        return;
      }
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

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <ThreeColumnLayout
        left={<TranscriptPanel onNeedApiKey={() => setSettingsOpen(true)} />}
        middle={<SuggestionsPanel />}
        right={<ChatPanel />}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
