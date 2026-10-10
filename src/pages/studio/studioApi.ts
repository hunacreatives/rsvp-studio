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

export async function createProject(input: { name: string; event_type: string; event_date: string | null; services: string[] }) {
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

export type JobRun = { job: string; last_run_at: string; details: { reminders?: number; closed?: number; digest?: boolean; errors?: string[] } | null };

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
