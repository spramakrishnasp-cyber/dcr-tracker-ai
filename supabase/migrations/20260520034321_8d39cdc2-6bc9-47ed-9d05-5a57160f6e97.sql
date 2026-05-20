
-- Grant all authenticated users full permissions across user data tables

-- customers: allow anyone authenticated to delete/update
DROP POLICY IF EXISTS "Owners or admins delete customers" ON public.customers;
DROP POLICY IF EXISTS "Owners or admins update customers" ON public.customers;

CREATE POLICY "Authenticated can delete customers"
ON public.customers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can update customers"
ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- profiles: allow delete + open update
CREATE POLICY "Authenticated can delete profiles"
ON public.profiles FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Authenticated can update profiles"
ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- reminder_log: allow all
CREATE POLICY "Authenticated can insert reminder_log"
ON public.reminder_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update reminder_log"
ON public.reminder_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete reminder_log"
ON public.reminder_log FOR DELETE TO authenticated USING (true);
