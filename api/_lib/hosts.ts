import type { SupabaseClient } from "@supabase/supabase-js";

export const STUDIO_INBOX = "hello@thersvpstudio.com";

/** Who hears about RSVPs: the event's owner/members who keep project
 *  updates on. The studio inbox only when nobody on the event has an account
 *  yet — never because the hosts turned these emails off. */
export async function hostRecipients(db: SupabaseClient, eventId: string): Promise<string[]> {
  const ids = new Set<string>();
  const { data: ev } = await db.from("events").select("owner_id").eq("id", eventId).maybeSingle();
  if (ev?.owner_id) ids.add(ev.owner_id);
  const { data: members } = await db.from("event_members").select("profile_id").eq("event_id", eventId);
  for (const m of members ?? []) ids.add(m.profile_id);
  if (!ids.size) return [STUDIO_INBOX];
  const { data: people } = await db.from("profiles").select("email, is_staff, notify_project_updates").in("id", [...ids]);
  const hosts = (people ?? []).filter((p) => !p.is_staff);
  if (!hosts.length) return [STUDIO_INBOX];
  return hosts.filter((p) => p.notify_project_updates !== false && p.email).map((p) => p.email as string);
}

/** Everyone hosting the event (owner + co-hosts), whatever their notification settings: for
 *  service notices about their own data (the site going offline, the guest list being deleted).
 *  Not coordinators or viewers: these are about the couple's own website and what it costs. */
export async function eventPeopleEmails(db: SupabaseClient, eventId: string): Promise<string[]> {
  const ids = new Set<string>();
  const { data: ev } = await db.from("events").select("owner_id").eq("id", eventId).maybeSingle();
  if (ev?.owner_id) ids.add(ev.owner_id);
  const { data: members } = await db.from("event_members").select("profile_id").eq("event_id", eventId).eq("role", "cohost");
  for (const m of members ?? []) ids.add(m.profile_id);
  if (!ids.size) return [];
  const { data: people } = await db.from("profiles").select("email, is_staff").in("id", [...ids]);
  return (people ?? []).filter((p) => !p.is_staff && p.email).map((p) => p.email as string);
}

/** `fallback` when the site has no names yet: host emails pass the event's name, so a subject
 *  never reads "3 new RSVPs for the host". */
export function formatHostNames(content: { hosts?: { name?: string }[] } | null | undefined, fallback = "the host"): string {
  const names = (content?.hosts ?? []).map((h) => h.name).filter(Boolean);
  return names.length > 0 ? names.join(" & ") : fallback;
}
