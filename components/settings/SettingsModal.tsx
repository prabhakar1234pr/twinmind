"use client";

import { CheckCircle2, Eye, EyeOff, Loader2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import { DEFAULT_SETTINGS, CHAT_MODEL_OPTIONS, WHISPER_MODEL_OPTIONS } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";

type Tab = "key" | "prompts" | "behavior";
type TestState = "idle" | "loading" | "ok" | "fail";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const s = useSettingsStore();
  const [tab, setTab] = useState<Tab>("key");
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
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-border px-3 pt-2">
          {(
            [
              ["key", "API Key"],
              ["prompts", "Prompts"],
              ["behavior", "Behavior"],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-t-md px-3 py-2 text-sm",
                tab === id
                  ? "bg-background text-foreground border border-b-0 border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {tab === "key" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Groq API key
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={s.apiKey}
                      onChange={(e) =>
                        s.updateSettings({ apiKey: e.target.value })
                      }
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
                      "mt-2 text-xs",
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
                <p className="mt-3 text-xs text-muted-foreground">
                  Your key is stored only in this browser (localStorage) and
                  sent to <code>/api/*</code> on each request via the{" "}
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
            </div>
          )}

          {tab === "prompts" && (
            <div className="space-y-5">
              <PromptField
                label="Suggestion prompt"
                help="Runs every refresh. Must produce a JSON object with a 3-item suggestions array."
                value={s.suggestionPrompt}
                onChange={(v) => s.updateSettings({ suggestionPrompt: v })}
                defaultValue={DEFAULT_SETTINGS.suggestionPrompt}
              />
              <PromptField
                label="Chat system prompt"
                help="Used as the system message for every chat reply. Supports {{transcript}}."
                value={s.chatSystemPrompt}
                onChange={(v) => s.updateSettings({ chatSystemPrompt: v })}
                defaultValue={DEFAULT_SETTINGS.chatSystemPrompt}
              />
              <PromptField
                label="Expansion prompt"
                help="Pre-fills the chat when a suggestion card is clicked. Supports {{suggestionFullContext}}."
                value={s.expansionPrompt}
                onChange={(v) => s.updateSettings({ expansionPrompt: v })}
                defaultValue={DEFAULT_SETTINGS.expansionPrompt}
              />
              <button
                onClick={() => s.resetPrompts()}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Reset all prompts to defaults
              </button>
            </div>
          )}

          {tab === "behavior" && (
            <div className="space-y-6">
              <SliderField
                label="Suggestion context window"
                hint={`Last ${s.contextWindowChunks} chunks (≈ ${Math.round(
                  s.contextWindowChunks * 0.5
                )} minutes of audio)`}
                min={4}
                max={20}
                step={1}
                value={s.contextWindowChunks}
                onChange={(v) => s.updateSettings({ contextWindowChunks: v })}
              />
              <SliderField
                label="Auto-refresh interval"
                hint={`Every ${s.refreshIntervalSec} seconds`}
                min={15}
                max={120}
                step={5}
                value={s.refreshIntervalSec}
                onChange={(v) => s.updateSettings({ refreshIntervalSec: v })}
              />
              <ToggleField
                label="Auto-refresh suggestions"
                hint="Turn off to only generate suggestions when the Refresh button is clicked."
                value={s.autoRefresh}
                onChange={(v) => s.updateSettings({ autoRefresh: v })}
              />
              <SelectField
                label="Whisper model"
                value={s.whisperModel}
                options={WHISPER_MODEL_OPTIONS}
                onChange={(v) => s.updateSettings({ whisperModel: v })}
              />
              <SelectField
                label="Chat / suggestions model"
                value={s.chatModel}
                options={CHAT_MODEL_OPTIONS}
                onChange={(v) => s.updateSettings({ chatModel: v })}
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/40 px-5 py-2.5">
          <span className="text-[11px] text-muted-foreground">
            Changes save automatically.
          </span>
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

function PromptField(props: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  defaultValue: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium">{props.label}</label>
        <button
          onClick={() => props.onChange(props.defaultValue)}
          className="text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          Reset
        </button>
      </div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        rows={8}
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-ring scrollbar-thin"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        {props.help} · {props.value.length} chars
      </p>
    </div>
  );
}

function SliderField(props: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium">{props.label}</label>
        <span className="text-xs text-muted-foreground">{props.hint}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function ToggleField(props: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        <p className="text-xs text-muted-foreground">{props.hint}</p>
      </div>
      <button
        role="switch"
        aria-checked={props.value}
        onClick={() => props.onChange(!props.value)}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          props.value ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
            props.value ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
