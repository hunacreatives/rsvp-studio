import { supabase } from "@/lib/supabase";

// Studio → Outreach data (supabase/outreach.sql): businesses in the event space we message
// ourselves on Messenger / Instagram / Viber, one at a time. Staff only (RLS).

export type OutreachStatus = "to_message" | "messaged" | "replied" | "signed_up" | "not_interested" | "skipped";
export type OutreachKind = "coordinator" | "venue" | "stylist" | "caterer" | "photo_video" | "stationery" | "entertainment" | "beauty" | "attire" | "cakes" | "rentals" | "party" | "other";
export const KINDS: Record<OutreachKind, string> = {
  coordinator: "Coordinator / planner",
  venue: "Venue",
  stylist: "Stylist / florist",
  caterer: "Catering / bar",
  photo_video: "Photo / video",
  stationery: "Invitations / stationery",
  entertainment: "Host / music / booth",
  beauty: "Hair and makeup",
  attire: "Gowns / attire",
  cakes: "Cakes / desserts",
  rentals: "Rentals / cars",
  party: "Party supplies",
  other: "Other",
};
/** Who a message is written for: coordinators get the free dashboard pitch, venues and every
 *  other supplier the referral one. */
export type Audience = "coordinator" | "venue" | "supplier";
export const audienceOf = (k: OutreachKind): Audience => (k === "coordinator" ? "coordinator" : k === "venue" ? "venue" : "supplier");
export const AUDIENCES: Record<Audience, string> = { coordinator: "Coordinators", venue: "Venues", supplier: "Other suppliers" };
export type MessageKey = "opener" | "followup" | "opener_venue" | "followup_venue" | "opener_supplier" | "followup_supplier";
export type Messages = Record<MessageKey, string>;
export const messageKey = (step: "opener" | "followup", a: Audience): MessageKey => (a === "coordinator" ? step : (`${step}_${a}` as MessageKey));
export type OutreachTab = "to_message" | "due" | "waiting" | "replied" | "signed_up" | "closed";

export type Contact = {
  id: string;
  code: string;
  name: string;
  contact_person: string | null;
  kind: OutreachKind;
  city: string | null;
  facebook: string | null;
  instagram: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  found_via: string | null;
  notes: string | null;
  status: OutreachStatus;
  messaged_at: string | null;
  followed_up_at: string | null;
  replied_at: string | null;
  signed_up_at: string | null;
  matched_profile: string | null;
  matched_enquiry: string | null;
  fb_key: string | null;
  ig_key: string | null;
  created_at: string;
};
export type ContactInput = Pick<Contact, "name" | "contact_person" | "kind" | "city" | "facebook" | "instagram" | "website" | "email" | "phone" | "found_via" | "notes">;
export type Counts = Record<OutreachTab, number> & { sent_today: number; messaged: number; total: number };

export const FOLLOW_UP_DAYS = 5;
export const DAILY_GOAL = 10;
export const LIST_GOAL = 10000;
export const PAGE = 50;
export const SITE = "https://thersvpstudio.com";

const must = <T,>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

/** Matches sign-ups to contacts, then counts each tab. null = outreach.sql hasn't been run yet. */
export async function refresh(): Promise<Counts | null> {
  const { data, error } = await supabase.rpc("outreach_refresh");
  return error ? null : (data as Counts);
}

const dueBefore = () => new Date(Date.now() - FOLLOW_UP_DAYS * 864e5).toISOString();

/** "" everyone · "ready" has a page, handle, email or mobile · "lookup" name only, find their page first */
export type Reach = "" | "ready" | "lookup";

export async function loadTab(tab: OutreachTab, opts: { search: string; city: string; kind: string; reach: Reach; page: number }): Promise<Contact[]> {
  let q = supabase.from("outreach_contacts").select("*");
  if (tab === "to_message") q = q.eq("status", "to_message").order("created_at", { ascending: true });
  else if (tab === "due") q = q.eq("status", "messaged").is("followed_up_at", null).lt("messaged_at", dueBefore()).order("messaged_at", { ascending: true });
  else if (tab === "waiting") q = q.eq("status", "messaged").or(`followed_up_at.not.is.null,messaged_at.gte.${dueBefore()}`).order("messaged_at", { ascending: false });
  else if (tab === "replied") q = q.eq("status", "replied").order("replied_at", { ascending: false });
  else if (tab === "signed_up") q = q.eq("status", "signed_up").order("signed_up_at", { ascending: false });
  else q = q.in("status", ["not_interested", "skipped"]).order("updated_at", { ascending: false });
  if (opts.city) q = q.ilike("city", opts.city);
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.reach === "ready") q = q.or("fb_key.not.is.null,ig_key.not.is.null,email.not.is.null,phone_key.not.is.null");
  if (opts.reach === "lookup") q = q.is("fb_key", null).is("ig_key", null).is("email", null).is("phone_key", null);
  const s = opts.search.trim().replace(/[%,()*]/g, " ");
  if (s) q = q.or(`name.ilike.%${s}%,contact_person.ilike.%${s}%,city.ilike.%${s}%,ig_key.ilike.%${s}%,fb_key.ilike.%${s}%`);
  return must(await q.range(opts.page * PAGE, opts.page * PAGE + PAGE - 1)) as Contact[];
}

/** Cities on the list, most contacts first (for the filter). */
export async function loadCities(): Promise<string[]> {
  const { data } = await supabase.rpc("outreach_cities");
  return ((data ?? []) as { city: string }[]).map((r) => r.city);
}

export async function update(id: string, patch: Partial<Contact>) {
  must(await supabase.from("outreach_contacts").update(patch).eq("id", id));
}
export async function remove(id: string) {
  must(await supabase.from("outreach_contacts").delete().eq("id", id));
}
/** Adds one; false when they're already on the list. */
export async function add(c: ContactInput): Promise<boolean> {
  return (await importRows([c])) === 1;
}
/** Adds many, 500 a call; returns how many were new (duplicates are skipped by the database). */
export async function importRows(rows: Partial<ContactInput>[], onProgress?: (done: number) => void): Promise<number> {
  let added = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await supabase.rpc("outreach_import", { p_rows: rows.slice(i, i + 500) });
    if (error) throw new Error(error.message);
    added += (data as number) ?? 0;
    onProgress?.(Math.min(i + 500, rows.length));
  }
  return added;
}

export async function loadMessages(): Promise<Messages> {
  const { data } = await supabase.from("outreach_messages").select("key, body");
  const m: Messages = { opener: "", followup: "", opener_venue: "", followup_venue: "", opener_supplier: "", followup_supplier: "" };
  for (const r of (data ?? []) as { key: MessageKey; body: string }[]) if (r.key in m) m[r.key] = r.body;
  return m;
}
export async function saveMessage(key: MessageKey, body: string) {
  must(await supabase.from("outreach_messages").upsert({ key, body, updated_at: new Date().toISOString() }));
}

// ---- sending -------------------------------------------------------------------------------

/** Their personal sign-up link: sign-ups through it are matched back to them. */
export const linkFor = (c: Pick<Contact, "code">) => `${SITE}/partners?o=${c.code}`;

/** "Hi Kate" when we know the person, else the business name. */
export const greetName = (c: Pick<Contact, "contact_person" | "name">) => (c.contact_person?.trim().split(/\s+/)[0] || c.name).trim();

export const fillMessage = (body: string, c: Contact) => body.replace(/\{name\}/g, greetName(c)).replace(/\{link\}/g, linkFor(c));

/** A PH mobile as +639XXXXXXXXX (0917…, 63917…, 917…), or null. */
export function phMobile(phone: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("09") ? d.slice(1) : d.length === 12 && d.startsWith("639") ? d.slice(2) : d.length === 10 && d.startsWith("9") ? d : null;
  return ten ? `+63${ten}` : null;
}

/** Where to message them: their Messenger chat, else Instagram DMs, else Viber, else email / site. */
export function chatFor(c: Contact): { url: string; label: string; icon: string } | null {
  if (c.fb_key) return { url: `https://m.me/${c.fb_key.replace(/^id:/, "")}`, label: "Messenger", icon: "ri-messenger-line" };
  if (c.ig_key) return { url: `https://ig.me/m/${c.ig_key}`, label: "Instagram", icon: "ri-instagram-line" };
  const viber = phMobile(c.phone);
  if (viber) return { url: `viber://chat?number=${encodeURIComponent(viber)}`, label: "Viber", icon: "ri-phone-line" };
  if (c.email) return { url: `mailto:${c.email}`, label: "Email", icon: "ri-mail-line" };
  if (c.website) return { url: /^https?:/i.test(c.website) ? c.website : `https://${c.website}`, label: "Website", icon: "ri-global-line" };
  return null;
}

/** A Facebook page search for a business we only have a name (and town) for. */
export const findUrl = (c: Pick<Contact, "name" | "city">) =>
  `https://www.facebook.com/search/pages/?q=${encodeURIComponent([c.name, c.city].filter(Boolean).join(" "))}`;

export const pageUrls = (c: Contact) =>
  [
    c.fb_key ? { url: c.fb_key.startsWith("id:") ? `https://www.facebook.com/profile.php?id=${c.fb_key.slice(3)}` : `https://www.facebook.com/${c.fb_key}`, icon: "ri-facebook-circle-line", label: "Facebook" } : null,
    c.ig_key ? { url: `https://www.instagram.com/${c.ig_key}`, icon: "ri-instagram-line", label: "Instagram" } : null,
    c.website ? { url: /^https?:/i.test(c.website) ? c.website : `https://${c.website}`, icon: "ri-global-line", label: "Website" } : null,
  ].filter(Boolean) as { url: string; icon: string; label: string }[];

// ---- import ---------------------------------------------------------------------------------

/** A spreadsheet export (CSV) → rows. Handles quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"' && t[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && !cell) quoted = true; // quotes only open at the start of a cell

    else if (ch === "," || ch === "\t") row.push(cell), (cell = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

// Column headings we understand (lowercased, spaces/punctuation removed) → field.
const HEADINGS: Record<string, keyof ContactInput> = {
  name: "name", business: "name", businessname: "name", company: "name", page: "name", pagename: "name",
  contact: "contact_person", contactperson: "contact_person", person: "contact_person", owner: "contact_person",
  kind: "kind", type: "kind", category: "kind",
  city: "city", location: "city", area: "city",
  facebook: "facebook", fb: "facebook", facebookpage: "facebook", facebookurl: "facebook",
  instagram: "instagram", ig: "instagram", instagramhandle: "instagram", handle: "instagram",
  website: "website", site: "website", url: "website",
  email: "email", emailaddress: "email",
  phone: "phone", mobile: "phone", viber: "phone", number: "phone", contactnumber: "phone",
  foundvia: "found_via", source: "found_via", foundon: "found_via",
  notes: "notes", note: "notes",
};

/** Turns a pasted or uploaded sheet into contacts. Needs a heading row with at least a name. */
/** A sheet's type column ("Venue", "photo_video", "Photographer"…) → a kind. */
export function kindFrom(v: string | undefined): OutreachKind {
  const t = (v ?? "").toLowerCase().trim();
  if (!t) return "coordinator";
  if (t in KINDS) return t as OutreachKind;
  const hit = (Object.entries(KINDS) as [OutreachKind, string][]).find(([, label]) => label.toLowerCase().split(/\s*\/\s*|\s+and\s+/).some((w) => t.includes(w.trim())));
  return hit?.[0] ?? (/plan|coordinat/.test(t) ? "coordinator" : /photo|video|film/.test(t) ? "photo_video" : "other");
}

export function rowsFromCsv(text: string): { rows: Partial<ContactInput>[]; unknown: string[] } {
  const [head, ...body] = parseCsv(text);
  if (!head) return { rows: [], unknown: [] };
  const fields = head.map((h) => HEADINGS[h.toLowerCase().replace(/[^a-z]/g, "")]);
  const unknown = head.filter((_, i) => !fields[i] && head[i].trim());
  const rows = body
    .map((cells) => {
      const r: Partial<ContactInput> = {};
      fields.forEach((f, i) => {
        const v = (cells[i] ?? "").trim();
        if (f && v && !r[f]) (r as Record<string, string>)[f] = v;
      });
      return r;
    })
    .filter((r) => r.name)
    .map((r) => ({ ...r, kind: kindFrom(r.kind as string | undefined) }));
  return { rows, unknown };
}
