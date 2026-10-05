-- Lets an agent be backed by a conversation flow instead of a single prompt.
--
-- Retell's inbound webhook fires on the ring, before the caller has spoken, so
-- the answering agent can only be chosen by which number was dialled. Switching
-- by what the caller actually wants therefore has to happen inside the agent --
-- that is what a conversation flow is: states with their own instructions and
-- plain-English conditions for moving between them.
--
-- Stored locally so the agents list can tell the two kinds apart without a
-- round trip to Retell for every row, and so the edit screen knows which
-- editor to open. NULL means the agent is a single-prompt (retell-llm) one,
-- which is every agent that exists today.
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS retell_conversation_flow_id text;

COMMENT ON COLUMN public.agents.retell_conversation_flow_id IS
  'Set when the agent runs a conversation flow. NULL = single-prompt agent.';
