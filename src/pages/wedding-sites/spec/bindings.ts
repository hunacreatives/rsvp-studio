import type { EventContent } from "../content/types";
import { parseEventDate } from "../content/parseEventDate";

// The closed list of content fields a template's text can bind to. Staff
// pick from this list when mapping an uploaded design (Studio →
// Templates), so it is deliberately small, named for people, and never an
// arbitrary path into the content object.

export const BINDING_FIELDS = [
  "hosts.names",
  "hosts.0.name",
  "hosts.1.name",
  "eventDate",
  "venue.name",
  "venue.address",
  "venue.nameOrAddress",
  "story.first",
] as const;
export type BindingField = (typeof BINDING_FIELDS)[number];

export interface BindingInfo {
  label: string;
  /** Formats staff can choose for this field (first = default). */
  formats?: { id: string; label: string }[];
  sample: string;
}

export const BINDING_INFO: Record<BindingField, BindingInfo> = {
  "hosts.names": {
    label: "All host names",
    formats: [
      { id: "joined", label: "One line (Ana & Ben)" },
      { id: "stacked", label: "One name per line" },
      { id: "first", label: "First names only" },
    ],
    sample: "Isabella & Mateo",
  },
  "hosts.0.name": { label: "First host's name", sample: "Isabella" },
  "hosts.1.name": { label: "Second host's name", sample: "Mateo" },
  eventDate: {
    label: "Event date",
    formats: [
      { id: "long", label: "Saturday, December 12, 2026" },
      { id: "medium", label: "December 12, 2026" },
      { id: "numeric", label: "12.12.2026" },
      { id: "day", label: "Day number (12)" },
      { id: "month", label: "Month (December)" },
      { id: "monthShort", label: "Short month (DEC)" },
      { id: "year", label: "Year (2026)" },
      { id: "weekday", label: "Weekday (Saturday)" },
      { id: "time", label: "Time (4:00 PM)" },
    ],
    sample: "Saturday, December 12, 2026",
  },
  "venue.name": { label: "Venue name", sample: "Casa San Pablo" },
  "venue.address": { label: "Venue address", sample: "San Pablo, Laguna" },
  "venue.nameOrAddress": { label: "Venue name (or address)", sample: "Casa San Pablo" },
  "story.first": { label: "Story — first paragraph", sample: "We met at a friend's despedida…" },
};

/** Placeholder text for an empty bound field, in the layer's chosen format
 *  (an empty "time" layer hints "4:00 PM", not a whole date). */
export function bindingSample(field: BindingField, format?: string): string {
  const info = BINDING_INFO[field];
  const label = format ? info.formats?.find((f) => f.id === format)?.label : undefined;
  const example = label?.match(/\(([^)]+)\)/)?.[1] ?? label;
  return example ?? info.sample;
}

function hostNames(content: EventContent): string[] {
  return content.hosts.map((h) => h.name.trim()).filter(Boolean);
}

function formatDate(iso: string, format: string | undefined): string {
  if (!iso) return "";
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hasTime = iso.includes("T") && !(d.getHours() === 0 && d.getMinutes() === 0);
  switch (format) {
    case "medium":
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    case "numeric":
      return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    case "day":
      return String(d.getDate());
    case "month":
      return d.toLocaleDateString("en-US", { month: "long" });
    case "monthShort":
      return d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    case "year":
      return String(d.getFullYear());
    case "weekday":
      return d.toLocaleDateString("en-US", { weekday: "long" });
    case "time":
      return hasTime ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
    default:
      return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
}

/** Resolve a bound field to display text ("" when the content is empty). */
export function resolveBinding(
  content: EventContent,
  field: BindingField,
  format?: string,
  joiner = "&",
): string {
  switch (field) {
    case "hosts.names": {
      const names = hostNames(content);
      if (format === "first") return names.map((n) => n.split(/\s+/)[0]).join(` ${joiner} `);
      if (format === "stacked") return names.join(`\n${joiner}\n`);
      return names.join(` ${joiner} `);
    }
    case "hosts.0.name":
      return hostNames(content)[0] ?? "";
    case "hosts.1.name":
      return hostNames(content)[1] ?? "";
    case "eventDate":
      return formatDate(content.eventDate, format);
    case "venue.name":
      return content.primaryLocation.name.trim();
    case "venue.address":
      return content.primaryLocation.addressLine.trim();
    case "venue.nameOrAddress":
      return (content.primaryLocation.name || content.primaryLocation.addressLine).trim();
    case "story.first":
      return (content.story ?? "").split("\n\n").map((p) => p.trim()).find(Boolean) ?? "";
  }
}
