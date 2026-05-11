-- Relax call_reports update/delete to all authenticated users
DROP POLICY IF EXISTS "Owners or admins update reports" ON public.call_reports;
DROP POLICY IF EXISTS "Owners or admins delete reports" ON public.call_reports;

CREATE POLICY "Authenticated can update reports"
ON public.call_reports FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated can delete reports"
ON public.call_reports FOR DELETE
TO authenticated
USING (true);

-- Travelling expenses: details + itemized other expenses
ALTER TABLE public.travelling_expenses
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS other_expenses_items jsonb NOT NULL DEFAULT '[]'::jsonb;