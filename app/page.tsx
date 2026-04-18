"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mic, Clock, ChevronRight, LogOut, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Session {
  id: string;
  title: string;
  created_at: string;
  ended_at: string | null;
  duration_sec: number;
  summary: string | null;
}

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);
      if (!user) { router.push("/auth"); return; }

      const { data } = await supabase
        .from("sessions")
        .select("id, title, created_at, ended_at, duration_sec, summary")
        .order("created_at", { ascending: false })
        .limit(50);

      setSessions(data ?? []);
      setLoading(false);
    };
    void load();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setDeletingId(id);
    await supabase.from("sessions").delete().eq("id", id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const fmtDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">TM</div>
            <span className="font-semibold">TwinMind</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{user?.email}</span>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Start new session CTA */}
        <button
          onClick={() => router.push("/record")}
          className="mb-8 flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-left transition-colors hover:border-primary/60 hover:bg-primary/10"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">New Session</p>
            <p className="text-sm text-muted-foreground">Start recording and get live AI suggestions</p>
          </div>
          <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
        </button>

        {/* Session list */}
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Past Sessions
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-border py-12 text-center">
            <Mic className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No sessions yet. Start your first one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/sessions/${s.id}`)}
                className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{s.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmt(s.created_at)}</span>
                  </div>
                  {s.summary ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.summary}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground/50 italic">No summary yet</p>
                  )}
                  {s.duration_sec > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {fmtDuration(s.duration_sec)}
                    </div>
                  )}
                </div>
                <div className="mt-0.5 flex shrink-0 items-center gap-1">
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    disabled={deletingId === s.id}
                    className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                    title="Delete session"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
