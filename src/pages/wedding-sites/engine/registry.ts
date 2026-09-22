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
  | "cinematic";

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

export function getTemplateDefinition(templateId: string): TemplateDefinition | undefined {
  return templateRegistry[templateId];
}

export function listTemplateDefinitions(): TemplateDefinition[] {
  return Object.values(templateRegistry);
}
