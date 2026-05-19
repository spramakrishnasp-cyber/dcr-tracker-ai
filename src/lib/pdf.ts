import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { CallReport, Customer, TravelExpense } from "./queries";
import { supabase } from "@/integrations/supabase/client";

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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cMap = new Map(customers.map((c) => [c.id, c]));
  const pMap = new Map(profiles.map((p) => [p.id, p]));

  const LEFT = 18;
  const RIGHT = W - 18;
  const CONTENT_W = RIGHT - LEFT;
  const BOTTOM = H - 18;

  const drawHeaderRule = (y: number) => {
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.4);
    doc.line(LEFT, y, RIGHT, y);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(225, 230, 240);
    doc.setLineWidth(0.3);
    doc.line(LEFT, H - 14, RIGHT, H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Sales DCR System - Confidential", LEFT, H - 8);
    doc.text(`Page ${pageNum} of ${totalPages}`, RIGHT, H - 8, { align: "right" });
  };

  // Title page header
  let y = 22;
  drawHeaderRule(y);
  y += 8;
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, LEFT, y);
  if (subtitle) {
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(subtitle, LEFT, y);
  }
  y += 4;
  drawHeaderRule(y);
  y += 8;

  // Split a discussion into intro (Note) + numbered items.
  // Recognises lines starting with "1." / "2)" / "•" / "-".
  const splitDiscussion = (raw: string | null) => {
    if (!raw) return { note: "", items: [] as string[] };
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const noteLines: string[] = [];
    const items: string[] = [];
    let inItems = false;
    let current = "";
    const itemStart = /^(\d+)[.)]\s+(.*)$/;
    const bulletStart = /^[-•*]\s+(.*)$/;
    for (const line of lines) {
      const m1 = line.match(itemStart);
      const m2 = line.match(bulletStart);
      if (m1 || m2) {
        if (current) items.push(current.trim());
        current = (m1 ? m1[2] : m2![1]) ?? "";
        inItems = true;
      } else if (inItems) {
        current += " " + line;
      } else {
        noteLines.push(line);
      }
    }
    if (current) items.push(current.trim());
    return { note: noteLines.join(" "), items };
  };

  const writeLabelValue = (label: string, value: string, startY: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    const labelText = `${label}:`;
    doc.text(labelText, LEFT, startY);
    const labelWidth = doc.getTextWidth(labelText) + 1.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const wrapped = doc.splitTextToSize(value || "", CONTENT_W - labelWidth);
    doc.text(wrapped, LEFT + labelWidth, startY);
    return startY + wrapped.length * 5.5;
  };

  const ensureSpace = (need: number) => {
    if (y + need > BOTTOM) {
      doc.addPage();
      y = 22;
      drawHeaderRule(y);
      y += 8;
    }
  };

  reports.forEach((r, idx) => {
    const c = cMap.get(r.customer_id ?? "");
    const p = pMap.get(r.user_id);
    const { note, items } = splitDiscussion(r.discussion);

    const dateStr = `${format(parseISO(r.call_date), "MMMM d, yyyy")}${r.call_time ? ` at ${format(new Date(`2000-01-01T${r.call_time}`), "h:mm a")}` : ""}`;
    const contact = [c?.contact_person, c?.customer_name].filter(Boolean).join(" - ") || c?.customer_name || "-";

    ensureSpace(60);

    y = writeLabelValue("Date", dateStr, y);
    y = writeLabelValue("Contact", contact, y);
    if (c?.company_name) y = writeLabelValue("Company Name", c.company_name, y);
    y = writeLabelValue("Title", r.meeting_type, y);
    y = writeLabelValue("Location", r.location ?? "", y);
    y = writeLabelValue("Employee", p?.full_name ?? "-", y);
    y = writeLabelValue("Status", r.order_status, y);
    if (r.product_discussed) y = writeLabelValue("Product", r.product_discussed, y);
    if (r.next_follow_up) y = writeLabelValue("Next Follow-up", format(parseISO(r.next_follow_up), "MMMM d, yyyy"), y);

    if (note) {
      y += 2;
      ensureSpace(10);
      y = writeLabelValue("Note", note, y);
    }

    if (items.length) {
      y += 3;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      items.forEach((item, i) => {
        const text = `${i + 1}. ${item}`;
        const wrapped = doc.splitTextToSize(text, CONTENT_W);
        ensureSpace(wrapped.length * 5.5 + 3);
        doc.text(wrapped, LEFT, y);
        y += wrapped.length * 5.5 + 2;
      });
    }

    if (r.meeting_outcome) {
      y += 2;
      ensureSpace(10);
      y = writeLabelValue("Outcome", r.meeting_outcome, y);
    }

    // Separator between reports
    if (idx < reports.length - 1) {
      y += 6;
      ensureSpace(8);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(LEFT, y, RIGHT, y);
      y += 8;
    }
  });

  if (reports.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("No reports to display.", LEFT, y);
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

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
export async function exportExpensesPdf(opts: {
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

  // ===== Append attached receipts =====
  type Receipt = { path: string; label: string };
  const receipts: Receipt[] = [];
  for (const e of expenses) {
    const dateLabel = format(parseISO(e.expense_date), "MMM d, yyyy");
    if (e.lodging_receipt_url) receipts.push({ path: e.lodging_receipt_url, label: `${dateLabel} - Lodging` });
    if (e.travel_fare_receipt_url) receipts.push({ path: e.travel_fare_receipt_url, label: `${dateLabel} - Travel Fare` });
    (e.other_expenses_items ?? []).forEach((it) => {
      if (it.receipt_url) receipts.push({ path: it.receipt_url, label: `${dateLabel} - ${it.category}` });
    });
  }

  if (receipts.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text("Attached Receipts", 14, 20);
    doc.setDrawColor(225, 230, 240);
    doc.line(14, 24, W - 14, 24);

    for (const r of receipts) {
      try {
        const { data: signed } = await supabase.storage
          .from("expense-receipts")
          .createSignedUrl(r.path, 60 * 10);
        if (!signed?.signedUrl) continue;
        const res = await fetch(signed.signedUrl);
        const blob = await res.blob();
        const isImage = blob.type.startsWith("image/");
        const isPdf = blob.type === "application/pdf" || r.path.toLowerCase().endsWith(".pdf");

        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
        doc.text(r.label, 14, 16);
        doc.setDrawColor(225, 230, 240);
        doc.line(14, 19, W - 14, 19);

        if (isImage) {
          const dataUrl: string = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = reject;
            fr.readAsDataURL(blob);
          });
          // Load image to get natural dimensions for aspect-correct fit
          const dims = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve({ w: 1, h: 1 });
            img.src = dataUrl;
          });
          const maxW = W - 28;
          const maxH = H - 35;
          const ratio = Math.min(maxW / dims.w, maxH / dims.h);
          const drawW = dims.w * ratio;
          const drawH = dims.h * ratio;
          const fmt = blob.type.includes("png") ? "PNG" : "JPEG";
          doc.addImage(dataUrl, fmt, (W - drawW) / 2, 24, drawW, drawH);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text(
            isPdf
              ? "PDF receipt attached - open the source file to view."
              : `Attachment type ${blob.type || "unknown"} - cannot preview inline.`,
            14,
            32,
          );
          doc.setTextColor(37, 99, 235);
          doc.textWithLink("Open receipt", 14, 40, { url: signed.signedUrl });
        }
      } catch {
        // skip failed receipt
      }
    }
  }

  doc.save(`${title.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
