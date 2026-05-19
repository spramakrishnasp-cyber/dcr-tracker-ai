
ALTER TABLE public.call_reports
  ADD COLUMN IF NOT EXISTS next_follow_up_time time without time zone;

ALTER TABLE public.travelling_expenses
  ADD COLUMN IF NOT EXISTS lodging_receipt_url text,
  ADD COLUMN IF NOT EXISTS travel_fare_receipt_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can view receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'expense-receipts');

CREATE POLICY "Users upload receipts in own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own receipts"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expense-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
