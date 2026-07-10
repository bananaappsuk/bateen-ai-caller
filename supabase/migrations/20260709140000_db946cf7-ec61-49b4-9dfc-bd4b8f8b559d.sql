
-- Supports Campaign Monitoring: retrying a failed campaign needs the
-- original parsed lead list (Retell has no "resend" for a batch call, so a
-- retry re-submits a brand new create-batch-call with the same tasks).
-- calls_completed/finished_at are updated by the monitoring poll every time
-- it observes a change from Retell's list-batch-call response.
ALTER TABLE public.campaigns
  ADD COLUMN leads jsonb,
  ADD COLUMN calls_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN finished_at timestamptz;
