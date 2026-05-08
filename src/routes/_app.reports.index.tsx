import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchReports, fetchCustomers, fetchProfiles } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, FileDown, Download, Trash2 } from "lucide-react";
import { exportReportsPdf, exportReportsCsv } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reports/")({
  component: Reports,
});

function Reports() {
  const { data: reports = [] } = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [empId, setEmpId] = useState("all");
  const [custId, setCustId] = useState("all");
  const [q, setQ] = useState("");

  const cMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const pMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filtered = useMemo(() => reports.filter((r) => {
    if (from && r.call_date < from) return false;
    if (to && r.call_date > to) return false;
    if (empId !== "all" && r.user_id !== empId) return false;
    if (custId !== "all" && r.customer_id !== custId) return false;
    if (q) {
      const s = q.toLowerCase();
      const c = cMap.get(r.customer_id ?? "");
      if (![r.discussion, r.meeting_outcome, r.product_discussed, c?.customer_name, c?.company_name]
        .some((x) => x?.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [reports, from, to, empId, custId, q, cMap]);

  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("call_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Report deleted"); qc.invalidateQueries({ queryKey: ["reports"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusVariant: Record<string, string> = {
    "Order Confirmed": "bg-success/15 text-success",
    "Interested": "bg-primary/10 text-primary",
    "Trial Required": "bg-warning/15 text-warning-foreground",
    "Follow-up Needed": "bg-accent text-accent-foreground",
    "No Response": "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Call Reports</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {reports.length} reports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => exportReportsCsv({ reports: filtered, customers, profiles })}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportReportsPdf({
            reports: filtered, customers, profiles,
            title: "Call Report",
            subtitle: `${from || "All time"} to ${to || "Now"}${empId !== "all" ? ` - ${pMap.get(empId)?.full_name ?? ""}` : ""}`,
          })}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button asChild>
            <Link to="/reports/new"><Plus className="h-4 w-4 mr-1" /> New Report</Link>
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5 mb-4">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Employee</label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Customer</label>
            <Select value={custId} onValueChange={setCustId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Search</label>
            <Input placeholder="Discussion, product…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Employee</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Discussion</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Follow-up</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const c = cMap.get(r.customer_id ?? "");
                const p = pMap.get(r.user_id);
                return (
                  <tr key={r.id} className="border-b border-border/60 align-top hover:bg-secondary/40">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <div>{format(parseISO(r.call_date), "MMM d")}</div>
                      <div className="text-xs text-muted-foreground">{r.call_time?.slice(0, 5)}</div>
                    </td>
                    <td className="py-2 pr-3">{p?.full_name || "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{c?.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c?.company_name || ""}</div>
                    </td>
                    <td className="py-2 pr-3">{r.meeting_type}</td>
                    <td className="py-2 pr-3 max-w-xs">
                      <div className="line-clamp-2 text-muted-foreground">{r.discussion || "—"}</div>
                      {r.product_discussed && <div className="text-xs mt-0.5">📦 {r.product_discussed}</div>}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge className={statusVariant[r.order_status] ?? ""} variant="secondary">{r.order_status}</Badge>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {r.next_follow_up ? format(parseISO(r.next_follow_up), "MMM d") : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete report?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No reports match these filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}