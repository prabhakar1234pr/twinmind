import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createGroqClient } from "@/lib/groq";
import { apiError } from "@/lib/groq";

type Params = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "nomic-embed-text-v1_5", input: text }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data[0].embedding;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(401, "Unauthorized");

  const apiKey = req.headers.get("x-groq-api-key") ?? "";
  if (!apiKey) return apiError(401, "Missing Groq API key");

  const { question, history = [] } = await req.json();
  if (!question?.trim()) return apiError(422, "No question provided");

  const serviceClient = createServiceClient();

  // Try vector search first; fall back to full-text if no embeddings exist
  let contextChunks: string[] = [];

  const queryEmbedding = await getEmbedding(question, apiKey);
  if (queryEmbedding) {
    const { data: matches } = await serviceClient.rpc("match_transcript_chunks", {
      query_embedding: queryEmbedding,
      match_session_id: id,
      match_count: 5,
    });

    if (matches?.length) {
      contextChunks = matches
        .filter((m: { similarity: number }) => m.similarity > 0.3)
        .map((m: { content: string }) => m.content);
    }
  }

  // Fall back: get full transcript if no vectors or poor similarity
  if (contextChunks.length === 0) {
    const { data: chunks } = await serviceClient
      .from("transcript_chunks")
      .select("text, chunk_index")
      .eq("session_id", id)
      .order("chunk_index");
    contextChunks = (chunks ?? []).map((c: { text: string }) => c.text);
  }

  if (contextChunks.length === 0) return apiError(422, "No transcript available for this session");

  const context = contextChunks.join("\n\n---\n\n");

  const groq = createGroqClient(apiKey);
  const stream = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    stream: true,
    temperature: 0.4,
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `You are an expert analyst for a recorded conversation. Help the user understand, recall, and extract insights from what was discussed.

**Rules:**
- Answer only from the transcript below — never fabricate facts or statistics not mentioned
- If the answer isn't in the transcript, say so plainly: "This wasn't mentioned in the recording."
- Format responses with markdown: **bold** key terms, use bullet lists for multiple points, use > blockquotes to cite specific things said
- Be analytical — interpret and explain, don't just repeat verbatim text
- Keep answers concise and scannable; use structure when answering multi-part questions

**Transcript:**
${context}`,
      },
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: question },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
