// Custom (cloned) voices.
//
// Voice listing goes through the list-agent-voices edge function rather than
// Retell's /list-voices directly: all tenants share one Retell account, so the
// raw list contains every tenant's clone. The function returns the stock voices
// plus only this user's own.
import { supabase } from "@/integrations/supabase/client";
import type { RetellVoice } from "@/services/retellService";

export interface CustomVoiceRow {
  id: string;
  retell_voice_id: string;
  voice_name: string;
  provider: string;
  preview_audio_url: string | null;
  created_at: string;
}

export interface ClonedVoice {
  voice_id: string;
  voice_name: string;
  provider: string;
  preview_audio_url: string | null;
}

function messageFrom(error: unknown, data: unknown, fallback: string): string {
  const fromData = (data as { error?: string } | null)?.error;
  if (fromData) return fromData;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Stock Retell voices plus this user's own clones. */
export async function listAgentVoices(): Promise<RetellVoice[]> {
  const { data, error } = await supabase.functions.invoke<RetellVoice[] | { error: string }>(
    "list-agent-voices",
    { body: {} },
  );
  if (error) throw new Error(messageFrom(error, data, "Could not load voices."));
  if (!Array.isArray(data)) throw new Error(messageFrom(null, data, "Could not load voices."));
  return data;
}

/** Clone a voice from a wav/mp3/m4a recording. */
export async function cloneVoice(file: File, voiceName: string): Promise<ClonedVoice> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("voice_name", voiceName);
  const { data, error } = await supabase.functions.invoke<ClonedVoice & { error?: string }>(
    "clone-voice",
    { body: form },
  );
  if (error || !data?.voice_id) throw new Error(messageFrom(error, data, "Voice cloning failed."));
  return data;
}

/** This user's cloned voices (for the management list). */
export async function listMyVoices(): Promise<CustomVoiceRow[]> {
  const { data, error } = await supabase
    .from("custom_voices")
    .select("id, retell_voice_id, voice_name, provider, preview_audio_url, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomVoiceRow[];
}

/**
 * Remove a voice from this account's list. Retell has no delete-voice endpoint,
 * so the clone still exists upstream — this only hides it from the picker.
 */
export async function removeMyVoice(id: string): Promise<void> {
  const { error } = await supabase.from("custom_voices").delete().eq("id", id);
  if (error) throw error;
}
