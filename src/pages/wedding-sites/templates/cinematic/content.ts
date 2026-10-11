import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import { customValue } from "../../content/custom";

/** "Gel" for one host, "Gel and Sam" for two, "Gel, Sam and Mia" for more. */
export function hostNames(content: EventContent): string {
  const names = content.hosts.map((h) => h.name.trim()).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const isPlural = (content: EventContent) => content.hosts.filter((h) => h.name.trim()).length > 1;

/**
 * The opening headline as lines — the reference sets "Gel is" / "turning
 * thirty!" on two lines. The host's own headline (custom "headline", Enter = line break) wins;
 * otherwise it's built from the names and the occasion.
 */
export function headlineLines(content: EventContent): string[] {
  const own = customValue(content, "headline").split("\n").map((l) => l.trim()).filter(Boolean);
  if (own.length) return own;
  const names = hostNames(content);
  if (!names) return [];
  const plural = isPlural(content);
  switch (content.occasion) {
    case "wedding":
      return [names, "are getting married!"];
    case "birthday":
      return [`${names} ${plural ? "are" : "is"}`, "celebrating!"];
    default:
      return [names, plural ? "are celebrating!" : "is celebrating!"];
  }
}

/** "May 11, 7:00pm" — the reference's exact date line (no weekday, no year). */
export function formatWhen(iso: string): string | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const hasTime = iso.includes("T") && !(d.getHours() === 0 && d.getMinutes() === 0);
  if (!hasTime) return day;
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?([AP])M$/i, (_, m: string) => `${m.toLowerCase()}m`);
  return `${day}, ${time}`;
}

/** "La Terraza, Montebello" */
export function venueLine(content: EventContent): string {
  return [content.primaryLocation.name, content.primaryLocation.addressLine].map((s) => s?.trim()).filter(Boolean).join(", ");
}
