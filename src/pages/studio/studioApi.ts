import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { notify } from "@/pages/account/portal/api";
import type { InvoiceStatus, PersonLite, Project } from "@/pages/account/portal/types";

// Staff-only writes. RLS lets these through only when profiles.is_staff
// is true (see supabase/client-dashboard-schema.sql).

const must = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

export type ProjectPatch = Partial<
  Pick<Project, "name" | "event_date" | "event_type" | "project_status" | "services" | "progress" | "next_step" | "next_step_due" | "next_step_owner" | "cover_image_url" | "site_url">
>;

export async function updateProject(id: string, patch: ProjectPatch, announce?: string) {
  must(await supabase.from("events").update(patch).eq("id", id));
  if (announce) {
    must(await supabase.from("project_activity").insert({ event_id: id, kind: "status", title: announce }));
    notify({ kind: "project_update", eventId: id, title: announce });
  }
}

export async function createProject(input: { name: string; event_type: string; event_date: string | null; services: string[]; partner_code?: string | null }) {
  const row = must(
    await supabase
      .from("events")
      .insert({ ...input, owner_id: null, table_name: null, project_status: "in_progress", progress: 0, managed_by_studio: true })
      .select("id")
      .single(),
  );
  return (row as { id: string }).id;
}

export async function postUpdate(eventId: string, title: string, detail: string | null) {
  must(await supabase.from("project_activity").insert({ event_id: eventId, kind: "update", title, detail }));
  must(await supabase.from("events").update({ updated_at: new Date().toISOString() }).eq("id", eventId));
  notify({ kind: "project_update", eventId, title, detail });
}

export async function addTask(eventId: string, title: string, due: string | null) {
  must(await supabase.from("project_tasks").insert({ event_id: eventId, title, due_date: due }));
  notify({ kind: "project_update", eventId, title: `New task: ${title}`, detail: due ? `Due ${due}` : null });
}

export async function setTask(id: string, patch: { done_at?: string | null; title?: string; due_date?: string | null }) {
  must(await supabase.from("project_tasks").update(patch).eq("id", id));
}

export async function deleteTask(id: string) {
  must(await supabase.from("project_tasks").delete().eq("id", id));
}

export async function createInvoice(input: {
  event_id: string;
  description: string;
  amount: number;
  due_date: string | null;
  payment_url: string | null;
  notes: string | null;
}) {
  const row = must(await supabase.from("invoices").insert(input).select("id").single()) as { id: string };
  notify({ kind: "invoice", invoiceId: row.id });
}

export async function setInvoiceStatus(id: string, status: InvoiceStatus) {
  must(await supabase.from("invoices").update({ status, paid_at: status === "paid" ? new Date().toISOString() : null }).eq("id", id));
  if (status === "paid") notify({ kind: "payment", invoiceId: id });
}

/** A payment made outside PayMongo (bank transfer, cash…): the date it arrived, how, and an optional receipt email. */
export async function recordPayment(id: string, p: { paidOn: string; method: string; reference: string; sendReceipt: boolean }) {
  must(
    await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: p.paidOn ? `${p.paidOn}T12:00:00+08:00` : new Date().toISOString(), paid_method: p.method || null, paid_reference: p.reference.trim() || null })
      .eq("id", id),
  );
  if (p.sendReceipt) notify({ kind: "payment", invoiceId: id });
}

/** Undo "paid" (it was a mistake). Optionally tell the client, with a note. */
export async function markInvoiceUnpaid(id: string, tell: boolean, note: string) {
  must(await supabase.from("invoices").update({ status: "open", paid_at: null, paid_method: null, paid_reference: null }).eq("id", id));
  if (tell) notify({ kind: "invoice_unpaid", invoiceId: id, note });
}

/** Cancel an invoice. Optionally tell the client, with a note. */
export async function voidInvoice(id: string, tell: boolean, note: string) {
  must(await supabase.from("invoices").update({ status: "void" }).eq("id", id));
  if (tell) notify({ kind: "invoice_void", invoiceId: id, note });
}

/** Fix an unpaid invoice (typo in the amount, new due date…). The client sees the change on their invoice. */
export async function updateInvoice(id: string, patch: { description: string; amount: number; due_date: string | null; notes: string | null }) {
  must(await supabase.from("invoices").update(patch).eq("id", id).eq("status", "open"));
}

/** Email the client a reminder (also records when, for "Last reminded"). */
export async function sendInvoiceReminder(id: string) {
  await notify({ kind: "invoice_reminder", invoiceId: id });
}

export async function setInvoicePaymentUrl(id: string, url: string | null) {
  must(await supabase.from("invoices").update({ payment_url: url }).eq("id", id));
}

/** Email a client their invite code with step-by-step instructions. */
export async function emailInviteCode(eventId: string, code: string, email: string) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ kind: "invite_code", eventId, code, email }),
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn’t send the email.");
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export async function createInviteCode(eventId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  must(await supabase.from("invite_codes").insert({ code, event_id: eventId }));
  return code;
}

export async function loadInviteCodes(eventId: string) {
  const r = await supabase.from("invite_codes").select("code, used_at").eq("event_id", eventId);
  return (r.data ?? []) as { code: string; used_at: string | null }[];
}

export async function loadClients(projects: Project[]) {
  const ids = projects.map((p) => p.id);
  if (!ids.length) return { owners: {} as Record<string, PersonLite>, members: {} as Record<string, PersonLite[]> };
  const ownerIds = [...new Set(projects.map((p) => p.owner_id).filter(Boolean))] as string[];
  const [{ data: owners }, { data: members }] = await Promise.all([
    ownerIds.length ? supabase.from("profiles").select("id, full_name, email, avatar_url, is_staff").in("id", ownerIds) : { data: [] },
    supabase.from("event_members").select("event_id, profiles(id, full_name, email, avatar_url, is_staff)").in("event_id", ids),
  ]);
  const ownerMap: Record<string, PersonLite> = {};
  for (const o of owners ?? []) ownerMap[o.id] = o as PersonLite;
  const byProject: Record<string, PersonLite> = {};
  for (const p of projects) if (p.owner_id && ownerMap[p.owner_id]) byProject[p.id] = ownerMap[p.owner_id];
  const memberMap: Record<string, PersonLite[]> = {};
  for (const m of members ?? []) {
    const person = m.profiles as unknown as PersonLite | null;
    if (person) (memberMap[m.event_id as string] ??= []).push(person);
  }
  return { owners: byProject, members: memberMap };
}

export async function uploadCover(eventId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${eventId}/cover-${Date.now()}.${ext}`;
  must(await supabase.storage.from("project-covers").upload(path, file, { contentType: file.type, upsert: true }));
  return supabase.storage.from("project-covers").getPublicUrl(path).data.publicUrl;
}

/** Every client account (non-staff), newest first. */
export async function loadClientDirectory() {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, location, avatar_url, created_at")
    .eq("is_staff", false)
    .order("created_at", { ascending: false });
  return (data ?? []) as {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    avatar_url: string | null;
    created_at: string;
  }[];
}

// ---------------------------------------------------------------------------
// Team & roles (supabase/team-roles.sql). Role changes only happen through
// the database's team functions, which check that the owner is asking.

export type StaffRole = "owner" | "admin";
export type TeamMember = { id: string; full_name: string | null; email: string | null; avatar_url: string | null; staff_role: StaffRole; created_at: string };
export type StaffInvite = { id: string; email: string; role: "admin"; created_at: string; last_sent_at: string };
export type TeamEvent = { id: string; email: string | null; action: string; from_role: string | null; to_role: string | null; actor_id: string | null; created_at: string };

/** The team, pending invites and recent changes. `ready: false` = team-roles.sql hasn't been run. */
export async function loadTeam(myId: string) {
  const [members, invites, events] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url, staff_role, created_at").not("staff_role", "is", null),
    supabase.from("staff_invites").select("id, email, role, created_at, last_sent_at").is("accepted_at", null).is("cancelled_at", null).order("created_at", { ascending: false }),
    supabase.from("staff_role_events").select("id, email, action, from_role, to_role, actor_id, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  if (members.error) return { ready: false as const, error: members.error.message };
  const team = ((members.data ?? []) as TeamMember[]).sort((a, b) => (a.staff_role === b.staff_role ? (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "") : a.staff_role === "owner" ? -1 : 1));
  return {
    ready: true as const,
    team,
    myRole: team.find((m) => m.id === myId)?.staff_role ?? null,
    invites: (invites.data ?? []) as StaffInvite[],
    events: (events.data ?? []) as TeamEvent[],
  };
}

/** Add an admin by email: added now if they have an account, otherwise invited (and emailed). */
export async function inviteAdmin(email: string) {
  const out = must(await supabase.rpc("invite_admin", { p_email: email })) as { status: "added" | "invited"; profile_id?: string; invite_id?: string; resent?: boolean };
  notify(out.status === "added" ? { kind: "staff_added", profileId: out.profile_id } : { kind: "staff_invite", inviteId: out.invite_id });
  return out;
}

export async function resendStaffInvite(email: string) {
  return inviteAdmin(email);
}

export async function cancelStaffInvite(id: string) {
  must(await supabase.rpc("cancel_staff_invite", { p_invite: id }));
}

export async function removeAdmin(profileId: string) {
  must(await supabase.rpc("remove_admin", { p_profile: profileId }));
}

export async function transferOwnership(profileId: string) {
  must(await supabase.rpc("transfer_ownership", { p_profile: profileId }));
}

// ---------------------------------------------------------------------------
// Support saved replies (supabase/support-team-tools.sql). Staff only.

export type SavedReply = { id: string; title: string; body: string; updated_at: string };

export async function loadSavedReplies() {
  const { data, error } = await supabase.from("support_saved_replies").select("id, title, body, updated_at").order("title");
  if (error) return [] as SavedReply[];
  return (data ?? []) as SavedReply[];
}

export async function saveSavedReply(reply: { id?: string; title: string; body: string }) {
  const row = { title: reply.title.trim(), body: reply.body.trim(), updated_at: new Date().toISOString() };
  if (reply.id) must(await supabase.from("support_saved_replies").update(row).eq("id", reply.id));
  else {
    const { data } = await supabase.auth.getUser();
    must(await supabase.from("support_saved_replies").insert({ ...row, created_by: data.user?.id ?? null }));
  }
}

export async function deleteSavedReply(id: string) {
  must(await supabase.from("support_saved_replies").delete().eq("id", id));
}

// ---------------------------------------------------------------------------
// Support: holidays (business-hours clock) and the daily job's heartbeat
// (supabase/support-lifecycle.sql).

export type Holiday = { day: string; name: string };

let holidayCache: Holiday[] | null = null;
const holidayListeners = new Set<(h: Holiday[]) => void>();

export async function loadHolidays(force = false) {
  if (holidayCache && !force) return holidayCache;
  const { data, error } = await supabase.from("support_holidays").select("day, name").order("day");
  holidayCache = error ? [] : ((data ?? []) as Holiday[]);
  holidayListeners.forEach((fn) => fn(holidayCache!));
  return holidayCache;
}

/** Holiday days as a Set, for the reply clock. Shared by every Studio page; reloads after edits. */
export function useHolidays() {
  const [list, setList] = useState<Holiday[]>(holidayCache ?? []);
  useEffect(() => {
    holidayListeners.add(setList);
    loadHolidays().then(setList);
    return () => void holidayListeners.delete(setList);
  }, []);
  const days = useMemo(() => new Set(list.map((h) => h.day)), [list]);
  return { list, days };
}

export async function saveHoliday(h: Holiday) {
  must(await supabase.from("support_holidays").upsert({ day: h.day, name: h.name.trim() }));
  await loadHolidays(true);
}

export async function deleteHoliday(day: string) {
  must(await supabase.from("support_holidays").delete().eq("day", day));
  await loadHolidays(true);
}

export type JobRun = { job: string; last_run_at: string; details: { reminders?: number; closed?: number; digest?: boolean; followups?: number; errors?: string[] } | null };

export async function loadJobRun(job = "support-daily") {
  const { data } = await supabase.from("support_job_runs").select("job, last_run_at, details").eq("job", job).maybeSingle();
  return (data ?? null) as JobRun | null;
}

// ---------------------------------------------------------------------------
// Support: email replies (supabase/support-email-replies.sql)

export type InboundEmail = {
  email_id: string;
  received_at: string | null;
  created_at: string;
  from_address: string | null;
  subject: string | null;
  outcome: "processing" | "posted" | "new_request" | "note" | "unmatched" | "ignored" | "error";
  reason: string | null;
  thread_id: string | null;
};

export async function loadInboundEmails(limit = 15) {
  const { data, error } = await supabase
    .from("support_inbound_emails")
    .select("email_id, received_at, created_at, from_address, subject, outcome, reason, thread_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  return error ? null : ((data ?? []) as InboundEmail[]);
}

/** Move one customer message into a new request; returns the new request's id. */
export async function splitSupportMessage(messageId: string) {
  return must(await supabase.rpc("support_split_message", { p_message: messageId })) as string;
}

/** A new email reply address for a request — the old one stops working. */
export async function rotateReplyKey(threadId: string) {
  return must(await supabase.rpc("support_rotate_reply_key", { p_thread: threadId })) as string;
}

// ---------------------------------------------------------------------------
// DIY website prices (supabase/payments.sql). 0 = free to publish.

export type SitePrices = { free: number; premium: number };

export async function loadSitePrices(): Promise<SitePrices | null> {
  const { data, error } = await supabase.from("site_prices").select("tier, amount");
  if (error) return null;
  const by = Object.fromEntries((data ?? []).map((r) => [r.tier, Number(r.amount)]));
  return { free: by.free ?? 0, premium: by.premium ?? 0 };
}

export async function saveSitePrices(p: SitePrices) {
  const now = new Date().toISOString();
  must(await supabase.from("site_prices").upsert([{ tier: "free", amount: p.free, updated_at: now }, { tier: "premium", amount: p.premium, updated_at: now }]));
}

// ---------------------------------------------------------------------------
// Leads: every inquiry-form submission (supabase/hardening.sql → enquiries).

export type LeadStatus = "new" | "contacted" | "converted" | "archived" | "spam";
export type Lead = {
  id: string;
  form: "project-inquiry" | "partner-inquiry" | "faq-question" | string;
  name: string | null;
  email: string | null;
  phone: string | null;
  values: Record<string, string | string[]>;
  attachments: string[];
  status: LeadStatus;
  event_id: string | null;
  created_at: string;
};

export async function loadLeads() {
  const { data, error } = await supabase.from("enquiries").select("id, form, name, email, phone, values, attachments, status, event_id, created_at").order("created_at", { ascending: false }).limit(300);
  return error ? null : ((data ?? []) as Lead[]);
}

export async function countNewLeads() {
  const { count } = await supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
  return count ?? 0;
}

/** Free sites as advertising: signups their "Make your own" links brought in (last 30 days),
 *  and RSVP emails sent in the last 24 hours (the budget in supabase/free-premium.sql). */
export type FreeSiteStats = { signups: number; viaSite: number; viaEmail: number; topSites: { slug: string; count: number }[]; rsvpEmails24h: number };
export async function loadFreeSiteStats(): Promise<FreeSiteStats | null> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [refs, emails] = await Promise.all([
    supabase.from("profiles").select("referred_by, referred_via").not("referred_by", "is", null).gte("created_at", since).limit(5000),
    supabase.from("rsvp_email_log").select("recipients").gte("sent_at", new Date(Date.now() - 86_400_000).toISOString()).limit(10000),
  ]);
  if (refs.error || emails.error) return null; // free-premium.sql not run yet
  const rows = (refs.data ?? []) as { referred_by: string; referred_via: string | null }[];
  const bySite = new Map<string, number>();
  for (const r of rows) bySite.set(r.referred_by, (bySite.get(r.referred_by) ?? 0) + 1);
  return {
    signups: rows.length,
    viaSite: rows.filter((r) => r.referred_via !== "email").length,
    viaEmail: rows.filter((r) => r.referred_via === "email").length,
    topSites: [...bySite].map(([slug, count]) => ({ slug, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    rsvpEmails24h: (emails.data ?? []).reduce((n, e) => n + (e.recipients as number), 0),
  };
}

/** Projects deleted in the last 30 days (after that the daily job removes them for good). */
export type DeletedProject = { id: string; name: string; deleted_at: string; managed_by_studio: boolean };
export async function loadDeletedProjects(): Promise<DeletedProject[]> {
  const { data } = await supabase.from("events").select("id, name, deleted_at, managed_by_studio").not("deleted_at", "is", null).order("deleted_at", { ascending: false });
  return (data ?? []) as DeletedProject[];
}
export async function restoreProject(id: string) {
  const { error } = await supabase.rpc("restore_project", { p_event: id });
  if (error) throw new Error(/RESTORE_WINDOW_PASSED/.test(error.message) ? "It’s been more than 30 days since this project was deleted, so it can’t be restored." : "Couldn’t restore the project — please try again.");
}

export async function setLeadStatus(id: string, status: LeadStatus, eventId?: string) {
  must(await supabase.from("enquiries").update({ status, ...(eventId ? { event_id: eventId } : {}) }).eq("id", id));
}

// ---------------------------------------------------------------------------
// DIY websites (events customers made themselves — managed_by_studio = false)

export type DiySite = { slug: string | null; template: string | null; published_at: string | null; rsvps: number; paid: number };

export async function loadDiySites(eventIds: string[]) {
  const out: Record<string, DiySite> = {};
  if (!eventIds.length) return out;
  const [{ data: sites }, { data: rsvps }, { data: pays }] = await Promise.all([
    supabase.from("wedding_sites").select("event_id, slug, published_at, draft_presentation").in("event_id", eventIds),
    supabase.from("rsvps").select("event_id").in("event_id", eventIds),
    supabase.from("payments").select("event_id, amount_centavos").eq("kind", "site_publish").eq("status", "paid").in("event_id", eventIds),
  ]);
  for (const id of eventIds) out[id] = { slug: null, template: null, published_at: null, rsvps: 0, paid: 0 };
  for (const s of sites ?? []) Object.assign(out[s.event_id], { slug: s.slug, published_at: s.published_at, template: (s.draft_presentation as { activeTemplateId?: string } | null)?.activeTemplateId ?? null });
  for (const r of rsvps ?? []) out[r.event_id].rsvps++;
  for (const p of pays ?? []) out[p.event_id].paid += p.amount_centavos / 100;
  return out;
}

// ---------------------------------------------------------------------------
// Custom domains (supabase/custom-domains.sql, api/_lib/domains.ts)

export type DomainContact = {
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};
export type DomainSettingsRow = { enabled: boolean; fx_rate: number; multiplier: number; min_price: number; contact: Partial<DomainContact> | null };

export async function loadDomainSettings(): Promise<DomainSettingsRow | null> {
  const { data, error } = await supabase.from("domain_settings").select("enabled, fx_rate, multiplier, min_price, contact").eq("id", 1).maybeSingle();
  if (error || !data) return null; // custom-domains.sql not run yet
  return { ...data, fx_rate: Number(data.fx_rate), multiplier: Number(data.multiplier), min_price: Number(data.min_price) };
}
export async function saveDomainSettings(s: DomainSettingsRow) {
  must(await supabase.from("domain_settings").update({ ...s, updated_at: new Date().toISOString() }).eq("id", 1));
}

export type DomainRow = { id: string; domain: string; status: string; price_php: number; expires_at: string | null; last_error: string | null; created_at: string; event_id: string | null; events: { name: string } | null };
export async function loadDomains(): Promise<DomainRow[]> {
  const { data } = await supabase.from("site_domains").select("id, domain, status, price_php, expires_at, last_error, created_at, event_id, events(name)").order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as unknown as DomainRow[];
}
export async function retryDomain(id: string) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/domain-status", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ id, retry: true }),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Retry failed.");
  return json.status ?? "";
}

// ── Website banner (site_banner, supabase/site-banner.sql) ─────────────────
export type BannerRow = { enabled: boolean; text: string; link: string | null; color: string; text_color: string };
export async function loadSiteBanner(): Promise<BannerRow | null> {
  const { data, error } = await supabase.from("site_banner").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return null; // site-banner.sql not run yet
  return { enabled: data.enabled, text: data.text, link: data.link, color: data.color ?? "#3fb6dc", text_color: data.text_color ?? "#ffffff" };
}
export async function saveSiteBanner(b: BannerRow) {
  must(await supabase.from("site_banner").update({ ...b, updated_at: new Date().toISOString() }).eq("id", 1));
}

// ── Partner program (supabase/revenue.sql) ─────────────────────────────────
export type PartnerKind = "planner" | "influencer" | "other";
export type PartnerRow = {
  id: string;
  code: string;
  kind: PartnerKind;
  name: string;
  business: string | null;
  email: string | null;
  phone: string | null;
  handle: string | null;
  payout_details: string | null;
  rate: number;
  discount: number;
  active: boolean;
  notes: string | null;
  created_at: string;
  rate_mode: "tiered" | "custom";
  welcomed_at: string | null;
  tier: "starter" | "silver" | "gold" | "custom";
  tier_rate: number;
  next_tier: string | null;
  next_at: number | null;
  clicks: number;
  enquiries: number;
  signups: number;
  paying: number;
  revenue: number;
  commission: number;
  paid_out: number;
  owed: number;
};
export type PartnerInput = Pick<PartnerRow, "code" | "kind" | "name" | "business" | "email" | "phone" | "handle" | "payout_details" | "rate" | "discount" | "active" | "notes" | "rate_mode">;
export type PartnerPersonRow = { kind: "enquiry" | "signup" | "project"; person: string; email: string | null; project: string | null; status: string; revenue: number; commission: number; created_at: string };

const NUM_KEYS = ["rate", "discount", "tier_rate", "clicks", "enquiries", "signups", "paying", "revenue", "commission", "paid_out", "owed"] as const;

/** null = revenue.sql not run yet. */
export async function loadPartners(): Promise<PartnerRow[] | null> {
  const { data, error } = await supabase.rpc("partner_report");
  if (error) return null;
  return ((data ?? []) as PartnerRow[]).map((r) => ({ ...r, ...Object.fromEntries(NUM_KEYS.map((k) => [k, Number(r[k] ?? 0)])) }));
}
export async function savePartner(id: string | null, p: PartnerInput): Promise<string> {
  const row = {
    code: p.code.trim().toUpperCase(),
    kind: p.kind,
    name: p.name.trim(),
    business: p.business?.trim() || null,
    email: p.email?.trim().toLowerCase() || null,
    phone: p.phone?.trim() || null,
    handle: p.handle?.trim() || null,
    payout_details: p.payout_details?.trim() || null,
    rate: p.rate,
    rate_mode: p.rate_mode ?? "tiered",
    discount: p.discount,
    active: p.active,
    notes: p.notes?.trim() || null,
  };
  const { data, error } = id ? await supabase.from("partners").update(row).eq("id", id).select("id").single() : await supabase.from("partners").insert(row).select("id").single();
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "That code is taken — pick another." : /code/i.test(error.message) ? "Codes are 3–20 letters or numbers." : "Couldn’t save the partner.");
  return (data as { id: string }).id;
}
/** The branded welcome email (api/notify.ts → partner_welcome): code, link, tiers, how to log in. */
export async function sendPartnerWelcome(partnerId: string) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ kind: "partner_welcome", partnerId }),
  }).catch(() => null);
  const out = (await res?.json().catch(() => ({}))) as { sent?: number; error?: string } | undefined;
  if (!res?.ok || !out?.sent) throw new Error(out?.error ?? "Couldn’t send the welcome email — please try again.");
}
export async function loadPartnerPeople(partnerId: string): Promise<PartnerPersonRow[]> {
  const { data } = await supabase.rpc("partner_referrals", { p_partner: partnerId });
  return ((data ?? []) as PartnerPersonRow[]).map((p) => ({ ...p, revenue: Number(p.revenue), commission: Number(p.commission) }));
}
export async function addPartnerPayout(partnerId: string, amount: number, note: string) {
  must(await supabase.from("partner_payouts").insert({ partner_id: partnerId, amount, note: note.trim() || null }));
}

export type SourceRow = { source: string; signups: number; enquiries: number; paying_customers: number; revenue: number };
/** null = revenue.sql not run yet. */
export async function loadSourceReport(days = 90): Promise<SourceRow[] | null> {
  const { data, error } = await supabase.rpc("source_report", { p_days: days });
  if (error) return null;
  return ((data ?? []) as SourceRow[]).map((r) => ({ ...r, signups: Number(r.signups), enquiries: Number(r.enquiries), paying_customers: Number(r.paying_customers), revenue: Number(r.revenue) }));
}

/** Which partner a project is credited to (their commission; supabase/revenue.sql). undefined = not set up yet. */
export async function loadProjectPartner(id: string): Promise<string | null | undefined> {
  const { data, error } = await supabase.from("events").select("partner_code").eq("id", id).maybeSingle();
  if (error) return undefined;
  return (data?.partner_code as string | null) ?? null;
}
export async function setProjectPartner(id: string, code: string | null) {
  if (code) {
    const { data } = await supabase.rpc("partner_code_valid", { p_code: code });
    if (!(Array.isArray(data) ? data[0] : data)) throw new Error("No active partner has that code.");
  }
  must(await supabase.from("events").update({ partner_code: code ? code.toUpperCase() : null }).eq("id", id));
}

/** For the invoice form: does this project's client get 10% off, and why? null = not set up yet. */
export async function loadBookingDiscount(eventId: string): Promise<{ pct: number; reason: "first" | "partner" | null; partnerCode: string | null } | null> {
  const { data, error } = await supabase.rpc("booking_discount", { p_event: eventId });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { pct: Number(row.pct ?? 0), reason: row.reason ?? null, partnerCode: row.partner_code ?? null } : { pct: 0, reason: null, partnerCode: null };
}

// ── Revenue (owner only, supabase/revenue-report.sql) ───────────────────────
export type RevenueItem = { paid_at: string; source: "package" | "premium" | "domain" | "renewal"; amount: number; cost: number; commission: number; event_id: string | null; label: string | null; method: string | null };
/** null = not allowed (not the owner) or the report isn't set up yet. */
export async function loadRevenue(from: Date, to: Date): Promise<RevenueItem[] | null> {
  const { data, error } = await supabase.rpc("revenue_items", { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) return null;
  return ((data ?? []) as RevenueItem[]).map((r) => ({ ...r, amount: Number(r.amount), cost: Number(r.cost), commission: Number(r.commission) }));
}
export async function loadPayouts(from: Date, to: Date): Promise<{ paid_at: string; amount: number; partner: string; note: string | null }[]> {
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const { data } = await supabase.rpc("revenue_payouts", { p_from: d(from), p_to: d(to) });
  return ((data ?? []) as { paid_at: string; amount: number; partner: string; note: string | null }[]).map((r) => ({ ...r, amount: Number(r.amount) }));
}

let ownerCheck: Promise<boolean> | null = null;
/** Is the signed-in staff member the owner? (Revenue is owner-only.) Cached per page load. */
export function isOwner(): Promise<boolean> {
  ownerCheck ??= Promise.resolve(supabase.rpc("is_owner")).then(({ data }) => data === true);
  return ownerCheck;
}

// ── Site health (Sentry errors + UptimeRobot; api/_lib/health-handler.ts) ──────
export type HealthIssue = { id: string; shortId: string; title: string; culprit: string; count: number; users: number; firstSeen: string; lastSeen: string; level: string; url: string };
export type HealthMonitor = { name: string; url: string; status: "up" | "down" | "paused" | "pending"; uptime30: number | null };
export type SiteHealth = {
  sentry: { configured: false } | { configured: true; issues: HealthIssue[]; allUrl?: string; error?: string };
  uptime: { configured: false } | { configured: true; monitors: HealthMonitor[]; dashboardUrl?: string; error?: string };
};
/** null = couldn't load (offline, or the API isn't deployed yet). */
export async function loadSiteHealth(): Promise<SiteHealth | null> {
  const { data } = await supabase.auth.getSession();
  try {
    const res = await fetch("/api/site-health", { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    if (!res.ok) return null;
    return (await res.json()) as SiteHealth;
  } catch {
    return null;
  }
}

// ── Promo codes (supabase/guest-features.sql) ─────────────────────────────────
export type PromoCode = { code: string; percent_off: number; note: string | null; active: boolean; starts_on: string | null; ends_on: string | null; max_uses: number | null; uses: number; created_at: string };
/** null = guest-features.sql not run yet. */
export async function loadPromoCodes(): Promise<PromoCode[] | null> {
  const { data, error } = await supabase.rpc("promo_code_stats");
  if (error) return null;
  return ((data ?? []) as PromoCode[]).map((r) => ({ ...r, percent_off: Number(r.percent_off), uses: Number(r.uses), max_uses: r.max_uses === null ? null : Number(r.max_uses) }));
}
export async function savePromoCode(p: { code: string; percent_off: number; note: string | null; starts_on: string | null; ends_on: string | null; max_uses: number | null }) {
  const { error } = await supabase.from("promo_codes").insert({ ...p, code: p.code.toUpperCase() });
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "That code already exists." : /check/i.test(error.message) ? "Codes are 3–20 letters or numbers, 1–90% off." : error.message);
}
export async function setPromoActive(code: string, active: boolean) {
  const { error } = await supabase.from("promo_codes").update({ active }).eq("code", code);
  if (error) throw new Error(error.message);
}
