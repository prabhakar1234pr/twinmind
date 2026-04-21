"use client";

import { API_KEY_HEADER } from "@/lib/groq";
import { fetchWithTimeout, parseApiErrorMessage } from "@/lib/http";
import { createLogger } from "@/lib/logger";
import { useSettingsStore } from "@/store/settingsStore";

interface ValidationResult {
  ok: boolean;
  status: number;
  message: string;
}

const log = createLogger("lib:apiKeyValidation");

export async function ensureValidApiKey(): Promise<ValidationResult> {
  const state = useSettingsStore.getState();
  const key = state.apiKey.trim();
  log.debug("ensureValidApiKey called", {
    hasKey: key.length > 0,
    cachedStatus: state.apiKeyValidationStatus,
    cachedForCurrentKey: state.apiKeyValidatedFor === key,
  });

  if (
    state.apiKeyValidationStatus === "valid" &&
    state.apiKeyValidatedFor === key &&
    key.length > 0
  ) {
    log.debug("using cached valid api key status");
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
    log.debug("using cached invalid api key status");
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
    log.info("calling /api/key-test");
    const res = await fetchWithTimeout("/api/key-test", {
      method: "POST",
      headers: key ? { [API_KEY_HEADER]: key } : {},
      timeoutMs: 10_000,
    });

    if (!res.ok) {
      const msg = await parseApiErrorMessage(res, "API key test failed.");
      const full = `HTTP ${res.status}: ${msg}`;
      log.warn("api key test failed", { status: res.status, message: msg });
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
    log.info("api key test succeeded");
    return { ok: true, status: 200, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "API key test failed.";
    log.error("api key test threw error", { message: msg });
    useSettingsStore.getState().setApiKeyValidation({
      status: "invalid",
      message: msg,
      validatedFor: key,
    });
    return { ok: false, status: 500, message: msg };
  }
}

