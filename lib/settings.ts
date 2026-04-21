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
  expansionContextWindowChunks: 0,
  refreshIntervalSec: 30,
  autoRefresh: true,
};
