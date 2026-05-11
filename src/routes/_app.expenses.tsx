import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchExpenses, fetchProfiles, type TravelExpense } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, FileDown, Pencil, Trash2, Wallet, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { exportExpensesPdf } from "@/lib/pdf";

export const Route = createFileRoute("/_app/expenses")({
  component: Expenses,
});

const OTHER_CATEGORIES = ["Mobile bill", "Cab", "Food bill", "Toll charges", "Courier", "Misc"] as const;
type OtherItem = { category: string; amount: string; note: string };

type FormState = {
  expense_date: string;
  details: string;
  daily_allowance: string;
  kilometers_travelled: string;
  ta_per_km: string;
  lodging_expense: string;
  travel_fare: string;
  other_items: OtherItem[];
  notes: string;
};

const empty = (): FormState => ({
  expense_date: format(new Date(), "yyyy-MM-dd"),
  details: "",
  daily_allowance: "",
  kilometers_travelled: "",
  ta_per_km: "",
  lodging_expense: "",
  travel_fare: "",
  other_items: [],
  notes: "",
});

const num = (v: string | number) => (v === "" || v == null ? 0 : Number(v) || 0);
const rowTotal = (e: TravelExpense) =>
  num(e.daily_allowance) + num(e.kilometers_travelled) * num(e.ta_per_km) +
  num(e.lodging_expense) + num(e.travel_fare) + num(e.other_expense);

function Expenses() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const pMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [empId, setEmpId] = useState("all");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TravelExpense | null>(null);
  const [form, setForm] = useState<FormState>(empty());

  const filtered = useMemo(() => expenses.filter((e) => {
    if (from && e.expense_date < from) return false;
    if (to && e.expense_date > to) return false;
    if (empId !== "all" && e.user_id !== empId) return false;
    return true;
  }), [expenses, from, to, empId]);

  const totals = filtered.reduce((s, e) => s + rowTotal(e), 0);

  const taAuto = num(form.kilometers_travelled) * num(form.ta_per_km);
  const otherTotal = form.other_items.reduce((s, i) => s + num(i.amount), 0);
  const formTotal =
    num(form.daily_allowance) + taAuto + num(form.lodging_expense) +
    num(form.travel_fare) + otherTotal;

  function openNew() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }
  function openEdit(e: TravelExpense) {
    setEditing(e);
    const items = Array.isArray(e.other_expenses_items) && e.other_expenses_items.length > 0
      ? e.other_expenses_items.map((i) => ({ category: i.category, amount: String(i.amount ?? ""), note: i.note ?? "" }))
      : (num(e.other_expense) > 0
          ? [{ category: "Misc", amount: String(e.other_expense), note: e.other_expense_note ?? "" }]
          : []);
    setForm({
      expense_date: e.expense_date,
      details: e.details ?? "",
      daily_allowance: String(e.daily_allowance ?? ""),
      kilometers_travelled: String(e.kilometers_travelled ?? ""),
      ta_per_km: String(e.ta_per_km ?? ""),
      lodging_expense: String(e.lodging_expense ?? ""),
      travel_fare: String(e.travel_fare ?? ""),
      other_items: items,
      notes: e.notes ?? "",
    });
    setOpen(true);
  }

  function addOtherItem() {
    setForm((f) => ({ ...f, other_items: [...f.other_items, { category: OTHER_CATEGORIES[0], amount: "", note: "" }] }));
  }
  function updateOtherItem(idx: number, patch: Partial<OtherItem>) {
    setForm((f) => ({ ...f, other_items: f.other_items.map((i, k) => k === idx ? { ...i, ...patch } : i) }));
  }
  function removeOtherItem(idx: number) {
    setForm((f) => ({ ...f, other_items: f.other_items.filter((_, k) => k !== idx) }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const items = form.other_items
        .filter((i) => num(i.amount) > 0)
        .map((i) => ({ category: i.category, amount: num(i.amount), note: i.note || null }));
      const otherTotalNum = items.reduce((s, i) => s + i.amount, 0);
      const summaryNote = items.map((i) => `${i.category}${i.note ? ` (${i.note})` : ""}: ${i.amount.toFixed(2)}`).join("; ") || null;
      const payload = {
        expense_date: form.expense_date,
        details: form.details || null,
        daily_allowance: num(form.daily_allowance),
        kilometers_travelled: num(form.kilometers_travelled),
        ta_per_km: num(form.ta_per_km),
        lodging_expense: num(form.lodging_expense),
        travel_fare: num(form.travel_fare),
        other_expense: otherTotalNum,
        other_expense_note: summaryNote,
        other_expenses_items: items,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("travelling_expenses").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("travelling_expenses").insert({ ...payload, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Expense updated" : "Expense added");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("travelling_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Expense deleted"); qc.invalidateQueries({ queryKey: ["expenses"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Travelling Expenses
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {expenses.length} entries · Total: <span className="font-medium text-foreground">{totals.toFixed(2)}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => exportExpensesPdf({
            expenses: filtered, profiles,
            title: "Travelling Expenses",
            subtitle: `${from || "All time"} to ${to || "Now"}${empId !== "all" ? ` - ${pMap.get(empId)?.full_name ?? ""}` : ""}`,
          })}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Expense</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Employee</label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Details</th>
                <th className="py-2 pr-3 text-right">DA</th>
                <th className="py-2 pr-3 text-right">KM</th>
                <th className="py-2 pr-3 text-right">TA/KM</th>
                <th className="py-2 pr-3 text-right">Travel</th>
                <th className="py-2 pr-3 text-right">Lodging</th>
                <th className="py-2 pr-3 text-right">Fare</th>
                <th className="py-2 pr-3 text-right">Other</th>
                <th className="py-2 pr-3 text-right">Total</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const ta = num(e.kilometers_travelled) * num(e.ta_per_km);
                const canEdit = isAdmin || e.user_id === user?.id;
                return (
                  <tr key={e.id} className="border-b border-border/60 hover:bg-secondary/40">
                    <td className="py-2 pr-3 whitespace-nowrap font-medium">{format(parseISO(e.expense_date), "MMM d, yyyy")}</td>
                    <td className="py-2 pr-3 max-w-xs">
                      <div className="line-clamp-2">{e.details || "—"}</div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(e.daily_allowance).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(e.kilometers_travelled).toFixed(0)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(e.ta_per_km).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{ta.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(e.lodging_expense).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(e.travel_fare).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(e.other_expense).toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold">{rowTotal(e).toFixed(2)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <Button size="icon" variant="ghost" disabled={!canEdit} onClick={() => openEdit(e)} title="Edit">
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={!canEdit} onClick={() => { if (confirm("Delete expense?")) del.mutate(e.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="text-center py-10 text-muted-foreground">No expenses recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "New Daily Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date *">
              <Input type="date" required value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </Field>
            <Field label="Details" full>
              <Input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Tour / purpose / location" />
            </Field>
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
              <Input value={taAuto.toFixed(2)} readOnly className="bg-muted/50" />
            </Field>
            <Field label="Lodging">
              <Input type="number" min="0" step="0.01" value={form.lodging_expense} onChange={(e) => setForm({ ...form, lodging_expense: e.target.value })} placeholder="0.00" />
            </Field>
            <Field label="Train / Air Fare">
              <Input type="number" min="0" step="0.01" value={form.travel_fare} onChange={(e) => setForm({ ...form, travel_fare: e.target.value })} placeholder="0.00" />
            </Field>
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground">Other Expenses</Label>
                <Button type="button" size="sm" variant="outline" onClick={addOtherItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              {form.other_items.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No other expenses added</p>
              )}
              {form.other_items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Select value={item.category} onValueChange={(v) => updateOtherItem(idx, { category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OTHER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.amount}
                      onChange={(e) => updateOtherItem(idx, { amount: e.target.value })} />
                  </div>
                  <div className="col-span-4">
                    <Input placeholder="Note (optional)" value={item.note}
                      onChange={(e) => updateOtherItem(idx, { note: e.target.value })} />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="col-span-1" onClick={() => removeOtherItem(idx)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <Field label="Notes" full>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </Field>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-2">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-base font-semibold tabular-nums">{formTotal.toFixed(2)}</span>
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : editing ? "Update" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
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