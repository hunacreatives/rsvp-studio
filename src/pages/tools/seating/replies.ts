import { firstName, matchInvitees } from "@/pages/account/portal/inviteMatch";
import { freeSeats, isHonorific, uid, type Chart, type Group, type Guest } from "./model";
import { parseParty, type ParseResult } from "./parse";
import { linePeople, words, type Invitee } from "./seatmatch";
import type { Issue } from "./check";

// An event's invite list and RSVPs → Mesa's households (Start from my RSVPs). Replies are
// read the same way the dashboard's Guests tab reads them (inviteMatch.ts), so "who's
// coming" means the same thing in both places. Pure: no network here (website.ts loads).

/** An RSVP as Mesa reads it (website.ts loadReplies). */
export interface Reply {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  attending: boolean | null;
  guest_count: number | null;
  kid_count: number | null;
  dietary: string | null;
  invitee_id: string | null;
  answers: Record<string, unknown> | null;
  updated_at: string | null;
  created_at: string;
}

const SENIOR = /\b(lola|lolo|inang|amang|nanay|tatay)\b/i;
const when = (r: Reply) => r.updated_at ?? r.created_at;

/** Several replies for one line (a forwarded link, a guest who sent the form twice): one per
 *  first name, the newest kept. */
function newestPerPerson(rs: Reply[]) {
  const by = new Map<string, Reply>();
  for (const r of rs) {
    const k = firstName(r.name) || r.id;
    const had = by.get(k);
    if (!had || when(r) > when(had)) by.set(k, r);
  }
  return [...by.values()];
}

/** What a line's replies add up to: can't come, coming (how many, kids, who), or not yet. */
export function answerOf(rs: Reply[]): { state: "no" | "yes" | "pending"; size?: number; kids?: number; names?: string[]; meal?: string } {
  const list = newestPerPerson(rs);
  if (!list.length) return { state: "pending" };
  const coming = list.filter((r) => r.attending !== false);
  if (!coming.length) return { state: "no" };
  const size = coming.reduce((n, r) => n + Math.max(1, r.guest_count ?? 1), 0);
  const kids = coming.reduce((n, r) => n + Math.max(0, r.kid_count ?? 0), 0);
  // "Who's coming with you?" (askPartyNames): the names they gave, one person each.
  const named = coming.flatMap((r) => {
    const v = r.answers?.["Party"];
    return typeof v === "string" ? v.split(/\s*(?:\n|,|;|&|\band\b)\s*/i).map((x) => x.trim()).filter((x) => x.length > 1) : [];
  });
  const meal = coming.map((r) => r.dietary?.trim()).find(Boolean);
  return { state: "yes", size, kids, names: named.length ? named : undefined, meal: meal ? meal.slice(0, 60) : undefined };
}

/** The key Mesa remembers a line's answer by: "no", "pending", or "yes:3". */
export const answerKey = (a: ReturnType<typeof answerOf>) => (a.state === "yes" ? `yes:${a.size ?? 1}` : a.state);

/**
 * One household's people: the names on the line (or the names they gave), then kids, then
 * "Guest of …" up to the size. The names come first; with fewer coming, the last go.
 */
function people(line: string, size: number | undefined, kids: number | undefined, given?: string[]) {
  const p = parseParty(line);
  const lead = (given?.[0] ?? p.people[0] ?? line).split(/\s+/).find((w) => w.length > 1 && !isHonorific(w)) ?? "Guest";
  const out: { name: string; tags?: Guest["tags"] }[] = [];
  const adults = given?.length ? given : p.people.length ? p.people : [line.trim() || "Guest"];
  for (const n of adults) out.push({ name: n.slice(0, 120), ...(SENIOR.test(n) ? { tags: ["senior" as const] } : {}) });
  const k = kids ?? p.kids;
  for (let i = 0; i < k; i++) out.push({ name: `${lead}’s kid${k > 1 ? ` ${i + 1}` : ""}`, tags: ["kid"] });
  const want = size ?? out.length + p.extra;
  for (let i = 0; out.length < want; i++) out.push({ name: `Guest of ${lead}${want - out.length > 1 || i ? ` ${i + 1}` : ""}`, tags: ["plusone"] });
  return out.slice(0, Math.max(1, want));
}

export interface EventGuests extends ParseResult {
  /** Lines with no reply yet (they're in, marked not replied). */
  pending: number;
  /** Lines whose replies say they can't come (left out). */
  declined: number;
  /** What each line's answer was when the plan was made (chart.site.seen). */
  seen: Record<string, string>;
  /** Each line's full answer (by invitee id, or "r:" + reply id for the open form). */
  answers: Record<string, ReturnType<typeof answerOf>>;
}

/** The invite list and replies → households, ready for the start flow's check screen. */
export function householdsFromEvent(invitees: (Invitee & { contact?: string | null })[], replies: Reply[], groupName = "Invited guests"): EventGuests {
  const group: Group = { id: uid("g"), name: groupName, cat: "other" };
  // Invite lists have no groups, but they do say who the sponsors are: "Ninong Jun & Ninang
  // Liza Cruz" sits at the sponsors' tables.
  const sponsors: Group = { id: uid("g"), name: "Sponsors", cat: "vip" };
  const SPONSOR = /\b(ninong|ninang|sponsors?)\b/i;
  const guests: Guest[] = [];
  const parties: ParseResult["parties"] = [];
  const skipped: ParseResult["skipped"] = [];
  const seen: Record<string, string> = {};
  const answers: EventGuests["answers"] = {};
  let pending = 0;
  let declined = 0;
  const matched = matchInvitees(
    invitees.map((i) => ({ ...i, contact: i.contact ?? null })),
    replies,
  );
  const used = new Set<string>();
  const extra = new Map<string, Reply[]>(); // invitee → more replies found by name below
  // Replies the first pass left: a person inside a household line ("Jun Cruz" on "Ninong Jun
  // & Ninang Liza Cruz"), or the same person again. Only when exactly one line fits.
  const taken = new Set(matched.flatMap((m) => [m.reply, ...m.others].filter(Boolean).map((r) => r!.id)));
  const lineFolk = invitees.map((i) => ({ id: i.id, folk: linePeople(i.name) }));
  for (const r of replies) {
    if (taken.has(r.id)) continue;
    const w = words(r.name);
    const first = w[0];
    const last = w.length > 1 ? w[w.length - 1] : "";
    if (!first) continue;
    const fits = lineFolk.filter((l) => l.folk.some((p) => p.first === first && (last ? p.last === last : l.folk.length === 1)));
    if (fits.length === 1) {
      extra.set(fits[0].id, [...(extra.get(fits[0].id) ?? []), r]);
      taken.add(r.id);
    }
  }
  const add = (line: string, ppl: { name: string; tags?: Guest["tags"] }[], extra: Partial<Guest>, meal?: string) => {
    const party = uid("p");
    const into = SPONSOR.test(line) ? sponsors : group;
    ppl.forEach((x, i) => guests.push({ id: uid("u"), name: x.name, groupId: into.id, party, tableId: null, seat: null, ...(x.tags ? { tags: x.tags } : {}), ...(i === 0 && meal ? { meal } : {}), ...extra }));
    parties.push({ line, people: ppl.map((x) => x.name), group: into.name });
  };
  for (const { inv, reply, others } of matched) {
    const rs = [reply, ...others, ...(extra.get(inv.id) ?? [])].filter(Boolean) as Reply[];
    rs.forEach((r) => used.add(r.id));
    const a = answerOf(rs);
    seen[inv.id] = answerKey(a);
    answers[inv.id] = a;
    if (a.state === "no") {
      declined++;
      skipped.push({ line: inv.name, reason: "replied they can’t come" });
      continue;
    }
    if (a.state === "pending") pending++;
    const size = a.state === "yes" ? a.size : (inv.party_size ?? undefined);
    add(inv.name, people(inv.name, size, a.kids, a.names), { inviteeId: inv.id, reply: a.state }, a.meal);
  }
  // Replies from the site's open form that aren't on the invite list: their own household.
  for (const r of replies) {
    if (used.has(r.id)) continue;
    const same = replies.filter((x) => !used.has(x.id) && firstName(x.name) === firstName(r.name) && x.name.trim().toLowerCase() === r.name.trim().toLowerCase());
    same.forEach((x) => used.add(x.id));
    const a = answerOf(same);
    seen[`r:${r.id}`] = answerKey(a);
    answers[`r:${r.id}`] = a;
    if (a.state === "no") {
      declined++;
      skipped.push({ line: r.name, reason: "replied they can’t come" });
      continue;
    }
    // Linked to their reply ("r:…") until they're on the invite list (Send seats adds them).
    add(r.name, people(r.name, a.size, a.kids, a.names), { reply: "yes", inviteeId: `r:${r.id}` }, a.meal);
  }
  const used2 = new Set(guests.map((g) => g.groupId));
  return { groups: [sponsors, group].filter((g) => used2.has(g.id)), guests, parties, duplicates: 0, wantTable: {}, skipped, unsure: [], pending, declined, seen, answers };
}

// ---- keeping a plan current (Premium) ----------------------------------------------

/** Something about the replies the host should look at, for the plan check. */
export type ReplyItem =
  | { kind: "fewer"; party: string; name: string; coming: number; have: number }
  | { kind: "more"; party: string; name: string; coming: number; have: number }
  | { kind: "new"; lines: { key: string; name: string; size: number; inviteeId?: string; reply: "yes" | "pending" }[] };

export interface SyncResult {
  /** Households whose answer changed to can't come (this time). */
  declined: string[];
  /** Households who came back (said yes after no). */
  back: string[];
  items: ReplyItem[];
  /** Anything in the plan changed. */
  changed: boolean;
}

/**
 * Bring a plan up to date with the event's replies. Only answers that changed since the plan
 * last looked (chart.site.seen) do anything, so the host's own fixes stay put. Changes the
 * chart in place (call it inside commit): marks guests coming / can't come / not replied,
 * drops clear-cut extras, fills empty meals. Nothing is unseated here; the host clears
 * can't-come seats with one tap.
 */
export function syncReplies(c: Chart, invitees: (Invitee & { contact?: string | null })[], replies: Reply[]): SyncResult {
  const out: SyncResult = { declined: [], back: [], items: [], changed: false };
  if (!c.site) return out;
  const seen = { ...(c.site.seen ?? {}) };
  // What each line says now, read exactly as Start from my RSVPs reads it.
  const answers = new Map(Object.entries(householdsFromEvent(invitees, replies).answers));
  const byLine = new Map<string, Guest[]>();
  for (const g of c.guests) if (g.inviteeId) (byLine.get(g.inviteeId) ?? byLine.set(g.inviteeId, []).get(g.inviteeId)!).push(g);
  const mark = (gs: Guest[], reply: Guest["reply"]) => gs.forEach((g) => g.reply !== reply && ((g.reply = reply), (out.changed = true)));
  const newLines: Extract<ReplyItem, { kind: "new" }>["lines"] = [];
  /** "Says 3 of 5" / "says 5, you have 4": worked out fresh each time, so it goes once fixed. */
  const countItem = (household: Guest[], a: ReturnType<typeof answerOf>, name: string) => {
    const have = household.filter((g) => g.reply !== "no").length;
    const coming = a.size ?? have;
    if (coming < have) out.items.push({ kind: "fewer", party: household[0].party, name, coming, have });
    else if (coming > have) out.items.push({ kind: "more", party: household[0].party, name, coming, have });
  };

  for (const [key, a] of answers) {
    const before = seen[key];
    const nowKey = answerKey(a);
    const household = byLine.get(key) ?? [];
    const inv = invitees.find((i) => i.id === key);
    const name = household.length ? household[0].name : (inv?.name ?? replies.find((r) => `r:${r.id}` === key)?.name ?? "A guest");
    if (!household.length) {
      // On the invite list (or the open form) but not in the plan: offer to add them.
      if (a.state !== "no") newLines.push({ key, name: inv?.name ?? name, size: a.size ?? inv?.party_size ?? 1, ...(inv ? { inviteeId: inv.id } : {}), reply: a.state });
      continue;
    }
    if (before === nowKey) {
      // Nothing new: the host's choices stand. A count that still doesn't match stays on the list.
      if (a.state === "yes") countItem(household, a, name);
      continue;
    }
    seen[key] = nowKey;
    out.changed = true;
    const party = household[0].party;
    if (a.state === "no") {
      mark(household, "no");
      out.declined.push(party);
      continue;
    }
    if (a.state === "pending") {
      mark(household, "pending");
      continue;
    }
    if (before === "no") out.back.push(party);
    const coming = a.size ?? household.length;
    const here = household.filter((g) => g.reply !== "no" || before === "no");
    mark(here, "yes");
    if (a.meal && !household[0].meal) household[0].meal = a.meal;
    if (coming < here.length) {
      // Clear-cut when the extras are plus-ones (or the kids they didn't bring): those go.
      const kidsComing = a.kids ?? here.filter((g) => g.tags?.includes("kid")).length;
      const drop: Guest[] = [];
      const plus = here.filter((g) => g.tags?.includes("plusone")).reverse();
      const kids = here.filter((g) => g.tags?.includes("kid"));
      const extraKids = kids.slice(kidsComing).reverse();
      for (const g of [...plus, ...extraKids]) if (here.length - drop.length > coming) drop.push(g);
      if (here.length - drop.length === coming) mark(drop, "no");
    }
    countItem(household, a, name);
  }
  if (newLines.length) out.items.push({ kind: "new", lines: newLines });
  c.site.seen = seen;
  c.site.syncedAt = Date.now();
  return out;
}

/** New households from replies (the plan check's "Add them"), unseated, in "From RSVPs". */
export function addReplyLines(c: Chart, lines: Extract<ReplyItem, { kind: "new" }>["lines"]) {
  let group = c.groups.find((g) => g.name === "From RSVPs");
  if (!group) {
    group = { id: uid("g"), name: "From RSVPs", cat: "other" };
    c.groups.push(group);
  }
  for (const l of lines) {
    if (c.guests.some((g) => g.inviteeId === (l.inviteeId ?? l.key))) continue;
    const party = uid("p");
    for (const x of people(l.name, l.size, undefined)) c.guests.push({ id: uid("u"), name: x.name, groupId: group.id, party, tableId: null, seat: null, ...(x.tags ? { tags: x.tags } : {}), inviteeId: l.inviteeId ?? l.key, reply: l.reply });
  }
}

/** The replies' items for the plan check, each with a fix where one is safe. */
export function replyIssues(c: Chart, items: ReplyItem[]): Issue[] {
  const tablesOf = (party: string) => [...new Set(c.guests.filter((g) => g.party === party && g.tableId).map((g) => g.tableId!))];
  return items.map((it): Issue => {
    if (it.kind === "new") {
      const n = it.lines.length;
      return {
        id: "replies:new",
        level: "fix",
        text: `${n} ${n === 1 ? "household has" : "households have"} replied or ${n === 1 ? "is" : "are"} on your invite list, but not in your plan: ${it.lines.slice(0, 3).map((l) => l.name).join(", ")}${n > 3 ? ` and ${n - 3} more` : ""}`,
        tableIds: [],
        fix: { label: n === 1 ? "Add them" : `Add all ${n}`, apply: (d) => addReplyLines(d, it.lines) },
      };
    }
    if (it.kind === "fewer") {
      const off = it.have - it.coming;
      return {
        id: `replies:fewer:${it.party}`,
        level: "fix",
        text: `${it.name}’s household says ${it.coming} of ${it.have} are coming`,
        tableIds: tablesOf(it.party),
        fix: {
          label: off === 1 ? "Mark the last one not coming" : `Mark the last ${off} not coming`,
          apply: (d) => d.guests.filter((g) => g.party === it.party && g.reply !== "no").slice(-off).forEach((g) => (g.reply = "no")),
        },
      };
    }
    const more = it.coming - it.have;
    return {
      id: `replies:more:${it.party}`,
      level: "fix",
      text: `${it.name}’s household says ${it.coming} are coming; the plan has ${it.have}`,
      tableIds: tablesOf(it.party),
      fix: {
        label: more === 1 ? "Add 1 guest" : `Add ${more} guests`,
        apply: (d) => {
          const home = d.guests.find((g) => g.party === it.party);
          if (!home) return;
          const lead = home.name.split(/\s+/).find((w) => w.length > 1 && !isHonorific(w)) ?? "Guest";
          const t = home.tableId ? d.tables.find((x) => x.id === home.tableId) : undefined;
          const free = t ? freeSeats(t, d.guests.filter((g) => g.tableId === t.id)) : [];
          for (let i = 0; i < more; i++) {
            const seat = free.shift();
            d.guests.push({ id: uid("u"), name: `Guest of ${lead}${more > 1 ? ` ${i + 1}` : ""}`, groupId: home.groupId, party: it.party, tableId: seat !== undefined && t ? t.id : null, seat: seat ?? null, tags: ["plusone"], inviteeId: home.inviteeId, reply: "yes" });
          }
        },
      },
    };
  });
}

