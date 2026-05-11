
DROP POLICY IF EXISTS "Owners or admins update expenses" ON public.travelling_expenses;
DROP POLICY IF EXISTS "Owners or admins delete expenses" ON public.travelling_expenses;

CREATE POLICY "Authenticated can update expenses"
ON public.travelling_expenses
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete expenses"
ON public.travelling_expenses
FOR DELETE TO authenticated
USING (true);
