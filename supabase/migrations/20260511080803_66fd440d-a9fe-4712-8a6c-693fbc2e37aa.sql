
ALTER TABLE public.call_reports
  ADD COLUMN IF NOT EXISTS daily_allowance numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kilometers_travelled numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ta_per_km numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lodging_expense numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS travel_fare numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_expense numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_expense_note text;
