import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/embed-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`embed-text function error: ${err}`);
  }

  const json = await res.json();
  return json.embedding as number[];
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: chunks } = await supabase
    .from("transcript_chunks")
    .select("id, text")
    .eq("session_id", id);

  if (!chunks?.length) return NextResponse.json({ error: "No transcript chunks" }, { status: 422 });

  const serviceClient = createServiceClient();
  let embedded = 0;

  for (const chunk of chunks) {
    if (!chunk.text.trim()) continue;
    try {
      const embedding = await getEmbedding(chunk.text);
      await serviceClient.from("transcript_embeddings").upsert({
        session_id: id,
        chunk_id: chunk.id,
        content: chunk.text,
        embedding: JSON.stringify(embedding),
      }, { onConflict: "chunk_id" });
      embedded++;
    } catch (err) {
      console.error("[embed] chunk error", err);
    }
  }

  return NextResponse.json({ embedded, total: chunks.length });
}
