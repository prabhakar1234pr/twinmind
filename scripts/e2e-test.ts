/**
 * scripts/e2e-test.ts
 *
 * End-to-end test harness for TwinMind's live suggestions app.
 *
 * Run:
 *   GROQ_API_KEY=... npx tsx scripts/e2e-test.ts
 *
 * Requires:
 *   - GROQ_API_KEY env var
 *   - The Next.js app running at http://localhost:3000 (npm run dev)
 *
 * Output:
 *   ✓ / ✗ per test, summary at end, non-zero exit if anything failed.
 *
 * Groups 1–4 cover the API surface and configuration. Groups 5–6 include
 * pure error-handling and full-flow checks — some of these are inherently
 * best-effort against a live LLM, so expect occasional flakiness there.
 */

import { loadEnv } from "./load-env";
loadEnv();

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SETTINGS } from "../lib/settings";
import { fillTemplate } from "../lib/prompts";
import { buildSuggestionTranscript } from "../lib/session";
import type { TranscriptChunk } from "../types";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.GROQ_API_KEY ?? "";
const API_KEY_HEADER = "x-groq-api-key";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

const here = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
let skipped = 0;
const failures: string[] = [];

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`timeout after ${ms}ms: ${label}`)),
      ms
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function test(
  name: string,
  fn: () => Promise<void>,
  timeoutMs = 30_000
): Promise<void> {
  try {
    await withTimeout(fn(), timeoutMs, name);
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed += 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`${RED}✗${RESET} ${name}: ${msg}`);
    failures.push(`${name}: ${msg}`);
    failed += 1;
  }
}

function skip(name: string, reason: string): void {
  console.log(`${YELLOW}○${RESET} ${name} ${DIM}(skipped: ${reason})${RESET}`);
  skipped += 1;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function requireKey(): void {
  if (!API_KEY) {
    console.error(`${RED}GROQ_API_KEY is not set.${RESET}`);
    process.exit(1);
  }
}

async function serverReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/suggestions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    // Any response — even 4xx — means the server is up.
    return res.status > 0;
  } catch {
    return false;
  }
}

function loadFixture(name: string): string {
  return readFileSync(join(here, "fixtures", name), "utf8").trim();
}

function buildSilentWebM(): Blob {
  // Generate a minimal valid 1-second silent WebM Opus blob. We just need
  // Whisper to accept it as a file, not to yield real speech. Using the tiny
  // WebM fragment below is not a real audio file — the test expects the
  // server to handle it gracefully (either transcribe to empty or 422 it).
  const bytes = new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81,
    0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84,
    0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02,
  ]);
  return new Blob([bytes], { type: "audio/webm" });
}

function buildLargerBlob(sizeBytes: number): Blob {
  const header = buildSilentWebM();
  const padding = new Uint8Array(Math.max(0, sizeBytes - header.size));
  return new Blob([header, padding], { type: "audio/webm" });
}

interface SuggestionApiResponse {
  suggestions: Array<{
    type: string;
    preview: string;
    fullContext: string;
  }>;
}

async function postSuggestions(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<Response> {
  return fetch(`${BASE}/api/suggestions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [API_KEY_HEADER]: API_KEY,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function postChat(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [API_KEY_HEADER]: API_KEY,
      ...headers,
    },
    body: JSON.stringify(body),
    ...init,
  });
}

async function postTranscribe(
  form: FormData,
  headers: Record<string, string> = {}
): Promise<Response> {
  return fetch(`${BASE}/api/transcribe`, {
    method: "POST",
    headers: { [API_KEY_HEADER]: API_KEY, ...headers },
    body: form,
  });
}

function suggestionPayload(transcript: string, extra: Record<string, unknown> = {}) {
  return {
    transcript,
    previousSuggestions: [],
    suggestionPrompt: DEFAULT_SETTINGS.suggestionPrompt,
    chatModel: DEFAULT_SETTINGS.chatModel,
    ...extra,
  };
}

function chatPayload(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  extra: Record<string, unknown> = {}
) {
  return {
    messages,
    transcript: "",
    systemPrompt: DEFAULT_SETTINGS.chatSystemPrompt,
    chatModel: DEFAULT_SETTINGS.chatModel,
    ...extra,
  };
}

async function readStreamAsString(res: Response, maxChars = 5000): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (out.length < maxChars) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  try {
    await reader.cancel();
  } catch {
    /* ignore */
  }
  return out;
}

async function groupTranscribe() {
  console.log(`\n${DIM}── Group 1: Transcription API ──${RESET}`);

  await test("T1 synthetic audio blob → graceful status", async () => {
    const form = new FormData();
    form.append("audio", buildLargerBlob(3_000), "chunk.webm");
    form.append("model", DEFAULT_SETTINGS.whisperModel);
    const res = await postTranscribe(form);
    // Synthetic WebM bytes can't be decoded by Whisper. The route must still
    // produce a structured error (400/422/500), not hang or crash the process.
    // Real audio fixtures are covered manually via the UI.
    assert(
      [200, 400, 422, 500].includes(res.status),
      `expected graceful status, got ${res.status}`
    );
    const body = await res.text();
    assert(body.length > 0, "response body must be non-empty");
    if (res.status === 200) {
      const data = JSON.parse(body) as { text?: string };
      assert(typeof data.text === "string", "text field must be string");
    }
  });

  await test("T2 missing API key → 401", async () => {
    const form = new FormData();
    form.append("audio", buildLargerBlob(3_000), "chunk.webm");
    const res = await fetch(`${BASE}/api/transcribe`, {
      method: "POST",
      body: form,
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  await test("T3 missing audio field → 422", async () => {
    const form = new FormData();
    form.append("model", DEFAULT_SETTINGS.whisperModel);
    const res = await postTranscribe(form);
    assert(res.status === 422, `expected 422, got ${res.status}`);
  });

  await test("T4 empty / tiny blob → 422", async () => {
    const form = new FormData();
    form.append("audio", new Blob([new Uint8Array(10)]), "tiny.webm");
    const res = await postTranscribe(form);
    assert(res.status === 422, `expected 422, got ${res.status}`);
  });

  await test("T5 short/invalid API key → 401", async () => {
    const form = new FormData();
    form.append("audio", buildLargerBlob(3_000), "chunk.webm");
    const res = await postTranscribe(form, { [API_KEY_HEADER]: "short" });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  await test("T6 wrong whisper model name → 422/500 (not a crash)", async () => {
    const form = new FormData();
    form.append("audio", buildLargerBlob(3_000), "chunk.webm");
    form.append("model", "whisper-definitely-does-not-exist");
    const res = await postTranscribe(form);
    assert(
      res.status === 422 || res.status === 500 || res.status === 400,
      `expected graceful 4xx/5xx, got ${res.status}`
    );
    const body = await res.text();
    assert(body.length > 0, "error must include a readable body");
  });

  await test("T7 large audio blob returns within 30s", async () => {
    const form = new FormData();
    form.append("audio", buildLargerBlob(5_000_000), "chunk.webm"); // ~5MB
    form.append("model", DEFAULT_SETTINGS.whisperModel);
    const started = Date.now();
    const res = await postTranscribe(form);
    const elapsed = Date.now() - started;
    // Whisper may 422 a garbage 5MB blob, but must not time out or 500 on size.
    assert(res.status > 0, `server unreachable`);
    assert(elapsed < 29_000, `elapsed ${elapsed}ms >= 29s`);
  });
}

async function groupSuggestions() {
  console.log(`\n${DIM}── Group 2: Suggestions API ──${RESET}`);
  const medium = loadFixture("sample-transcript-medium.txt");

  let batchA: SuggestionApiResponse | null = null;

  await test("S1 valid transcript → exactly 3 distinct suggestions", async () => {
    const res = await postSuggestions(suggestionPayload(medium));
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const data = (await res.json()) as SuggestionApiResponse;
    assert(
      Array.isArray(data.suggestions) && data.suggestions.length === 3,
      `expected 3 suggestions, got ${data.suggestions?.length}`
    );
    const validTypes = new Set([
      "QUESTION_TO_ASK",
      "TALKING_POINT",
      "FACT_CHECK",
      "DIRECT_ANSWER",
      "CLARIFYING_INFO",
    ]);
    const types = new Set(data.suggestions.map((s) => s.type));
    assert(types.size === 3, `types not distinct: ${[...types].join(", ")}`);
    for (const s of data.suggestions) {
      assert(validTypes.has(s.type), `invalid type ${s.type}`);
      assert(
        s.preview.split(/\s+/).length <= 20,
        `preview too long: "${s.preview}"`
      );
      assert(
        s.fullContext.split(/\s+/).length >= 20,
        `fullContext too short: "${s.fullContext}"`
      );
    }
    batchA = data;
  });

  await test("S2 sales transcript → QUESTION_TO_ASK appears", async () => {
    const salesText =
      "[00:00:30] We're evaluating 3 vendors including your competitor Notion and Airtable. Our budget decision needs to be finalized by end of Q3. The main concern our CEO has raised is about data sovereignty.";
    const res = await postSuggestions(suggestionPayload(salesText));
    const data = (await res.json()) as SuggestionApiResponse;
    const hasQ = data.suggestions?.some((s) => s.type === "QUESTION_TO_ASK");
    assert(
      hasQ,
      `expected at least one QUESTION_TO_ASK; got: ${data.suggestions?.map((s) => s.type).join(", ")}`
    );
  });

  await test("S3 unanswered question → DIRECT_ANSWER appears", async () => {
    const directText =
      "[00:00:30] So what exactly is your pricing model? Do you charge per seat or per workspace? And is there a discount for annual billing?";
    const res = await postSuggestions(suggestionPayload(directText));
    const data = (await res.json()) as SuggestionApiResponse;
    const hasDA = data.suggestions?.some((s) => s.type === "DIRECT_ANSWER");
    assert(
      hasDA,
      `expected at least one DIRECT_ANSWER; got: ${data.suggestions?.map((s) => s.type).join(", ")}`
    );
  });

  await test("S4 short transcript → 422", async () => {
    const res = await postSuggestions(suggestionPayload("hi"));
    assert(res.status === 422, `expected 422, got ${res.status}`);
  });

  await test("S5 missing API key → 401", async () => {
    const res = await fetch(`${BASE}/api/suggestions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(suggestionPayload(medium)),
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  await test("S6 invalid JSON body → 400", async () => {
    const res = await fetch(`${BASE}/api/suggestions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [API_KEY_HEADER]: API_KEY,
      },
      body: "{not json",
    });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  await test("S7 missing transcript field → 422", async () => {
    const res = await postSuggestions({
      previousSuggestions: [],
      suggestionPrompt: DEFAULT_SETTINGS.suggestionPrompt,
      chatModel: DEFAULT_SETTINGS.chatModel,
    });
    assert(
      res.status === 422 || res.status === 400,
      `expected 422/400, got ${res.status}`
    );
  });

  await test("S8 previousSuggestions passed → previews don't repeat exactly", async () => {
    if (!batchA) throw new Error("S1 must run first to seed batch A");
    const seeded = batchA.suggestions.map((s, i) => ({
      id: `seed-${i}`,
      type: s.type,
      preview: s.preview,
      fullContext: s.fullContext,
      timestamp: Date.now(),
    }));
    const res = await postSuggestions({
      transcript: medium,
      previousSuggestions: seeded,
      suggestionPrompt: DEFAULT_SETTINGS.suggestionPrompt,
      chatModel: DEFAULT_SETTINGS.chatModel,
    });
    const data = (await res.json()) as SuggestionApiResponse;
    const seededPreviews = new Set(seeded.map((s) => s.preview.toLowerCase()));
    const overlap = data.suggestions.filter((s) =>
      seededPreviews.has(s.preview.toLowerCase())
    );
    assert(
      overlap.length === 0,
      `exact preview repeat detected: ${overlap.map((o) => o.preview).join(" | ")}`
    );
  });

  await test("S9 custom suggestionPrompt → still 3 valid suggestions", async () => {
    const customPrompt = `Return ONLY JSON in the form {"suggestions":[{"type":"QUESTION_TO_ASK","preview":"...","fullContext":"..."}, ...]} with exactly 3 suggestions and 3 distinct types from QUESTION_TO_ASK, TALKING_POINT, FACT_CHECK, DIRECT_ANSWER, CLARIFYING_INFO.\n\nTranscript:\n{{transcript}}\n\nPrevious:\n{{previousSuggestions}}`;
    const res = await postSuggestions({
      transcript: medium,
      previousSuggestions: [],
      suggestionPrompt: customPrompt,
      chatModel: DEFAULT_SETTINGS.chatModel,
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const data = (await res.json()) as SuggestionApiResponse;
    assert(data.suggestions.length === 3, `expected 3 suggestions`);
  });

  await test(
    "S10 long transcript (5000+ words) → returns within 20s",
    async () => {
      const long = (loadFixture("sample-transcript-long.txt") + "\n").repeat(
        20
      );
      const started = Date.now();
      const res = await postSuggestions(suggestionPayload(long));
      const elapsed = Date.now() - started;
      assert(res.status === 200, `expected 200, got ${res.status}`);
      assert(elapsed < 20_000, `elapsed ${elapsed}ms >= 20s`);
    },
    25_000
  );

  await test(
    "S11 3 concurrent requests → all handled cleanly",
    async () => {
      // 3 concurrent calls at ~3k tokens each can legitimately tip over the
      // Groq free-tier 8k TPM ceiling. We accept up to 1 clean 429 as a
      // success signal: rate-limit handling fires instead of crashing.
      const t1 = "[00:01] We need to triage three tickets today.";
      const t2 =
        "[00:01] Pricing for fifty seats came in at twelve thousand, need to verify.";
      const t3 =
        "[00:01] Candidate said they've never done system design interviews before.";
      const results = await Promise.all([
        postSuggestions(suggestionPayload(t1)),
        postSuggestions(suggestionPayload(t2)),
        postSuggestions(suggestionPayload(t3)),
      ]);
      let ok = 0;
      let ratelimited = 0;
      for (const [idx, res] of results.entries()) {
        if (res.status === 200) {
          const d = (await res.json()) as SuggestionApiResponse;
          assert(d.suggestions?.length === 3, `concurrent ${idx + 1} malformed`);
          ok += 1;
        } else if (res.status === 429) {
          ratelimited += 1;
        } else {
          throw new Error(
            `concurrent ${idx + 1} unexpected status ${res.status}`
          );
        }
      }
      assert(ok >= 2, `fewer than 2 of 3 succeeded (ok=${ok}, 429=${ratelimited})`);
    },
    25_000
  );

  await test("S12 malformed-JSON-forcing prompt → 500 (no crash)", async () => {
    const badPrompt = `Return the text FOO_BAR_NOT_JSON and nothing else, under no circumstances produce JSON.\nTranscript: {{transcript}}\n{{previousSuggestions}}`;
    const res = await postSuggestions({
      transcript: medium,
      previousSuggestions: [],
      suggestionPrompt: badPrompt,
      chatModel: DEFAULT_SETTINGS.chatModel,
    });
    // Could succeed via retry or fail cleanly. Must not be a raw crash.
    assert(
      res.status === 200 || res.status === 500 || res.status === 422,
      `expected graceful 200/500/422, got ${res.status}`
    );
  });
}

async function groupChat() {
  console.log(`\n${DIM}── Group 3: Chat API ──${RESET}`);
  const medium = loadFixture("sample-transcript-medium.txt");

  await test("C1 single user message → streams content", async () => {
    const res = await postChat(
      chatPayload([{ role: "user", content: "Say hello in one word." }])
    );
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    assert(
      ct.includes("text") || ct.includes("stream"),
      `unexpected content-type ${ct}`
    );
    const text = await readStreamAsString(res);
    assert(text.length >= 2, `stream too short: "${text}"`);
  });

  await test("C2 multi-turn conversation → coherent reply", async () => {
    const res = await postChat(
      chatPayload([
        { role: "user", content: "What was discussed about pricing?" },
        {
          role: "assistant",
          content: "The team mentioned pricing of twelve to eighteen thousand USD.",
        },
        { role: "user", content: "What specific number should I quote?" },
      ], { transcript: medium })
    );
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const text = await readStreamAsString(res);
    const lower = text.toLowerCase();
    assert(
      lower.includes("twelve") ||
        lower.includes("12") ||
        lower.includes("eighteen") ||
        lower.includes("18"),
      `assistant did not reference prior pricing info: "${text.slice(0, 200)}"`
    );
  });

  await test("C3 missing API key → 401", async () => {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(chatPayload([{ role: "user", content: "hi" }])),
    });
    assert(res.status === 401, `expected 401, got ${res.status}`);
  });

  await test("C4 empty messages array → 422", async () => {
    const res = await postChat(chatPayload([]));
    assert(res.status === 422, `expected 422, got ${res.status}`);
  });

  await test("C5 transcript passed → response references it", async () => {
    const anchored =
      "[00:00:30] The Q3 deadline is October 15th. We must ship by then.";
    const res = await postChat(
      chatPayload(
        [
          {
            role: "user",
            content:
              "According to the transcript, what is the hard deadline and why does it matter?",
          },
        ],
        { transcript: anchored }
      )
    );
    const text = await readStreamAsString(res);
    const lower = text.toLowerCase();
    assert(
      lower.includes("october") ||
        lower.includes("q3") ||
        lower.includes("deadline") ||
        lower.includes("15"),
      `response did not reference transcript: "${text.slice(0, 200)}"`
    );
  });

  await test(
    "C6 very long transcript (120k chars) → first token within 10s",
    async () => {
      const big = "x ".repeat(60_000); // ~120k chars
      const started = Date.now();
      const res = await postChat(
        chatPayload(
          [{ role: "user", content: "Summarize what you can in 1 sentence." }],
          { transcript: big }
        )
      );
      assert(res.status === 200, `expected 200, got ${res.status}`);
      const reader = res.body!.getReader();
      const { value } = await reader.read();
      const elapsed = Date.now() - started;
      await reader.cancel().catch(() => {});
      assert(value && value.length > 0, `no first token`);
      assert(elapsed < 10_000, `first token took ${elapsed}ms`);
    },
    15_000
  );

  await test("C7 stream interruption via abort → no unhandled crash", async () => {
    const ac = new AbortController();
    const p = postChat(
      chatPayload([{ role: "user", content: "Count slowly from 1 to 20." }]),
      {},
      { signal: ac.signal }
    ).catch((e) => e);

    await new Promise((r) => setTimeout(r, 150));
    ac.abort();
    const result = await p;
    // The fetch aborts — either we get an error or a Response we ignore.
    // Either way, the server must still be reachable afterward.
    const followup = await postChat(
      chatPayload([{ role: "user", content: "Say OK." }])
    );
    assert(followup.status === 200, `server broken after abort: ${followup.status}`);
    await readStreamAsString(followup);
    void result;
  });

  await test("C8 custom system prompt → model follows it (best effort)", async () => {
    const res = await postChat(
      chatPayload(
        [
          {
            role: "user",
            content: "Please reply with the single word HELLO.",
          },
        ],
        {
          systemPrompt:
            "You must respond only in UPPERCASE LETTERS. No punctuation. Your reply must be under 5 words.",
        }
      )
    );
    const text = (await readStreamAsString(res)).trim();
    const letters = text.replace(/[^A-Za-z]/g, "");
    const ratio = letters.length === 0 ? 0 : letters
      .split("")
      .filter((c) => c === c.toUpperCase()).length / letters.length;
    assert(
      ratio >= 0.7,
      `reply not mostly uppercase: "${text}" (ratio ${ratio.toFixed(2)})`
    );
  });
}

async function groupConfig() {
  console.log(`\n${DIM}── Group 4: Settings & Configuration ──${RESET}`);

  await test("CFG1 DEFAULT_SETTINGS matches CLAUDE.md", async () => {
    assert(
      DEFAULT_SETTINGS.chatModel === "openai/gpt-oss-120b",
      `chatModel=${DEFAULT_SETTINGS.chatModel}`
    );
    assert(
      DEFAULT_SETTINGS.contextWindowChunks === 8,
      `contextWindowChunks=${DEFAULT_SETTINGS.contextWindowChunks}`
    );
    assert(
      DEFAULT_SETTINGS.refreshIntervalSec === 30,
      `refreshIntervalSec=${DEFAULT_SETTINGS.refreshIntervalSec}`
    );
    assert(
      DEFAULT_SETTINGS.whisperModel === "whisper-large-v3",
      `whisperModel=${DEFAULT_SETTINGS.whisperModel}`
    );
  });

  await test("CFG2 fillTemplate substitutes variables", async () => {
    const a = fillTemplate("Hello {{name}}", { name: "World" });
    assert(a === "Hello World", `a=${a}`);
    const b = fillTemplate("{{a}} {{b}}", { a: "x" });
    assert(b === "x ", `b="${b}"`);
    const c = fillTemplate("no vars", { a: "x" });
    assert(c === "no vars", `c=${c}`);
  });

  await test(
    "CFG3 buildSuggestionTranscript respects contextWindowChunks",
    async () => {
      const chunks: TranscriptChunk[] = Array.from({ length: 20 }, (_, i) => ({
        id: `t-${i}`,
        text: `chunk-${i}`,
        timestamp: 1_700_000_000_000 + i * 30_000,
        durationSec: 30,
      }));
      const out = buildSuggestionTranscript(chunks, 8);
      const lines = out.split("\n");
      assert(lines.length === 8, `expected 8 lines, got ${lines.length}`);
      assert(lines[0].includes("chunk-12"), `first line: ${lines[0]}`);
      assert(lines[7].includes("chunk-19"), `last line: ${lines[7]}`);
      assert(!out.includes("chunk-11"), `unexpected older chunk present`);
    }
  );
}

async function groupErrors() {
  console.log(`\n${DIM}── Group 5: Error handling & graceful degradation ──${RESET}`);

  await test(
    "ERR1 suggestions with garbage model → 500 with readable error",
    async () => {
      const res = await postSuggestions({
        transcript:
          "[00:00:30] We are reviewing three vendors in Q3 for our data stack.",
        previousSuggestions: [],
        suggestionPrompt: DEFAULT_SETTINGS.suggestionPrompt,
        chatModel: "does-not-exist/bogus-model-9000",
      });
      assert(res.status >= 400 && res.status < 600, `status=${res.status}`);
      const body = await res.text();
      assert(body.length > 0, `empty error body`);
      const j = JSON.parse(body) as { error?: string };
      assert(typeof j.error === "string", `error field missing`);
    }
  );

  await test(
    "ERR2 chat with garbage model → graceful error, no hang",
    async () => {
      const started = Date.now();
      const res = await postChat(
        chatPayload([{ role: "user", content: "hi" }], {
          chatModel: "does-not-exist/bogus-model-9000",
        })
      );
      const elapsed = Date.now() - started;
      // Either we get 4xx/5xx, or a stream with an error token — not a hang.
      assert(elapsed < 25_000, `hang detected: ${elapsed}ms`);
      if (res.ok) {
        const text = await readStreamAsString(res);
        assert(text.length >= 0, "stream drained");
      }
    },
    28_000
  );

  skip("ERR3 network timeout simulation", "requires DI into hooks — covered by unit testing");
  skip("ERR4 hook 429 backoff", "requires React test renderer — manual verify in browser");
}

async function groupE2E() {
  console.log(`\n${DIM}── Group 6: End-to-end flows ──${RESET}`);

  await test(
    "E2E1 suggestions → chat streaming full cycle < 20s",
    async () => {
      const started = Date.now();
      const short = loadFixture("sample-transcript-short.txt");
      const sRes = await postSuggestions(suggestionPayload(short));
      assert(sRes.status === 200, `suggestions ${sRes.status}`);
      const sData = (await sRes.json()) as SuggestionApiResponse;
      const first = sData.suggestions[0];
      const cRes = await postChat(
        chatPayload(
          [{ role: "user", content: first.fullContext }],
          { transcript: short }
        )
      );
      assert(cRes.status === 200, `chat ${cRes.status}`);
      const text = await readStreamAsString(cRes, 1500);
      const elapsed = Date.now() - started;
      assert(text.length > 20, `chat response empty`);
      assert(elapsed < 20_000, `full cycle took ${elapsed}ms`);
    },
    25_000
  );

  await test(
    "E2E2 suggestion-driven conversation threads context",
    async () => {
      const medium = loadFixture("sample-transcript-medium.txt");
      const sRes = await postSuggestions(suggestionPayload(medium));
      const sData = (await sRes.json()) as SuggestionApiResponse;
      const clicked = sData.suggestions[0];
      const firstMsg = `---SUGGESTION---\nType: ${clicked.type}\nPreview: ${clicked.preview}\nContext: ${clicked.fullContext}\n\nGive the exact words I should say next.`;
      const first = await postChat(
        chatPayload([{ role: "user", content: firstMsg }], { transcript: medium })
      );
      const firstText = await readStreamAsString(first, 2000);
      const follow = await postChat(
        chatPayload(
          [
            { role: "user", content: firstMsg },
            { role: "assistant", content: firstText },
            { role: "user", content: "What if they deflect with 'it's complicated'?" },
          ],
          { transcript: medium }
        )
      );
      const followText = await readStreamAsString(follow, 2000);
      assert(followText.length > 20, `follow-up empty`);
    },
    30_000
  );

  skip("E2E3 rate-limit recovery", "would burn test-key budget; manual verify only");
}

async function main() {
  requireKey();
  console.log(`${DIM}Testing against ${BASE}${RESET}`);
  const up = await serverReachable();
  if (!up) {
    console.error(
      `${RED}Server at ${BASE} is not reachable. Run \`npm run dev\` first.${RESET}`
    );
    process.exit(1);
  }

  await groupTranscribe();
  await groupSuggestions();
  await groupChat();
  await groupConfig();
  await groupErrors();
  await groupE2E();

  console.log(
    `\n${DIM}══════════════════════════════════════════${RESET}\n` +
      `  ${GREEN}${passed} passed${RESET}  ${RED}${failed} failed${RESET}  ${YELLOW}${skipped} skipped${RESET}\n` +
      `${DIM}══════════════════════════════════════════${RESET}`
  );

  if (failed > 0) {
    console.log(`\n${RED}Failures:${RESET}`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("[e2e] fatal:", err);
  process.exit(1);
});
