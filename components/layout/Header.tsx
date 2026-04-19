"use client";

import { Download, Key, Mic, MicOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { buildExport, downloadExport } from "@/lib/session";

interface Props {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: Props) {
  const hasApiKey = useSettingsStore((s) => s.apiKey.trim().length > 0);
  const resetSession = useSessionStore((s) => s.resetSession);
  const isRecording = useSessionStore((s) => s.isRecording);
  const requestRecordingToggle = useSessionStore((s) => s.requestRecordingToggle);
  const transcriptChunks = useSessionStore((s) => s.transcriptChunks);
  const chatMessages = useSessionStore((s) => s.chatMessages);
  const suggestionBatches = useSessionStore((s) => s.suggestionBatches);

  const hasContent =
    transcriptChunks.length > 0 ||
    chatMessages.length > 0 ||
    suggestionBatches.length > 0;

  const handleExport = () => {
    const { sessionId, startedAt } = useSessionStore.getState();
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

  const handleEndSession = () => {
    // Stop the mic if it's on, leave the transcript/suggestions/chat visible
    // on the page. A separate "Clear" action is available if the user wants
    // to start over (Export is the persistence path the assignment specifies).
    if (isRecording) requestRecordingToggle();
  };

  const handleClear = () => {
    if (!hasContent) return;
    if (
      confirm(
        "Clear everything? Transcript, suggestions, and chat will be erased. Export first if you want to keep them."
      )
    ) {
      resetSession();
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3 sm:h-14 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold sm:h-8 sm:w-8 sm:text-sm">
          TM
        </div>
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-semibold">TwinMind</span>
          <span className="text-xs text-muted-foreground">Live Suggestions</span>
        </div>
        <span className="text-sm font-semibold sm:hidden">TwinMind</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {!hasApiKey && (
          <span className="hidden text-xs text-amber-600 dark:text-amber-400 sm:inline sm:mr-1">
            API key required
          </span>
        )}

        {/* Record / Stop: at sm–lg the transcript panel is hidden, so we
            surface the mic toggle in the header at those breakpoints. */}
        <button
          onClick={requestRecordingToggle}
          className={cn(
            "hidden sm:inline-flex lg:hidden",
            "h-8 w-8 items-center justify-center rounded-md transition-colors",
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "border border-border bg-background text-muted-foreground hover:bg-muted"
          )}
          title={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {isRecording && (
          <button
            onClick={handleEndSession}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-2.5 text-white hover:bg-red-700 sm:h-9 sm:px-3"
            title="End the recording"
          >
            <Square className="h-3.5 w-3.5" />
            <span className="hidden text-sm sm:inline">End session</span>
          </button>
        )}

        <button
          onClick={handleExport}
          disabled={!hasContent}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:hover:bg-background sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
          title="Export session JSON"
        >
          <Download className="h-4 w-4" />
          <span className="hidden text-sm sm:inline">Export</span>
        </button>

        <button
          onClick={handleClear}
          disabled={!hasContent}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-background sm:h-9 sm:px-3 sm:text-sm"
          title="Clear session data"
        >
          Clear
        </button>

        <button
          onClick={onOpenSettings}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"
          title="Groq API key"
        >
          <Key className="h-4 w-4" />
          <span className="hidden text-sm sm:inline">API key</span>
        </button>
      </div>
    </header>
  );
}
