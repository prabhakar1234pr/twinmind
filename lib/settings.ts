import type { Settings } from "@/types";
import {
  DEFAULT_CHAT_SYSTEM_PROMPT,
  DEFAULT_EXPANSION_PROMPT,
  DEFAULT_SUGGESTION_PROMPT,
} from "@/lib/prompts";

export const SETTINGS_STORAGE_KEY = "twinmind-settings-v1";

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
  expansionPrompt: DEFAULT_EXPANSION_PROMPT,
  contextWindowChunks: 8,
  refreshIntervalSec: 30,
  whisperModel: "whisper-large-v3",
  chatModel: "openai/gpt-oss-120b",
  autoRefresh: true,
  captureSystemAudio: false,
};

export const WHISPER_MODEL_OPTIONS = [
  { value: "whisper-large-v3", label: "whisper-large-v3 (most accurate)" },
  { value: "whisper-large-v3-turbo", label: "whisper-large-v3-turbo (faster)" },
];

export const CHAT_MODEL_OPTIONS = [
  { value: "openai/gpt-oss-120b", label: "openai/gpt-oss-120b (assignment default)" },
  { value: "openai/gpt-oss-20b", label: "openai/gpt-oss-20b (faster)" },
];
