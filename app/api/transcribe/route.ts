import { NextRequest } from "next/server";
import {
  apiError,
  createGroqClient,
  getApiKeyFromRequest,
  isRateLimitError,
} from "@/lib/groq";
import { ASSIGNMENT_WHISPER_MODEL } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;

const MIN_AUDIO_BYTES = 2_000;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const apiKey = getApiKeyFromRequest(req);
  if (!apiKey) {
    console.error("[transcribe] missing API key");
    return apiError(401, "Missing or invalid Groq API key.");
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    console.error("[transcribe] failed to parse form data");
    return apiError(400, "Expected multipart/form-data.");
  }

  const file = form.get("audio");
  const model = ASSIGNMENT_WHISPER_MODEL;

  if (!(file instanceof Blob) || file.size === 0) {
    console.error("[transcribe] missing or empty audio blob");
    return apiError(422, "No audio blob in 'audio' field.");
  }

  if (file.size < MIN_AUDIO_BYTES) {
    console.error(`[transcribe] audio too short size=${file.size}b`);
    return apiError(422, "Audio chunk too short to transcribe.");
  }

  console.log(`[transcribe] model=${model} size=${file.size}b type=${file.type}`);
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
    console.log(`[transcribe] ok words=${text.split(" ").length} ms=${Date.now() - t0}`);
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed.";
    if (isRateLimitError(err)) {
      console.error(`[transcribe] rate limit ms=${Date.now() - t0}`);
      return apiError(
        429,
        "Whisper rate limit reached. Audio will retry shortly."
      );
    }
    console.error(`[transcribe] error ms=${Date.now() - t0}`, msg);
    return apiError(500, msg);
  }
}
