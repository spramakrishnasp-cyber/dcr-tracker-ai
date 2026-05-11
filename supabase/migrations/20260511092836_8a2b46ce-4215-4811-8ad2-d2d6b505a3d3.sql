
-- WhatsApp number on profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- App settings (single row, key=value-ish)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_webhook_url text,
  reminder_morning_enabled boolean NOT NULL DEFAULT true,
  reminder_evening_before_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings viewable by authenticated" ON public.app_settings;
CREATE POLICY "Settings viewable by authenticated" ON public.app_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Authenticated manage settings" ON public.app_settings;
CREATE POLICY "Authenticated manage settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_app_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed one row
INSERT INTO public.app_settings (id) SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Reminders sent log to dedupe
CREATE TABLE IF NOT EXISTS public.reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  kind text NOT NULL, -- 'evening_before' | 'morning_of'
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id, kind)
);
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reminder log viewable" ON public.reminder_log FOR SELECT TO authenticated USING (true);
