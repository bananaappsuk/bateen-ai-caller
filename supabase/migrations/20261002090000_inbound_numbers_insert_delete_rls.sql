-- inbound_numbers was created with SELECT and UPDATE policies only, but the
-- Numbers page inserts and deletes rows straight from the browser. With RLS on
-- and no policy for those two commands, adding a number failed outright
-- ("new row violates row-level security policy") and deleting one silently did
-- nothing: Postgres filtered the row out, deleted zero rows, and still returned
-- 204, so the UI reported success while the row stayed in the table.
--
-- Both are owner-scoped, matching the SELECT and UPDATE policies already here.
-- The WITH CHECK on insert is what stops a client writing a row owned by
-- somebody else.
DROP POLICY IF EXISTS "inbound_numbers_insert_own" ON public.inbound_numbers;
CREATE POLICY "inbound_numbers_insert_own" ON public.inbound_numbers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "inbound_numbers_delete_own" ON public.inbound_numbers;
CREATE POLICY "inbound_numbers_delete_own" ON public.inbound_numbers
  FOR DELETE USING (auth.uid() = user_id);
