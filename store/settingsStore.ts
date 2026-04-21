"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/lib/settings";
import type { Settings } from "@/types";

interface SettingsStore extends Settings {
  updateSettings: (partial: Partial<Settings>) => void;
  resetPrompts: () => void;
  apiKeyValidationStatus: "unknown" | "validating" | "valid" | "invalid";
  apiKeyValidationMessage: string | null;
  apiKeyValidatedFor: string | null;
  setApiKeyValidation: (args: {
    status: "unknown" | "validating" | "valid" | "invalid";
    message?: string | null;
    validatedFor?: string | null;
  }) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      apiKeyValidationStatus: "unknown",
      apiKeyValidationMessage: null,
      apiKeyValidatedFor: null,
      updateSettings: (partial) =>
        set((state) => {
          const next: Partial<SettingsStore> = { ...partial };
          if (
            typeof partial.apiKey === "string" &&
            partial.apiKey !== state.apiKey
          ) {
            next.apiKeyValidationStatus = "unknown";
            next.apiKeyValidationMessage = null;
            next.apiKeyValidatedFor = null;
          }
          return next as SettingsStore;
        }),
      resetPrompts: () =>
        set({
          suggestionPrompt: DEFAULT_SETTINGS.suggestionPrompt,
          chatSystemPrompt: DEFAULT_SETTINGS.chatSystemPrompt,
          expansionPrompt: DEFAULT_SETTINGS.expansionPrompt,
        }),
      setApiKeyValidation: ({ status, message = null, validatedFor = null }) =>
        set({
          apiKeyValidationStatus: status,
          apiKeyValidationMessage: message,
          apiKeyValidatedFor: validatedFor,
        }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      // Bump when Settings shape changes so stale localStorage gets replaced.
      version: 9,
    }
  )
);
