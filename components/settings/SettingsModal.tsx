"use client";

import { CheckCircle2, Eye, EyeOff, Loader2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";

type TestState = "idle" | "loading" | "ok" | "fail";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Minimal settings modal — API key only.
 * Prompts and behavior parameters are hardcoded to the best-performing defaults
 * (see lib/prompt-versions/ and lib/settings.ts) and not user-editable in the UI.
 */
export function SettingsModal({ open, onClose }: Props) {
  const s = useSettingsStore();
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState<string>("");

  useEffect(() => {
    if (open) setTestState("idle");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const runTest = async () => {
    if (!s.apiKey.trim()) {
      setTestState("fail");
      setTestMessage("Enter a key first.");
      return;
    }
    setTestState("loading");
    setTestMessage("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [API_KEY_HEADER]: s.apiKey.trim(),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
          transcript: "",
          systemPrompt: "You are a test. Reply with only: ok",
          chatModel: s.chatModel,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setTestState("fail");
        setTestMessage(txt.slice(0, 200));
        return;
      }
      const reader = res.body?.getReader();
      if (reader) {
        await reader.read();
        reader.cancel();
      }
      setTestState("ok");
      setTestMessage("Connection successful.");
    } catch (err) {
      setTestState("fail");
      setTestMessage(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Groq API key</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={s.apiKey}
                onChange={(e) => s.updateSettings({ apiKey: e.target.value })}
                placeholder="gsk_\u2026"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={runTest}
              disabled={testState === "loading"}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
            >
              {testState === "loading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : testState === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : testState === "fail" ? (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              ) : null}
              Test
            </button>
          </div>

          {testMessage && (
            <p
              className={cn(
                "text-xs",
                testState === "ok"
                  ? "text-emerald-600"
                  : testState === "fail"
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {testMessage}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Your key is stored only in this browser (localStorage) and sent to{" "}
            <code>/api/*</code> on each request via the{" "}
            <code>x-groq-api-key</code> header. Create one at{" "}
            <a
              className="underline"
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
            >
              console.groq.com/keys
            </a>
            .
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/40 px-5 py-2.5">
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
