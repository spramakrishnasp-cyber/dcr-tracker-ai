import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchReports, fetchCustomers, fetchProfiles } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/analytics")({
  component: Analytics,
});

const COLORS = ["hsl(220 70% 45%)", "hsl(170 60% 45%)", "hsl(40 90% 55%)", "hsl(0 70% 55%)", "hsl(260 50% 55%)"];

function Analytics() {
  const { data: reports = [] } = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const last30 = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((d) => {
      const ds = format(d, "yyyy-MM-dd");
      return { day: format(d, "MMM d"), calls: reports.filter((r) => r.call_date === ds).length };
    });
  }, [reports]);

  const byEmployee = useMemo(() => {
    const m = new Map<string, number>();
    reports.forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
    return profiles
      .map((p) => ({ name: p.full_name || p.email, calls: m.get(p.id) ?? 0 }))
      .sort((a, b) => b.calls - a.calls);
  }, [reports, profiles]);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    reports.forEach((r) => m.set(r.order_status, (m.get(r.order_status) ?? 0) + 1));
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [reports]);

  const conversion = reports.length
    ? Math.round((reports.filter((r) => r.order_status === "Order Confirmed").length / reports.length) * 1000) / 10
    : 0;

  const topCustomers = useMemo(() => {
    const m = new Map<string, number>();
    reports.forEach((r) => { if (r.customer_id) m.set(r.customer_id, (m.get(r.customer_id) ?? 0) + 1); });
    const cMap = new Map(customers.map((c) => [c.id, c]));
    return Array.from(m, ([id, count]) => ({ name: cMap.get(id)?.customer_name ?? "—", count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);
  }, [reports, customers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance insights for your sales team</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPI label="Total Calls" value={reports.length} />
        <KPI label="Conversion Rate" value={`${conversion}%`} />
        <KPI label="Active Customers" value={customers.filter((c) => c.status === "Active").length} />
        <KPI label="Sales Reps" value={profiles.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Calls — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={3} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="hsl(220 70% 45%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Calls by Status</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Calls by Employee</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byEmployee}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="calls" fill="hsl(220 70% 45%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-4">Top Customers by Engagement</h2>
          <div className="space-y-3">
            {topCustomers.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {topCustomers.map((t) => {
              const max = Math.max(...topCustomers.map((x) => x.count), 1);
              return (
                <div key={t.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{t.name}</span>
                    <span className="text-muted-foreground">{t.count} calls</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(t.count / max) * 100}%`, background: "var(--gradient-primary)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-3xl font-semibold mt-2">{value}</div>
    </Card>
  );
}