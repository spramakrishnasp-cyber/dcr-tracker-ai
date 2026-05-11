import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers } from "@/lib/queries";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, User, ClipboardList, Wallet, MapPin, Save, X } from "lucide-react";

export const Route = createFileRoute("/_app/reports/new")({
  component: NewReport,
});

const meetingTypes = ["Physical Meeting", "Phone Call", "Video Call", "Follow-up"] as const;
const orderStatuses = ["Interested", "Trial Required", "Follow-up Needed", "Order Confirmed", "No Response"] as const;

function NewReport() {
  const { user } = useAuth();
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_id: "",
    call_date: format(new Date(), "yyyy-MM-dd"),
    call_time: format(new Date(), "HH:mm"),
    meeting_type: "Physical Meeting" as (typeof meetingTypes)[number],
    product_discussed: "",
    discussion: "",
    order_status: "Interested" as (typeof orderStatuses)[number],
    meeting_outcome: "",
    next_follow_up: "",
    location: "",
    daily_allowance: "",
    kilometers_travelled: "",
    ta_per_km: "",
    lodging_expense: "",
    travel_fare: "",
    other_expense: "",
    other_expense_note: "",
  });

  const num = (v: string) => (v === "" ? 0 : Number(v) || 0);
  const kmAmount = num(form.kilometers_travelled) * num(form.ta_per_km);
  const totalExpense =
    num(form.daily_allowance) +
    kmAmount +
    num(form.lodging_expense) +
    num(form.travel_fare) +
    num(form.other_expense);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("call_reports").insert({
        user_id: user!.id,
        customer_id: form.customer_id || null,
        call_date: form.call_date,
        call_time: form.call_time,
        meeting_type: form.meeting_type,
        product_discussed: form.product_discussed || null,
        discussion: form.discussion || null,
        order_status: form.order_status,
        meeting_outcome: form.meeting_outcome || null,
        next_follow_up: form.next_follow_up || null,
        location: form.location || null,
        daily_allowance: num(form.daily_allowance),
        kilometers_travelled: num(form.kilometers_travelled),
        ta_per_km: num(form.ta_per_km),
        lodging_expense: num(form.lodging_expense),
        travel_fare: num(form.travel_fare),
        other_expense: num(form.other_expense),
        other_expense_note: form.other_expense_note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report saved");
      qc.invalidateQueries({ queryKey: ["reports"] });
      navigate({ to: "/reports" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function captureLocation() {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, location: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}` }),
      () => toast.error("Could not get location"),
    );
  }

  const selectedCustomer = customers.find((c) => c.id === form.customer_id);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      className="max-w-5xl mx-auto pb-24"
    >
      {/* Salesforce-style sticky header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-5 bg-card border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Call Report</div>
            <h1 className="text-base md:text-lg font-semibold truncate">
              {selectedCustomer ? selectedCustomer.customer_name : "New Call Report"}
            </h1>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate({ to: "/reports" })}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button type="submit" size="sm" disabled={save.isPending || !form.customer_id}>
            <Save className="h-4 w-4 mr-1" /> {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-5 px-1">
        <Section icon={<CalendarClock className="h-4 w-4" />} title="Call Information">
          <Field label="Date *">
            <Input type="date" required value={form.call_date} onChange={(e) => setForm({ ...form, call_date: e.target.value })} />
          </Field>
          <Field label="Time *">
            <Input type="time" required value={form.call_time} onChange={(e) => setForm({ ...form, call_time: e.target.value })} />
          </Field>
          <Field label="Meeting Type *">
            <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v as typeof form.meeting_type })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {meetingTypes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Order Status *">
            <Select value={form.order_status} onValueChange={(v) => setForm({ ...form, order_status: v as typeof form.order_status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {orderStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <Section icon={<User className="h-4 w-4" />} title="Customer & Discussion">
          <Field label="Customer *" full>
            <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
              <SelectContent>
                {customers.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">Add customers first</div>}
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.customer_name}{c.company_name ? ` — ${c.company_name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Product Discussed">
            <Input value={form.product_discussed} onChange={(e) => setForm({ ...form, product_discussed: e.target.value })} />
          </Field>
          <Field label="Meeting Outcome">
            <Input value={form.meeting_outcome} onChange={(e) => setForm({ ...form, meeting_outcome: e.target.value })} />
          </Field>
          <Field label="Discussion / Remarks" full>
            <Textarea rows={4} value={form.discussion} onChange={(e) => setForm({ ...form, discussion: e.target.value })} />
          </Field>
          <Field label="Next Follow-up">
            <Input type="date" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} />
          </Field>
          <Field label="Location (GPS / address)">
            <div className="flex gap-2">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="lat, lng or address" />
              <Button type="button" variant="outline" size="icon" onClick={captureLocation}><MapPin className="h-4 w-4" /></Button>
            </div>
          </Field>
        </Section>

        <Section icon={<Wallet className="h-4 w-4" />} title="Travelling Expenses">
          <Field label="Daily Allowance">
            <Input type="number" min="0" step="0.01" value={form.daily_allowance} onChange={(e) => setForm({ ...form, daily_allowance: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Kilometers Travelled">
            <Input type="number" min="0" step="0.01" value={form.kilometers_travelled} onChange={(e) => setForm({ ...form, kilometers_travelled: e.target.value })} placeholder="0" />
          </Field>
          <Field label="TA per Kilometer">
            <Input type="number" min="0" step="0.01" value={form.ta_per_km} onChange={(e) => setForm({ ...form, ta_per_km: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Travel Allowance (auto)">
            <Input value={kmAmount.toFixed(2)} readOnly className="bg-muted/50" />
          </Field>
          <Field label="Lodging">
            <Input type="number" min="0" step="0.01" value={form.lodging_expense} onChange={(e) => setForm({ ...form, lodging_expense: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Train / Air Fare">
            <Input type="number" min="0" step="0.01" value={form.travel_fare} onChange={(e) => setForm({ ...form, travel_fare: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Other Expenses">
            <Input type="number" min="0" step="0.01" value={form.other_expense} onChange={(e) => setForm({ ...form, other_expense: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Other Expenses Note">
            <Input value={form.other_expense_note} onChange={(e) => setForm({ ...form, other_expense_note: e.target.value })} placeholder="Description" />
          </Field>
          <div className="md:col-span-2 flex justify-end mt-2">
            <div className="rounded-md border border-border bg-muted/40 px-4 py-2 text-sm">
              <span className="text-muted-foreground mr-2">Total Expense:</span>
              <span className="font-semibold tabular-nums">{totalExpense.toFixed(2)}</span>
            </div>
          </div>
        </Section>
      </div>
    </form>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <div className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-muted/40 border-b border-border">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {children}
      </div>
    </Card>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}