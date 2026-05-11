import { createFileRoute } from "@tanstack/react-router";
import { CallReportForm } from "@/components/CallReportForm";

export const Route = createFileRoute("/_app/reports/new")({
  component: () => <CallReportForm />,
});
