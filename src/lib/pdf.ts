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
export function exportExpensesPdf(opts: {
  expenses: TravelExpense[];
  profiles: { id: string; full_name: string; email: string }[];
  title: string;
  subtitle?: string;
}) {
  const { expenses, title, subtitle } = opts;
  const doc = new jsPDF({ orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, W, 28, "F");
  doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  doc.rect(0, 28, W, 1.5, "F");

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
  doc.text("Travelling Expenses Report", 30, 19);

  doc.setFontSize(8);
  doc.text("Generated", W - 14, 13, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(format(new Date(), "PP p"), W - 14, 19, { align: "right" });

  // Title
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

  // KPIs
  const totals = expenses.reduce(
    (acc, e) => {
      const km = Number(e.kilometers_travelled) * Number(e.ta_per_km);
      acc.da += Number(e.daily_allowance);
      acc.km += Number(e.kilometers_travelled);
      acc.ta += km;
      acc.lodge += Number(e.lodging_expense);
      acc.fare += Number(e.travel_fare);
      acc.other += Number(e.other_expense);
      acc.total += Number(e.daily_allowance) + km + Number(e.lodging_expense) + Number(e.travel_fare) + Number(e.other_expense);
      return acc;
    },
    { da: 0, km: 0, ta: 0, lodge: 0, fare: 0, other: 0, total: 0 },
  );

  const kpiCandidates = [
    { label: "Entries", value: String(expenses.length), show: expenses.length > 0 },
    { label: "Total KM", value: totals.km.toFixed(0), show: totals.km > 0 },
    { label: "Daily Allow.", value: totals.da.toFixed(2), show: totals.da > 0 },
    { label: "Travel Allow.", value: totals.ta.toFixed(2), show: totals.ta > 0 },
    { label: "Lodging", value: totals.lodge.toFixed(2), show: totals.lodge > 0 },
    { label: "Fare", value: totals.fare.toFixed(2), show: totals.fare > 0 },
    { label: "Other", value: totals.other.toFixed(2), show: totals.other > 0 },
    { label: "Grand Total", value: totals.total.toFixed(2), show: true },
  ];
  const kpis = kpiCandidates.filter((k) => k.show);

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
    doc.setFontSize(12);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(k.value, x + 4, kpiTop + 14);
  });

  // Build columns dynamically — only include columns that have data
  type Col = { header: string; align?: "left" | "right"; width?: number | "auto"; bold?: boolean; get: (e: TravelExpense) => string; total?: string };
  const allCols: (Col & { show: boolean })[] = [
    { header: "Date", width: 26, bold: true, show: true, get: (e) => format(parseISO(e.expense_date), "MMM d, yyyy") },
    { header: "Details", width: "auto", show: expenses.some((e) => e.details), get: (e) => e.details ?? "" },
    { header: "Daily Allow.", align: "right", show: totals.da > 0, get: (e) => Number(e.daily_allowance).toFixed(2), total: totals.da.toFixed(2) },
    { header: "KM", align: "right", show: totals.km > 0, get: (e) => Number(e.kilometers_travelled).toFixed(0), total: totals.km.toFixed(0) },
    { header: "TA/KM", align: "right", show: expenses.some((e) => Number(e.ta_per_km) > 0), get: (e) => Number(e.ta_per_km).toFixed(2) },
    { header: "Travel Allow.", align: "right", show: totals.ta > 0, get: (e) => (Number(e.kilometers_travelled) * Number(e.ta_per_km)).toFixed(2), total: totals.ta.toFixed(2) },
    { header: "Lodging", align: "right", show: totals.lodge > 0, get: (e) => Number(e.lodging_expense).toFixed(2), total: totals.lodge.toFixed(2) },
    { header: "Fare", align: "right", show: totals.fare > 0, get: (e) => Number(e.travel_fare).toFixed(2), total: totals.fare.toFixed(2) },
    { header: "Other", align: "right", show: totals.other > 0, get: (e) => Number(e.other_expense).toFixed(2), total: totals.other.toFixed(2) },
    { header: "Other Breakdown", width: "auto", show: expenses.some((e) => e.other_expense_note), get: (e) => e.other_expense_note ?? "" },
    { header: "Total", align: "right", bold: true, show: true, get: (e) => {
        const ta = Number(e.kilometers_travelled) * Number(e.ta_per_km);
        return (Number(e.daily_allowance) + ta + Number(e.lodging_expense) + Number(e.travel_fare) + Number(e.other_expense)).toFixed(2);
      }, total: totals.total.toFixed(2) },
  ];
  const cols = allCols.filter((c) => c.show);
  const columnStyles: Record<number, { cellWidth?: number | "auto"; halign?: "left" | "right"; fontStyle?: "bold" }> = {};
  cols.forEach((c, i) => {
    columnStyles[i] = {
      ...(c.width ? { cellWidth: c.width } : {}),
      ...(c.align ? { halign: c.align } : {}),
      ...(c.bold ? { fontStyle: "bold" } : {}),
    };
  });

  autoTable(doc, {
    startY: kpiTop + kpiH + 6,
    head: [cols.map((c) => c.header)],
    body: expenses.map((e) => cols.map((c) => c.get(e))),
    foot: [cols.map((c, i) => i === 0 ? "Total" : (c.total ?? ""))],
    styles: { fontSize: 8.5, cellPadding: 3, valign: "top", textColor: [40, 45, 65], lineColor: [225, 230, 240], lineWidth: 0.1 },
    headStyles: { fillColor: [BRAND.r, BRAND.g, BRAND.b], textColor: 255, fontStyle: "bold", fontSize: 9, cellPadding: 4, halign: "left" },
    footStyles: { fillColor: [LIGHT.r, LIGHT.g, LIGHT.b], textColor: [BRAND.r, BRAND.g, BRAND.b], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [LIGHT.r, LIGHT.g, LIGHT.b] },
    columnStyles,
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
