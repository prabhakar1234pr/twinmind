export type SuggestionType =
  | "QUESTION_TO_ASK"
  | "TALKING_POINT"
  | "FACT_CHECK"
  | "DIRECT_ANSWER"
  | "CLARIFYING_INFO";

export const SUGGESTION_TYPES: SuggestionType[] = [
  "QUESTION_TO_ASK",
  "TALKING_POINT",
  "FACT_CHECK",
  "DIRECT_ANSWER",
  "CLARIFYING_INFO",
];

export interface Suggestion {
  id: string;
  type: SuggestionType;
  preview: string;
  fullContext: string;
  timestamp: number;
}

export interface SuggestionBatch {
  id: string;
  suggestions: Suggestion[];
  timestamp: number;
  transcriptSnapshot: string;
}

export interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
  durationSec: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  linkedSuggestionId?: string;
  streaming?: boolean;
}

export interface Settings {
  apiKey: string;
  suggestionPrompt: string;
  chatSystemPrompt: string;
  expansionPrompt: string;
  contextWindowChunks: number;
  refreshIntervalSec: number;
  whisperModel: string;
  chatModel: string;
  autoRefresh: boolean;
  /**
   * Also capture system audio (other party's voice via getDisplayMedia) and
   * mix with the mic stream. When false, mic only.
   */
  captureSystemAudio: boolean;
}

export interface ExportedSession {
  id: string;
  startedAt: number;
  exportedAt: number;
  transcript: TranscriptChunk[];
  suggestionBatches: SuggestionBatch[];
  chatMessages: ChatMessage[];
  settingsSnapshot: Omit<Settings, "apiKey">;
}

export interface SuggestionsApiRequest {
  transcript: string;
  previousSuggestions: Suggestion[];
  suggestionPrompt: string;
  chatModel: string;
}

export interface SuggestionsApiResponse {
  suggestions: Array<Omit<Suggestion, "id" | "timestamp">>;
}

export interface ChatApiRequest {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  transcript: string;
  systemPrompt: string;
  chatModel: string;
}

export interface TranscribeApiResponse {
  text: string;
}
