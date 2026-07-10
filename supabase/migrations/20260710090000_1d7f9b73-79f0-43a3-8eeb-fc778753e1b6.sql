
-- The original agents migration granted DELETE at the table level but never
-- added a matching RLS policy, so every delete silently affected zero rows
-- regardless of caller — including stale agent rows pointing at agents
-- already removed in Retell, which blocked cleanup entirely.
CREATE POLICY "Public can delete agents" ON public.agents FOR DELETE USING (true);
