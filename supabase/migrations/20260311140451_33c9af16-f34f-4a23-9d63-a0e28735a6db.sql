
-- Fix: Convert RESTRICTIVE policies to PERMISSIVE and restrict SELECT to service_role only

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anonymous inserts" ON contact_submissions;
DROP POLICY IF EXISTS "Allow authenticated reads" ON contact_submissions;

-- Recreate INSERT as PERMISSIVE for anon and authenticated
CREATE POLICY "Allow public inserts"
  ON contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
