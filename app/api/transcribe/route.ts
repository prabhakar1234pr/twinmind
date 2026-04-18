import { NextRequest } from "next/server";
import { apiError, createGroqClient, getApiKeyFromRequest } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    return apiError(401, "Missing or invalid Groq API key.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "Expected multipart/form-data.");
  }

  const file = form.get("audio");
  const model = (form.get("model") as string) || "whisper-large-v3";

  if (!(file instanceof Blob) || file.size === 0) {
    return apiError(422, "No audio blob in 'audio' field.");
  }

  const groq = createGroqClient(apiKey);

  try {
    const blob = file as Blob;
    const named: File =
      file instanceof File
        ? file
        : new File([blob], "chunk.webm", {
            type: blob.type || "audio/webm",
          });

    const result = await groq.audio.transcriptions.create({
      file: named,
      model,
      response_format: "json",
      temperature: 0,
    });

    const text = (result?.text ?? "").trim();
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed.";
    return apiError(500, msg);
  }
}
