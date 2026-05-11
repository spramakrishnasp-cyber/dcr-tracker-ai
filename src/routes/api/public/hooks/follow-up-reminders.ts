import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/hooks/follow-up-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SERVICE_KEY) {
          return Response.json({ error: "Server not configured" }, { status: 500 });
        }
        const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

        // Determine target dates
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const tmr = new Date(today.getTime() + 86400000);
        const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, "0")}-${String(tmr.getDate()).padStart(2, "0")}`;

        // Settings
        const { data: settings } = await sb.from("app_settings").select("*").limit(1).maybeSingle();
        const webhook = (settings as any)?.whatsapp_webhook_url;
        const morningOn = (settings as any)?.reminder_morning_enabled ?? true;
        const eveningOn = (settings as any)?.reminder_evening_before_enabled ?? true;

        if (!webhook) return Response.json({ ok: true, skipped: "no webhook configured" });

        // Optional explicit kind from caller
        let body: any = {};
        try { body = await request.json(); } catch {}
        const explicitKind = body?.kind as "evening_before" | "morning_of" | undefined;

        const tasks: { kind: "evening_before" | "morning_of"; date: string }[] = [];
        if ((explicitKind === "evening_before" || !explicitKind) && eveningOn) tasks.push({ kind: "evening_before", date: tmrStr });
        if ((explicitKind === "morning_of" || !explicitKind) && morningOn) tasks.push({ kind: "morning_of", date: todayStr });

        let sent = 0, skipped = 0, failed = 0;

        for (const t of tasks) {
          const { data: reports } = await sb
            .from("call_reports")
            .select("id, user_id, customer_id, call_date, next_follow_up, discussion, meeting_outcome")
            .eq("next_follow_up", t.date);

          if (!reports?.length) continue;

          const userIds = [...new Set(reports.map((r: any) => r.user_id))];
          const customerIds = [...new Set(reports.map((r: any) => r.customer_id).filter(Boolean))];
          const [{ data: profiles }, { data: customers }] = await Promise.all([
            sb.from("profiles").select("id, full_name, whatsapp_number").in("id", userIds),
            customerIds.length
              ? sb.from("customers").select("id, customer_name, company_name").in("id", customerIds)
              : Promise.resolve({ data: [] as any[] }),
          ]);
          const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
          const customerMap = new Map((customers ?? []).map((c: any) => [c.id, c]));

          for (const r of reports as any[]) {
            // dedupe
            const { data: already } = await sb
              .from("reminder_log")
              .select("id")
              .eq("report_id", r.id)
              .eq("kind", t.kind)
              .maybeSingle();
            if (already) { skipped++; continue; }

            const prof = profileMap.get(r.user_id);
            const wa = prof?.whatsapp_number;
            if (!wa) { skipped++; continue; }
            const cust = r.customer_id ? customerMap.get(r.customer_id) : null;
            const customerName = cust ? `${cust.customer_name}${cust.company_name ? " (" + cust.company_name + ")" : ""}` : "customer";

            const message = t.kind === "evening_before"
              ? `Reminder: tomorrow (${t.date}) follow-up with ${customerName}.`
              : `Today (${t.date}) follow-up with ${customerName}. Don't forget!`;

            try {
              const res = await fetch(webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  whatsapp_number: wa,
                  employee_name: prof?.full_name,
                  customer_name: customerName,
                  call_date: r.call_date,
                  next_follow_up: r.next_follow_up,
                  kind: t.kind,
                  message,
                  report_id: r.id,
                }),
              });
              if (!res.ok) throw new Error(`Webhook ${res.status}`);
              await sb.from("reminder_log").insert({ report_id: r.id, kind: t.kind });
              sent++;
            } catch (e) {
              console.error("reminder send failed", r.id, e);
              failed++;
            }
          }
        }

        return Response.json({ ok: true, sent, skipped, failed, today: todayStr, tomorrow: tmrStr });
      },
    },
  },
});
