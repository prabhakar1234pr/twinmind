"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useSessionStore } from "@/store/sessionStore";
import { API_KEY_HEADER } from "@/lib/groq";
import { cn } from "@/lib/utils";

type Step = "saving" | "summary" | "embedding" | "done" | "error";

const STEPS: { key: Step; label: string }[] = [
  { key: "saving", label: "Saving session" },
  { key: "summary", label: "Generating AI summary" },
  { key: "embedding", label: "Indexing transcript for search" },
];

const STEP_ORDER: Step[] = ["saving", "summary", "embedding", "done"];

interface Props {
  dbSessionId: string;
  onCancel: () => void;
}

export function FinishSessionOverlay({ dbSessionId, onCancel }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("saving");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function finish() {
      const {
        transcriptChunks,
        suggestionBatches,
        chatMessages,
        startedAt,
        isRecording,
        requestRecordingToggle,
      } = useSessionStore.getState();
      const { apiKey } = useSettingsStore.getState();

      if (isRecording) requestRecordingToggle();

      // Step 1: Save
      setStep("saving");
      try {
        const durationSec = Math.floor((Date.now() - startedAt) / 1000);
        const title = transcriptChunks[0]?.text
          ? transcriptChunks[0].text.slice(0, 60) +
            (transcriptChunks[0].text.length > 60 ? "…" : "")
          : `Session ${new Date().toLocaleTimeString()}`;

        const res = await fetch(`/api/sessions/${dbSessionId}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            [API_KEY_HEADER]: apiKey,
          },
          body: JSON.stringify({ title, transcript: transcriptChunks, suggestionBatches, chatMessages, durationSec }),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch {
        setErrorMsg("Failed to save session. Please try again.");
        setStep("error");
        return;
      }

      // Step 2: Summary (non-fatal)
      setStep("summary");
      try {
        await fetch(`/api/sessions/${dbSessionId}/summary`, {
          method: "POST",
          headers: { [API_KEY_HEADER]: useSettingsStore.getState().apiKey },
        });
      } catch {
        // non-fatal — user can regenerate from session detail
      }

      // Step 3: Embeddings (non-fatal)
      setStep("embedding");
      try {
        await fetch(`/api/sessions/${dbSessionId}/embed`, {
          method: "POST",
          headers: { [API_KEY_HEADER]: useSettingsStore.getState().apiKey },
        });
      } catch {
        // non-fatal
      }

      setStep("done");
    }

    finish();
  }, [dbSessionId]);

  const currentIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Finishing Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "done"
              ? "Your session is ready to review."
              : step === "error"
              ? "Something went wrong."
              : "Processing your recording…"}
          </p>
        </div>

        {/* Progress icon */}
        <div className="mb-6 flex justify-center">
          {step === "done" ? (
            <CheckCircle className="h-12 w-12 text-green-500" />
          ) : step === "error" ? (
            <div className="text-sm text-red-500">{errorMsg}</div>
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          )}
        </div>

        {/* Step list */}
        <ol className="mb-8 space-y-3">
          {STEPS.map((s) => {
            const idx = STEP_ORDER.indexOf(s.key);
            const isDone = currentIdx > idx || step === "done";
            const isActive = s.key === step;
            return (
              <li key={s.key} className="flex items-center gap-3 text-sm">
                {isDone ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
                )}
                <span
                  className={cn(
                    isDone && "text-muted-foreground line-through",
                    isActive && "font-medium",
                    !isDone && !isActive && "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Actions */}
        <div className="flex gap-2">
          {step === "done" || step === "error" ? (
            <>
              <button
                onClick={() => {
                  useSessionStore.getState().resetSession();
                  router.push("/");
                }}
                className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Home
              </button>
              {step === "done" && (
                <button
                  onClick={() => {
                    useSessionStore.getState().resetSession();
                    router.push(`/sessions/${dbSessionId}`);
                  }}
                  className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  View Session
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onCancel}
              className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
