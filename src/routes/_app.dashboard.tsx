import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchReports, fetchCustomers, fetchProfiles, fetchExpenses } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, Users, Calendar, Bell, TrendingUp, Wallet, CalendarClock } from "lucide-react";
import { format, isToday, startOfWeek, startOfMonth, parseISO, isAfter, compareAsc } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: reports = [] } = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);

  const todayCount = reports.filter((r) => isToday(parseISO(r.call_date))).length;
  const weekCount = reports.filter((r) => isAfter(parseISO(r.call_date), weekStart) || parseISO(r.call_date).toDateString() === weekStart.toDateString()).length;
  const monthCount = reports.filter((r) => isAfter(parseISO(r.call_date), monthStart) || parseISO(r.call_date).toDateString() === monthStart.toDateString()).length;
  const activeCustomers = customers.filter((c) => c.status === "Active").length;
  const followUps = reports.filter(
    (r) => r.next_follow_up && isAfter(parseISO(r.next_follow_up), today) && r.order_status === "Follow-up Needed",
  ).length;

  const statusColor: Record<string, string> = {
    "Order Confirmed": "bg-success/15 text-success",
    "Interested": "bg-primary/10 text-primary",
    "Trial Required": "bg-warning/15 text-warning-foreground",
    "Follow-up Needed": "bg-accent text-accent-foreground",
    "No Response": "bg-muted text-muted-foreground",
  };

  // Upcoming follow-ups
  const upcoming = reports
    .filter((r) => r.next_follow_up && !isAfter(today, parseISO(r.next_follow_up)))
    .sort((a, b) => compareAsc(parseISO(a.next_follow_up!), parseISO(b.next_follow_up!)))
    .slice(0, 8);

  const recent = reports.slice(0, 6);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Expense totals (current month)
  const n = (v: number | null | undefined) => Number(v ?? 0) || 0;
  const monthExpenses = expenses.filter((e) => isAfter(parseISO(e.expense_date), monthStart) || parseISO(e.expense_date).toDateString() === monthStart.toDateString());
  const expBreakdown = monthExpenses.reduce(
    (acc, e) => {
      acc.daily += n(e.daily_allowance);
      acc.travel += n(e.kilometers_travelled) * n(e.ta_per_km);
      acc.lodging += n(e.lodging_expense);
      acc.fare += n(e.travel_fare);
      acc.other += n(e.other_expense);
      return acc;
    },
    { daily: 0, travel: 0, lodging: 0, fare: 0, other: 0 },
  );
  const expGrand = expBreakdown.daily + expBreakdown.travel + expBreakdown.lodging + expBreakdown.fare + expBreakdown.other;
  const expRows: { label: string; value: number }[] = [
    { label: "Daily Allowance", value: expBreakdown.daily },
    { label: "Travel Allowance (KM × Rate)", value: expBreakdown.travel },
    { label: "Lodging", value: expBreakdown.lodging },
    { label: "Train / Air Fare", value: expBreakdown.fare },
    { label: "Other Expenses", value: expBreakdown.other },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your sales activity</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Stat label="Calls Today" value={todayCount} icon={PhoneCall} accent />
        <Stat label="This Week" value={weekCount} icon={Calendar} />
        <Stat label="This Month" value={monthCount} icon={TrendingUp} />
        <Stat label="Active Customers" value={activeCustomers} icon={Users} />
        <Stat label="Pending Follow-ups" value={followUps} icon={Bell} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Activity</h2>
            <span className="text-xs text-muted-foreground">Latest {recent.length} reports</span>
          </div>
          <div className="divide-y divide-border">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No reports yet — log your first call to get started.
              </p>
            )}
            {recent.map((r) => {
              const c = r.customer_id ? customerById.get(r.customer_id) : null;
              const p = profileById.get(r.user_id);
              return (
                <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {c?.customer_name || "Unknown customer"}
                      {c?.company_name && <span className="text-muted-foreground"> · {c.company_name}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {p?.full_name || "—"} · {r.meeting_type} · {format(parseISO(r.call_date), "MMM d")}
                    </div>
                    {r.discussion && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.discussion}</div>
                    )}
                  </div>
                  <Badge className={statusColor[r.order_status] ?? ""} variant="secondary">
                    {r.order_status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" /> Follow-ups
            </h2>
            <span className="text-xs text-muted-foreground">Next {upcoming.length}</span>
          </div>
          <div className="divide-y divide-border">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No upcoming follow-ups.</p>
            )}
            {upcoming.map((r) => {
              const c = r.customer_id ? customerById.get(r.customer_id) : null;
              const d = parseISO(r.next_follow_up!);
              return (
                <div key={r.id} className="py-2.5">
                  <div className="text-sm font-medium truncate">
                    {c?.customer_name || "Unknown customer"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>{format(d, "MMM d, yyyy")}</span>
                    {r.next_follow_up_time && (
                      <span>· {format(new Date(`2000-01-01T${r.next_follow_up_time}`), "h:mm a")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Total Expenses Details
          </h2>
          <span className="text-xs text-muted-foreground">
            {format(monthStart, "MMMM yyyy")} · {monthExpenses.length} entries
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          {expRows.map((r) => (
            <div key={r.label} className="rounded-md border border-border bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">{r.label}</div>
              <div className="text-lg font-semibold tabular-nums mt-1">{r.value.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-md px-4 py-3" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
          <span className="text-sm uppercase tracking-wide opacity-90">Grand Total</span>
          <span className="text-2xl font-semibold tabular-nums">{expGrand.toFixed(2)}</span>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <Card className="p-4 relative overflow-hidden" style={accent ? { background: "var(--gradient-primary)", color: "var(--primary-foreground)" } : undefined}>
      <div className="flex items-center justify-between">
        <span className={accent ? "text-xs uppercase tracking-wide opacity-80" : "text-xs uppercase tracking-wide text-muted-foreground"}>{label}</span>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <div className="text-3xl font-semibold mt-2">{value}</div>
    </Card>
  );
}