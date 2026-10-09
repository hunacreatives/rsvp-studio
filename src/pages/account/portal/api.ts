import { supabase } from "@/lib/supabase";
import type { Activity, Attachment, Invoice, Message, PersonLite, Profile, Project, Task, Thread, ThreadKind, ThreadSummary, SupportCategory, SupportStatus } from "./types";

export type SiteInfo = {
  slug: string;
  publishedAt: string | null;
  templateId: string | null;
  heroUrl: string | null;
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
  message: string | null;
  created_at: string | null;
  bringing?: string | null;
  guest_count?: number | null;
  attending?: boolean | null;
  dietary?: string | null;
};

const PROFILE_COLS =
  "id, full_name, email, created_at, is_staff, phone, location, avatar_url, billing_name, billing_email, billing_address, notify_project_updates, notify_billing_updates, password_changed_at";

const PROJECT_COLS =
  "id, name, event_date, event_type, table_name, status, project_status, services, progress, next_step, next_step_due, cover_image_url, site_url, completed_at, updated_at, created_at, owner_id";

type SiteRow = {
  event_id: string;
  slug: string;
  published_at: string | null;
  draft_content: { galleries?: { items?: { image?: { masterUrl?: string } }[] }[] } | null;
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
  return { slug: row.slug, publishedAt: row.published_at, templateId, heroUrl: hero };
}

/** Projects the user can see. Staff see every project (RLS allows it). */
async function loadProjects(userId: string, staff: boolean): Promise<Project[]> {
  if (staff) {
    const { data } = await supabase.from("events").select(PROJECT_COLS).order("updated_at", { ascending: false });
    return (data ?? []).map((e) => ({ ...(e as Omit<Project, "role">), role: e.owner_id === userId ? "Owner" : "Member" }));
  }
  const [own, member] = await Promise.all([
    supabase.from("events").select(PROJECT_COLS).eq("owner_id", userId),
    supabase.from("event_members").select(`events(${PROJECT_COLS})`).eq("profile_id", userId),
  ]);
  const byId = new Map<string, Project>();
  for (const e of own.data ?? []) byId.set(e.id, { ...(e as Omit<Project, "role">), role: "Owner" });
  for (const r of member.data ?? []) {
    const e = r.events as unknown as Omit<Project, "role"> | null;
    if (e && !byId.has(e.id)) byId.set(e.id, { ...e, role: "Member" });
  }
  return [...byId.values()]
    .filter((p) => p.status !== "archived")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
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

export async function loadSnapshot(userId: string): Promise<PortalSnapshot | null> {
  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", userId).single();
  if (!profile) return null;
  const staff = !!profile.is_staff;
  const projects = await loadProjects(userId, staff);
  const ids = projects.map((p) => p.id);

  const none = { data: [] as never[] };
  const [tasks, activity, invoices, staffPeople, sites] = await Promise.all([
    ids.length ? supabase.from("project_tasks").select("*").in("event_id", ids).order("due_date", { ascending: true, nullsFirst: false }) : none,
    ids.length ? supabase.from("project_activity").select("*").in("event_id", ids).order("created_at", { ascending: false }).limit(60) : none,
    ids.length ? supabase.from("invoices").select("*").in("event_id", ids).order("issued_at", { ascending: false }) : none,
    supabase.from("profiles").select("id, full_name, avatar_url, is_staff, email").eq("is_staff", true),
    ids.length ? supabase.from("wedding_sites").select("event_id, slug, published_at, draft_content, draft_presentation").in("event_id", ids) : none,
  ]);

  const people: Record<string, PersonLite> = {};
  for (const p of staffPeople.data ?? []) people[p.id] = p as PersonLite;
  people[profile.id] = { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, is_staff: staff, email: profile.email };

  const siteMap: Record<string, SiteInfo> = {};
  for (const row of (sites.data ?? []) as SiteRow[]) siteMap[row.event_id] = siteInfo(row);

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
export async function updateSupportRequest(threadId: string, patch: { status?: SupportStatus; urgent?: boolean; category?: SupportCategory; assigned_to?: string | null }) {
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
  const query = project.table_name
    ? supabase.from(project.table_name).select("*")
    : supabase.from("rsvps").select("*").eq("event_id", project.id);
  const { data } = await query.order("created_at", { ascending: false });
  return (data ?? []) as Guest[];
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
