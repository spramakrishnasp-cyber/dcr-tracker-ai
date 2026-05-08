import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  DatabaseBackup,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Call Reports", icon: PhoneCall },
  { to: "/reports/new", label: "New Report", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Backup & Restore", icon: DatabaseBackup },
] as const;

export function AppLayout() {
  const { profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 h-screen z-40 bg-card border-r border-border w-64 transition-transform shrink-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-primary-foreground font-bold"
            style={{ background: "var(--gradient-primary)" }}
          >
            DCR
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Sales DCR</div>
            <div className="text-[11px] text-muted-foreground">Call Reporting</div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to ||
              (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">
              {(profile?.full_name || profile?.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {profile?.full_name || "User"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {isAdmin ? "Admin" : "Employee"}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border flex items-center px-4 lg:px-8 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="text-sm text-muted-foreground">
            Welcome back, <span className="text-foreground font-medium">{profile?.full_name || "Sales Rep"}</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}