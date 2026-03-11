
-- Rate limit: max 3 submissions per email per hour
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM contact_submissions
  WHERE email = NEW.email
    AND created_at > now() - interval '1 hour';

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER contact_rate_limit_trigger
  BEFORE INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_contact_rate_limit();
