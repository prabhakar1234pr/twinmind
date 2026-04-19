"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/lib/settings";
import type { Settings } from "@/types";

interface SettingsStore extends Settings {
  updateSettings: (partial: Partial<Settings>) => void;
  resetPrompts: () => void;
  hasApiKey: () => boolean;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,
      updateSettings: (partial) => set(partial),
      resetPrompts: () =>
        set({
          suggestionPrompt: DEFAULT_SETTINGS.suggestionPrompt,
          chatSystemPrompt: DEFAULT_SETTINGS.chatSystemPrompt,
          expansionPrompt: DEFAULT_SETTINGS.expansionPrompt,
        }),
      hasApiKey: () => get().apiKey.trim().length > 0,
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      // Bump when Settings shape changes so stale localStorage gets replaced.
      version: 5,
    }
  )
);
