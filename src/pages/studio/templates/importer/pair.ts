import type { AiLayer, AiResult } from "./assemble";
import type { SvgAnalysis } from "./svg";
import type { SvgBuild } from "./svgImport";

// Two-version designs: the staff upload a desktop SVG and a phone SVG of the
// same design. Each is traced on its own (so both match their design), and
// the phone version is tied to the desktop one so ONE set of content fills
// both: the same text fields, the same fonts, the same customer photos.

type Raw = Record<string, unknown>;
type Pick = NonNullable<AiResult["photos"]>[number] & { oval?: boolean; fit?: { x: number; y: number; w: number; h: number }; slot?: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Similarity of two strings (0–1) from shared letter pairs; tolerates small misreads. */
function similar(a: string, b: string) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const pairs = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) ?? 0) + 1);
    return m;
  };
  const pa = pairs(a);
  const pb = pairs(b);
  let shared = 0;
  for (const [k, n] of pa) shared += Math.min(n, pb.get(k) ?? 0);
  return (2 * shared) / (a.length - 1 + b.length - 1);
}

/**
 * The phone version's AI reading, tied to the desktop one: each phone text
 * takes the meaning and font of the desktop text with the same wording
 * (a name stays the name field, a heading keeps its font). Design-wide
 * choices (fonts, palette, standard sections) come from the desktop.
 */
export function reconcilePhone(desk: AiResult, phone: AiResult): AiResult {
  const deskText = desk.layers.map((l) => norm(l.lines.join(" ")));
  const used = new Set<number>();
  const layers = phone.layers.map((l): AiLayer => {
    const t = norm(l.lines.join(" "));
    let best = -1;
    let bestScore = 0.8;
    deskText.forEach((d, i) => {
      const s = similar(t, d) - (used.has(i) ? 0.05 : 0);
      if (s > bestScore) (best = i), (bestScore = s);
    });
    const slotOk = (f: AiLayer["font"]) => (desk.fonts[f] ? f : "body");
    if (best < 0) return { ...l, font: slotOk(l.font) };
    used.add(best);
    const d = desk.layers[best];
    return {
      ...l,
      role: d.role,
      field: d.field,
      format: d.format,
      joiner: d.joiner,
      font: d.font,
      weight: d.weight,
      italic: d.italic,
      uppercase: d.uppercase,
      hostCount: d.hostCount,
      editorHint: d.editorHint,
      ...(d.scale ? { scale: d.scale } : {}),
    };
  });
  return {
    ...phone,
    eventTypes: desk.eventTypes,
    paletteLabel: desk.paletteLabel,
    palette: desk.palette,
    fonts: desk.fonts,
    available: desk.available,
    radius: desk.radius,
    sections: desk.sections,
    layers,
  };
}

/**
 * The phone version's customer photos: the same images as the desktop's
 * photo slots (same picture data, same part of it), so a customer's photo
 * fills both. Matched by content, not by the AI, so they can't disagree.
 */
export function phonePhotoPicks(deskA: SvgAnalysis, deskPicks: Pick[], phoneA: SvgAnalysis): Pick[] {
  const close = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
    Math.abs(a.x - b.x) < 0.03 && Math.abs(a.y - b.y) < 0.03 && Math.abs(a.w - b.w) < 0.05 && Math.abs(a.h - b.h) < 0.05;
  const taken = new Set<number>();
  const out: Pick[] = [];
  deskPicks.forEach((pick, slot) => {
    const d = deskA.pictures.find((p) => p.n === pick.p);
    if (!d?.src) return;
    const m =
      phoneA.pictures.find((p) => !taken.has(p.n) && p.src === d.src && close(p.crop, d.crop)) ??
      // Same image, reframed for the phone: still the same photo.
      phoneA.pictures.find((p) => !taken.has(p.n) && p.src === d.src && !deskA.pictures.some((o) => o !== d && o.src === d.src));
    if (!m) return;
    taken.add(m.n);
    out.push({ p: m.n, hint: pick.hint, slot });
  });
  return out;
}

/**
 * One template from the two traced versions: the desktop sections show on
 * wide screens, the phone sections (ids and art prefixed "m-") on narrow
 * ones, and the standard sections (RSVP form, footer…) show on both.
 */
export function mergeVersions(desk: Raw, phone: Raw): Raw {
  const isDrawn = (s: Raw) => s.kind === "canvas" || s.kind === "layout";
  const rename = (id: string) => `m-${id}`;
  const phoneSections = (phone.sections as Raw[]).filter(isDrawn).map((s) => ({
    ...s,
    id: rename(s.id as string),
    screen: "phone",
    ...(s.backgroundAssetId ? { backgroundAssetId: rename(s.backgroundAssetId as string) } : {}),
    ...(s.bgAssetId ? { bgAssetId: rename(s.bgAssetId as string) } : {}),
    ...(s.layers
      ? {
          layers: (s.layers as Raw[]).map((l) => ({
            ...l,
            ...(l.assetId ? { assetId: rename(l.assetId as string) } : {}),
            ...(l.frameAssetId ? { frameAssetId: rename(l.frameAssetId as string) } : {}),
          })),
        }
      : {}),
  }));
  const deskSections = (desk.sections as Raw[]).map((s) => (isDrawn(s) ? { ...s, screen: "desktop" } : s));
  const lastDrawn = deskSections.map(isDrawn).lastIndexOf(true);
  const sections = [...deskSections.slice(0, lastDrawn + 1), ...phoneSections, ...deskSections.slice(lastDrawn + 1)];
  const phoneAssets = Object.fromEntries(Object.entries(phone.assets as Record<string, Raw>).map(([k, v]) => [rename(k), { ...v, url: rename(v.url as string) }]));
  const phoneSources = Object.fromEntries(
    Object.entries((phone.__sources ?? {}) as Record<string, Raw>).map(([k, v]) => [rename(k), { ...v, canvas: rename(v.canvas as string) }]),
  );
  return {
    ...desk,
    __sources: desk.__sources,
    __phoneSources: phoneSources,
    assets: { ...(desk.assets as Raw), ...phoneAssets },
    sections,
  };
}

/** The phone version's art files, renamed to match mergeVersions(). */
export function phoneFiles(build: SvgBuild): File[] {
  return [...build.bands.map((b) => b.art), ...build.overlays.map((o) => o.file)].map((f) => new File([f], `m-${f.name}`, { type: f.type }));
}
