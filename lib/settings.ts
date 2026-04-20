import type { Settings } from "@/types";
import {
  DEFAULT_CHAT_SYSTEM_PROMPT,
  DEFAULT_EXPANSION_PROMPT,
  DEFAULT_SUGGESTION_PROMPT,
} from "@/lib/prompts";

export const SETTINGS_STORAGE_KEY = "twinmind-settings-v1";
export const ASSIGNMENT_WHISPER_MODEL = "whisper-large-v3";
export const ASSIGNMENT_CHAT_MODEL = "openai/gpt-oss-120b";

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  suggestionPrompt: DEFAULT_SUGGESTION_PROMPT,
  chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT,
  expansionPrompt: DEFAULT_EXPANSION_PROMPT,
  contextWindowChunks: 8,
  expansionContextWindowChunks: 20,
  refreshIntervalSec: 30,
  whisperModel: ASSIGNMENT_WHISPER_MODEL,
  chatModel: ASSIGNMENT_CHAT_MODEL,
  autoRefresh: true,
};

export const WHISPER_MODEL_OPTIONS = [
  {
    value: ASSIGNMENT_WHISPER_MODEL,
    label: "whisper-large-v3 (assignment fixed)",
  },
];

export const CHAT_MODEL_OPTIONS = [
  {
    value: ASSIGNMENT_CHAT_MODEL,
    label: "openai/gpt-oss-120b (assignment fixed)",
  },
];
