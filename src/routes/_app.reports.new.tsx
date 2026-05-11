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
import { Separator } from "@/components/ui/separator";

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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Call Report</h1>
        <p className="text-sm text-muted-foreground">Log details of your customer interaction</p>
      </div>
      <Card className="p-6">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date *</Label>
              <Input type="date" required value={form.call_date} onChange={(e) => setForm({ ...form, call_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Time *</Label>
              <Input type="time" required value={form.call_time} onChange={(e) => setForm({ ...form, call_time: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Customer *</Label>
            <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger>
              <SelectContent>
                {customers.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">Add customers first</div>}
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.customer_name}{c.company_name ? ` — ${c.company_name}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Meeting Type *</Label>
              <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v as typeof form.meeting_type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Order Status *</Label>
              <Select value={form.order_status} onValueChange={(v) => setForm({ ...form, order_status: v as typeof form.order_status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {orderStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Product Discussed</Label>
            <Input value={form.product_discussed} onChange={(e) => setForm({ ...form, product_discussed: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Discussion / Remarks</Label>
            <Textarea rows={4} value={form.discussion} onChange={(e) => setForm({ ...form, discussion: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Meeting Outcome</Label>
            <Input value={form.meeting_outcome} onChange={(e) => setForm({ ...form, meeting_outcome: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Next Follow-up</Label>
              <Input type="date" value={form.next_follow_up} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location (GPS / address)</Label>
              <div className="flex gap-2">
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="lat, lng or address" />
                <Button type="button" variant="outline" onClick={captureLocation}>📍</Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/reports" })}>Cancel</Button>
            <Button type="submit" disabled={save.isPending || !form.customer_id}>
              {save.isPending ? "Saving…" : "Save Report"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}