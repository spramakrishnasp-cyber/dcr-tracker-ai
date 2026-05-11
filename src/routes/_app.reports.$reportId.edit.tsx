import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CallReportForm } from "@/components/CallReportForm";
import type { CallReport } from "@/lib/queries";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reports/$reportId/edit")({
  component: EditReport,
});

function EditReport() {
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => {
      const { data, error } = await supabase.from("call_reports").select("*").eq("id", reportId).single();
      if (error) throw error;
      return data as CallReport;
    },
  });

  useEffect(() => {
    if (error) {
      toast.error("Could not load report");
      navigate({ to: "/reports" });
    }
  }, [error, navigate]);

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading report…</div>;
  }
  return <CallReportForm existing={data} />;
}