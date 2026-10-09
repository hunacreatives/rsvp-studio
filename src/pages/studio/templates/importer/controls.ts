import type { SvgAnalysis, SvgLeaf } from "./svg";
import type { SvgBuild } from "./svgImport";

// Traced designs often DRAW their form and buttons: rounded boxes with
// "Name" / "Email Address" inside, a pill that says "RSVP" or "Find Us on
// the Map". The drawing stays exactly as designed; on top of it go real,
// see-through controls — inputs over the boxes (the drawn placeholder
// becomes the input's placeholder) and links over the buttons.

type Raw = Record<string, unknown>;
type Box = { x: number; y: number; w: number; h: number };
type Source = { canvas: string; x: number; y: number; w: number; h: number };

const centreIn = (a: Box, b: Box) => {
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  return cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h;
};

function fieldKey(words: string): "name" | "email" | "message" | "guests" | "dietary" {
  const t = words.toLowerCase();
  if (/e-?mail/.test(t)) return "email";
  if (/diet|allerg|food/.test(t)) return "dietary";
  if (/how many|guests?\b|party|pax|attendees/.test(t)) return "guests";
  if (/name/.test(t)) return "name";
  return "message";
}

function linkAction(label: string): "map" | "rsvp" | "submit" | null {
  const t = label.toLowerCase();
  if (/map|direction|location|find us|waze|venue/.test(t)) return "map";
  if (/rsvp|reply|respond|join|attend/.test(t)) return "rsvp";
  return null;
}

const SUBMIT = /rsvp|send|submit|reply|confirm|respond/i;

/** Adds field/link layers to each traced (canvas) section. Returns notes for staff. */
export function withControls(raw: Raw, a: SvgAnalysis, build: SvgBuild): { raw: Raw; notes: string[] } {
  const W = a.width;
  const H = a.height;
  const sources = (raw.__sources ?? {}) as Record<string, Source>;
  const notes: string[] = [];
  let workingForm = false;
  const bands = build.bands.length ? build.bands : [{ y0: 0, y1: 1 }];

  const sections = (raw.sections as Raw[]).map((sec) => {
    if (sec.kind !== "canvas") return sec;
    const id = String(sec.id);
    const j = id === "hero" ? 0 : Number(id.match(/band-(\d+)$/)?.[1] ?? 1) - 1;
    const band = bands[j] ?? bands[0];
    const span = band.y1 - band.y0;
    const layers = [...(sec.layers as Raw[])];

    // Shapes in this band, in the canvas's own coordinates (0–1 of its width/height).
    const shapes = a.leaves
      // Pictures (images, pattern-filled shapes) aren't drawn controls.
      .filter((l) => l.rect && !/^url\(/.test(l.fill ?? "") && l.tag !== "image" && l.tag !== "use" && l.y + l.h / 2 >= band.y0 && l.y + l.h / 2 < band.y1)
      .map((l) => ({ l, box: { x: l.x, y: (l.y - band.y0) / span, w: l.w, h: l.h / span }, wPx: l.w * W, hPx: l.h * H }));
    const texts = layers
      .filter((l) => l.type === "text" && sources[l.id as string]?.canvas === id)
      .map((l) => ({ layer: l, ink: sources[l.id as string] as Box, words: String(l.text ?? "") }));
    const inside = (b: Box) => texts.filter((t) => centreIn(t.ink, b));
    const stroked = (l: SvgLeaf) => l.rect === "outline" || (!!l.stroke && (l.strokeW ?? 0) > 0) || (l.fillOpacity ?? 1) < 0.2;

    const fields = shapes.filter((s) => {
      if (!stroked(s.l) || s.wPx < 100 || s.hPx < 20) return false;
      const t = inside(s.box);
      // Empty, or a placeholder that starts near the left edge.
      return t.length === 0 || (t.length === 1 && t[0].ink.x - s.box.x < 0.3 * s.box.w);
    });
    const buttons = shapes.filter((s) => {
      if (s.l.rect !== "fill" || fields.includes(s) || s.hPx < 18 || s.hPx > 120 || s.wPx / s.hPx < 1.4) return false;
      const t = inside(s.box);
      return t.length === 1 && Math.abs(t[0].ink.x + t[0].ink.w / 2 - (s.box.x + s.box.w / 2)) < 0.15 * s.box.w;
    });

    const added: Raw[] = [];
    const drop = new Set<Raw>();
    // A form: input boxes plus a submit-looking button below them.
    const submit = fields.length
      ? buttons
          .filter((b) => {
            const top = Math.min(...fields.map((f) => f.box.y));
            const bottom = Math.max(...fields.map((f) => f.box.y + f.box.h));
            const x0 = Math.min(...fields.map((f) => f.box.x));
            const x1 = Math.max(...fields.map((f) => f.box.x + f.box.w));
            // Right under the boxes, within their width, with a short label ("RSVP", "Send").
            return SUBMIT.test(inside(b.box)[0].words) && inside(b.box)[0].words.length <= 24 && b.box.y > top && b.box.y - bottom < bottom - top + 0.05 && b.box.x + b.box.w > x0 && b.box.x < x1;
          })
          .sort((p, q) => p.box.y - q.box.y)[0]
      : undefined;
    if (submit) {
      const minH = Math.min(...fields.map((f) => f.hPx));
      const used = new Set<string>();
      for (const f of [...fields].sort((p, q) => p.box.y - q.box.y || p.box.x - q.box.x)) {
        const ph = inside(f.box)[0];
        // No placeholder: the words just above the box are its label.
        const label = ph
          ? undefined
          : texts.filter((t) => t.ink.y + t.ink.h <= f.box.y + 0.002 && f.box.y - (t.ink.y + t.ink.h) < (f.box.h * 1.6)).sort((p, q) => q.ink.y - p.ink.y)[0];
        let key = fieldKey((ph ?? label)?.words ?? "");
        if (used.has(key)) {
          if (used.has("message")) continue;
          key = "message";
        }
        used.add(key);
        const style = (ph ?? label)?.layer;
        if (ph) drop.add(ph.layer);
        added.push({
          id: `field-${key}`,
          type: "field",
          key,
          placeholder: ph?.words ?? "",
          font: style?.font ?? "body",
          size: Number(style?.size ?? 2.4),
          color: style?.color ?? "ink",
          multiline: f.hPx > minH * 1.6,
          inset: ph ? Math.max(0.5, (ph.ink.x - f.box.x) * 100) : 1.5,
          radius: (f.l.radius ?? 0) * 100,
          box: f.box,
          z: 45,
          rotate: 0,
        });
      }
      added.push({ id: "link-submit", type: "link", action: "submit", label: inside(submit.box)[0].words.slice(0, 60), radius: (submit.l.radius ?? 0) * 100, box: submit.box, z: 46, rotate: 0 });
      if (used.has("email") && used.has("name")) workingForm = true;
      if (!used.has("email")) notes.push("The drawn RSVP form has no email box. Replies need an email, so add one to the design (or guests can use the standard RSVP form).");
    }
    // Other drawn buttons that clearly go somewhere.
    for (const b of buttons) {
      if (b === submit) continue;
      const label = inside(b.box)[0].words;
      const action = linkAction(label);
      if (!action || action === "submit") continue;
      added.push({ id: `link-${action}-${added.length}`, type: "link", action, label: label.slice(0, 60), radius: (b.l.radius ?? 0) * 100, box: b.box, z: 46, rotate: 0 });
    }
    if (!added.length) return sec;
    return { ...sec, layers: [...layers.filter((l) => !drop.has(l)), ...added] };
  });
  // The design's own form now takes replies: no second, standard RSVP form.
  const kept = workingForm ? sections.filter((s) => !(s.kind === "block" && s.block === "rsvp")) : sections;
  return { raw: { ...raw, sections: kept }, notes };
}
