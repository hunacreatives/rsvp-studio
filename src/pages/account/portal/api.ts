import type { SaveTheDate } from "@/pages/wedding-sites/content/saveTheDate";
import { supabase } from "@/lib/supabase";
import type { Activity, Attachment, EventAccess, Invoice, Message, PersonLite, Profile, Project, Task, Thread, ThreadKind, ThreadSummary, SupportCategory, SupportStatus } from "./types";
import { isUnclaimed } from "./types";

export type SiteInfo = {
  slug: string;
  publishedAt: string | null;
  templateId: string | null;
  heroUrl: string | null;
  /** "Replies close on" (content.rsvpDeadline), YYYY-MM-DD. */
  deadline?: string | null;
  /** DIY sites (supabase/project-lifecycle.sql): online until this date; null = no end set. */
  liveUntil?: string | null;
  /** The site went offline after its event. */
  ended?: boolean;
  premium?: boolean;
  /** When its guest RSVPs and photos were removed (30 days after it ended). */
  guestsPurgedAt?: string | null;
  /** A studio Save the Date on this link (supabase/save-the-date.sql), and whether the link shows it. */
  std?: SaveTheDate | null;
  stdLive?: boolean;
};

export type PortalSnapshot = {
  profile: Profile;
  projects: Project[];
  tasks: Task[];
  activity: Activity[];
  invoices: Invoice[];
  threads: ThreadSummary[];
  people: Record<string, PersonLite>;
  sites: Record<string, SiteInfo>;
};

export type Guest = {
  id: string;
  name: string | null;
  email: string | null;
  /** Shared `rsvps` table only: guests can answer with a mobile number instead. */
  phone?: string | null;
  message: string | null;
  created_at: string | null;
  bringing?: string | null;
  guest_count?: number | null;
  /** Of guest_count, how many are kids (supabase/baby-events.sql). */
  kid_count?: number | null;
  /** Shared to the site's message wall, and whether the host hid it (supabase/under-glass.sql). */
  message_public?: boolean | null;
  message_hidden?: boolean | null;
  attending?: boolean | null;
  dietary?: string | null;
  /** Answers to the hosts' own questions, by question (supabase/guest-links.sql). */
  answers?: Record<string, string> | null;
  /** Replied from their personal invite link. */
  invitee_id?: string | null;
};

const PROFILE_COLS =
  "id, full_name, email, created_at, is_staff, phone, location, avatar_url, billing_name, billing_email, billing_address, notify_project_updates, notify_billing_updates, notify_tips, password_changed_at";

const BASE_PROJECT_COLS =
  "id, name, event_date, event_type, table_name, status, project_status, services, progress, next_step, next_step_due, cover_image_url, site_url, completed_at, updated_at, created_at, owner_id, next_step_owner, managed_by_studio, deleted_at";
// Client events (supabase/coordinator-desk.sql). Until that file is on the database these
// columns don't exist, and every read falls back to the ones without them.
const PROJECT_COLS = `${BASE_PROJECT_COLS}, client_of, handed_over_at`;
const NO_COLUMN = "42703";

type SiteRow = {
  event_id: string;
  slug: string;
  published_at: string | null;
  std?: SaveTheDate | null;
  std_live?: boolean;
  draft_content: { galleries?: { items?: { image?: { masterUrl?: string } }[] }[]; rsvpDeadline?: string } | null;
  draft_presentation: {
    activeTemplateId?: string;
    byTemplate?: Record<string, { heroImage?: { masterUrl?: string } }>;
  } | null;
};

function siteInfo(row: SiteRow): SiteInfo {
  const templateId = row.draft_presentation?.activeTemplateId ?? null;
  const hero =
    (templateId && row.draft_presentation?.byTemplate?.[templateId]?.heroImage?.masterUrl) ||
    row.draft_content?.galleries?.[0]?.items?.[0]?.image?.masterUrl ||
    null;
  const deadline = row.draft_content?.rsvpDeadline;
  return { slug: row.slug, publishedAt: row.published_at, templateId, heroUrl: hero, deadline: deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null, std: row.std ?? null, stdLive: row.std_live === true };
}

/** Projects the user can see. Staff see every project (RLS allows it). */
async function loadProjects(userId: string, staff: boolean, cols = PROJECT_COLS): Promise<Project[]> {
  type Row = Omit<Project, "role" | "access">;
  if (staff) {
    // Deleted projects only appear in Studio → Projects → Deleted (studioApi.loadDeletedProjects).
    const { data, error } = await supabase.from("events").select(cols).is("deleted_at", null).order("updated_at", { ascending: false });
    if (error && cols !== BASE_PROJECT_COLS) return loadProjects(userId, staff, BASE_PROJECT_COLS);
    return ((data ?? []) as unknown as Row[]).map((e) => ({ ...e, role: e.owner_id === userId ? "Owner" : "Member", access: "owner" }));
  }
  const [own, member] = await Promise.all([
    supabase.from("events").select(cols).eq("owner_id", userId),
    supabase.from("event_members").select(`role, events(${cols})`).eq("profile_id", userId),
  ]);
  if ((own.error || member.error) && cols !== BASE_PROJECT_COLS) return loadProjects(userId, staff, BASE_PROJECT_COLS);
  const byId = new Map<string, Project>();
  for (const e of (own.data ?? []) as unknown as Row[]) byId.set(e.id, { ...e, role: "Owner", access: "owner" });
  for (const r of (member.data ?? []) as unknown as { role: string; events: Row | null }[]) {
    const e = r.events;
    const access = (["cohost", "coordinator", "viewer"].includes(r.role as string) ? r.role : "cohost") as EventAccess;
    if (e && !byId.has(e.id)) byId.set(e.id, { ...e, role: "Member", access });
  }
  const list = [...byId.values()].filter((p) => p.status !== "archived" && !p.deleted_at);
  // Client events I still own: the hand-over invite that's out, if any (the next step waits on it).
  const unclaimed = list.filter(isUnclaimed).map((p) => p.id);
  if (unclaimed.length) {
    const { data } = await supabase
      .from("event_invites")
      .select("event_id, email")
      .eq("role", "owner")
      .is("accepted_at", null)
      .is("cancelled_at", null)
      .gt("expires_at", new Date().toISOString())
      .in("event_id", unclaimed);
    const to = new Map((data ?? []).map((i) => [i.event_id as string, i.email as string]));
    for (const p of list) if (to.has(p.id)) p.handover_to = to.get(p.id);
  }
  // Viewers a coordinator invited are their crew (coordinator-fixes.sql my_crew_events); a viewer
  // the couple invited (family) isn't, and doesn't get the Coordinator desk.
  if (list.some((p) => p.access === "viewer")) {
    const { data } = await supabase.rpc("my_crew_events");
    const crew = new Set(((data ?? []) as unknown[]).map((x) => (typeof x === "string" ? x : (x as { my_crew_events?: string }).my_crew_events ?? "")));
    for (const p of list) if (p.access === "viewer" && crew.has(p.id)) p.crew = true;
  }
  return list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/**
 * Inbox rows: each visible thread + its latest message + unread flag.
 * `viewerIsStaff` flips who "the other side" is (studio vs. client).
 */
export async function loadThreadSummaries(
  userId: string,
  viewerIsStaff: boolean,
  people: Record<string, PersonLite>,
): Promise<ThreadSummary[]> {
  const { data: threads } = await supabase
    .from("message_threads")
    .select("*")
    .order("last_message_at", { ascending: false });
  const list = (threads ?? []) as Thread[];
  if (!list.length) return [];
  const ids = list.map((t) => t.id);

  const [{ data: msgs }, { data: reads }] = await Promise.all([
    supabase.from("messages").select("*").in("thread_id", ids).order("created_at", { ascending: false }).limit(500),
    supabase.from("thread_reads").select("thread_id, last_read_at").eq("profile_id", userId).in("thread_id", ids),
  ]);
  const lastByThread = new Map<string, Message>();
  const staffSenderByThread = new Map<string, string>();
  for (const m of (msgs ?? []) as Message[]) {
    if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);
    if (!staffSenderByThread.has(m.thread_id) && people[m.sender_id]?.is_staff) staffSenderByThread.set(m.thread_id, m.sender_id);
  }
  const readAt = new Map((reads ?? []).map((r) => [r.thread_id as string, r.last_read_at as string]));

  // Client names for the studio inbox (staff can read all profiles).
  if (viewerIsStaff) {
    const missing = [...new Set(list.map((t) => t.profile_id))].filter((id) => !people[id]);
    if (missing.length) {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, is_staff, email").in("id", missing);
      for (const p of data ?? []) people[p.id] = p as PersonLite;
    }
  }

  return list.map((t) => {
    const last = lastByThread.get(t.id) ?? null;
    const seen = readAt.get(t.id);
    const unread = !!last && last.sender_id !== userId && (!seen || seen < last.created_at);
    let counterpart: PersonLite | undefined;
    if (viewerIsStaff) counterpart = people[t.profile_id];
    else {
      const staffId = staffSenderByThread.get(t.id);
      counterpart = staffId ? people[staffId] : undefined;
    }
    return {
      ...t,
      lastMessage: last,
      unread,
      counterpartName: counterpart?.full_name || counterpart?.email || (viewerIsStaff ? "Client" : "The RSVP Studio"),
      counterpartAvatar: counterpart?.avatar_url ?? null,
    };
  });
}

// Sites for these projects, with their Save the Date. Until supabase/save-the-date.sql is on
// the database (std doesn't exist yet), the same read without it.
async function loadSites(ids: string[]) {
  const cols = "event_id, slug, published_at, draft_content, draft_presentation";
  const r = await supabase.from("wedding_sites").select(`${cols}, std, std_live`).in("event_id", ids);
  return r.error?.code === "42703" ? supabase.from("wedding_sites").select(cols).in("event_id", ids) : r;
}

/** A project's Save the Date numbers: page opens and invitation sign-ups. */
export async function saveTheDateStats(eventId: string) {
  const [opens, signups] = await Promise.all([
    supabase.from("save_the_date_stats").select("opens").eq("event_id", eventId).maybeSingle(),
    supabase.from("invitees").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("source", "save_the_date"),
  ]);
  return { opens: (opens.data as { opens: number } | null)?.opens ?? 0, signups: signups.count ?? 0 };
}

export async function loadSnapshot(userId: string): Promise<PortalSnapshot | null> {
  // is_coordinator comes with coordinator-desk.sql; before that, the same read without it.
  let { data: profile, error: profileError } = await supabase.from("profiles").select(`${PROFILE_COLS}, is_coordinator`).eq("id", userId).single();
  if (profileError?.code === NO_COLUMN) ({ data: profile } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", userId).single());
  if (!profile) return null;
  const staff = !!profile.is_staff;
  const projects = await loadProjects(userId, staff);
  const ids = projects.map((p) => p.id);

  const none = { data: [] as never[] };
  const [tasks, activity, invoices, staffPeople, sites, lifecycle] = await Promise.all([
    ids.length ? supabase.from("project_tasks").select("*").in("event_id", ids).order("due_date", { ascending: true, nullsFirst: false }) : none,
    ids.length ? supabase.from("project_activity").select("*").in("event_id", ids).order("created_at", { ascending: false }).limit(60) : none,
    ids.length ? supabase.from("invoices").select("*").in("event_id", ids).order("issued_at", { ascending: false }) : none,
    supabase.from("profiles").select("id, full_name, avatar_url, is_staff, email").eq("is_staff", true),
    ids.length ? loadSites(ids) : none,
    ids.length ? supabase.rpc("project_lifecycle", { p_ids: ids }) : none,
  ]);

  const people: Record<string, PersonLite> = {};
  for (const p of staffPeople.data ?? []) people[p.id] = p as PersonLite;
  people[profile.id] = { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, is_staff: staff, email: profile.email };

  const siteMap: Record<string, SiteInfo> = {};
  for (const row of (sites.data ?? []) as SiteRow[]) siteMap[row.event_id] = siteInfo(row);
  type Life = { event_id: string; premium: boolean; live_until: string | null; ended: boolean; guests_purged_at: string | null };
  for (const l of (lifecycle.data ?? []) as Life[]) {
    const s = siteMap[l.event_id];
    if (s) Object.assign(s, { liveUntil: l.live_until, ended: l.ended, premium: l.premium, guestsPurgedAt: l.guests_purged_at });
  }

  const threads = await loadThreadSummaries(userId, staff, people);

  return {
    profile: profile as Profile,
    projects,
    tasks: (tasks.data ?? []) as Task[],
    activity: (activity.data ?? []) as Activity[],
    invoices: ((invoices.data ?? []) as Invoice[]).map((i) => ({ ...i, amount: Number(i.amount) })),
    threads,
    people,
    sites: siteMap,
  };
}

export async function updateProfile(id: string, patch: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  // Keep the auth metadata name in sync — the navbar reads it.
  if (patch.full_name !== undefined) await supabase.auth.updateUser({ data: { full_name: patch.full_name } });
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  await updateProfile(userId, { avatar_url: url });
  return url;
}

export async function setTaskDone(taskId: string, done: boolean) {
  const { error } = await supabase.rpc("set_task_done", { task_id: taskId, done });
  if (error) throw new Error(error.message);
}

export async function loadMessages(threadId: string): Promise<Message[]> {
  const { data } = await supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at");
  return (data ?? []) as Message[];
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function uploadAttachments(threadId: string, files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const file of files) {
    const safe = file.name.replace(/[^\w.\- ]+/g, "_");
    const path = `${threadId}/${crypto.randomUUID()}/${safe}`;
    const { error } = await supabase.storage.from("message-files").upload(path, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    out.push({ name: file.name, path, size: file.size, type: file.type });
  }
  return out;
}

export async function sendMessage(threadId: string, senderId: string, body: string, files: File[], opts: { internal?: boolean } = {}) {
  const attachments = files.length ? await uploadAttachments(threadId, files) : [];
  const { data, error } = await supabase
    .from("messages")
    .insert({ thread_id: threadId, sender_id: senderId, body, attachments, ...(opts.internal ? { internal: true } : {}) })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  // Notes stay inside the team: no emails.
  if (!opts.internal) notify({ kind: "message", messageId: data.id });
  return data as Message;
}

export async function createThread(input: {
  profileId: string;
  eventId: string | null;
  kind: ThreadKind;
  subject: string;
  category?: SupportCategory;
}) {
  const { data, error } = await supabase
    .from("message_threads")
    .insert({ profile_id: input.profileId, event_id: input.eventId, kind: input.kind, subject: input.subject, ...(input.category ? { category: input.category } : {}) })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Thread;
}

/** Customer: mark their own support request solved. */
export async function resolveMyRequest(threadId: string) {
  const { error } = await supabase.rpc("resolve_my_request", { p_thread: threadId });
  if (error) throw new Error(error.message);
}

/** Staff: change a support request's status / urgency (resolving emails the customer). */
export async function updateSupportRequest(
  threadId: string,
  patch: { status?: SupportStatus; urgent?: boolean; category?: SupportCategory; assigned_to?: string | null; hold_until?: string | null },
) {
  const { error } = await supabase.from("message_threads").update(patch).eq("id", threadId);
  if (error) throw new Error(error.message);
  if (patch.status === "resolved") notify({ kind: "support_resolved", threadId });
}

export async function markThreadRead(threadId: string, profileId: string) {
  await supabase
    .from("thread_reads")
    .upsert({ thread_id: threadId, profile_id: profileId, last_read_at: new Date().toISOString() });
}

export async function attachmentUrl(path: string) {
  const { data } = await supabase.storage.from("message-files").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function changePassword(password: string, profileId: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  await supabase.from("profiles").update({ password_changed_at: new Date().toISOString() }).eq("id", profileId);
}

export async function loadGuests(project: Pick<Project, "id" | "table_name">) {
  // Only a studio-provisioned per-event table (e.g. francesjash_rsvps) is ever read by name.
  const legacy = project.table_name && /^[a-z0-9_]+_rsvps$/.test(project.table_name) ? project.table_name : null;
  if (project.table_name && !legacy) return [] as Guest[];
  const query = legacy
    ? supabase.from(legacy).select("*")
    : supabase.from("rsvps").select("*").eq("event_id", project.id);
  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as Guest[];
}

/**
 * Start a PayMongo checkout (api/pay-checkout.ts) for an invoice, to publish a
 * DIY website, or (`upgrade`) to make a free-template site Premium. Returns the
 * PayMongo page to send the customer to, or `free` when nothing is owed (e.g. a free template).
 */
export async function startCheckout(target: { invoiceId: string } | { eventId: string; upgrade?: boolean; domain?: string; renewDomain?: boolean; smsPack?: 100 | 300 | 600 }): Promise<{ checkoutUrl?: string; free?: boolean }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again to pay.");
  const res = await fetch("/api/pay-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(target),
  });
  const json = (await res.json().catch(() => ({}))) as { checkout_url?: string; free?: boolean; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Couldn’t start the payment — please try again.");
  return { checkoutUrl: json.checkout_url, free: json.free };
}

/** Delete a project (owner: their own DIY site · staff: any). Hidden at once; removed for good after 30 days. */
export async function deleteProject(eventId: string) {
  const { error } = await supabase.rpc("delete_project", { p_event: eventId });
  if (error) throw new Error(/NOT_ALLOWED/.test(error.message) ? "Only the owner can delete this project." : "Couldn’t delete the project — please try again.");
}

/** A co-host takes themselves off a project. */
export async function leaveProject(eventId: string) {
  // remove_event_member (coordinator-mode.sql) also passes their seating plans to the couple
  // and gives those plans a new check-in link. Without it, leave_project as before.
  const { data } = await supabase.auth.getUser();
  const viaPeople = data.user ? await supabase.rpc("remove_event_member", { p_event: eventId, p_profile: data.user.id }) : null;
  if (viaPeople && !viaPeople.error) return;
  const { error } = await supabase.rpc("leave_project", { p_event: eventId });
  if (error) throw new Error("Couldn’t leave the project — please try again.");
}

// ---- People on an event (supabase/coordinator-mode.sql) ----------------------------------
export type EventPerson = { kind: "person" | "invite"; id: string; name: string | null; email: string | null; role: EventAccess; since: string; added_by: string | null };

/** The couple, everyone on the event, and open invites (the couple and cohosts see them all,
 *  a coordinator the ones they sent). Null when it can't be read (before the SQL runs). */
export async function loadEventPeople(eventId: string): Promise<EventPerson[] | null> {
  const { data, error } = await supabase.rpc("event_people", { p_event: eventId });
  return error ? null : ((data ?? []) as EventPerson[]);
}

/** Email someone an invite (api/notify.ts, kind event_invite). Returns the problem, or null. */
/** role "owner": hand an event I added for a client over to them (coordinator-desk.sql). */
export async function inviteToEvent(eventId: string, email: string, role: EventAccess): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ kind: "event_invite", eventId, email, role }),
  }).catch(() => null);
  if (!r) return "Couldn’t reach us. Check your connection and try again.";
  if (r.ok) return null;
  return ((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn’t send the invite. Please try again.";
}

export async function cancelEventInvite(id: string) {
  const { error } = await supabase.rpc("cancel_event_invite", { p_id: id });
  if (error) throw new Error("Couldn’t cancel the invite. Please try again.");
}

export async function removeEventMember(eventId: string, profileId: string) {
  const { error } = await supabase.rpc("remove_event_member", { p_event: eventId, p_profile: profileId });
  if (error) throw new Error(/NOT_ALLOWED/.test(error.message) ? "Only the event’s hosts can remove people." : "Couldn’t remove them. Please try again.");
}

export type JoinProblem = "SIGN_IN" | "NOT_FOUND" | "USED" | "EXPIRED" | "OTHER_EMAIL" | "ERROR";
/** The /account/join link: join the event as the invite says. */
export async function acceptEventInvite(token: string): Promise<{ eventId: string; role: EventAccess } | { problem: JoinProblem }> {
  const { data, error } = await supabase.rpc("accept_event_invite", { p_token: token });
  if (error) return { problem: ((["SIGN_IN", "NOT_FOUND", "USED", "EXPIRED", "OTHER_EMAIL"] as const).find((c) => error.message.includes(c)) ?? "ERROR") as JoinProblem };
  const r = data as { event_id: string; role: EventAccess };
  return { eventId: r.event_id, role: r.role };
}

/** Free accounts: up to 3 free projects at once, 1 of them live (supabase/free-limits.sql). */
export const FREE_PROJECT_LIMIT = 3;
export type FreeProject = { id: string; name: string; live: boolean };

/** The customer's free projects that count toward the limit. Staff: always empty. */
export async function myFreeProjects(): Promise<FreeProject[]> {
  const { data, error } = await supabase.rpc("my_free_projects");
  if (error) return [];
  return (data ?? []) as FreeProject[];
}

/** Publishing this site would make a second live free site: the name of the one that's live. */
export async function freeLiveConflict(eventId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("my_free_live_conflict", { p_event: eventId });
  if (error) return null;
  return (data as string | null) ?? null;
}

// ---------------------------------------------------------------------------
// Custom domains (api/domain-search, api/domain-status)

async function authedFetch(url: string, init: Parameters<typeof fetch>[1] = {}) {
  const { data } = await supabase.auth.getSession();
  return fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}`, ...(init.headers ?? {}) } });
}

let domainsOn: Promise<boolean> | null = null;
/** Is buying a custom domain switched on (Studio → Templates → Custom domains)? */
export function domainsEnabled() {
  domainsOn ??= fetch("/api/domain-search").then((r) => r.json()).then((j) => !!j.enabled).catch(() => false);
  return domainsOn;
}

export type DomainResult = { domain: string; php: number };
export async function searchDomains(eventId: string, query: string): Promise<{ results: DomainResult[]; taken: string[] }> {
  const res = await authedFetch("/api/domain-search", { method: "POST", body: JSON.stringify({ eventId, query }) });
  const json = (await res.json().catch(() => ({}))) as { results?: DomainResult[]; taken?: string[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Domain search isn’t responding — please try again.");
  return { results: json.results ?? [], taken: json.taken ?? [] };
}

export type DomainStatus = { status: "none" | "paid" | "buying" | "connecting" | "active" | "failed" | "expired"; domain?: string; expiresAt?: string | null; renewalPhp?: number | null };
/** Where a site's domain is at (and nudges its setup along). */
export async function domainStatus(eventId: string): Promise<DomainStatus> {
  const res = await authedFetch(`/api/domain-status?eventId=${encodeURIComponent(eventId)}`);
  return ((await res.json().catch(() => null)) as DomainStatus | null) ?? { status: "none" };
}

// ---------------------------------------------------------------------------
// Texts (supabase/sms.sql, api/_lib/sms.ts) and "Message your guests" (api/notify.ts → broadcast)

export const SMS_PACKS = [
  { texts: 100, php: 199 },
  { texts: 300, php: 549 },
  { texts: 600, php: 1099 },
] as const;

let smsOn: Promise<boolean> | null = null;
/** Is texting switched on for everyone (Semaphore connected)? `?sms=1` shows it anyway, for testing. */
export function smsEnabled() {
  if (new URLSearchParams(window.location.search).has("sms")) return Promise.resolve(true);
  smsOn ??= fetch("/api/pay-checkout?op=sms-status").then((r) => r.json()).then((j) => !!j.enabled).catch(() => false);
  return smsOn;
}

export type SmsAccount = { enabled: boolean; credits: number; used: number; premium_grant_at: string | null; host_alerts: "email" | "sms" | "both"; host_phone: string | null };
/** The event's texting row, or null before texting was ever switched on (undefined: sms.sql not run). */
export async function smsAccount(eventId: string): Promise<SmsAccount | null | undefined> {
  const { data, error } = await supabase.from("event_sms").select("enabled, credits, used, premium_grant_at, host_alerts, host_phone").eq("event_id", eventId).maybeSingle();
  if (error) return undefined;
  return (data as SmsAccount | null) ?? null;
}

const SMS_ERRORS: Record<string, string> = {
  NO_CREDITS: "Add texts first, then switch it on.",
  PREMIUM_ONLY: "Texts for every reply are part of Premium.",
  BAD_PHONE: "Enter your mobile number, e.g. 0917 123 4567.",
};
const smsError = (m: string) => SMS_ERRORS[Object.keys(SMS_ERRORS).find((k) => m.includes(k)) ?? ""] ?? "Couldn’t save. Please try again.";

export async function setSmsEnabled(eventId: string, on: boolean): Promise<SmsAccount> {
  const { data, error } = await supabase.rpc("sms_set_enabled", { p_event: eventId, p_on: on });
  if (error) throw new Error(smsError(error.message));
  return data as SmsAccount;
}

export async function setHostAlerts(eventId: string, alerts: SmsAccount["host_alerts"], phone: string | null): Promise<SmsAccount> {
  const { data, error } = await supabase.rpc("sms_set_host_alerts", { p_event: eventId, p_alerts: alerts, p_phone: phone });
  if (error) throw new Error(smsError(error.message));
  return data as SmsAccount;
}

export type BroadcastAudience = "coming" | "replied" | "waiting" | "declined";
export type BroadcastChannel = "email" | "sms" | "both";
export type BroadcastPreview = { emails: number; texts: number; segments: number; credits: number; left: number; textingOn: boolean; unreachable: number; premium: boolean };
/** "Message your guests": `preview` counts who it reaches and what it costs; otherwise sends. */
export async function broadcast(o: { eventId: string; audience: BroadcastAudience; channel: BroadcastChannel; message: string; preview?: boolean }) {
  const res = await authedFetch("/api/notify", { method: "POST", body: JSON.stringify({ kind: "broadcast", ...o }) });
  const json = (await res.json().catch(() => ({}))) as BroadcastPreview & { error?: string; textStatus?: string | null };
  if (!res.ok) throw new Error(json.error ?? "Couldn’t send it. Please try again.");
  return json;
}

/** A payment's status, for the "checking your payment…" screen after PayMongo sends the customer back. */
export async function paymentStatus(paymentId: string) {
  const { data } = await supabase.from("payments").select("status, method").eq("id", paymentId).maybeSingle();
  return (data ?? null) as { status: "pending" | "paid" | "failed" | "expired"; method: string | null } | null;
}

/**
 * Fire-and-forget email notification (api/notify.ts). Failing to email
 * never blocks the action that triggered it.
 */
export async function notify(payload: Record<string, unknown>) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore — email is best-effort
  }
}

// ---------------------------------------------------------------------------
// Partner program (supabase/revenue.sql): a partner's own dashboard, matched by login email.

export type MyPartner = {
  code: string;
  kind: "planner" | "influencer" | "other";
  name: string;
  rate: number;
  discount: number;
  active: boolean;
  /** starter 10% · silver 15% (5 paying clients) · gold 20% (15) · custom (set by the studio) */
  tier: "starter" | "silver" | "gold" | "custom";
  next_tier: "silver" | "gold" | null;
  next_at: number | null;
  next_rate: number | null;
  clicks: number;
  enquiries: number;
  signups: number;
  paying: number;
  revenue: number;
  commission: number;
  paid_out: number;
  owed: number;
};
export type PartnerPerson = { kind: "enquiry" | "signup" | "project"; person: string; status: string; revenue: number; commission: number; created_at: string };
export type PartnerPayout = { amount: number; paid_at: string; note: string | null };

let myPartnerCache: Promise<MyPartner | null> | null = null;
/** The signed-in person's partner account, if they're a partner (cached per page load). */
export function myPartner(fresh = false): Promise<MyPartner | null> {
  if (fresh || !myPartnerCache)
    myPartnerCache = Promise.resolve(supabase.rpc("my_partner")).then(({ data, error }) => {
      const row = !error && (Array.isArray(data) ? data[0] : data);
      if (!row) return null;
      const n = (k: string) => Number((row as Record<string, unknown>)[k] ?? 0);
      const r = row as Record<string, unknown>;
      return { ...(row as MyPartner), next_at: r.next_at == null ? null : n("next_at"), next_rate: r.next_rate == null ? null : n("next_rate"), rate: n("rate"), discount: n("discount"), clicks: n("clicks"), enquiries: n("enquiries"), signups: n("signups"), paying: n("paying"), revenue: n("revenue"), commission: n("commission"), paid_out: n("paid_out"), owed: n("owed") };
    });
  return myPartnerCache;
}
/** Their partner application while it's still being looked at (supabase/partner-flow.sql). */
export async function myPartnerApplication(): Promise<{ at: string } | null> {
  const { data, error } = await supabase.rpc("my_partner_application");
  const row = !error && ((Array.isArray(data) ? data[0] : data) as { status: string; created_at: string } | null);
  return row && (row.status === "new" || row.status === "contacted") ? { at: row.created_at } : null;
}
export async function myPartnerPeople(): Promise<PartnerPerson[]> {
  const { data } = await supabase.rpc("my_partner_people");
  return ((data ?? []) as PartnerPerson[]).map((p) => ({ ...p, revenue: Number(p.revenue), commission: Number(p.commission) }));
}
export async function myPartnerPayouts(): Promise<PartnerPayout[]> {
  const { data } = await supabase.rpc("my_partner_payouts");
  return ((data ?? []) as PartnerPayout[]).map((p) => ({ ...p, amount: Number(p.amount) }));
}

/** A code typed at checkout: a partner's referral code or a promo code (supabase/guest-features.sql). */
export async function applyDiscountCode(eventId: string, code: string): Promise<{ kind: "partner"; name: string } | { kind: "promo"; pct: number }> {
  const { data, error } = await supabase.rpc("apply_discount_code", { p_event: eventId, p_code: code });
  if (error) {
    const m = error.message;
    throw new Error(
      /BAD_CODE/.test(m) ? "That code isn’t valid. Check the spelling."
      : /EXPIRED_CODE/.test(m) ? "That code has expired or been used up."
      : /OWN_CODE/.test(m) ? "You can’t use your own partner code."
      : /ALREADY_CREDITED/.test(m) ? "This project already has a referral code."
      : /ALREADY_PAID/.test(m) ? "Codes can only be added before paying."
      : "Couldn’t add the code. Please try again.",
    );
  }
  const [kind, value] = String(data ?? "").split(/:(.*)/s);
  return kind === "promo" ? { kind: "promo", pct: Number(value) } : { kind: "partner", name: value ?? "" };
}

export type DiscountReason = "first" | "partner" | "promo";
/** The % off this project gets at checkout and why (the biggest one wins; they never add up). */
export async function myEventDiscount(eventId: string): Promise<{ pct: number; reason: DiscountReason | null; code: string | null }> {
  const { data, error } = await supabase.rpc("my_event_discount", { p_event: eventId });
  const row = !error && (Array.isArray(data) ? data[0] : data);
  return row
    ? { pct: Number(row.pct ?? 0), reason: (row.reason ?? null) as DiscountReason | null, code: (row.code as string | null) ?? null }
    : { pct: 0, reason: null, code: null };
}
