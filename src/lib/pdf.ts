import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { CallReport, Customer } from "./queries";

export function exportReportsPdf(opts: {
  reports: CallReport[];
  customers: Customer[];
  profiles: { id: string; full_name: string; email: string }[];
  title: string;
  subtitle?: string;
}) {
  const { reports, customers, profiles, title, subtitle } = opts;
  const doc = new jsPDF({ orientation: "landscape" });
  const cMap = new Map(customers.map((c) => [c.id, c]));
  const pMap = new Map(profiles.map((p) => [p.id, p]));

  // Header band
  doc.setFillColor(35, 55, 110);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Sales DCR System", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Daily Call Report", doc.internal.pageSize.getWidth() - 14, 14, { align: "right" });

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 14, 32);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 38);
    doc.setTextColor(0);
  }
  doc.setFontSize(9);
  doc.text(`Total Calls: ${reports.length}`, doc.internal.pageSize.getWidth() - 14, 32, { align: "right" });
  doc.text(`Generated: ${format(new Date(), "PPp")}`, doc.internal.pageSize.getWidth() - 14, 38, { align: "right" });

  autoTable(doc, {
    startY: 44,
    head: [["Date", "Time", "Employee", "Customer", "Type", "Status", "Discussion", "Follow-up"]],
    body: reports.map((r) => [
      format(parseISO(r.call_date), "MMM d, yyyy"),
      r.call_time?.slice(0, 5) ?? "",
      pMap.get(r.user_id)?.full_name ?? "—",
      cMap.get(r.customer_id ?? "")?.customer_name ?? "—",
      r.meeting_type,
      r.order_status,
      r.discussion ?? "",
      r.next_follow_up ? format(parseISO(r.next_follow_up), "MMM d") : "—",
    ]),
    styles: { fontSize: 8, cellPadding: 2.5, valign: "top" },
    headStyles: { fillColor: [35, 55, 110], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: { 6: { cellWidth: 70 } },
    didDrawPage: (data) => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Page ${page}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: "right" },
      );
      doc.text(
        "Authorized Signature: ___________________",
        14,
        doc.internal.pageSize.getHeight() - 8,
      );
    },
  });

  doc.save(`${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function exportReportsCsv(opts: {
  reports: CallReport[];
  customers: Customer[];
  profiles: { id: string; full_name: string; email: string }[];
}) {
  const { reports, customers, profiles } = opts;
  const cMap = new Map(customers.map((c) => [c.id, c]));
  const pMap = new Map(profiles.map((p) => [p.id, p]));
  const rows = [
    ["Date", "Time", "Employee", "Customer", "Company", "Meeting Type", "Product", "Order Status", "Discussion", "Outcome", "Next Follow-up", "Location"],
    ...reports.map((r) => {
      const c = cMap.get(r.customer_id ?? "");
      return [
        r.call_date,
        r.call_time?.slice(0, 5) ?? "",
        pMap.get(r.user_id)?.full_name ?? "",
        c?.customer_name ?? "",
        c?.company_name ?? "",
        r.meeting_type,
        r.product_discussed ?? "",
        r.order_status,
        r.discussion ?? "",
        r.meeting_outcome ?? "",
        r.next_follow_up ?? "",
        r.location ?? "",
      ];
    }),
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dcr_reports_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}