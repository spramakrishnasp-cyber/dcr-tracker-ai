import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, type CallReport } from "@/lib/queries";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, User, ClipboardList, MapPin, Save, X, Check, ChevronsUpDown, Plus } from "lucide-react";

const meetingTypes = ["Physical Meeting", "Phone Call", "Video Call", "Follow-up"] as const;
const orderStatuses = ["Interested", "Trial Required", "Follow-up Needed", "Order Confirmed", "No Response"] as const;

export function CallReportForm({ existing }: { existing?: CallReport }) {
  const { user } = useAuth();
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isEdit = !!existing;
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const [form, setForm] = useState({
    customer_id: existing?.customer_id ?? "",
    call_date: existing?.call_date ?? format(new Date(), "yyyy-MM-dd"),
    call_time: existing?.call_time?.slice(0, 5) ?? format(new Date(), "HH:mm"),
    meeting_type: (existing?.meeting_type ?? "Physical Meeting") as (typeof meetingTypes)[number],
    product_discussed: existing?.product_discussed ?? "",
    discussion: existing?.discussion ?? "",
    order_status: (existing?.order_status ?? "Interested") as (typeof orderStatuses)[number],
    meeting_outcome: existing?.meeting_outcome ?? "",
    next_follow_up: existing?.next_follow_up ?? "",
    next_follow_up_time: existing?.next_follow_up_time?.slice(0, 5) ?? "",
    location: existing?.location ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        customer_id: form.customer_id || null,
        call_date: form.call_date,
        call_time: form.call_time,
        meeting_type: form.meeting_type,
        product_discussed: form.product_discussed || null,
        discussion: form.discussion || null,
        order_status: form.order_status,
        meeting_outcome: form.meeting_outcome || null,
        next_follow_up: form.next_follow_up || null,
        next_follow_up_time: form.next_follow_up ? (form.next_follow_up_time || null) : null,
        location: form.location || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("call_reports").update(payload).eq("id", existing!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("call_reports").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }

      // Fire follow-up webhook when a follow-up date is set
      if (form.next_follow_up) {
        try {
          const customer = customers.find((c) => c.id === form.customer_id);
          const followUpTime = form.next_follow_up_time || "09:00";
          await fetch("https://hook.eu1.make.com/wyajdhgby9bus2a3e4eaeqb8ktuddesa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerName: customer?.customer_name ?? "",
              followUpDateTime: `${form.next_follow_up}T${followUpTime}`,
              notes: form.discussion || form.meeting_outcome || "",
              phone: customer?.mobile ?? "",
            }),
          });
        } catch (e) {
          console.error("Follow-up webhook failed", e);
        }
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Report updated" : "Report saved");
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
      <div className="sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-5 bg-card border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Call Report</div>
            <h1 className="text-base md:text-lg font-semibold truncate">
              {selectedCustomer ? selectedCustomer.customer_name : (isEdit ? "Edit Call Report" : "New Call Report")}
            </h1>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate({ to: "/reports" })}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button type="submit" size="sm" disabled={save.isPending || !form.customer_id}>
            <Save className="h-4 w-4 mr-1" /> {save.isPending ? "Saving…" : isEdit ? "Update" : "Save"}
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
            <Popover open={customerPickerOpen} onOpenChange={setCustomerPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerPickerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedCustomer
                    ? `${selectedCustomer.customer_name}${selectedCustomer.company_name ? ` — ${selectedCustomer.company_name}` : ""}`
                    : "Select a customer"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <Command>
                  <CommandInput placeholder="Search customers..." />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-2 text-sm text-muted-foreground">
                        No customer found.
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.customer_name} ${c.company_name ?? ""} ${c.mobile ?? ""} ${c.city ?? ""}`}
                          onSelect={() => {
                            setForm({ ...form, customer_id: c.id });
                            setCustomerPickerOpen(false);
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${form.customer_id === c.id ? "opacity-100" : "opacity-0"}`} />
                          <span>{c.customer_name}{c.company_name ? ` — ${c.company_name}` : ""}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                <div className="border-t border-border p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setCustomerPickerOpen(false);
                      setNewCustomerOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add new customer
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>New Customer</DialogTitle>
                </DialogHeader>
                <QuickCustomerForm
                  onCreated={(id) => {
                    setForm((f) => ({ ...f, customer_id: id }));
                    setNewCustomerOpen(false);
                  }}
                  onCancel={() => setNewCustomerOpen(false)}
                />
              </DialogContent>
            </Dialog>
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
          <Field label="Follow-up Time">
            <Input
              type="time"
              value={form.next_follow_up_time}
              onChange={(e) => setForm({ ...form, next_follow_up_time: e.target.value })}
              disabled={!form.next_follow_up}
            />
          </Field>
          <Field label="Location (GPS / address)">
            <div className="flex gap-2">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="lat, lng or address" />
              <Button type="button" variant="outline" size="icon" onClick={captureLocation}><MapPin className="h-4 w-4" /></Button>
            </div>
          </Field>
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