import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, MessageCircle, Send } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, profile, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [whatsapp, setWhatsapp] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("whatsapp_number").eq("id", user.id).maybeSingle()
        .then(({ data }) => setWhatsapp((data as any)?.whatsapp_number || ""));
    }
  }, [user]);

  const { data: settings } = useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [webhook, setWebhook] = useState("");
  const [morningOn, setMorningOn] = useState(true);
  const [eveningOn, setEveningOn] = useState(true);
  const [savingApp, setSavingApp] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setWebhook(settings.whatsapp_webhook_url || "");
      setMorningOn(!!settings.reminder_morning_enabled);
      setEveningOn(!!settings.reminder_evening_before_enabled);
    }
  }, [settings]);

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ whatsapp_number: whatsapp || null }).eq("id", user.id);
    setSavingProfile(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  }

  async function saveAppSettings() {
    if (!settings?.id) { toast.error("Settings row missing"); return; }
    setSavingApp(true);
    const { error } = await supabase.from("app_settings").update({
      whatsapp_webhook_url: webhook || null,
      reminder_morning_enabled: morningOn,
      reminder_evening_before_enabled: eveningOn,
      updated_by: user?.id,
    }).eq("id", settings.id);
    setSavingApp(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Reminder settings saved");
    qc.invalidateQueries({ queryKey: ["app_settings"] });
  }

  async function sendTest() {
    if (!webhook) { toast.error("Save a webhook URL first"); return; }
    setTesting(true);
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          employee_name: profile?.full_name || "Test Employee",
          customer_name: "Sample Customer (Sample Co)",
          next_follow_up: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          call_date: new Date().toISOString().split("T")[0],
          message: "This is a test reminder message from the follow-up system.",
          whatsapp_number: whatsapp || "+1234567890",
        }),
      });
      toast.success("Test payload sent. Check your Zap/automation history.");
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and reminder preferences.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Profile</h2>
          <p className="text-sm text-muted-foreground">Your WhatsApp number is used to receive follow-up reminders.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={profile?.full_name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ""} disabled />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="wa">WhatsApp Mobile Number</Label>
            <Input
              id="wa"
              placeholder="+91 98765 43210"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use international format (with country code).</p>
          </div>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save profile
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium">Follow-up Reminders (WhatsApp)</h2>
          <p className="text-sm text-muted-foreground">
            Reminders are sent automatically through a webhook (Zapier / Make / n8n) that posts to WhatsApp.
            Each employee receives reminders for their own follow-ups.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hook">Webhook URL</Label>
          <Input
            id="hook"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            We POST JSON: <code>{`{ employee_name, customer_name, next_follow_up, call_date, message, whatsapp_number }`}</code>
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-medium text-sm">Evening before (6 PM)</div>
            <div className="text-xs text-muted-foreground">Heads-up the day before the follow-up</div>
          </div>
          <Switch checked={eveningOn} onCheckedChange={setEveningOn} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="font-medium text-sm">Morning of (9 AM)</div>
            <div className="text-xs text-muted-foreground">Reminder on the follow-up day</div>
          </div>
          <Switch checked={morningOn} onCheckedChange={setMorningOn} />
        </div>

        <div className="flex gap-2">
          <Button onClick={saveAppSettings} disabled={savingApp}>
            {savingApp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save reminders
          </Button>
          <Button variant="outline" onClick={sendTest} disabled={testing || !webhook}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send test payload
          </Button>
        </div>
        {!isAdmin && (
          <p className="text-xs text-muted-foreground">Tip: any employee can update these settings.</p>
        )}
      </Card>
    </div>
  );
}
