import type { ComponentType } from "react";
import type { EventContent } from "../content/types";
import type { BaseTemplateSettings } from "../presentation/types";
import { editorialFormalTemplateDefinition } from "../templates/editorial-formal";
import { modernMinimalTemplateDefinition } from "../templates/modern-minimal";
import { botanicalTemplateDefinition } from "../templates/botanical";
import { scrapbookTemplateDefinition } from "../templates/scrapbook";
import { cinematicTemplateDefinition } from "../templates/cinematic";
import { pickleballTemplateDefinition } from "../templates/pickleball";
import { debutTemplateDefinition } from "../templates/debut";
import { loveLetterTemplateDefinition } from "../templates/love-letter";
import { promenadeTemplateDefinition } from "../templates/promenade";
import { openPlayTemplateDefinition } from "../templates/open-play";
import { capizTemplateDefinition } from "../templates/capiz";
import { caladoTemplateDefinition } from "../templates/calado";
import { underGlassTemplateDefinition } from "../templates/under-glass";
import { rivieraTemplateDefinition } from "../templates/riviera";
import { poolsideTemplateDefinition } from "../templates/poolside";
import { freediveTemplateDefinition } from "../templates/freedive";
import { summitTemplateDefinition } from "../templates/summit";
import { safariTemplateDefinition } from "../templates/safari";
import { levelUpTemplateDefinition } from "../templates/levelup";
import { tinghunRiceTemplateDefinition } from "../templates/tinghun-rice";
import { debutIssueTemplateDefinition } from "../templates/debut-issue";
import { tinghunLacquerTemplateDefinition } from "../templates/tinghun-lacquer";
import { tinghunPorcelainTemplateDefinition } from "../templates/tinghun-porcelain";

// Template contract + registry.
//
// Deliberately a single hand-built object literal, not a filesystem
// auto-discovery/plugin loader — see docs/template-builder-decisions.md.
// New templates are registered here explicitly, one line each, mirroring
// the existing flat route-array idiom in src/router/config.tsx.

export interface TemplateProps<S extends BaseTemplateSettings = BaseTemplateSettings> {
  content: EventContent;
  settings: S;
  /**
   * True only inside the builder's live preview. Templates may use it to
   * show editor-only affordances — an "add your story" hint, an empty
   * photo frame — so a half-filled draft still reads as a designed page
   * instead of collapsing to almost nothing. These MUST never render on
   * the published site, which does not pass this flag.
   */
  editorPreview?: boolean;
  /**
   * True only on the published page (/invite/:slug) — the one place a
   * full-screen opening animation or timed reveal may play. Gallery cards
   * and the builder render the finished, resting state instead.
   */
  live?: boolean;
  /**
   * True only on the full-page design preview (/build/preview/:id), where a
   * couple browses the sample: a template may play its opening there, but it
   * must not fetch live data (that stays behind `live`).
   */
  demo?: boolean;
  /**
   * True only on the gallery card (/build): the card is a fixed 4:3 frame, so a template
   * whose first screen is sized to the browser window can size it to the card instead.
   */
  gallery?: boolean;
}

export type TemplateArchetype =
  | "editorial"
  | "formal-stationery"
  | "botanical"
  | "modern-minimal"
  | "scrapbook"
  | "cinematic"
  /** Templates uploaded through Studio → Templates (spec + runtime). */
  | "uploaded";

export interface TemplateDefinition<S extends BaseTemplateSettings = BaseTemplateSettings> {
  id: string;
  label: string;
  archetype: TemplateArchetype;
  previewThumbnailUrl: string;
  component: ComponentType<TemplateProps<S>>;
  defaultSettings: S;
  /**
   * Future free/paid template tiers — see docs/template-builder-decisions.md.
   * No billing exists yet, so this is purely declarative today (every
   * template should set it explicitly; nothing reads/enforces it yet).
   * Optional only so it doesn't force a change everywhere the instant
   * it's added — but new templates should always set it.
   */
  tier?: "free" | "premium";
  /**
   * The kinds of event this design is for (events.event_type: wedding, birthday, …), from
   * templates.event_types (Studio → Templates). Empty or missing: any event.
   */
  occasions?: string[];
  /**
   * A still of the design's first screen for the gallery cards (/build and the account
   * picker), made by scripts/template-cards.mjs. Without it the card renders the template
   * live, which is heavy with many cards on one page.
   */
  cardImage?: string;
  /** False for a design no longer offered (it still renders existing sites). Only matters when
   *  the database catalog can't load; otherwise templates.status decides. */
  offered?: boolean;
  /**
   * Sample content used wherever the template is shown as a SAMPLE
   * rather than as someone's event — the gallery card, the dev harness.
   * Never written into a real event and never merged into client
   * content; a template without it falls back to a schematic mockup.
   */
  demoContent?: EventContent;
  /**
   * The standard editor sections this design actually shows. The builder
   * hides the rest, so a host never fills in something that won't appear.
   * Missing = every section (the general-purpose templates).
   */
  uses?: StandardSection[];
  /**
   * The page width the gallery card lays the design out at (default 1100). A design whose
   * first screen is taller than the card (Pickleball's invitation) sets it wider, so the
   * whole thing fits instead of being cut off.
   */
  galleryWidth?: number;
  /** How many gallery photos the design shows (the builder says so). */
  galleryLimit?: number;
  /** The design turns photos over to show their back: the builder asks what's written there,
   *  and that captions start with the year. */
  photoBacks?: boolean;
  /** What this design calls the "story" (e.g. "Invitation message"). */
  storyLabel?: string;
  storyHint?: string;
  /**
   * Fields only this design has — a headline, a dress code, a favorite
   * song… Answers are stored in content.custom[key] and edited in the
   * builder's "<template> details" section.
   */
  customFields?: CustomField[];
  /**
   * The sections a host can switch off for this design, in page order: standard keys
   * (SectionVisibility, e.g. "schedule", "registry") and the design's own (e.g. "bring").
   * Drives the "Show on website" switches in the editor and Look & Feel's list.
   * Missing = Look & Feel's general list.
   */
  hideable?: { key: string; label: string }[];
  /** False for a design with no entourage or motif colours on the page: the builder leaves out
   *  the "Entourage & motif" group. */
  entourage?: false;
  /**
   * Sections the host can move on the page, in the design's own order. `key` is what the
   * design marks with siteEdit().section; `vis` the SectionVisibility keys that show it (the
   * key itself when left out). Designs without it can't be reordered.
   */
  sections?: { key: string; label: string; vis?: string[] }[];
}

export type StandardSection = "story" | "dateVenue" | "schedule" | "accommodations" | "travel" | "gallery" | "keyPeople" | "registry" | "faqs";

export interface CustomField {
  /** Stable storage key (content.custom[key]). Reuse a key across templates to share the answer. */
  key: string;
  label: string;
  hint?: string;
  /** Shown faded in the empty field. */
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  /** A fixed choice instead of free text: shown as a dropdown; the first option is the default. */
  options?: { value: string; label: string }[];
  /** The design's own section this field belongs to (a key in `hideable`): the editor groups
   *  these fields under that section's name with its "Show on website" switch. */
  section?: string;
}

// `any` here is the one intentional escape hatch: the registry is
// necessarily heterogeneous (each template can have its own settings
// shape extending BaseTemplateSettings), and callers narrow via the
// specific TemplateDefinition they look up, not via this map's type.
export const templateRegistry: Record<string, TemplateDefinition<any>> = {
  "editorial-formal": editorialFormalTemplateDefinition,
  "modern-minimal": modernMinimalTemplateDefinition,
  botanical: botanicalTemplateDefinition,
  scrapbook: scrapbookTemplateDefinition,
  cinematic: cinematicTemplateDefinition,
  pickleball: pickleballTemplateDefinition,
  debut: debutTemplateDefinition,
  "love-letter": loveLetterTemplateDefinition,
  promenade: promenadeTemplateDefinition,
  "open-play": openPlayTemplateDefinition,
  capiz: capizTemplateDefinition,
  calado: caladoTemplateDefinition,
  "under-glass": underGlassTemplateDefinition,
  riviera: rivieraTemplateDefinition,
  poolside: poolsideTemplateDefinition,
  freedive: freediveTemplateDefinition,
  summit: summitTemplateDefinition,
  safari: safariTemplateDefinition,
  levelup: levelUpTemplateDefinition,
  "tinghun-rice": tinghunRiceTemplateDefinition,
  "tinghun-lacquer": tinghunLacquerTemplateDefinition,
  "tinghun-porcelain": tinghunPorcelainTemplateDefinition,
  "debut-issue": debutIssueTemplateDefinition,
};

// ---------------------------------------------------------------------------
// Runtime catalog. Uploaded templates (Studio → Templates) live in the
// database, not in code: engine/catalog.ts loads them and registers them
// here next to the hand-coded ones above. The `templates` table also holds
// gallery order, tier and visibility for EVERY template (code ones too).

export interface CatalogEntry {
  id: string;
  label: string;
  kind: "code" | "spec";
  tier: "free" | "premium";
  status: "draft" | "listed" | "hidden" | "retired";
  sort: number;
  currentVersionId: string | null;
  thumbnailUrl: string | null;
  eventTypes: string[];
}

const runtimeTemplates: Record<string, TemplateDefinition<any>> = {};
let catalog: Record<string, CatalogEntry> | null = null;
let version = 0;
const listeners = new Set<() => void>();
const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

export function subscribeTemplates(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const templatesVersion = () => version;

/** Called by engine/catalog.ts once the database catalog has loaded. */
export function setTemplateCatalog(entries: CatalogEntry[] | null, specDefinitions: TemplateDefinition[]) {
  catalog = entries ? Object.fromEntries(entries.map((e) => [e.id, e])) : null;
  for (const def of specDefinitions) runtimeTemplates[def.id] = def;
  notify();
}

/** Register one spec template outside the catalog (e.g. a public page's pinned version). */
export function registerTemplate(def: TemplateDefinition) {
  if (runtimeTemplates[def.id] === def) return;
  runtimeTemplates[def.id] = def;
  notify();
}

export function getCatalogEntry(templateId: string): CatalogEntry | undefined {
  return catalog?.[templateId];
}

export function getTemplateDefinition(templateId: string): TemplateDefinition | undefined {
  const def = runtimeTemplates[templateId] ?? templateRegistry[templateId];
  const entry = catalog?.[templateId];
  // The catalog row is the source of truth for label, tier and the events it's for.
  return def && entry ? { ...def, label: entry.label, tier: entry.tier, occasions: entry.eventTypes } : def;
}

/** Whether a design can be used for this kind of event (none set on the design: any event). */
export function templateFitsEvent(template: Pick<TemplateDefinition, "occasions">, eventType: string | null | undefined): boolean {
  const o = template.occasions ?? [];
  return !eventType || o.length === 0 || o.includes(eventType);
}

/** Templates offered in the gallery: listed ones, in catalog order. Before
 *  the catalog loads (or if it can't), the hand-coded templates. */
export function listTemplateDefinitions(): TemplateDefinition[] {
  if (!catalog) return Object.values(templateRegistry).filter((d) => d.offered !== false);
  return Object.values(catalog)
    .filter((e) => e.status === "listed")
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
    .map((e) => getTemplateDefinition(e.id))
    .filter((d): d is TemplateDefinition => Boolean(d));
}
