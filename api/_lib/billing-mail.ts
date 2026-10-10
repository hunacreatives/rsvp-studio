import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";
import { FROM, layout, makeSendMail } from "./support-mail.js";

// Invoice emails to the client — from the Studio (api/notify.ts) and from
// PayMongo payments (api/paymongo-webhook.ts). Billing emails go to the
// event's people who keep billing updates on (their billing address if set).

export type InvoiceMailKind = "invoice" | "payment" | "reminder" | "void" | "unpaid";

const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);
/** "2026-10-14" → "October 14, 2026" (dates without a time, so no timezone shift). */
export const longDate = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

const METHOD_LABEL: Record<string, string> = {
  gcash: "GCash",
  paymaya: "Maya",
  maya: "Maya",
  card: "card",
  qrph: "QR Ph",
  grab_pay: "GrabPay",
  dob: "online banking",
  billease: "BillEase",
  bank_transfer: "bank transfer",
  cash: "cash",
};
export const methodLabel = (m: string | null | undefined) => (m ? (METHOD_LABEL[m.toLowerCase()] ?? m) : "");

async function billingRecipients(db: SupabaseClient, eventId: string) {
  const ids = new Set<string>();
  const { data: ev } = await db.from("events").select("owner_id, name").eq("id", eventId).maybeSingle();
  if (ev?.owner_id) ids.add(ev.owner_id);
  const { data: members } = await db.from("event_members").select("profile_id").eq("event_id", eventId);
  for (const m of members ?? []) ids.add(m.profile_id);
  if (!ids.size) return { to: [] as string[], eventName: (ev?.name as string) ?? "" };
  const { data } = await db.from("profiles").select("email, billing_email, is_staff, notify_billing_updates").in("id", [...ids]);
  const to = (data ?? [])
    .filter((p) => !p.is_staff && p.notify_billing_updates !== false && (p.billing_email || p.email))
    .map((p) => (p.billing_email || p.email) as string);
  return { to, eventName: (ev?.name as string) ?? "" };
}

/** Send one kind of invoice email. `note` is the studio's optional message (void / unpaid). */
export async function sendInvoiceEmail(
  db: SupabaseClient,
  sendMail: ReturnType<typeof makeSendMail>,
  opts: { invoiceId: string; kind: InvoiceMailKind; origin: string; note?: string | null },
) {
  const { data: inv } = await db
    .from("invoices")
    .select("id, number, event_id, description, amount, due_date, status, paid_method")
    .eq("id", opts.invoiceId)
    .maybeSingle();
  if (!inv) throw new Error("Invoice not found");
  const { to, eventName } = await billingRecipients(db, inv.event_id);
  if (!to.length) return 0;

  const amount = peso(Number(inv.amount));
  const forWhat = eventName ? ` for ${eventName}` : "";
  const due = inv.due_date ? longDate(inv.due_date) : "";
  const note = opts.note?.trim() ? `<br><br><span style="color:#868697">Note from the studio:</span><br>${esc(opts.note.trim()).replace(/\n/g, "<br>")}` : "";
  const link = `${opts.origin}/account/billing/${inv.id}`;
  const payLine = "You can pay online with GCash, Maya, card or QR Ph.";

  const mail = {
    invoice: {
      subject: `New invoice — ${amount}${forWhat}`,
      heading: "You have a new invoice",
      body: `${esc(inv.description)}<br><strong>${amount}</strong>${due ? ` · due ${due}` : " · due now"}<br><br>${payLine}`,
      cta: "View and pay",
    },
    reminder: {
      subject: `Reminder: ${amount} ${due ? `due ${due}` : "due now"}${forWhat}`,
      heading: "A friendly reminder",
      body: `Invoice ${esc(inv.number)} for ${esc(inv.description)} — <strong>${amount}</strong> — is ${due && new Date(`${inv.due_date}T23:59:59+08:00`) < new Date() ? `past its due date (${due})` : due ? `due ${due}` : "due now"}.<br><br>${payLine} If you’ve already paid, thank you — just reply in your dashboard and we’ll check.`,
      cta: "View and pay",
    },
    payment: {
      subject: `Payment received — ${amount}${forWhat}`,
      heading: "Thank you — payment received",
      body: `We’ve received your payment of <strong>${amount}</strong>${inv.paid_method ? ` by ${esc(methodLabel(inv.paid_method))}` : ""} for ${esc(inv.description)}. Your receipt is ready in your dashboard.`,
      cta: "View receipt",
    },
    void: {
      subject: `Invoice cancelled — ${esc(inv.number)}${forWhat}`,
      heading: "An invoice was cancelled",
      body: `Invoice ${esc(inv.number)} for ${esc(inv.description)} (${amount}) has been cancelled, so there’s nothing to pay on it.${note}`,
      cta: "View billing",
    },
    unpaid: {
      subject: `Correction: invoice ${esc(inv.number)} is still open${forWhat}`,
      heading: "A correction to your invoice",
      body: `We marked invoice ${esc(inv.number)} (${amount}) as paid by mistake, so it shows as unpaid again.${note}`,
      cta: "View invoice",
    },
  }[opts.kind];

  const results = await Promise.allSettled(
    to.map((addr) =>
      sendMail({
        from: FROM,
        to: addr,
        subject: mail.subject,
        html: layout(esc(mail.heading), mail.body, { label: mail.cta, url: opts.kind === "void" ? `${opts.origin}/account/billing` : link }),
      }),
    ),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}
