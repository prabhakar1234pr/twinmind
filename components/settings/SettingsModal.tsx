"use client";

import { CheckCircle2, Eye, EyeOff, Loader2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { API_KEY_HEADER } from "@/lib/groq";
import { fetchWithTimeout, parseApiErrorMessage } from "@/lib/http";
import { createLogger } from "@/lib/logger";
import {
  ASSIGNMENT_CHAT_MODEL,
  ASSIGNMENT_WHISPER_MODEL,
  DEFAULT_SETTINGS,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";

type TestState = "idle" | "loading" | "ok" | "fail";
type Tab = "apiKey" | "prompts" | "behavior";
const log = createLogger("component:SettingsModal");

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const s = useSettingsStore();
  const [tab, setTab] = useState<Tab>("apiKey");
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
    log.info("manual key test requested");
    if (!s.apiKey.trim()) {
      setTestState("fail");
      setTestMessage("Enter a key first.");
      s.setApiKeyValidation({
        status: "invalid",
        message: "HTTP 401: API key is empty.",
        validatedFor: "",
      });
      return;
    }
    setTestState("loading");
    setTestMessage("");
    try {
      const res = await fetchWithTimeout("/api/key-test", {
        method: "POST",
        headers: {
          [API_KEY_HEADER]: s.apiKey.trim(),
        },
        timeoutMs: 10_000,
      });

      if (!res.ok) {
        const msg = await parseApiErrorMessage(res, "Request failed");
        const full = `HTTP ${res.status}: ${msg.slice(0, 220)}`;
        log.warn("manual key test failed", { status: res.status, message: msg });
        s.setApiKeyValidation({
          status: "invalid",
          message: full,
          validatedFor: s.apiKey.trim(),
        });
        setTestState("fail");
        setTestMessage(full);
        return;
      }

      const payload = (await res.json()) as { message?: string };
      const successMsg = payload.message || "API key valid.";
      log.info("manual key test succeeded");
      s.setApiKeyValidation({
        status: "valid",
        message: successMsg,
        validatedFor: s.apiKey.trim(),
      });
      setTestState("ok");
      setTestMessage(successMsg);
    } catch (err) {
      setTestState("fail");
      const msg = err instanceof Error ? err.message : "Unknown error";
      log.error("manual key test threw error", { message: msg });
      s.setApiKeyValidation({
        status: "invalid",
        message: msg,
        validatedFor: s.apiKey.trim(),
      });
      setTestMessage(msg);
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
          <TabButton active={tab === "apiKey"} onClick={() => setTab("apiKey")}>
            API Key
          </TabButton>
          <TabButton active={tab === "prompts"} onClick={() => setTab("prompts")}>
            Prompts
          </TabButton>
          <TabButton active={tab === "behavior"} onClick={() => setTab("behavior")}>
            Behavior
          </TabButton>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-thin">
          {tab === "apiKey" && (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={s.apiKey}
                    onChange={(e) => s.updateSettings({ apiKey: e.target.value })}
                    placeholder="gsk_…"
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
            </>
          )}

          {tab === "prompts" && (
            <div className="space-y-5">
              <PromptField
                label="Live suggestion prompt"
                help="System prompt the model sees when generating the 3 live suggestions."
                value={s.suggestionPrompt}
                onChange={(v) => s.updateSettings({ suggestionPrompt: v })}
                defaultValue={DEFAULT_SETTINGS.suggestionPrompt}
              />
              <PromptField
                label="Chat system prompt"
                help="System prompt for free-form follow-up questions in the chat panel."
                value={s.chatSystemPrompt}
                onChange={(v) => s.updateSettings({ chatSystemPrompt: v })}
                defaultValue={DEFAULT_SETTINGS.chatSystemPrompt}
              />
              <PromptField
                label="Detailed on-click answer prompt"
                help="System prompt used when a suggestion is clicked and expanded into a full streaming answer."
                value={s.expansionPrompt}
                onChange={(v) => s.updateSettings({ expansionPrompt: v })}
                defaultValue={DEFAULT_SETTINGS.expansionPrompt}
              />
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => s.resetPrompts()}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Reset all prompts to defaults
                </button>
              </div>
            </div>
          )}

          {tab === "behavior" && (
            <div className="space-y-5">
              <SliderField
                label="Live suggestion context window"
                hint="Last N chunks (~ N/2 minutes of audio)"
                min={4}
                max={20}
                step={1}
                value={s.contextWindowChunks}
                onChange={(v) => s.updateSettings({ contextWindowChunks: v })}
              />
              <SliderField
                label="Expanded answer context window"
                hint="0 = full transcript (assignment mode). Otherwise use last N chunks."
                min={0}
                max={60}
                step={5}
                value={s.expansionContextWindowChunks}
                onChange={(v) => s.updateSettings({ expansionContextWindowChunks: v })}
              />
              <SliderField
                label="Refresh interval"
                hint="Every N seconds"
                min={15}
                max={120}
                step={5}
                value={s.refreshIntervalSec}
                onChange={(v) => s.updateSettings({ refreshIntervalSec: v })}
                suffix="s"
              />
              <ToggleField
                label="Auto-refresh suggestions"
                hint="Turn off to only generate suggestions when the Refresh button is clicked."
                value={s.autoRefresh}
                onChange={(v) => s.updateSettings({ autoRefresh: v })}
              />
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Models are fixed for assignment compliance:
                <br />
                Whisper: <code>{ASSIGNMENT_WHISPER_MODEL}</code>
                <br />
                Suggestions + chat: <code>{ASSIGNMENT_CHAT_MODEL}</code>
              </div>
            </div>
          )}
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

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={props.onClick}
      className={cn(
        "-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
        props.active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {props.children}
    </button>
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
        {props.help} &middot; {props.value.length} chars
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
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium">{props.label}</label>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {props.value}
          {props.suffix ?? ""}
        </span>
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
      <p className="mt-1 text-[11px] text-muted-foreground">{props.hint}</p>
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
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label className="text-sm font-medium">{props.label}</label>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{props.hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.value}
        onClick={() => props.onChange(!props.value)}
        className={cn(
          "relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          props.value ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-background shadow transition-transform",
            props.value ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

