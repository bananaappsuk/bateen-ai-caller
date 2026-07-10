
-- Agent Synchronization: agents removed in Retell are never deleted locally
-- (campaigns/calls may still reference them historically) — they're flagged
-- instead, so the UI can warn and exclude them from new assignments.
ALTER TABLE public.agents
  ADD COLUMN deleted_in_retell boolean NOT NULL DEFAULT false;

CREATE INDEX agents_deleted_in_retell_idx ON public.agents (deleted_in_retell);
