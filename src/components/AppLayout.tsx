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
  Wallet,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Call Reports", icon: PhoneCall },
  { to: "/reports/new", label: "New Report", icon: FileText },
  { to: "/expenses", label: "Travelling Expenses", icon: Wallet },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/backup", label: "Backup & Restore", icon: DatabaseBackup },
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
          "fixed lg:sticky top-0 h-screen z-40 w-64 transition-transform shrink-0 text-[color:var(--sidebar-navy-foreground)]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ background: "var(--sidebar-navy)" }}
      >
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
          <div
            className="h-9 w-9 rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm"
            style={{ background: "var(--gradient-primary)" }}
          >
            DCR
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Sales DCR</div>
            <div className="text-[11px] text-white/60">Call Reporting</div>
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
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border-l-2",
                  active
                    ? "bg-white/10 text-white border-l-[color:var(--primary)]"
                    : "text-white/75 border-l-transparent hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
              {(profile?.full_name || profile?.email || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-white">
                {profile?.full_name || "User"}
              </div>
              <div className="text-[11px] text-white/60 truncate">
                {isAdmin ? "Admin" : "Employee"}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/10"
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