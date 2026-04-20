"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";
import type {
  ChatMessage,
  Suggestion,
  SuggestionBatch,
  TranscriptChunk,
} from "@/types";

interface SessionStore {
  sessionId: string;
  startedAt: number;

  transcriptChunks: TranscriptChunk[];
  addTranscriptChunk: (chunk: TranscriptChunk) => void;

  suggestionBatches: SuggestionBatch[];
  addSuggestionBatch: (batch: SuggestionBatch) => void;
  isGeneratingSuggestions: boolean;
  setGeneratingSuggestions: (v: boolean) => void;
  suggestionError: string | null;
  setSuggestionError: (msg: string | null) => void;

  chatMessages: ChatMessage[];
  activeSuggestion: Suggestion | null;
  setActiveSuggestion: (s: Suggestion | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  appendToMessage: (id: string, delta: string) => void;
  finalizeMessage: (id: string) => void;
  isChatStreaming: boolean;
  setChatStreaming: (v: boolean) => void;

  // Recording state exposed so header mic button can read/control it
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;
  recordingToggleSeq: number;
  requestRecordingToggle: () => void;
  transcriptFlushSeq: number;
  requestTranscriptFlush: () => void;

  // Latency metrics surfaced in the header for the demo reviewer
  lastSuggestionLatencyMs: number | null;
  lastChatFirstTokenMs: number | null;
  lastSuggestionAt: number | null;
  setLastSuggestionLatencyMs: (ms: number) => void;
  setLastChatFirstTokenMs: (ms: number) => void;
  isWaitingForTranscriptFlush: boolean;
  setIsWaitingForTranscriptFlush: (v: boolean) => void;

  resetSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: uid("sess-"),
  startedAt: Date.now(),

  transcriptChunks: [],
  addTranscriptChunk: (chunk) =>
    set((s) => ({ transcriptChunks: [...s.transcriptChunks, chunk] })),

  suggestionBatches: [],
  addSuggestionBatch: (batch) =>
    set((s) => ({ suggestionBatches: [...s.suggestionBatches, batch] })),
  isGeneratingSuggestions: false,
  setGeneratingSuggestions: (v) => set({ isGeneratingSuggestions: v }),
  suggestionError: null,
  setSuggestionError: (msg) => set({ suggestionError: msg }),

  chatMessages: [],
  activeSuggestion: null,
  setActiveSuggestion: (s) => set({ activeSuggestion: s }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  appendToMessage: (id, delta) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m
      ),
    })),
  finalizeMessage: (id) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, streaming: false } : m
      ),
    })),
  isChatStreaming: false,
  setChatStreaming: (v) => set({ isChatStreaming: v }),

  isRecording: false,
  setIsRecording: (v) => set({ isRecording: v }),
  recordingToggleSeq: 0,
  requestRecordingToggle: () =>
    set((s) => ({ recordingToggleSeq: s.recordingToggleSeq + 1 })),
  transcriptFlushSeq: 0,
  requestTranscriptFlush: () =>
    set((s) => ({ transcriptFlushSeq: s.transcriptFlushSeq + 1 })),

  lastSuggestionLatencyMs: null,
  lastChatFirstTokenMs: null,
  lastSuggestionAt: null,
  setLastSuggestionLatencyMs: (ms) =>
    set({ lastSuggestionLatencyMs: ms, lastSuggestionAt: Date.now() }),
  setLastChatFirstTokenMs: (ms) => set({ lastChatFirstTokenMs: ms }),
  isWaitingForTranscriptFlush: false,
  setIsWaitingForTranscriptFlush: (v) => set({ isWaitingForTranscriptFlush: v }),

  resetSession: () =>
    set({
      sessionId: uid("sess-"),
      startedAt: Date.now(),
      transcriptChunks: [],
      suggestionBatches: [],
      chatMessages: [],
      activeSuggestion: null,
      suggestionError: null,
      isGeneratingSuggestions: false,
      isChatStreaming: false,
      isRecording: false,
      recordingToggleSeq: 0,
      transcriptFlushSeq: 0,
      lastSuggestionLatencyMs: null,
      lastChatFirstTokenMs: null,
      lastSuggestionAt: null,
      isWaitingForTranscriptFlush: false,
    }),
}));
