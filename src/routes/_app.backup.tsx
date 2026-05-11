import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Upload, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/backup")({
  component: SettingsPage,
});

type Backup = {
  version: 1;
  exported_at: string;
  customers: any[];
  call_reports: any[];
};

function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  async function handleBackup() {
    setBusy(true);
    try {
      const [{ data: customers, error: e1 }, { data: reports, error: e2 }] = await Promise.all([
        supabase.from("customers").select("*"),
        supabase.from("call_reports").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const backup: Backup = {
        version: 1,
        exported_at: new Date().toISOString(),
        customers: customers ?? [],
        call_reports: reports ?? [],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dcr-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Backup downloaded · ${backup.customers.length} customers · ${backup.call_reports.length} reports`);
    } catch (e: any) {
      toast.error(e.message ?? "Backup failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(file: File) {
    if (!user) return;
    setBusy(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Backup;
      if (!data || data.version !== 1 || !Array.isArray(data.customers) || !Array.isArray(data.call_reports)) {
        throw new Error("Invalid backup file");
      }

      const confirmMsg = mode === "replace"
        ? `REPLACE mode will delete ${isAdmin ? "ALL" : "your"} existing customers & reports, then import ${data.customers.length} customers and ${data.call_reports.length} reports. Continue?`
        : `MERGE will import ${data.customers.length} customers and ${data.call_reports.length} reports (existing rows with same id are updated). Continue?`;
      if (!confirm(confirmMsg)) { setBusy(false); return; }

      if (mode === "replace") {
        const delReports = isAdmin
          ? await supabase.from("call_reports").delete().neq("id", "00000000-0000-0000-0000-000000000000")
          : await supabase.from("call_reports").delete().eq("user_id", user.id);
        if (delReports.error) throw delReports.error;
        const delCust = isAdmin
          ? await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
          : await supabase.from("customers").delete().eq("created_by", user.id);
        if (delCust.error) throw delCust.error;
      }

      // Reassign ownership to the importing user so RLS allows insert
      const customers = data.customers.map((c) => ({ ...c, created_by: user.id }));
      const reports = data.call_reports.map((r) => ({ ...r, user_id: user.id }));

      if (customers.length) {
        const { error } = await supabase.from("customers").upsert(customers, { onConflict: "id" });
        if (error) throw error;
      }
      if (reports.length) {
        const { error } = await supabase.from("call_reports").upsert(reports, { onConflict: "id" });
        if (error) throw error;
      }

      toast.success(`Restored ${customers.length} customers, ${reports.length} reports`);
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e.message ?? "Restore failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground">Export your data to a JSON file, or restore from a previous backup.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium">Backup</h2>
          <p className="text-sm text-muted-foreground">Downloads a JSON file containing customers and call reports you can access.</p>
        </div>
        <Button onClick={handleBackup} disabled={busy}>
          <Download className="h-4 w-4 mr-2" /> Download backup
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-medium">Restore</h2>
          <p className="text-sm text-muted-foreground">Upload a previously exported backup file.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={mode === "merge" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("merge")}
          >
            Merge (upsert)
          </Button>
          <Button
            variant={mode === "replace" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("replace")}
          >
            Replace
          </Button>
        </div>

        {mode === "replace" && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Replace mode deletes {isAdmin ? "all" : "your"} existing customers and reports before import. This cannot be undone.</span>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleRestore(f);
          }}
        />
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Upload className="h-4 w-4 mr-2" /> Choose backup file
        </Button>
      </Card>
    </div>
  );
}