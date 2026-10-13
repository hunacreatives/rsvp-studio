import type { SupabaseClient } from "@supabase/supabase-js";
import { sendInvoiceEmail } from "./billing-mail.js";
import type { makeSendMail } from "./support-mail.js";

// Automatic invoice reminders (daily job): an open invoice gets the existing "A friendly
// reminder" email on its due date, then again every ~4 days, for up to 10 days past due
// (about three reminders). After that it's the studio's call (Studio → Invoices).
// Each invoice is claimed by moving last_reminded_at first, so a second run can't resend.
// A reminder sent by hand from Studio counts too.

const AGAIN_AFTER_MS = 3.5 * 86_400_000;
const STOP_AFTER_DAYS = 10;
const MAX_PER_RUN = 30;

export async function sendInvoiceReminders(db: SupabaseClient, sendMail: ReturnType<typeof makeSendMail>, origin: string, opts: { deadline: number }) {
  const report = { sent: 0, errors: [] as string[] };
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  const oldest = new Date(Date.parse(today) - STOP_AFTER_DAYS * 86_400_000).toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - AGAIN_AFTER_MS).toISOString();
  const { data, error } = await db
    .from("invoices")
    .select("id, number, last_reminded_at")
    .eq("status", "open")
    .lte("due_date", today)
    .gte("due_date", oldest)
    .or(`last_reminded_at.is.null,last_reminded_at.lt.${cutoff}`)
    .limit(MAX_PER_RUN);
  if (error) {
    report.errors.push(`invoice reminders: ${error.message}`);
    return report;
  }
  for (const inv of data ?? []) {
    if (Date.now() > opts.deadline) break;
    try {
      // Claim it (only if nobody reminded them since the list was read).
      let claim = db.from("invoices").update({ last_reminded_at: new Date().toISOString() }).eq("id", inv.id).eq("status", "open");
      claim = inv.last_reminded_at ? claim.eq("last_reminded_at", inv.last_reminded_at) : claim.is("last_reminded_at", null);
      const { data: claimed } = await claim.select("id");
      if (!claimed?.length) continue;
      const n = await sendInvoiceEmail(db, sendMail, { invoiceId: inv.id, kind: "reminder", origin });
      if (n) report.sent++;
    } catch (e) {
      report.errors.push(`invoice reminder ${inv.number}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return report;
}
