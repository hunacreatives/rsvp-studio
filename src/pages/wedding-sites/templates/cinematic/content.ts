import type { EventContent } from "../../content/types";

/** "Gel" for one host, "Gel and Sam" for two, "Gel, Sam and Mia" for more —
 *  matches the reference's single-honoree copy while staying generic. */
export function hostNames(content: EventContent): string {
  const names = content.hosts.map((h) => h.name.trim()).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "May 11, 7:00 PM" — the reference's exact date+time line format,
 *  gracefully degrading to date-only or nothing if either is missing. */
export function formatDateTime(iso: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const dateLabel = date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const hasTime = iso.includes("T") && !(date.getHours() === 0 && date.getMinutes() === 0);
  if (!hasTime) return dateLabel;

  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateLabel}, ${timeLabel}`;
}

export function hasLocation(content: EventContent): boolean {
  return Boolean(content.primaryLocation.name?.trim() || content.primaryLocation.addressLine?.trim());
}
