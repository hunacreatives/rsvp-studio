// Who on the hosts' invite list has replied (supabase/guest-features.sql → invitees). Shared by
// Guests → Invite list and the dashboard's counts, so "5 haven't replied" means the same thing
// everywhere. A reply matches an invitee by their personal link, by email or mobile, or by name.

export const nameKey = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export const phoneKey = (s: string | null | undefined) => {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
};
export const emailKey = (s: string | null | undefined) => (s && s.includes("@") ? s.trim().toLowerCase() : "");
const HONORIFICS = new Set(["tita", "tito", "ate", "kuya", "lola", "lolo", "ninang", "ninong", "manang", "manong", "mr", "mrs", "ms", "miss", "dr", "atty", "engr", "sir", "maam"]);
/** The first name, past any "Tita"/"Ate": "Tita Lorna" → "lorna". */
export const firstName = (s: string | null | undefined) => nameKey(s).split(" ").filter((w) => !HONORIFICS.has(w))[0] ?? "";

type Entry = { name: string; contact: string | null };
/** The same guest twice: the same name, or the same email/mobile and first name (families
 *  share a phone, so a shared contact alone isn't enough). */
export function sameGuest(a: Entry, b: Entry) {
  if (nameKey(a.name) && nameKey(a.name) === nameKey(b.name)) return true;
  const contact = (emailKey(a.contact) && emailKey(a.contact) === emailKey(b.contact)) || (phoneKey(a.contact) && phoneKey(a.contact) === phoneKey(b.contact));
  return !!contact && !!firstName(a.name) && firstName(a.name) === firstName(b.name);
}

export type ReplyLike = { id: string; name: string; email?: string | null; phone?: string | null; invitee_id?: string | null };
export type InviteeLike = { id: string; name: string; contact: string | null };

/**
 * Which replies belong to each invitee; each reply is used once. `reply`: the invitee's own (or
 * first) reply. `others`: people who replied on their forwarded personal link, sharing its seats.
 */
export function matchInvitees<I extends InviteeLike, G extends ReplyLike>(list: I[], guests: G[]): { inv: I; reply: G | null; others: G[] }[] {
  // Replies from a personal link: certain, and there can be several (a forwarded link).
  const used = new Set(guests.filter((g) => g.invitee_id && list.some((i) => i.id === g.invitee_id)).map((g) => g.id));
  const find = (inv: I) => {
    const e = emailKey(inv.contact);
    const p = phoneKey(inv.contact);
    const n = nameKey(inv.name);
    return (
      guests.find((g) => !used.has(g.id) && ((e && emailKey(g.email) === e) || (p && phoneKey(g.phone) === p))) ??
      guests.find((g) => !used.has(g.id) && n && nameKey(g.name) === n) ??
      null
    );
  };
  return list.map((inv) => {
    const linked = guests.filter((g) => g.invitee_id === inv.id);
    const own = linked.find((g) => !!firstName(g.name) && firstName(g.name) === firstName(inv.name)) ?? linked[0];
    const reply = own ?? find(inv);
    if (reply) used.add(reply.id);
    return { inv, reply: reply ?? null, others: linked.filter((g) => g !== reply) };
  });
}

/** The nudge hosts copy into Messenger or Viber for guests who haven't replied. */
export function reminderMessage(eventName: string, siteUrl: string | null, deadline?: string | null) {
  const by = deadline
    ? ` by ${new Date(`${deadline}T12:00:00+08:00`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" })}`
    : "";
  return `Hi! Just a friendly reminder to RSVP for ${eventName}${by}. Everything’s here: ${siteUrl ?? ""}`.trim();
}
