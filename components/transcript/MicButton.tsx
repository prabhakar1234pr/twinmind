"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isRecording: boolean;
  disabled?: boolean;
  onClick: () => void;
  disabledReason?: string;
}

export function MicButton({ isRecording, disabled, onClick, disabledReason }: Props) {
  return (
    <div className="relative flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
        title={disabled ? disabledReason ?? "Unavailable" : undefined}
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-sm transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isRecording
            ? "bg-red-600 hover:bg-red-700"
            : "bg-primary hover:opacity-90"
        )}
      >
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" />
        )}
        {isRecording ? (
          <MicOff className="h-7 w-7 relative" />
        ) : (
          <Mic className="h-7 w-7 relative" />
        )}
      </button>
      <span className="text-xs text-muted-foreground">
        {isRecording ? "Recording\u2026 click to stop" : "Click to start"}
      </span>
    </div>
  );
}
