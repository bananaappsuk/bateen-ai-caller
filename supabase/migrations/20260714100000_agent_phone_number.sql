-- Agents need an outbound caller-ID number for the dialer (VocalMax stored this
-- as agent.phoneNumber, resolved at dial time with a Retell list-phone-numbers
-- fallback). Nullable — an agent may be created before a number is assigned.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS phone_number text;
