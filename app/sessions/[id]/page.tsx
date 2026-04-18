"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, FileText, StickyNote, Send, Loader2, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MarkdownContent } from "@/components/chat/MarkdownContent";
import { cn } from "@/lib/utils";

type Tab = "summary" | "transcript" | "notes";

interface SessionData {
  id: string;
  title: string;
  created_at: string;
  summary: string | null;
  notes: string;
  duration_sec: number;
}

interface Chunk { id: string; chunk_index: number; text: string; timestamp_ms: number; }
interface RagMsg { role: "user" | "assistant"; content: string; }

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<SessionData | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [ragMessages, setRagMessages] = useState<RagMsg[]>([]);
  const [ragInput, setRagInput] = useState("");
  const [ragLoading, setRagLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase
        .from("sessions").select("*").eq("id", id).single();
      if (!sessionData) { router.push("/"); return; }
      setSession(sessionData);
      setNotes(sessionData.notes ?? "");

      const { data: chunkData } = await supabase
        .from("transcript_chunks")
        .select("id, chunk_index, text, timestamp_ms")
        .eq("session_id", id)
        .order("chunk_index");
      setChunks(chunkData ?? []);
    };
    void load();
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ragMessages]);

  const saveNotes = (value: string) => {
    setNotes(value);
    clearTimeout(notesTimer.current);
    setNotesSaving(true);
    notesTimer.current = setTimeout(async () => {
      await supabase.from("sessions").update({ notes: value }).eq("id", id);
      setNotesSaving(false);
    }, 800);
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    const res = await fetch(`/api/sessions/${id}/summary`, { method: "POST" });
    if (res.ok) {
      const { summary } = await res.json();
      setSession((s) => s ? { ...s, summary } : s);
    }
    setSummaryLoading(false);
  };

  const generateEmbeddings = async () => {
    setEmbedLoading(true);
    await fetch(`/api/sessions/${id}/embed`, { method: "POST" });
    setEmbedLoading(false);
  };

  const askQuestion = async () => {
    const q = ragInput.trim();
    if (!q || ragLoading) return;
    setRagInput("");
    const newMessages: RagMsg[] = [...ragMessages, { role: "user", content: q }];
    setRagMessages(newMessages);
    setRagLoading(true);

    const res = await fetch(`/api/sessions/${id}/rag`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: q, history: newMessages.slice(-6) }),
    });

    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      setRagMessages([...newMessages, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setRagMessages([...newMessages, { role: "assistant", content: answer }]);
      }
    } else {
      setRagMessages([...newMessages, { role: "assistant", content: "Failed to get answer." }]);
    }
    setRagLoading(false);
  };

  const fullTranscript = chunks.map((c) => c.text).join(" ");
  const wordCount = fullTranscript.split(/\s+/).filter(Boolean).length;

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: "summary", label: "AI Summary", Icon: Sparkles },
    { id: "transcript", label: "Transcript", Icon: FileText },
    { id: "notes", label: "Notes", Icon: StickyNote },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <button onClick={() => router.push("/")} className="rounded-md p-1.5 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{session.title}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(session.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
              {wordCount > 0 && ` · ${wordCount} words`}
            </p>
          </div>
        </div>
      </header>

      {/* Two-column layout: left = tabs, right = RAG chat */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-0 overflow-hidden lg:gap-6 lg:px-4 lg:py-6">

        {/* Left: tabs */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-border">
            {TABS.map(({ id: tid, label, Icon }) => (
              <button
                key={tid}
                onClick={() => setActiveTab(tid)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tid
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
            {activeTab === "summary" && (
              <div className="space-y-4">
                {session.summary ? (
                  <div className="prose prose-sm max-w-none">
                    <MarkdownContent content={session.summary} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border py-10 text-center">
                    <Sparkles className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
                    <p className="mb-4 text-sm text-muted-foreground">No summary yet</p>
                    <button
                      onClick={generateSummary}
                      disabled={summaryLoading || chunks.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {summaryLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Generate AI Summary
                    </button>
                    {chunks.length === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">No transcript to summarize yet.</p>
                    )}
                  </div>
                )}
                {session.summary && (
                  <button
                    onClick={generateSummary}
                    disabled={summaryLoading}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Regenerate summary
                  </button>
                )}
              </div>
            )}

            {activeTab === "transcript" && (
              <div className="space-y-4">
                {chunks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transcript recorded.</p>
                ) : (
                  chunks.map((chunk) => (
                    <div key={chunk.id} className="rounded-lg bg-muted/40 p-3">
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                        {new Date(chunk.timestamp_ms).toLocaleTimeString()}
                      </p>
                      <p className="text-sm leading-relaxed">{chunk.text}</p>
                    </div>
                  ))
                )}
                {chunks.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={generateEmbeddings}
                      disabled={embedLoading}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {embedLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {embedLoading ? "Indexing for RAG…" : "Index for semantic search"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "notes" && (
              <div className="h-full">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Your personal notes for this session</p>
                  {notesSaving && <p className="text-xs text-muted-foreground">Saving…</p>}
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => saveNotes(e.target.value)}
                  placeholder="Add your own notes, action items, follow-ups…"
                  className="h-full min-h-[400px] w-full resize-none rounded-lg border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: RAG chat — full width on mobile (below), sidebar on lg */}
        <div className="flex w-full shrink-0 flex-col border-t border-border lg:w-[380px] lg:rounded-xl lg:border lg:border-border">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Ask this session</h2>
            <p className="text-[11px] text-muted-foreground">
              {chunks.length > 0 ? "Ask anything about what was said" : "Record a session to enable Q&A"}
            </p>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {ragMessages.length === 0 ? (
              <div className="pt-4 text-center text-xs text-muted-foreground">
                Ask a question about the transcript, decisions made, or anything that was discussed.
              </div>
            ) : (
              ragMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3.5 py-2.5",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground text-sm"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {m.role === "assistant"
                      ? <MarkdownContent content={m.content} streaming={ragLoading && i === ragMessages.length - 1} />
                      : m.content
                    }
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border p-3">
            <div className="flex gap-2">
              <input
                value={ragInput}
                onChange={(e) => setRagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void askQuestion(); } }}
                placeholder={chunks.length === 0 ? "No transcript yet…" : "Ask about this session…"}
                disabled={chunks.length === 0 || ragLoading}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <button
                onClick={askQuestion}
                disabled={!ragInput.trim() || ragLoading || chunks.length === 0}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {ragLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
