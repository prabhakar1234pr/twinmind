import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGroqClient } from "@/lib/groq";

type Params = { params: Promise<{ id: string }> };

export const runtime = "edge";

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get transcript chunks
  const { data: chunks } = await supabase
    .from("transcript_chunks")
    .select("chunk_index, text")
    .eq("session_id", id)
    .order("chunk_index");

  if (!chunks?.length) return NextResponse.json({ error: "No transcript" }, { status: 422 });

  const fullTranscript = chunks.map((c) => c.text).join("\n\n");
  const apiKey = req.headers.get("x-groq-api-key") ?? "";

  // Fall back to service role fetch if no API key in header
  if (!apiKey) return NextResponse.json({ error: "Missing Groq API key header" }, { status: 401 });

  const groq = createGroqClient(apiKey);
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `You are a meeting summarizer. Given a conversation transcript, produce a concise structured summary.

Format:
## Overview
1-2 sentence summary of what was discussed.

## Key Points
- Bullet points of the main topics, decisions, or insights.

## Action Items
- Any tasks, follow-ups, or next steps mentioned. If none, write "None identified."

Be concrete. Quote specific names, numbers, decisions when mentioned.`,
      },
      { role: "user", content: `Transcript:\n\n${fullTranscript}` },
    ],
  });

  const summary = completion.choices[0]?.message?.content?.trim() ?? "";

  // Save to DB
  await supabase.from("sessions").update({ summary }).eq("id", id);

  return NextResponse.json({ summary });
}
