import { NextRequest } from "next/server";
import {
  apiError,
  createGroqClient,
  getErrorStatus,
  getApiKeyFromRequest,
} from "@/lib/groq";
import { createLogger } from "@/lib/logger";
import { ASSIGNMENT_WHISPER_MODEL } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;
const log = createLogger("api:transcribe");

const MIN_AUDIO_BYTES = 2_000;

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const apiKey = getApiKeyFromRequest(req);
  log.info("received transcription request", { hasKey: apiKey.length > 0 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    log.warn("failed to parse form data");
    return apiError(400, "Expected multipart/form-data.");
  }

  const file = form.get("audio");
  const model = ASSIGNMENT_WHISPER_MODEL;

  if (!(file instanceof Blob) || file.size === 0) {
    log.warn("missing or empty audio blob");
    return apiError(422, "No audio blob in 'audio' field.");
  }

  if (file.size < MIN_AUDIO_BYTES) {
    log.warn("audio too short", { sizeBytes: file.size });
    return apiError(422, "Audio chunk too short to transcribe.");
  }

  log.info("calling whisper transcription", {
    model,
    sizeBytes: file.size,
    mimeType: file.type,
  });
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
    log.info("transcription completed", {
      words: text ? text.split(/\s+/).length : 0,
      elapsedMs: Date.now() - t0,
    });
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed.";
    const status = getErrorStatus(err);
    log.error("transcription failed", {
      status,
      message: msg,
      elapsedMs: Date.now() - t0,
    });
    return apiError(status, msg);
  }
}
