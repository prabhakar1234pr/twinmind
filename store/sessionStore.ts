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

  // Prefetch cache: suggestion ID → full answer text (empty string = still loading)
  prefetchedAnswers: Record<string, string>;
  prefetchingIds: string[];
  setPrefetchedAnswer: (id: string, content: string) => void;
  addPrefetchingId: (id: string) => void;
  removePrefetchingId: (id: string) => void;

  chatMessages: ChatMessage[];
  activeSuggestion: Suggestion | null;
  setActiveSuggestion: (s: Suggestion | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  appendToMessage: (id: string, delta: string) => void;
  finalizeMessage: (id: string) => void;
  isChatStreaming: boolean;
  setChatStreaming: (v: boolean) => void;

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

  prefetchedAnswers: {},
  prefetchingIds: [],
  setPrefetchedAnswer: (id, content) =>
    set((s) => ({ prefetchedAnswers: { ...s.prefetchedAnswers, [id]: content } })),
  addPrefetchingId: (id) =>
    set((s) => ({ prefetchingIds: [...s.prefetchingIds, id] })),
  removePrefetchingId: (id) =>
    set((s) => ({ prefetchingIds: s.prefetchingIds.filter((x) => x !== id) })),

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
      prefetchedAnswers: {},
      prefetchingIds: [],
    }),
}));
