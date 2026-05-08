import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, type Customer } from "@/lib/queries";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/customers")({
  component: Customers,
});

function Customers() {
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const filtered = customers.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [c.customer_name, c.company_name, c.contact_person, c.city, c.industry_segment]
      .some((x) => x?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} total · {customers.filter(c => c.status === "Active").length} active</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4 mr-1" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Customer" : "New Customer"}</DialogTitle>
            </DialogHeader>
            <CustomerForm
              customer={editing}
              onDone={() => { setOpen(false); setEditing(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">City</th>
                <th className="py-2 pr-4">Segment</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CustomerRow key={c.id} c={c} onEdit={(x) => { setEditing(x); setOpen(true); }} />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CustomerRow({ c, onEdit }: { c: Customer; onEdit: (c: Customer) => void }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").delete().eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <tr className="border-b border-border/60 hover:bg-secondary/40">
      <td className="py-2 pr-4 font-medium">{c.customer_name}</td>
      <td className="py-2 pr-4">{c.company_name || "—"}</td>
      <td className="py-2 pr-4 text-muted-foreground">{c.contact_person || "—"}<br/><span className="text-xs">{c.mobile || c.email || ""}</span></td>
      <td className="py-2 pr-4">{c.city || "—"}</td>
      <td className="py-2 pr-4">{c.industry_segment || "—"}</td>
      <td className="py-2 pr-4">
        <Badge variant={c.status === "Active" ? "default" : "secondary"}>{c.status}</Badge>
      </td>
      <td className="py-2 pr-4">
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => onEdit(c)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this customer?")) del.mutate(); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CustomerForm({ customer, onDone }: { customer: Customer | null; onDone: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customer_name: customer?.customer_name ?? "",
    company_name: customer?.company_name ?? "",
    contact_person: customer?.contact_person ?? "",
    mobile: customer?.mobile ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    state: customer?.state ?? "",
    customer_type: customer?.customer_type ?? "",
    industry_segment: customer?.industry_segment ?? "",
    notes: customer?.notes ?? "",
    status: customer?.status ?? "Active",
  });

  const save = useMutation({
    mutationFn: async () => {
      if (customer) {
        const { error } = await supabase.from("customers").update(form).eq("id", customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert({ ...form, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(customer ? "Customer updated" : "Customer created");
      qc.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const F = (label: string, key: keyof typeof form, type = "text") => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={form[key] as string} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {F("Customer Name *", "customer_name")}
        {F("Company", "company_name")}
        {F("Contact Person", "contact_person")}
        {F("Mobile", "mobile")}
        {F("Email", "email", "email")}
        {F("City", "city")}
        {F("State", "state")}
        {F("Customer Type", "customer_type")}
        {F("Industry Segment", "industry_segment")}
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "Active" | "Inactive" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={save.isPending || !form.customer_name}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}