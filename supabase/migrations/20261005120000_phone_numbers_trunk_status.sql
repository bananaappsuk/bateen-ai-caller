-- Records whether a number is actually reachable, not just known to us.
--
-- A number only receives calls if it is ON the Twilio Elastic SIP Trunk.
-- Existing in Retell is not enough -- +447576545787 was in Retell for weeks
-- and still rejected calls until it was added to the trunk. The Numbers page
-- let anyone type any UK number, so an unreachable one could be pointed at an
-- agent and look configured while never ringing.
--
-- NULL means "not verified": we could not ask Twilio, so we do not claim
-- either way. TRUE/FALSE are only written by sync-phone-numbers when Twilio
-- credentials are configured.
ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS on_trunk boolean,
  ADD COLUMN IF NOT EXISTS trunk_checked_at timestamptz;

COMMENT ON COLUMN public.phone_numbers.on_trunk IS
  'True when Twilio reports this number on the SIP trunk. NULL = never verified.';
