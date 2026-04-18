"use client";

import { Download, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { buildExport, downloadExport } from "@/lib/session";

interface Props {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: Props) {
  const hasApiKey = useSettingsStore((s) => s.apiKey.trim().length > 0);
  const resetSession = useSessionStore((s) => s.resetSession);

  const handleExport = () => {
    const { sessionId, startedAt, transcriptChunks, suggestionBatches, chatMessages } =
      useSessionStore.getState();
    const settings = useSettingsStore.getState();
    const payload = buildExport({
      sessionId,
      startedAt,
      transcript: transcriptChunks,
      suggestionBatches,
      chatMessages,
      settings,
    });
    downloadExport(payload);
  };

  const handleReset = () => {
    if (
      confirm(
        "Clear current session? Transcript, suggestions, and chat will be erased. Export first if you want to keep them."
      )
    ) {
      resetSession();
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          TM
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">TwinMind</span>
          <span className="text-xs text-muted-foreground">Live Suggestions</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!hasApiKey && (
          <span className="text-xs text-amber-600 dark:text-amber-400 mr-2">
            API key required
          </span>
        )}
        <button
          onClick={handleReset}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
          title="Clear session"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Clear</span>
        </button>
        <button
          onClick={handleExport}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted"
          title="Export session JSON"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90"
          title="Settings"
        >
          <SettingsIcon className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}
