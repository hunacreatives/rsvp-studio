import type { SvgAnalysis, SvgLeaf } from "./svg";
import type { SvgBuild } from "./svgImport";

/** Cap height as a share of the font size (typical for Latin display and text faces). */
const CAP = 0.73;

// Website mode, final step: turn each traced band (a canvas section of
// positioned layers, as assembled from the measurements + AI labels) into a
// real website section — rows and stacks of text, photos, buttons and a
// working RSVP form. Pure data in, data out; every rule is general (shapes,
// gaps, alignment), nothing is specific to one design.
//
// Bands whose content overlaps or tilts (collages, polaroids, cards on
// cards) stay canvas sections: flow layout can't express them faithfully.

type Box = { x: number; y: number; w: number; h: number };
type Raw = Record<string, unknown>;
// `box` is where an element renders; `ink` is where its pixels actually are
// in the design. Rows/columns are decided from ink (a text box widened for
// longer customer text must not merge two columns).
type Atom =
  | { kind: "text"; box: Box; ink: Box; layer: Raw }
  | { kind: "photo"; box: Box; ink: Box; layer: Raw }
  | { kind: "image"; box: Box; ink: Box; layer: Raw }
  | { kind: "button"; box: Box; ink: Box; node: Raw }
  | { kind: "form"; box: Box; ink: Box; node: Raw }
  | { kind: "divider"; box: Box; ink: Box; node: Raw };

const right = (b: Box) => b.x + b.w;
const bottom = (b: Box) => b.y + b.h;
const centreIn = (inner: Box, outer: Box) => {
  const cx = inner.x + inner.w / 2, cy = inner.y + inner.h / 2;
  return cx > outer.x && cx < right(outer) && cy > outer.y && cy < bottom(outer);
};
const overlapArea = (a: Box, b: Box) => Math.max(0, Math.min(right(a), right(b)) - Math.max(a.x, b.x)) * Math.max(0, Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y));
const union = (bs: Box[]): Box => {
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y));
  return { x: x0, y: y0, w: Math.max(...bs.map(right)) - x0, h: Math.max(...bs.map(bottom)) - y0 };
};
const round = (n: number) => Math.round(n * 10) / 10;
const roundBox = (b: Box): Box => ({ x: round(b.x), y: round(b.y), w: round(b.w), h: round(b.h) });
const cssColor = (rgb: string | undefined, opacity = 1) => {
  if (!rgb || !rgb.startsWith("rgb")) return undefined;
  const m = rgb.match(/[\d.]+/g)!.map(Number);
  const hex = "#" + m.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  return opacity < 0.99 ? hex + Math.round(opacity * 255).toString(16).padStart(2, "0") : hex;
};

/** What a form field asks for, from its label wording. */
function fieldKey(label: string, hasOptions: boolean): "name" | "email" | "attending" | "guests" | "dietary" | "message" {
  const t = label.toLowerCase();
  if (hasOptions || /coming|attend|join us|be there|will you|can you make/.test(t)) return "attending";
  if (/e-?mail/.test(t)) return "email";
  if (/diet|allerg|restriction|food/.test(t)) return "dietary";
  if (/how many|guests|party|plus/.test(t)) return "guests";
  if (/name/.test(t)) return "name";
  return "message";
}

export function toWebsite(raw: Raw, a: SvgAnalysis, build: SvgBuild): Raw {
  const W = a.width;
  const H = a.height;
  const sections = raw.sections as Raw[];
  const assets = { ...(raw.assets as Record<string, Raw>) };
  const used = new Set<string>();
  const out: Raw[] = [];
  let bandIndex = -1;
  let firstDisplay = true;
  let madeForm = false;
  // Elements that are text (letters and their effects): never "art".
  const lettering = new Set(a.candidates.flatMap((c) => [...c.ks, ...c.effects].map(Math.floor)));

  for (const sec of sections) {
    if (sec.kind !== "canvas") {
      out.push(sec);
      continue;
    }
    bandIndex++;
    const band = build.bands[bandIndex] ?? { y0: 0, y1: 1, uniform: false, color: "", art: null as unknown as File, artSize: { w: 0, h: 0 } };
    const bandH = (band.y1 - band.y0) * H;
    const px = (b: Box): Box => ({ x: b.x * W, y: b.y * bandH, w: b.w * W, h: b.h * bandH });
    const layers = sec.layers as Raw[];

    // Atoms from the traced layers.
    const sources = (raw.__sources ?? {}) as Record<string, { canvas: string; x: number; y: number; w: number; h: number }>;
    let atoms: Atom[] = layers
      .map((l): Atom | null => {
        const box = px(l.box as Box);
        if (l.type === "text") {
          const src = sources[l.id as string];
          const ink = src && src.canvas === sec.id ? px(src) : box;
          // Render box: the text's room horizontally, its line boxes vertically.
          // Ink starts at the cap height (~0.73em), which the browser centres
          // in each line box, so the box starts half the leftover space above it.
          const size = (Number(l.size) / 100) * W;
          const lh = Number(l.lineHeight ?? 1.2);
          const lines = Math.max(1, Math.round((ink.h - CAP * size) / (lh * size)) + 1);
          const h = lines * lh * size;
          return { kind: "text", box: { x: box.x, y: ink.y - ((lh - CAP) / 2) * size, w: box.w, h }, ink, layer: l };
        }
        if (l.type === "photo") return { kind: "photo", box, ink: box, layer: l };
        if (l.type === "image") return { kind: "image", box, ink: box, layer: l };
        return null;
      })
      .filter((x): x is Atom => !!x);
    // Multi-host name variants share a spot; keep the two-host one for layout
    // (the runtime shows whichever applies — handled inside the text node).
    atoms = atoms.filter((x) => !(x.kind === "text" && (x.layer.when as Raw | undefined)?.maxHosts !== undefined));

    // Collage? Overlapping pictures or anything tilted → keep this band traced.
    const pics = atoms.filter((x) => x.kind === "photo" || x.kind === "image");
    const tilted = atoms.some((x) => "layer" in x && Math.abs(Number(x.layer.rotate ?? 0)) > 1.5);
    const overlapping = pics.some((p, i) => pics.slice(i + 1).some((q) => overlapArea(p.box, q.box) > 0.05 * Math.min(p.box.w * p.box.h, q.box.w * q.box.h)));
    if (tilted || overlapping) {
      out.push(sec);
      if (sec.backgroundAssetId) used.add(sec.backgroundAssetId as string);
      for (const l of layers) if (l.type === "image") used.add(l.assetId as string);
      continue;
    }

    // Shapes in this band (buttons, fields, cards, dividers), band-relative px.
    const shapes: (SvgLeaf & { box: Box })[] = a.leaves
      .filter((l) => (l.rect || (l.tag === "rect" && l.h * H <= 4)) && l.y + l.h / 2 >= band.y0 && l.y + l.h / 2 < band.y1)
      .map((l) => ({ ...l, box: { x: l.x * W, y: (l.y - band.y0) * H, w: l.w * W, h: l.h * H } }))
      .filter((l) => !(l.box.w > W * 0.95 && l.box.h > bandH * 0.9));
    // Shapes rebuilt as real elements (form, buttons, rules), by element.
    const rebuilt = new Set<number>();
    let formHere = false;
    const texts = () => atoms.filter((x): x is Extract<Atom, { kind: "text" }> => x.kind === "text");
    const consumed = new Set<Raw>();
    const textOf = (t: { layer: Raw }) => String(t.layer.text ?? "");
    const style = (t: { layer: Raw }) => ({
      font: t.layer.font ?? "body",
      size: round((Number(t.layer.size) / 100) * W),
      color: t.layer.color ?? "ink",
      weight: t.layer.weight ?? 400,
      uppercase: !!t.layer.uppercase,
      letterSpacing: Number(t.layer.letterSpacing ?? 0),
    });

    // --- Forms: a card (panel) holding input boxes / choice options and a button.
    const isField = (s: SvgLeaf & { box: Box }) => (s.rect === "outline" || (s.fillOpacity ?? 1) < 0.2) && s.box.w >= 100 && s.box.h >= 20;
    const panels = shapes.filter((s) => s.box.w > 200 && s.box.h > 150 && shapes.filter((o) => o !== s && centreIn(o.box, s.box) && isField(o)).length >= 2);
    for (const panel of panels.sort((p, q) => q.box.w * q.box.h - p.box.w * p.box.h).slice(0, 1)) {
      const inside = shapes.filter((o) => o !== panel && centreIn(o.box, panel.box) && !(Math.abs(o.box.w - panel.box.w) < 8 && Math.abs(o.box.h - panel.box.h) < 8));
      const twin = shapes.find((o) => o !== panel && Math.abs(o.box.w - panel.box.w) < 8 && Math.abs(o.box.h - panel.box.h) < 8 && Math.abs(o.box.x - panel.box.x) < 8);
      const fieldsIn = inside.filter(isField).sort((p, q) => p.box.y - q.box.y);
      const textsIn = texts().filter((t) => centreIn(t.ink, panel.box));
      const submitShape = inside
        .filter((o) => !isField(o) && o.rect === "fill" && o.box.h >= 20 && o.box.h <= 100)
        .find((o) => textsIn.some((t) => centreIn(t.ink, o.box)));
      if (!submitShape || !fieldsIn.length) continue;
      const submitText = textsIn.find((t) => centreIn(t.ink, submitShape.box))!;
      // Group: options are low-opacity fills holding text; plain inputs are empty outlines.
      const groups: { label?: Extract<Atom, { kind: "text" }>; shapes: typeof fieldsIn; options: string[] }[] = [];
      for (const f of fieldsIn) {
        const inner = textsIn.find((t) => centreIn(t.ink, f.box));
        const prevGroup = groups[groups.length - 1];
        const isOption = !!inner && (f.fillOpacity ?? 1) < 0.2 && f.rect !== "outline";
        if (isOption && prevGroup && prevGroup.options.length && f.box.y - bottom(prevGroup.shapes[prevGroup.shapes.length - 1].box) < f.box.h) {
          prevGroup.shapes.push(f);
          prevGroup.options.push(textOf(inner!));
          consumed.add(inner!.layer);
          continue;
        }
        const label = textsIn
          .filter((t) => bottom(t.ink) <= f.box.y + 2 && f.box.y - bottom(t.ink) < Math.max(40, f.box.h * 1.6) && !consumed.has(t.layer) && t !== submitText)
          .sort((p, q) => bottom(q.ink) - bottom(p.ink))[0];
        if (label) consumed.add(label.layer);
        if (inner) consumed.add(inner.layer);
        groups.push({ label, shapes: [f], options: isOption && inner ? [textOf(inner)] : [] });
      }
      const fieldH = fieldsIn.filter((f) => f.rect === "outline").map((f) => f.box.h);
      // Labels render with line-height 1 (box = font size); the ink sits roughly centred in it.
      const halfLead = (t: Extract<Atom, { kind: "text" }>) => Math.max(0, (style(t).size - t.ink.h) / 2);
      const groupBottom = (i: number) => bottom(groups[i].shapes[groups[i].shapes.length - 1].box);
      const spacing = (g: (typeof groups)[number], i: number) => ({
        ...(i > 0 ? { top: round(Math.max(0, (g.label ? g.label.ink.y - halfLead(g.label) : g.shapes[0].box.y) - groupBottom(i - 1))) } : {}),
        ...(g.label ? { labelGap: round(Math.max(0, g.shapes[0].box.y - bottom(g.label.ink) - halfLead(g.label))) } : {}),
        ...(g.shapes.length > 1 ? { optGap: round(Math.max(0, g.shapes[1].box.y - bottom(g.shapes[0].box))) } : {}),
      });
      const fields = groups.map((g, gi) => {
        const labelText = g.label ? textOf(g.label) : "";
        const key = fieldKey(labelText, g.options.length > 0);
        const h = g.shapes[0].box.h;
        return {
          key,
          label: labelText || (key === "name" ? "Your name" : "Message"),
          kind: g.options.length ? ("choice" as const) : key === "email" ? ("email" as const) : h > (Math.min(...fieldH, 999) || h) * 1.6 ? ("textarea" as const) : ("text" as const),
          ...(g.options.length ? { options: g.options.slice(0, 2) } : {}),
          h: round(h),
          ...spacing(g, gi),
        };
      });
      // Every reply needs an email (confirmation + duplicate check): add one after the name if the design has none.
      const seen = new Set<string>();
      const deduped = fields.filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)));
      if (!deduped.some((f) => f.key === "email")) {
        const at = deduped.findIndex((f) => f.key === "name");
        const plain = deduped.find((f) => f.kind === "text");
        const nameField = deduped[at];
        deduped.splice(at + 1, 0, { key: "email", label: "Email", kind: "email", h: plain?.h ?? 36, added: true, ...(nameField?.labelGap !== undefined ? { labelGap: nameField.labelGap } : {}) } as (typeof deduped)[number]);
      }
      const gaps = groups.slice(1).map((g, i) => (g.label?.ink.y ?? g.shapes[0].box.y) - bottom(groups[i].shapes[groups[i].shapes.length - 1].box));
      const note = textsIn.filter((t) => t.ink.y > bottom(submitShape.box) - 2 && !consumed.has(t.layer) && t !== submitText);
      note.forEach((t) => consumed.add(t.layer));
      consumed.add(submitText.layer);
      const firstLabel = groups.find((g) => g.label)?.label;
      const plainField = fieldsIn.find((f) => f.rect === "outline");
      const optionField = fieldsIn.find((f) => f.rect !== "outline");
      const node: Raw = {
        t: "form",
        box: roundBox(panel.box),
        panel: {
          fill: cssColor(panel.rect === "fill" ? panel.fill : twin?.fill, panel.fillOpacity),
          stroke: cssColor(panel.stroke ?? twin?.stroke),
          strokeW: round(((panel.strokeW ?? twin?.strokeW ?? 0) as number) * W),
          radius: round(Math.max(panel.radius ?? 0, twin?.radius ?? 0) * W),
          pad: round(Math.max(0, Math.min(fieldsIn[0].box.x - panel.box.x, (groups[0].label?.ink.y ?? fieldsIn[0].box.y) - panel.box.y))),
        },
        fields: deduped,
        gap: round(gaps.length ? gaps.sort((p, q) => p - q)[gaps.length >> 1] : 16),
        labelStyle: firstLabel ? { font: style(firstLabel).font, size: style(firstLabel).size, color: style(firstLabel).color, weight: style(firstLabel).weight } : { font: "body", size: 13, color: "ink", weight: 400 },
        input: {
          stroke: cssColor(plainField?.stroke ?? plainField?.fill, plainField?.strokeOpacity ?? 1),
          strokeW: round((plainField?.strokeW ?? 1 / W) * W),
          radius: round((plainField?.radius ?? 0) * W),
          size: firstLabel ? style(firstLabel).size : 14,
        },
        ...(optionField ? { option: { fill: cssColor(optionField.fill, optionField.fillOpacity), radius: round((optionField.radius ?? 0) * W) } } : {}),
        button: {
          ...style(submitText),
          label: textOf(submitText) || "Send RSVP",
          fill: cssColor(submitShape.fill, submitShape.fillOpacity),
          strokeW: 0,
          radius: round((submitShape.radius ?? 0) * W),
          h: round(submitShape.box.h),
          top: round(Math.max(0, submitShape.box.y - groupBottom(groups.length - 1))),
        },
        ...(note.length ? { note: note.map(textOf).join(" "), noteGap: round(Math.max(0, Math.min(...note.map((t) => t.ink.y - halfLead(t))) - bottom(submitShape.box))) } : {}),
      };
      atoms = atoms.filter((x) => !(x.kind === "text" && consumed.has(x.layer)));
      atoms.push({ kind: "form", box: panel.box, ink: panel.box, node });
      // Shapes that belonged to the form are done.
      for (const s of [panel, twin, ...inside]) if (s) (shapes.splice(shapes.indexOf(s), 1), rebuilt.add(Math.floor(s.k)));
      formHere = true;
    }

    // --- Buttons: a compact shape holding exactly one line of text.
    for (const s of [...shapes]) {
      if (s.box.h < 18 || s.box.h > 110 || s.box.w / s.box.h < 1.4) continue;
      const inner = texts().filter((t) => centreIn(t.ink, s.box));
      if (inner.length !== 1) continue;
      const t = inner[0];
      const label = textOf(t) || String((t.layer.bind as Raw | undefined)?.field ?? "");
      atoms = atoms.filter((x) => x !== t);
      atoms.push({
        kind: "button",
        box: s.box,
        ink: s.box,
        node: {
          t: "button",
          box: roundBox(s.box),
          label: label.slice(0, 60),
          href: /rsvp|reply|respond|attend|répond/i.test(label) ? "#rsvp" : "#rsvp",
          style: {
            ...style(t),
            fill: s.rect === "fill" ? cssColor(s.fill, s.fillOpacity) : undefined,
            stroke: cssColor(s.stroke ?? (s.rect === "outline" ? s.fill : undefined)),
            strokeW: round((s.strokeW ?? (s.rect === "outline" ? 1 / W : 0)) * W),
            radius: round((s.radius ?? 0) * W),
          },
        },
      });
      shapes.splice(shapes.indexOf(s), 1);
      rebuilt.add(Math.floor(s.k));
    }

    // --- Dividers: thin rules.
    for (const s of shapes) {
      if (s.box.h <= 4 && s.box.w >= 40) rebuilt.add(Math.floor(s.k)), atoms.push({ kind: "divider", box: s.box, ink: s.box, node: { t: "divider", box: roundBox(s.box), color: cssColor(s.fill) ?? "#000000" } });
    }

    // --- Rows and stacks from the gaps (recursive whitespace cuts).
    const leaf = (x: Atom): Raw => {
      if (x.kind === "button" || x.kind === "form" || x.kind === "divider") return x.node;
      const l = x.layer;
      if (x.kind === "photo") {
        const ph = build.photos.find((p) => p.slot === l.slot);
        return { t: "photo", box: roundBox(x.box), slot: l.slot, rotate: l.rotate ?? 0, radius: 0, ...(ph ? { focal: ph.focal } : {}), ...(l.editorHint ? { editorHint: l.editorHint } : {}) };
      }
      if (x.kind === "image") {
        used.add(l.assetId as string);
        return { t: "image", box: roundBox(x.box), assetId: l.assetId, opacity: l.opacity ?? 1 };
      }
      const size = (Number(l.size) / 100) * W;
      const isDisplay = l.font === "display" || size >= 28;
      const tag = isDisplay ? (firstDisplay ? ((firstDisplay = false), "h1") : "h2") : "p";
      const shadow = l.shadow as { x: number; y: number; blur: number; color: string } | undefined;
      return {
        t: "text",
        id: l.id,
        box: roundBox(x.box),
        room: round(x.box.w),
        ...(l.bind ? { bind: l.bind } : {}),
        ...(l.text !== undefined ? { text: l.text } : {}),
        font: l.font,
        size: round(size),
        ...(l.minSize ? { minSize: round((Number(l.minSize) / 100) * W) } : {}),
        color: l.color,
        align: l.align,
        weight: l.weight,
        italic: l.italic,
        uppercase: l.uppercase,
        letterSpacing: l.letterSpacing,
        lineHeight: l.lineHeight,
        opacity: l.opacity ?? 1,
        hideWhenEmpty: l.hideWhenEmpty ?? false,
        ...(l.editorHint ? { editorHint: l.editorHint } : {}),
        ...(shadow ? { shadow: { x: (shadow.x / 100) * W, y: (shadow.y / 100) * W, blur: (shadow.blur / 100) * W, color: shadow.color } } : {}),
        tag,
      };
    };
    const split = (xs: Atom[], axis: "x" | "y", minGap: number) => {
      const s0 = (b: Box) => (axis === "x" ? b.x : b.y);
      const s1 = (b: Box) => (axis === "x" ? right(b) : bottom(b));
      const sorted = [...xs].sort((p, q) => s0(p.ink) - s0(q.ink));
      const groups: Atom[][] = [];
      let end = -Infinity;
      for (const x of sorted) {
        if (!groups.length || s0(x.ink) - end >= minGap) groups.push([x]);
        else groups[groups.length - 1].push(x);
        end = Math.max(end, s1(x.ink));
      }
      return groups;
    };
    const tree = (xs: Atom[]): Raw => {
      if (xs.length === 1) return leaf(xs[0]);
      const rows = split(xs, "y", 6);
      if (rows.length > 1) return { t: "stack", box: roundBox(union(xs.map((x) => x.box))), children: rows.map(tree) };
      const cols = split(xs, "x", 12);
      if (cols.length > 1) {
        const photoCount = xs.filter((x) => x.kind === "photo").length;
        return { t: "row", box: roundBox(union(xs.map((x) => x.box))), phone: photoCount >= 3 && photoCount === xs.length ? "2up" : "stack", children: cols.map(tree) };
      }
      // Overlapping items that no gap separates: stack them in reading order.
      return { t: "stack", box: roundBox(union(xs.map((x) => x.box))), children: [...xs].sort((p, q) => p.box.y - q.box.y).map(leaf) };
    };

    // Layered art (text on an illustration, a sticker or a photo) only looks
    // right traced: keep the band as a canvas.
    const inBand = (y: number, h: number) => y + h / 2 >= band.y0 && y + h / 2 < band.y1;
    const under = [
      ...a.pictures.filter((p) => !p.background && inBand(p.y, p.h)).map((p) => ({ x: p.x * W, y: (p.y - band.y0) * H, w: p.w * W, h: p.h * H })),
      ...a.leaves
        .filter((l) => inBand(l.y, l.h) && l.opacity >= 0.02 && l.tag !== "image" && l.tag !== "use" && !lettering.has(Math.floor(l.k)) && !rebuilt.has(Math.floor(l.k)) && !(l.w > 0.95 && l.h * H > bandH * 0.9))
        .map((l) => ({ x: l.x * W, y: (l.y - band.y0) * H, w: l.w * W, h: l.h * H })),
    ];
    const layered = texts().some((t) => under.some((b) => overlapArea(t.ink, b) > 0.2 * t.ink.w * t.ink.h));
    if (layered) {
      out.push(sec);
      if (sec.backgroundAssetId) used.add(sec.backgroundAssetId as string);
      for (const l of layers) if (l.type === "image") used.add(l.assetId as string);
      continue;
    }
    if (formHere) madeForm = true;

    const root = atoms.length ? tree(atoms) : { t: "stack", box: { x: 0, y: 0, w: W, h: bandH }, children: [] };
    // The band's artwork is only needed for what wasn't rebuilt: if every
    // drawn element is now text, a photo, or a real form/button/rule, the art
    // would only leave ghost outlines on phones (where the layout reflows).
    const photoKs = new Set(build.photos.map((ph) => ph.k));
    const leftoverArt =
      a.pictures.some((p) => p.y + p.h / 2 >= band.y0 && p.y + p.h / 2 < band.y1 && !photoKs.has(p.k)) ||
      a.leaves.some((l) => {
      const cy = l.y + l.h / 2;
      if (cy < band.y0 || cy >= band.y1 || l.opacity < 0.02 || l.tag === "image" || l.tag === "use") return false;
      if (lettering.has(Math.floor(l.k)) || rebuilt.has(Math.floor(l.k))) return false;
      return !(l.w > 0.95 && l.h * H > bandH * 0.9);
    });
    const bgAsset = !band.uniform && leftoverArt && sec.backgroundAssetId ? (sec.backgroundAssetId as string) : undefined;
    if (bgAsset) used.add(bgAsset);
    out.push({
      id: sec.id,
      kind: "layout",
      ...(sec.visibilityKey ? { visibilityKey: sec.visibilityKey } : {}),
      designWidth: round(W),
      height: round(bandH),
      bg: band.color || sec.band || "bg",
      ...(bgAsset ? { bgAssetId: bgAsset } : {}),
      // The section is the outer frame; children are positioned from its top-left.
      root: { t: "stack", box: { x: 0, y: 0, w: round(W), h: round(bandH) }, children: [root] },
    });
  }

  // Ship only the art that's still used.
  for (const k of Object.keys(assets)) if (!used.has(k)) delete assets[k];
  // The design's own form is now a working RSVP form: no second, standard one.
  const sectionsOut = madeForm ? out.filter((x) => !(x.kind === "block" && x.block === "rsvp")) : out;
  return { ...raw, assets, sections: sectionsOut };
}
