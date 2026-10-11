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

export function formatHostNames(content: { hosts?: { name?: string }[] } | null | undefined): string {
  const names = (content?.hosts ?? []).map((h) => h.name).filter(Boolean);
  return names.length > 0 ? names.join(" & ") : "the host";
}
