
-- Call Details needs the full transcript text persisted (not just the
-- has_transcript flag used by the Call History list), plus the call
-- summary so the detail page doesn't have to hit Retell on every view.
ALTER TABLE public.calls
  ADD COLUMN transcript text,
  ADD COLUMN summary text;
