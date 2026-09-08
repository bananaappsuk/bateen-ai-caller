-- Per-user cloned voices (Retell "Clone Voice").
--
-- Retell clones live on the single shared platform account, so /list-voices
-- returns every tenant's clone to everyone. This table records which clone
-- belongs to which user so the list-agent-voices edge function can return the
-- stock voices plus only the caller's own.
--
-- Verified against the live Retell API (2026-09-07):
--   POST https://api.retellai.com/clone-voice  (multipart: files, voice_name,
--   voice_provider) -> { voice_id: "custom_voice_<hash>", voice_type: "custom",
--   voice_name, provider, avatar_url, preview_audio_url }
-- Stock voices come back from /list-voices as voice_type "standard"; clones as
-- "custom". Retell has NO delete-voice endpoint, so removal here is a local
-- hide only — the clone itself persists on the Retell account.
CREATE TABLE IF NOT EXISTS public.custom_voices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  retell_voice_id   text NOT NULL UNIQUE,
  voice_name        text NOT NULL,
  provider          text NOT NULL DEFAULT 'platform',
  preview_audio_url text,
  avatar_url        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_voices_user_id_idx ON public.custom_voices(user_id);

ALTER TABLE public.custom_voices ENABLE ROW LEVEL SECURITY;

-- Owners can read and rename/remove their own voices. Inserts happen only in
-- the clone-voice edge function (service role), after Retell confirms the
-- clone, so a client can never claim a voice id it doesn't own.
DROP POLICY IF EXISTS "custom_voices_select_own" ON public.custom_voices;
CREATE POLICY "custom_voices_select_own" ON public.custom_voices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_voices_update_own" ON public.custom_voices;
CREATE POLICY "custom_voices_update_own" ON public.custom_voices
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "custom_voices_delete_own" ON public.custom_voices;
CREATE POLICY "custom_voices_delete_own" ON public.custom_voices
  FOR DELETE USING (auth.uid() = user_id);
