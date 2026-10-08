import type { ComponentType } from "react";
import type { EventContent } from "../content/types";
import type { BaseTemplateSettings } from "../presentation/types";
import { editorialFormalTemplateDefinition } from "../templates/editorial-formal";
import { modernMinimalTemplateDefinition } from "../templates/modern-minimal";
import { botanicalTemplateDefinition } from "../templates/botanical";
import { scrapbookTemplateDefinition } from "../templates/scrapbook";
import { cinematicTemplateDefinition } from "../templates/cinematic";

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
   * Sample content used wherever the template is shown as a SAMPLE
   * rather than as someone's event — the gallery card, the dev harness.
   * Never written into a real event and never merged into client
   * content; a template without it falls back to a schematic mockup.
   */
  demoContent?: EventContent;
}

// `any` here is the one intentional escape hatch: the registry is
// necessarily heterogeneous (each template can have its own settings
// shape extending BaseTemplateSettings), and callers narrow via the
// specific TemplateDefinition they look up, not via this map's type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const templateRegistry: Record<string, TemplateDefinition<any>> = {
  "editorial-formal": editorialFormalTemplateDefinition,
  "modern-minimal": modernMinimalTemplateDefinition,
  botanical: botanicalTemplateDefinition,
  scrapbook: scrapbookTemplateDefinition,
  cinematic: cinematicTemplateDefinition,
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // The catalog row is the source of truth for label and tier.
  return def && entry ? { ...def, label: entry.label, tier: entry.tier } : def;
}

/** Templates offered in the gallery: listed ones, in catalog order. Before
 *  the catalog loads (or if it can't), the hand-coded templates. */
export function listTemplateDefinitions(): TemplateDefinition[] {
  if (!catalog) return Object.values(templateRegistry);
  return Object.values(catalog)
    .filter((e) => e.status === "listed")
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
    .map((e) => getTemplateDefinition(e.id))
    .filter((d): d is TemplateDefinition => Boolean(d));
}
