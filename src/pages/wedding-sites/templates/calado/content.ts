import type { EventContent, EntourageGroup } from "../../content/types";
import { customValue } from "../../content/custom";
import { parseEventDate } from "../../content/parseEventDate";

export { eventIsOver, timeOf, timeWords } from "../love-letter/content";
export { receptionMap } from "../capiz/content";

/** Which day it is (custom "babyEvent", a dropdown in the builder). */
export type BabyEvent = "christening" | "both" | "birthday" | "dedication";
export const babyEvent = (c: EventContent): BabyEvent => {
  const v = customValue(c, "babyEvent");
  return v === "both" || v === "birthday" || v === "dedication" ? v : "christening";
};

/** The words that change with the day. Dedication never uses Catholic wording. */
export function wordsFor(kind: BabyEvent) {
  switch (kind) {
    case "both":
      return { eyebrow: "The christening & first birthday of", label: "Christening & first birthday", ceremony: "The christening", party: "The celebration", sponsors: "Mga Ninong at Ninang" };
    case "birthday":
      return { eyebrow: "The first birthday of", label: "First birthday", ceremony: "The party", party: "The celebration", sponsors: "Our ninongs & ninangs" };
    case "dedication":
      return { eyebrow: "The dedication of", label: "Baby dedication", ceremony: "The dedication service", party: "The celebration", sponsors: "Spiritual parents" };
    default:
      return { eyebrow: "The christening of", label: "Christening", ceremony: "The christening", party: "The celebration", sponsors: "Mga Ninong at Ninang" };
  }
}

/** The name on the hoop, in lines: the host's own breaks (custom "heroName", Enter = new line),
 *  else the first name, then the rest (so "Amara Sofia" never leaves one word alone). */
export function nameLines(c: EventContent): string[] {
  const own = customValue(c, "heroName").split("\n").map((l) => l.trim()).filter(Boolean);
  if (own.length) return own.slice(0, 3);
  const words = (c.hosts[0]?.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  return [words[0], words.slice(1).join(" ")];
}

/** "A S" for the small stitched initials at the end. */
export function initials(c: EventContent) {
  return (c.hosts[0]?.name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join(" ");
}

/** "Saturday, 13 March 2027" */
export function longDate(iso: string): string | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** The town from the venue's address ("Makati City"). */
export function townOf(c: EventContent): string {
  const parts = (c.primaryLocation.addressLine ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/**
 * The livestream's start for someone watching from abroad: "10:00 AM in Manila" and, when
 * the viewer's own clock differs, "9:00 PM your time (Toronto)". The event's date is
 * Philippine time unless it says otherwise.
 */
export function streamTimes(iso: string): { manila: string; local: string | null } | null {
  if (!iso || !iso.includes("T")) return null;
  const at = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}+08:00`);
  if (Number.isNaN(at.getTime())) return null;
  const fmt = (tz?: string) => at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  const manila = fmt("Asia/Manila");
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    zone = "";
  }
  if (!zone || zone === "Asia/Manila" || fmt(zone) === manila) return { manila, local: null };
  const day = (tz: string) => at.toLocaleDateString("en-US", { weekday: "short", timeZone: tz });
  const city = zone.split("/").pop()?.replace(/_/g, " ") ?? zone;
  const otherDay = day(zone) !== day("Asia/Manila") ? ` ${day(zone)}` : "";
  return { manila, local: `${fmt(zone)}${otherDay} your time (${city})` };
}

/**
 * The godparents, for the sampler: groups named Ninong(s) and Ninang(s) side by side, then
 * any other groups (e.g. "Godparents", "Spiritual parents"), each a list of names.
 */
export function godparents(c: EventContent): { ninongs: string[]; ninangs: string[]; others: EntourageGroup[] } {
  const groups = (c.entourage ?? []).map((g) => ({ ...g, people: g.people.map((p) => p.trim()).filter(Boolean) })).filter((g) => g.people.length);
  const ninongs = groups.filter((g) => /ninong|godfather/i.test(g.title)).flatMap((g) => g.people);
  const ninangs = groups.filter((g) => /ninang|godmother/i.test(g.title)).flatMap((g) => g.people);
  const others = groups.filter((g) => !/ninong|godfather|ninang|godmother/i.test(g.title));
  return { ninongs, ninangs, others };
}
