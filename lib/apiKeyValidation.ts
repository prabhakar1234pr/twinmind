"use client";

import { API_KEY_HEADER } from "@/lib/groq";
import { fetchWithTimeout, parseApiErrorMessage } from "@/lib/http";
import { useSettingsStore } from "@/store/settingsStore";

interface ValidationResult {
  ok: boolean;
  status: number;
  message: string;
}

export async function ensureValidApiKey(): Promise<ValidationResult> {
  const state = useSettingsStore.getState();
  const key = state.apiKey.trim();

  if (
    state.apiKeyValidationStatus === "valid" &&
    state.apiKeyValidatedFor === key &&
    key.length > 0
  ) {
    return {
      ok: true,
      status: 200,
      message: state.apiKeyValidationMessage ?? "API key valid.",
    };
  }

  if (
    state.apiKeyValidationStatus === "invalid" &&
    state.apiKeyValidatedFor === key &&
    state.apiKeyValidationMessage
  ) {
    return {
      ok: false,
      status: 401,
      message: state.apiKeyValidationMessage,
    };
  }

  state.setApiKeyValidation({
    status: "validating",
    message: null,
    validatedFor: key,
  });

  try {
    const res = await fetchWithTimeout("/api/key-test", {
      method: "POST",
      headers: key ? { [API_KEY_HEADER]: key } : {},
      timeoutMs: 10_000,
    });

    if (!res.ok) {
      const msg = await parseApiErrorMessage(res, "API key test failed.");
      const full = `HTTP ${res.status}: ${msg}`;
      useSettingsStore.getState().setApiKeyValidation({
        status: "invalid",
        message: full,
        validatedFor: key,
      });
      return { ok: false, status: res.status, message: full };
    }

    const payload = (await res.json()) as { message?: unknown };
    const msg =
      typeof payload.message === "string" && payload.message.trim().length > 0
        ? payload.message
        : "API key valid.";
    useSettingsStore.getState().setApiKeyValidation({
      status: "valid",
      message: msg,
      validatedFor: key,
    });
    return { ok: true, status: 200, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "API key test failed.";
    useSettingsStore.getState().setApiKeyValidation({
      status: "invalid",
      message: msg,
      validatedFor: key,
    });
    return { ok: false, status: 500, message: msg };
  }
}

