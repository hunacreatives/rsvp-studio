import type { EventContent } from "../content/types";
import { parseEventDate } from "../content/parseEventDate";

// The closed list of content fields a template's text can bind to. Staff
// pick from this list when mapping an uploaded design (Studio →
// Templates), so it is deliberately small, named for people, and never an
// arbitrary path into the content object.

const DATE_FORMATS = [
  { id: "long", label: "Saturday, December 12, 2026" },
  { id: "medium", label: "December 12, 2026" },
  { id: "numeric", label: "12.12.2026" },
  { id: "day", label: "Day number (12)" },
  { id: "month", label: "Month (December)" },
  { id: "monthShort", label: "Short month (DEC)" },
  { id: "year", label: "Year (2026)" },
  { id: "weekday", label: "Weekday (Saturday)" },
  { id: "time", label: "Time (4:00 PM)" },
  { id: "timePadded", label: "Time (04:00 PM)" },
  { id: "time24", label: "24-hour time (16:00)" },
];

const BASE_INFO = {
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
  eventDate: { label: "Event date", formats: DATE_FORMATS, sample: "Saturday, December 12, 2026" },
  "venue.name": { label: "Venue name", sample: "Casa San Pablo" },
  "venue.address": { label: "Venue address", sample: "San Pablo, Laguna" },
  "venue.nameOrAddress": { label: "Venue name (or address)", sample: "Casa San Pablo" },
  "story.first": { label: "Story — first paragraph", sample: "We met at a friend's despedida…" },
} satisfies Record<string, BindingInfo>;

/**
 * Repeating content (schedule items, FAQs, …) is bound by position:
 * "schedule.1.time" = the second schedule item's time. A design with four
 * timeline rows binds rows 0–3; a customer with three items simply has the
 * fourth row hidden.
 */
export const REPEATING = {
  schedule: {
    label: "Schedule item",
    max: 8,
    parts: {
      label: { label: "name", sample: "Ceremony" },
      time: { label: "time", sample: "4:00 PM", formats: DATE_FORMATS.filter((f) => f.id.startsWith("time") || f.id === "medium") },
      description: { label: "details", sample: "At the garden chapel" },
      place: { label: "place", sample: "Garden Chapel" },
    },
  },
  faqs: { label: "FAQ", max: 8, parts: { question: { label: "question", sample: "Can I bring a plus one?" }, answer: { label: "answer", sample: "Our celebration is intimate…" } } },
  travel: { label: "Travel note", max: 6, parts: { title: { label: "title", sample: "Getting there" }, body: { label: "text", sample: "Fly into Manila…" } } },
  stay: {
    label: "Place to stay",
    max: 4,
    parts: { name: { label: "name", sample: "Hotel Maravillosa" }, address: { label: "address", sample: "Calle Mayor 12" }, notes: { label: "notes", sample: "Use code LB2030" } },
  },
  people: { label: "Wedding party member", max: 12, parts: { name: { label: "name", sample: "Sofia Reyes" }, role: { label: "role", sample: "Maid of Honor" } } },
  registry: { label: "Registry", max: 4, parts: { store: { label: "store", sample: "Rustan's" } } },
  story: { label: "Story paragraph", max: 4, parts: { text: { label: "text", sample: "We met at a friend's despedida…" } } },
} as const;

type Repeating = typeof REPEATING;
const repeatingFields = (Object.keys(REPEATING) as (keyof Repeating)[]).flatMap((group) =>
  Array.from({ length: REPEATING[group].max }, (_, i) => Object.keys(REPEATING[group].parts).map((part) => `${group}.${i}.${part}`)).flat(),
);

/** The closed list of fields a template's text can bind to. */
export const BINDING_FIELDS = [...Object.keys(BASE_INFO), ...repeatingFields] as unknown as readonly [string, ...string[]];
export type BindingField = string;

export interface BindingInfo {
  label: string;
  /** Formats staff can choose for this field (first = default). */
  formats?: { id: string; label: string }[];
  sample: string;
  /** Repeating group this field belongs to (for grouping in pickers). */
  group?: string;
}

function infoFor(field: string): BindingInfo {
  if (field in BASE_INFO) return BASE_INFO[field as keyof typeof BASE_INFO];
  const m = field.match(/^(\w+)\.(\d+)\.(\w+)$/);
  const group = m && REPEATING[m[1] as keyof Repeating];
  const part = group && (group.parts as Record<string, { label: string; sample: string; formats?: { id: string; label: string }[] }>)[m[3]];
  if (!group || !part) return { label: field, sample: "" };
  return { label: `${group.label} ${Number(m[2]) + 1} — ${part.label}`, sample: part.sample, formats: part.formats, group: group.label };
}

export const BINDING_INFO: Record<BindingField, BindingInfo> = Object.fromEntries(BINDING_FIELDS.map((f) => [f, infoFor(f)]));

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
    case "timePadded":
      return hasTime ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";
    case "time24":
      return hasTime ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
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
  return resolveRepeating(content, field, format);
}

function resolveRepeating(content: EventContent, field: string, format?: string): string {
  const m = field.match(/^(\w+)\.(\d+)\.(\w+)$/);
  if (!m) return "";
  const i = Number(m[2]);
  const part = m[3];
  const t = (v: string | undefined) => (v ?? "").trim();
  switch (m[1]) {
    case "schedule": {
      const item = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime))[i];
      if (!item) return "";
      if (part === "label") return t(item.label);
      if (part === "time") return formatDate(item.startTime, format ?? "time");
      if (part === "description") return t(item.description);
      if (part === "place") return t(item.location?.name);
      return "";
    }
    case "faqs": {
      const item = [...content.faqs].sort((a, b) => a.order - b.order)[i];
      return item ? t(part === "question" ? item.question : item.answer) : "";
    }
    case "travel": {
      const item = content.travelInformation[i];
      return item ? t(part === "title" ? item.title : item.body) : "";
    }
    case "stay": {
      const item = content.accommodations[i];
      if (!item) return "";
      return t(part === "name" ? item.name : part === "address" ? item.addressLine : item.notes);
    }
    case "people": {
      const item = content.keyPeople[i];
      return item ? t(part === "name" ? item.name : item.role) : "";
    }
    case "registry":
      return t(content.registryLinks[i]?.storeName);
    case "story":
      return (content.story ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean)[i] ?? "";
  }
  return "";
}
