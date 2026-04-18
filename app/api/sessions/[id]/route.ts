import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/sessions/[id] — upsert full session data (transcript, suggestions, chat)
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, transcript, suggestionBatches, chatMessages, durationSec } = body;

  // Update session metadata
  await supabase
    .from("sessions")
    .update({ title, ended_at: new Date().toISOString(), duration_sec: durationSec ?? 0 })
    .eq("id", id).eq("user_id", user.id);

  // Upsert transcript chunks
  if (transcript?.length) {
    const rows = transcript.map((c: { id: string; text: string; timestamp: number; durationSec: number }, i: number) => ({
      id: c.id,
      session_id: id,
      chunk_index: i,
      text: c.text,
      timestamp_ms: c.timestamp,
      duration_sec: c.durationSec,
    }));
    await supabase.from("transcript_chunks").upsert(rows, { onConflict: "id" });
  }

  // Upsert suggestion batches + suggestions
  for (const [bi, batch] of (suggestionBatches ?? []).entries()) {
    await supabase.from("suggestion_batches").upsert({
      id: batch.id, session_id: id, batch_index: bi,
      timestamp_ms: batch.timestamp, transcript_snapshot: batch.transcriptSnapshot,
    }, { onConflict: "id" });

    if (batch.suggestions?.length) {
      const sRows = batch.suggestions.map((s: { id: string; type: string; preview: string; fullContext: string; timestamp: number }) => ({
        id: s.id, session_id: id, batch_id: batch.id,
        type: s.type, preview: s.preview, full_context: s.fullContext, timestamp_ms: s.timestamp,
      }));
      await supabase.from("suggestions").upsert(sRows, { onConflict: "id" });
    }
  }

  // Upsert chat messages
  if (chatMessages?.length) {
    const mRows = chatMessages.map((m: { id: string; role: string; content: string; timestamp: number; linkedSuggestionId?: string }) => ({
      id: m.id, session_id: id, role: m.role, content: m.content,
      timestamp_ms: m.timestamp, linked_suggestion_id: m.linkedSuggestionId ?? null,
    }));
    await supabase.from("chat_messages").upsert(mRows, { onConflict: "id" });
  }

  return NextResponse.json({ ok: true });
}

// PATCH /api/sessions/[id] — update title or notes
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { error } = await supabase
    .from("sessions").update(body).eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
