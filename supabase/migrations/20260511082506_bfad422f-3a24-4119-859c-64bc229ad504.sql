CREATE TABLE public.travelling_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily_allowance NUMERIC NOT NULL DEFAULT 0,
  kilometers_travelled NUMERIC NOT NULL DEFAULT 0,
  ta_per_km NUMERIC NOT NULL DEFAULT 0,
  lodging_expense NUMERIC NOT NULL DEFAULT 0,
  travel_fare NUMERIC NOT NULL DEFAULT 0,
  other_expense NUMERIC NOT NULL DEFAULT 0,
  other_expense_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.travelling_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expenses viewable by authenticated"
ON public.travelling_expenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert their own expenses"
ON public.travelling_expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners or admins update expenses"
ON public.travelling_expenses FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners or admins delete expenses"
ON public.travelling_expenses FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_travelling_expenses_updated_at
BEFORE UPDATE ON public.travelling_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_travelling_expenses_user_date ON public.travelling_expenses(user_id, expense_date DESC);