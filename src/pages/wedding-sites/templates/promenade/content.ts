import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";

/** "Alex & Diana" (first names). */
export function coupleNames(content: EventContent): string {
  const f = content.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  if (f.length <= 1) return f[0] ?? "";
  return `${f.slice(0, -1).join(", ")} & ${f[f.length - 1]}`;
}

const valid = (iso: string) => {
  if (!iso) return null;
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Saturday, 21 June 2030" */
export function heroDate(iso: string): string | null {
  const d = valid(iso);
  return d ? `${d.toLocaleDateString("en-GB", { weekday: "long" })}, ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })} ${d.getFullYear()}` : null;
}

/** "21 June" for the countdown line. */
export function dayMonth(iso: string): string | null {
  const d = valid(iso);
  return d ? `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })}` : null;
}

/** "3:00 PM" */
export function timeOf(iso: string): string {
  const d = valid(iso);
  return d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

export type StoryEntry = { year?: string; title?: string; body: string };

/**
 * The story as a timeline: each paragraph is one moment. A paragraph whose
 * first line is "2021 · How We Met" (or "2021 - …", "2021: …") gets that year
 * and title; a short first line on its own is a title; the rest is the text.
 */
export function storyEntries(story: string | undefined): StoryEntry[] {
  return (story ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [first, ...rest] = p.split("\n");
      const body = rest.join("\n").trim();
      const m = /^(\d{4})\s*[·•\-–—|:]\s*(.+)$/.exec(first.trim());
      if (m && body) return { year: m[1], title: m[2].trim(), body };
      if (body && first.trim().length <= 48) return { title: first.trim(), body };
      return { body: p };
    });
}

/** True from the day after the event (Philippine time). */
export function eventIsOver(iso: string): boolean {
  const day = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  return today > day;
}
