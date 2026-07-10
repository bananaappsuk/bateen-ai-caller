
-- Dashboard Analytics needs "Average Success Rate" / "Top Performing Agent",
-- which are about whether the agent achieved the call's objective (Retell's
-- call_analysis.call_successful) — distinct from call_status (ended/error),
-- which only says whether the call connected/completed technically.
ALTER TABLE public.calls
  ADD COLUMN call_successful boolean;

CREATE INDEX calls_started_at_status_idx ON public.calls (started_at, status);
