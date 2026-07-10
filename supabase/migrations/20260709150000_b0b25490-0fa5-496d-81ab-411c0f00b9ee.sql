
-- Extends the existing calls table (rather than adding a new one) for Call
-- History. campaign_id is filled in best-effort during sync by matching a
-- call's from/to numbers against a campaign's phone number + lead list,
-- since Retell's call objects don't carry a batch_call_id back to us.
ALTER TABLE public.calls
  ADD COLUMN lead_name text,
  ADD COLUMN campaign_id uuid REFERENCES public.campaigns(campaign_id) ON DELETE SET NULL,
  ADD COLUMN started_at timestamptz,
  ADD COLUMN ended_at timestamptz,
  ADD COLUMN duration_ms integer,
  ADD COLUMN cost_cents numeric,
  ADD COLUMN recording_url text,
  ADD COLUMN has_transcript boolean NOT NULL DEFAULT false;

CREATE INDEX calls_campaign_id_idx ON public.calls (campaign_id);
CREATE INDEX calls_started_at_idx ON public.calls (started_at DESC);
