import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { CallReport, Customer, TravelExpense } from "./queries";

const BRAND = { r: 28, g: 45, b: 92 };       // deep navy
const ACCENT = { r: 234, g: 88, b: 12 };     // warm orange
const MUTED = { r: 110, g: 120, b: 140 };
const LIGHT = { r: 245, g: 247, b: 252 };

const STATUS_COLORS: Record<string, [number, number, number]> = {
  "Order Confirmed": [22, 163, 74],
  "Interested": [37, 99, 235],
  "Trial Required": [202, 138, 4],
  "Follow-up Needed": [124, 58, 237],
  "No Response": [120, 120, 120],
};

export function exportReportsPdf(opts: {
  reports: CallReport[];
  customers: Customer[];
  profiles: { id: string; full_name: string; email: string }[];
  title: string;
  subtitle?: string;
}) {
  const { reports, customers, profiles, title, subtitle } = opts;
  const doc = new jsPDF({ orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cMap = new Map(customers.map((c) => [c.id, c]));
  const pMap = new Map(profiles.map((p) => [p.id, p]));

  // ===== HEADER =====
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, W, 28, "F");
  doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  doc.rect(0, 28, W, 1.5, "F");

  // Logo mark
  doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  doc.circle(20, 14, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("S", 20, 16.5, { align: "center" });

  doc.setFontSize(15);
  doc.text("Sales DCR System", 30, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 230);
  doc.text("Daily Call Report Management", 30, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 230);
  doc.text("Generated", W - 14, 13, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(format(new Date(), "PP p"), W - 14, 19, { align: "right" });

  // ===== TITLE =====
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 14, 42);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(subtitle, 14, 48);
  }

  // ===== KPI CARDS =====
  const uniqCustomers = new Set(reports.map((r) => r.customer_id).filter(Boolean)).size;
  const uniqEmployees = new Set(reports.map((r) => r.user_id)).size;
  const orders = reports.filter((r) => r.order_status === "Order Confirmed").length;
  const followUps = reports.filter((r) => r.next_follow_up).length;

  const kpis: { label: string; value: string }[] = [
    { label: "Total Calls", value: String(reports.length) },
    { label: "Customers", value: String(uniqCustomers) },
    { label: "Employees", value: String(uniqEmployees) },
    { label: "Orders Confirmed", value: String(orders) },
    { label: "Follow-ups", value: String(followUps) },
  ];

  const kpiTop = 54;
  const kpiH = 18;
  const gap = 4;
  const kpiW = (W - 28 - gap * (kpis.length - 1)) / kpis.length;
  kpis.forEach((k, i) => {
    const x = 14 + i * (kpiW + gap);
    doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b);
    doc.roundedRect(x, kpiTop, kpiW, kpiH, 2, 2, "F");
    doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
    doc.rect(x, kpiTop, 1.2, kpiH, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(k.label.toUpperCase(), x + 4, kpiTop + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(k.value, x + 4, kpiTop + 14);
  });

  // ===== TABLE =====
  autoTable(doc, {
    startY: kpiTop + kpiH + 6,
    head: [["Date", "Employee", "Customer", "Type", "Discussion", "Status", "Follow-up"]],
    body: reports.map((r) => {
      const c = cMap.get(r.customer_id ?? "");
      return [
        `${format(parseISO(r.call_date), "MMM d, yyyy")}\n${r.call_time?.slice(0, 5) ?? ""}`,
        pMap.get(r.user_id)?.full_name ?? "-",
        `${c?.customer_name ?? "-"}\n${c?.company_name ?? ""}`,
        r.meeting_type,
        [r.discussion, r.product_discussed ? `Product: ${r.product_discussed}` : ""]
          .filter(Boolean).join("\n"),
        r.order_status,
        r.next_follow_up ? format(parseISO(r.next_follow_up), "MMM d, yyyy") : "-",
      ];
    }),
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: "top",
      textColor: [40, 45, 65],
      lineColor: [225, 230, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
      halign: "left",
    },
    alternateRowStyles: { fillColor: [LIGHT.r, LIGHT.g, LIGHT.b] },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      1: { cellWidth: 32 },
      2: { cellWidth: 42 },
      3: { cellWidth: 22 },
      4: { cellWidth: "auto" },
      5: { cellWidth: 32, halign: "center" },
      6: { cellWidth: 24 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const color = STATUS_COLORS[String(data.cell.raw)] ?? [100, 100, 100];
        data.cell.styles.textColor = color;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 8;
      }
    },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      const pageCount = doc.getNumberOfPages();
      doc.setDrawColor(225, 230, 240);
      doc.setLineWidth(0.3);
      doc.line(14, H - 12, W - 14, H - 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      doc.text("Authorized Signature: ______________________", 14, H - 6);
      doc.text("Sales DCR System - Confidential", W / 2, H - 6, { align: "center" });
      doc.text(`Page ${page} of ${pageCount}`, W - 14, H - 6, { align: "right" });
    },
    margin: { top: 14, left: 14, right: 14, bottom: 16 },
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