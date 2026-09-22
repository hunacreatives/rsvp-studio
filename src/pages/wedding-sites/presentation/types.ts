import type { ImageAsset } from "../content/types";

// Presentation is deliberately separate from content (see
// docs/template-builder-decisions.md). This file only describes curated,
// constrained customization surfaces — never raw CSS, arbitrary spacing,
// or freeform positioning. See CustomizationBoundary in the research doc
// for which knobs are safe to expose at all.

export interface SectionVisibility {
  hero: boolean;
  hostIntro: boolean;
  schedule: boolean;
  venue: boolean;
  gallery: boolean;
  accommodations: boolean;
  travelInformation: boolean;
  registry: boolean;
  faqs: boolean;
  rsvp: boolean;
}

export const defaultSectionVisibility: SectionVisibility = {
  hero: true,
  hostIntro: true,
  schedule: true,
  venue: true,
  gallery: true,
  accommodations: true,
  travelInformation: true,
  registry: true,
  faqs: true,
  rsvp: true,
};

export interface PaletteOption {
  id: string;
  label: string;
  /** Hex swatches, sourced from src/index.css's existing --acc-* design
   *  tokens rather than inventing new ad hoc colors. */
  swatches: string[];
}

export interface FontPairingOption {
  id: string;
  label: string;
  displayFont: string;
  bodyFont: string;
}

/**
 * The settings every template shares. A specific template may extend this
 * with a small, closed set of its own template-specific options (e.g. a
 * hero treatment variant) — never an open-ended prop like arbitrary
 * spacing or a raw font-size number.
 */
export interface BaseTemplateSettings {
  paletteId: string;
  fontPairingId: string;
  sectionVisibility: SectionVisibility;
  /** Per-template hero image swap. Focal point lives on the ImageAsset
   *  itself, so switching templates never requires re-cropping. */
  heroImage?: ImageAsset;
}

/**
 * Presentation state for one event. `byTemplate` is additive-only: a
 * template's settings node is created lazily from its `defaultSettings`
 * on first selection and is never deleted when the host(s) switch away
 * from it — this is what lets them return to a prior template without
 * losing its configuration. See Decision 2 in the decision log.
 */
export interface PresentationState {
  activeTemplateId: string;
  byTemplate: Record<string, BaseTemplateSettings>;
}

export const emptyPresentationState: PresentationState = {
  activeTemplateId: "",
  byTemplate: {},
};
