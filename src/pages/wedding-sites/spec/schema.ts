import { z } from "zod";
import { BINDING_FIELDS, type BindingField } from "./bindings";

// Template spec v1 — the data format for templates the studio UPLOADS
// (Studio → Templates) instead of hand-coding. One generic runtime
// (runtime/SpecTemplate.tsx) renders any spec, so a new design needs no
// developer and no deploy. See docs/template-builder-decisions.md
// ("Uploadable templates: spec + runtime").
//
// A spec is a list of sections. Two kinds:
// - "canvas": the art-directed part straight from the designer's file — a
//   background image with text/photo/image layers placed in normalized
//   boxes (0..1 of the canvas). Text binds to event content (names, date,
//   venue) so every customer's details fill the design.
// - "block": a shared, token-styled section from the block library
//   (schedule, venue, gallery, RSVP, ...) for everything the designer
//   didn't draw.
//
// Sizes inside a canvas are in "canvas units" = % of the canvas width, so
// the design scales as one piece on every screen.

const hex = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "colour must be a hex value like #520606");

export const COLOR_TOKENS = ["bg", "surface", "ink", "muted", "accent", "onAccent"] as const;
/** Font slots: display/body always; accent/extra for designs with 3–4 faces. */
export const FONT_SLOTS = ["display", "body", "accent", "extra"] as const;
export type FontSlot = (typeof FONT_SLOTS)[number];
export type ColorToken = (typeof COLOR_TOKENS)[number];
const colorRef = z.union([z.enum(COLOR_TOKENS), hex]);

const box = z.object({
  x: z.number().min(-0.5).max(1.5),
  y: z.number().min(-0.5).max(1.5),
  w: z.number().positive().max(2),
  h: z.number().positive().max(2),
});

const when = z
  .object({ minHosts: z.number().int().min(0).optional(), maxHosts: z.number().int().min(0).optional() })
  .optional();

const binding = z.object({
  field: z.enum(BINDING_FIELDS),
  /** Field-specific format, e.g. eventDate → "long" | "day" | "monthShort". */
  format: z.string().optional(),
  /** hosts.names only: the word between names ("&", "and"). */
  joiner: z.string().max(12).optional(),
});

const layerBase = {
  id: z.string().min(1).max(60),
  box,
  z: z.number().int().min(0).max(50).default(1),
  rotate: z.number().min(-180).max(180).default(0),
  when,
};

const textLayer = z
  .object({
    ...layerBase,
    type: z.literal("text"),
    /** Bound to content; omit for fixed text that is part of the design. */
    bind: binding.optional(),
    /** Fixed text (when no bind), or the fallback shown when the bound field is empty. */
    text: z.string().max(400).optional(),
    font: z.enum(FONT_SLOTS).default("body"),
    /** Canvas units (% of canvas width). */
    size: z.number().positive().max(40),
    /** Smallest size the text may shrink to when real content is long. */
    minSize: z.number().positive().max(40).optional(),
    color: colorRef.default("ink"),
    align: z.enum(["left", "center", "right"]).default("center"),
    valign: z.enum(["top", "middle", "bottom"]).default("middle"),
    weight: z.number().int().min(100).max(900).default(400),
    italic: z.boolean().default(false),
    uppercase: z.boolean().default(false),
    letterSpacing: z.number().min(-0.1).max(1).default(0),
    lineHeight: z.number().min(0.7).max(3).default(1.2),
    opacity: z.number().min(0).max(1).default(1),
    /** Hide the layer entirely when its bound field is empty (published page). */
    hideWhenEmpty: z.boolean().default(false),
    /** Placeholder shown in the builder while the bound field is empty. */
    editorHint: z.string().max(60).optional(),
    /** Drop shadow / glow, in canvas units (e.g. Canva's text shadow). */
    shadow: z
      .object({
        x: z.number().min(-5).max(5),
        y: z.number().min(-5).max(5),
        blur: z.number().min(0).max(10),
        color: z.string().regex(/^#[0-9a-fA-F]{8}$/, "shadow colour must be #rrggbbaa"),
      })
      .optional(),
  });

const photoLayer = z.object({
  ...layerBase,
  type: z.literal("photo"),
  /** Which customer photo: 0 = first gallery photo, 1 = second, ... */
  slot: z.number().int().min(0).max(30),
  radius: z.number().min(0).max(50).default(0),
  /** Optional frame drawn over the photo (an asset id). */
  frameAssetId: z.string().optional(),
  editorHint: z.string().max(60).optional(),
});

const imageLayer = z.object({
  ...layerBase,
  type: z.literal("image"),
  assetId: z.string(),
  opacity: z.number().min(0).max(1).default(1),
});

const rsvpButtonLayer = z.object({
  ...layerBase,
  type: z.literal("rsvpButton"),
  label: z.string().max(30).default("RSVP"),
  color: colorRef.default("onAccent"),
  fill: colorRef.default("accent"),
  size: z.number().positive().max(10).default(2.2),
});

export const layerSchema = z.discriminatedUnion("type", [
  textLayer, // "needs bind or text" is checked in templateSpecSchema's superRefine
  photoLayer,
  imageLayer,
  rsvpButtonLayer,
]);

export const VISIBILITY_KEYS = [
  "hero",
  "hostIntro",
  "schedule",
  "venue",
  "gallery",
  "accommodations",
  "travelInformation",
  "registry",
  "faqs",
  "rsvp",
] as const;

const canvasSection = z.object({
  id: z.string().min(1).max(60),
  kind: z.literal("canvas"),
  visibilityKey: z.enum(VISIBILITY_KEYS).optional(),
  /** Design size of the canvas in px (only the ratio matters). */
  aspect: z.tuple([z.number().positive(), z.number().positive()]),
  maxWidth: z.number().positive().max(2400).default(640),
  band: colorRef.default("bg"),
  /** "none": no space around the canvas — bands of a long design stack edge to edge. */
  padding: z.enum(["normal", "none"]).default("normal"),
  backgroundAssetId: z.string().optional(),
  layers: z.array(layerSchema).max(150),
});

export const BLOCK_TYPES = ["story", "keyPeople", "schedule", "venue", "gallery", "registry", "faqs", "rsvp", "footer"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

const blockSection = z.object({
  id: z.string().min(1).max(60),
  kind: z.literal("block"),
  block: z.enum(BLOCK_TYPES),
  visibilityKey: z.enum(VISIBILITY_KEYS).optional(),
  band: colorRef.default("bg"),
  heading: z.string().max(60).optional(),
  divider: z.enum(["none", "line", "leaf", "dots"]).default("line"),
  align: z.enum(["center", "left"]).default("center"),
});

export const sectionSchema = z.discriminatedUnion("kind", [canvasSection, blockSection]);

const palette = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
  colors: z.object({
    bg: hex,
    surface: hex,
    ink: hex,
    muted: hex,
    accent: hex,
    onAccent: hex,
  }),
});

const fontRef = z.object({
  /** Google Fonts family name, e.g. "Cormorant Garamond". */
  family: z.string().min(1).max(60),
  weights: z.array(z.number().int()).max(6).default([400, 700]),
  italic: z.boolean().default(false),
  /** CSS fallback stack appended after the family. */
  fallback: z.string().max(80).default("serif"),
});

const asset = z.object({
  /** Absolute URL or site path (template-assets bucket once uploaded). */
  url: z.string().min(1),
  w: z.number().positive(),
  h: z.number().positive(),
});

export const templateSpecSchema = z
  .object({
    specVersion: z.literal(1),
    meta: z.object({
      eventTypes: z.array(z.enum(["wedding", "birthday", "anniversary", "other"])).default([]),
    }),
    tokens: z.object({
      palettes: z.array(palette).min(1).max(8),
      defaultPaletteId: z.string(),
      /** Let customers pick the platform-wide palettes too (only when the art isn't colour-baked). */
      allowGlobalPalettes: z.boolean().default(false),
      fonts: z.object({ display: fontRef, body: fontRef, accent: fontRef.optional(), extra: fontRef.optional() }),
      radius: z.enum(["none", "soft", "round"]).default("soft"),
    }),
    assets: z.record(asset).default({}),
    sections: z.array(sectionSchema).min(1).max(30),
  })
  .superRefine((spec, ctx) => {
    if (!spec.tokens.palettes.some((p) => p.id === spec.tokens.defaultPaletteId)) {
      ctx.addIssue({ code: "custom", path: ["tokens", "defaultPaletteId"], message: "defaultPaletteId must match one of the palettes" });
    }
    const ids = new Set<string>();
    spec.sections.forEach((section, si) => {
      if (ids.has(section.id)) ctx.addIssue({ code: "custom", path: ["sections", si, "id"], message: `duplicate section id "${section.id}"` });
      ids.add(section.id);
      if (section.kind !== "canvas") return;
      if (section.backgroundAssetId && !spec.assets[section.backgroundAssetId]) {
        ctx.addIssue({ code: "custom", path: ["sections", si, "backgroundAssetId"], message: `unknown asset "${section.backgroundAssetId}"` });
      }
      section.layers.forEach((layer, li) => {
        const at = ["sections", si, "layers", li];
        if (layer.type === "text" && !layer.bind && !layer.text) {
          ctx.addIssue({ code: "custom", path: at, message: "a text layer needs either `bind` or `text`" });
        }
        if (layer.type === "image" && !spec.assets[layer.assetId]) {
          ctx.addIssue({ code: "custom", path: [...at, "assetId"], message: `unknown asset "${layer.assetId}"` });
        }
        if (layer.type === "photo" && layer.frameAssetId && !spec.assets[layer.frameAssetId]) {
          ctx.addIssue({ code: "custom", path: [...at, "frameAssetId"], message: `unknown asset "${layer.frameAssetId}"` });
        }
      });
    });
  });

// Hand-written types for a VALIDATED spec (defaults applied). zod's
// z.infer can't be used here: this project compiles with strict: false,
// and without strictNullChecks zod infers every field as optional. Keep
// these in step with the schema above — parseSpec() is the only way a spec
// becomes a TemplateSpec, so the schema remains the source of truth.

type ColorRef = ColorToken | string;
interface Box { x: number; y: number; w: number; h: number }
interface LayerBase { id: string; box: Box; z: number; rotate: number; when?: { minHosts?: number; maxHosts?: number } }

export interface TextLayerSpec extends LayerBase {
  type: "text";
  bind?: { field: BindingField; format?: string; joiner?: string };
  text?: string;
  font: FontSlot;
  size: number;
  minSize?: number;
  color: ColorRef;
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "bottom";
  weight: number;
  italic: boolean;
  uppercase: boolean;
  letterSpacing: number;
  lineHeight: number;
  opacity: number;
  hideWhenEmpty: boolean;
  editorHint?: string;
  shadow?: { x: number; y: number; blur: number; color: string };
}
export interface PhotoLayerSpec extends LayerBase { type: "photo"; slot: number; radius: number; frameAssetId?: string; editorHint?: string }
export interface ImageLayerSpec extends LayerBase { type: "image"; assetId: string; opacity: number }
export interface RsvpButtonLayerSpec extends LayerBase { type: "rsvpButton"; label: string; color: ColorRef; fill: ColorRef; size: number }
export type LayerSpec = TextLayerSpec | PhotoLayerSpec | ImageLayerSpec | RsvpButtonLayerSpec;

type VisibilityKey = (typeof VISIBILITY_KEYS)[number];
export interface CanvasSectionSpec {
  id: string;
  kind: "canvas";
  visibilityKey?: VisibilityKey;
  aspect: [number, number];
  maxWidth: number;
  band: ColorRef;
  padding: "normal" | "none";
  backgroundAssetId?: string;
  layers: LayerSpec[];
}
export interface BlockSectionSpec {
  id: string;
  kind: "block";
  block: BlockType;
  visibilityKey?: VisibilityKey;
  band: ColorRef;
  heading?: string;
  divider: "none" | "line" | "leaf" | "dots";
  align: "center" | "left";
}
export type SpecSection = CanvasSectionSpec | BlockSectionSpec;

export interface PaletteSpec { id: string; label: string; colors: Record<ColorToken, string> }
export interface FontRefSpec { family: string; weights: number[]; italic: boolean; fallback: string }
export interface TemplateSpec {
  specVersion: 1;
  meta: { eventTypes: ("wedding" | "birthday" | "anniversary" | "other")[] };
  tokens: {
    palettes: PaletteSpec[];
    defaultPaletteId: string;
    allowGlobalPalettes: boolean;
    fonts: { display: FontRefSpec; body: FontRefSpec; accent?: FontRefSpec; extra?: FontRefSpec };
    radius: "none" | "soft" | "round";
  };
  assets: Record<string, { url: string; w: number; h: number }>;
  sections: SpecSection[];
}

export type ParseResult = { ok: true; spec: TemplateSpec } | { ok: false; errors: string[] };

/** Validate an uploaded spec. Errors are human-readable, one per problem. */
export function parseSpec(input: unknown): ParseResult {
  const result = templateSpecSchema.safeParse(input);
  if (result.success) return { ok: true, spec: result.data as unknown as TemplateSpec };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.length ? i.path.join(".") + ": " : ""}${i.message}`),
  };
}
