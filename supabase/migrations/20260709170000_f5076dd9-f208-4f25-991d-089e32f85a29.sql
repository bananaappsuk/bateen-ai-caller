
-- Append-only audit log for every inbound Retell webhook delivery, plus the
-- logical sub-events derived from it (transcript_ready, recording_ready,
-- summary_ready, voicemail, failed — Retell itself only emits
-- call_started/call_ended/call_analyzed; see supabase/functions/retell-webhook
-- for the mapping). Never deduplicated — idempotency lives in the calls-row
-- upsert, not in this log, so "log every event" stays literally true even
-- across webhook redeliveries.
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retell_call_id text,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'processed',
  payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webhook_events_call_id_idx ON public.webhook_events (retell_call_id);
CREATE INDEX webhook_events_created_at_idx ON public.webhook_events (created_at DESC);

GRANT SELECT ON public.webhook_events TO anon, authenticated;
GRANT ALL ON public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view webhook_events" ON public.webhook_events FOR SELECT USING (true);
-- No public INSERT policy: only the webhook edge function writes here,
-- using the service-role key, which bypasses RLS entirely.

-- Real-time Call History: let the frontend subscribe to calls table changes
-- instead of relying only on polling. REPLICA IDENTITY FULL so UPDATE
-- payloads carry the whole row, not just the primary key.
ALTER TABLE public.calls REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
  END IF;
END $$;
