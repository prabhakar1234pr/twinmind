"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSessionStore } from "@/store/sessionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { API_KEY_HEADER } from "@/lib/groq";

const SAVE_DEBOUNCE_MS = 5000; // save 5s after last change

export function useAutoSave(dbSessionId: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const supabase = createClient();

  const scheduleSave = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const { transcriptChunks, suggestionBatches, chatMessages, startedAt } =
        useSessionStore.getState();
      const { apiKey } = useSettingsStore.getState();

      if (!dbSessionId || !apiKey) return;

      const durationSec = Math.floor((Date.now() - startedAt) / 1000);
      const title = transcriptChunks[0]?.text
        ? transcriptChunks[0].text.slice(0, 60) + (transcriptChunks[0].text.length > 60 ? "…" : "")
        : `Session ${new Date().toLocaleTimeString()}`;

      fetch(`/api/sessions/${dbSessionId}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [API_KEY_HEADER]: apiKey,
        },
        body: JSON.stringify({
          title,
          transcript: transcriptChunks,
          suggestionBatches,
          chatMessages,
          durationSec,
        }),
      }).catch(console.error);
    }, SAVE_DEBOUNCE_MS);
  }, [dbSessionId]);

  // Subscribe to store changes and trigger save
  useEffect(() => {
    const unsub = useSessionStore.subscribe(() => {
      scheduleSave();
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [scheduleSave]);
}

export async function createDbSession(title?: string): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("sessions")
    .insert({ user_id: user.id, title: title ?? `Session ${new Date().toLocaleTimeString()}` })
    .select("id")
    .single();

  return data?.id ?? null;
}
