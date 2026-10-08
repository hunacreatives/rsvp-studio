// AI import from ONE SVG file. Design tools export text as letter shapes
// (no <text> tags), but an SVG is still layered: every letter, flower and
// photo is its own element. So instead of guessing text from pixels, we:
//   1. measure every element in the browser (position, colour, paint order),
//   2. find "letter runs" — consecutive same-colour shapes lined up in rows
//      (how Canva/Figma write out a text box) — and split them into lines,
//   3. let the AI say which runs really are text and what they mean,
//   4. render the artwork with those elements REMOVED: clean art, nothing
//      repainted, no second export needed.

export interface SvgLeaf {
  k: number;
  tag: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity: number;
}

export interface SvgCandidate {
  /** 1-based number shown to the AI. */
  n: number;
  /** Elements (data-k) that make up this line. */
  ks: number[];
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  /** Effect elements drawn with this line (e.g. Canva's baked shadow image). */
  effects: number[];
  /** Tilt of the line (degrees), from its letters' positions; 0 when level. */
  rotate: number;
  /** Unrotated size and centre (normalized), for a tilted line. */
  cx: number;
  cy: number;
  rw: number;
  rh: number;
}

/** An embedded picture that might be a customer-replaceable photo. */
export interface SvgPicture {
  /** 1-based number shown to the AI as "P<n>". */
  n: number;
  k: number;
  /** Visible area (after clipping), axis-aligned, normalized. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Unrotated visible size + centre + tilt, for a rotated photo slot. */
  cx: number;
  cy: number;
  rw: number;
  rh: number;
  rotate: number;
  format: "jpeg" | "png" | "other";
  /** The picture's own image data (for previewing the design's photo in its slot). */
  src: string;
}

export interface SvgAnalysis {
  /** The SVG with every drawable element tagged data-k, sized to its viewBox. */
  tagged: string;
  width: number;
  height: number;
  leaves: SvgLeaf[];
  candidates: SvgCandidate[];
  images: SvgLeaf[];
  pictures: SvgPicture[];
  /** Section boundaries (y, 0–1) where a background band changes and nothing crosses. */
  cuts: number[];
}

const LEAF_SELECTOR = "path, image, rect, use, circle, ellipse, polygon, polyline, line";
const HIDDEN_SCOPES = "defs, clipPath, mask, pattern, symbol, marker";
const MEASURE_W = 1000;

function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return "#000000";
  return "#" + m.slice(0, 3).map((v) => Math.round(+v).toString(16).padStart(2, "0")).join("");
}

/** Parse, tag every drawable element, and measure it in a hidden live SVG. */
export async function analyseSvg(file: File): Promise<SvgAnalysis> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) throw new Error("That file isn't a readable SVG.");

  const vb = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const width = vb.length === 4 && vb[2] > 0 ? vb[2] : parseFloat(svg.getAttribute("width") ?? "") || 1000;
  const height = vb.length === 4 && vb[3] > 0 ? vb[3] : parseFloat(svg.getAttribute("height") ?? "") || 1000;
  if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));

  let k = 0;
  for (const el of Array.from(svg.querySelectorAll(LEAF_SELECTOR))) {
    if (el.closest(HIDDEN_SCOPES)) continue;
    el.setAttribute("data-k", String(k++));
  }
  if (k === 0) throw new Error("The SVG has no drawable elements.");
  if (doc.querySelector("text")) {
    // Live <text> is rare in real exports; it still renders, but we don't map it yet.
    console.warn("SVG contains <text> elements; they are treated as artwork for now.");
  }
  const tagged = new XMLSerializer().serializeToString(doc);

  // Measure in a hidden live copy at a fixed width.
  const host = document.createElement("div");
  // Off-screen and transparent — NOT visibility:hidden, which every element
  // would inherit and then be skipped as hidden.
  host.style.cssText = `position:absolute;left:-20000px;top:0;width:${MEASURE_W}px;opacity:0;pointer-events:none`;
  host.innerHTML = tagged;
  document.body.appendChild(host);
  try {
    const live = host.querySelector("svg")!;
    live.setAttribute("width", String(MEASURE_W));
    live.setAttribute("height", String((MEASURE_W * height) / width));
    live.style.display = "block";
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const R = live.getBoundingClientRect();
    const clipped = clipBounds(live);
    const leaves: SvgLeaf[] = [];
    for (const el of Array.from(live.querySelectorAll<SVGGraphicsElement>("[data-k]"))) {
      const b = clipped(el);
      if (!b || (b.width <= 0 && b.height <= 0)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      leaves.push({
        k: Number(el.getAttribute("data-k")),
        tag: el.tagName.toLowerCase(),
        x: (b.left - R.left) / R.width,
        y: (b.top - R.top) / R.height,
        w: b.width / R.width,
        h: b.height / R.height,
        fill: cs.fill,
        opacity: Number(cs.opacity) * Number(cs.fillOpacity || 1),
      });
    }
    const aspect = height / width;
    const candidates = findLetterLines(leaves, aspect);
    const effects = new Set(candidates.flatMap((c) => c.effects));
    return {
      tagged,
      width,
      height,
      leaves,
      candidates,
      images: leaves.filter((l) => l.tag === "image" || l.tag === "use"),
      pictures: measurePictures(live, R, effects),
      cuts: findCuts(leaves, aspect),
    };
  } finally {
    host.remove();
  }
}

type Pt = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };

/**
 * Visible screen bounds of an element: its box intersected with every clip
 * path on its ancestors. Design tools clip constantly (cropped photos,
 * textures bleeding past a band), so raw boxes overstate what's visible.
 */
function clipBounds(live: SVGSVGElement) {
  const cache = new Map<Element, { x0: number; y0: number; x1: number; y1: number } | null>();
  const clipOf = (owner: Element) => {
    if (cache.has(owner)) return cache.get(owner)!;
    let result: { x0: number; y0: number; x1: number; y1: number } | null = null;
    const ref = owner.getAttribute("clip-path")?.match(/url\(#([^)]+)\)/)?.[1];
    const clip = ref ? live.querySelector(`#${CSS.escape(ref)}`) : null;
    const om = (owner as SVGGraphicsElement).getScreenCTM?.();
    if (clip && om) {
      const pts = Array.from(clip.children)
        .filter((c): c is SVGGraphicsElement => c instanceof SVGGraphicsElement)
        .flatMap((sh) => {
          const bb = sh.getBBox();
          const t = sh.transform?.baseVal?.consolidate()?.matrix;
          return [
            [bb.x, bb.y],
            [bb.x + bb.width, bb.y],
            [bb.x + bb.width, bb.y + bb.height],
            [bb.x, bb.y + bb.height],
          ].map(([x, y]) => {
            const px = t ? t.a * x + t.c * y + t.e : x;
            const py = t ? t.b * x + t.d * y + t.f : y;
            return { x: om.a * px + om.c * py + om.e, y: om.b * px + om.d * py + om.f };
          });
        });
      if (pts.length) result = { x0: Math.min(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), x1: Math.max(...pts.map((p) => p.x)), y1: Math.max(...pts.map((p) => p.y)) };
    }
    cache.set(owner, result);
    return result;
  };
  return (el: SVGGraphicsElement): Rect | null => {
    const b = el.getBoundingClientRect();
    let x0 = b.left, y0 = b.top, x1 = b.right, y1 = b.bottom;
    for (let a: Element | null = el; a && a !== live; a = a.parentElement) {
      if (!a.hasAttribute("clip-path")) continue;
      const c = clipOf(a);
      if (!c) continue;
      x0 = Math.max(x0, c.x0);
      y0 = Math.max(y0, c.y0);
      x1 = Math.min(x1, c.x1);
      y1 = Math.min(y1, c.y1);
    }
    if (x1 <= x0 || y1 <= y0) return null;
    return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
  };
}

/** Points of an element's own bbox in screen space. */
function corners(el: SVGGraphicsElement): Pt[] {
  const b = el.getBBox();
  const m = el.getScreenCTM();
  if (!m) return [];
  return [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x + b.width, b.y + b.height],
    [b.x, b.y + b.height],
  ].map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
}

/**
 * Pictures: what's actually visible of each embedded image. Canva crops
 * photos with clip paths and tilts them with transforms, so we intersect the
 * image with every clip on its ancestors — in the image's own rotated frame,
 * so a tilted polaroid photo gives its true width, height and angle.
 */
function measurePictures(live: SVGSVGElement, R: DOMRect, effects: Set<number>): SvgPicture[] {
  const out: SvgPicture[] = [];
  const els = Array.from(live.querySelectorAll<SVGGraphicsElement>("[data-k]")).filter((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "image" || tag === "use") return true;
    // Figma: a shape filled with a pattern that holds an image.
    const fill = el.getAttribute("fill") ?? "";
    const id = fill.match(/url\(#([^)]+)\)/)?.[1];
    return !!id && !!live.querySelector(`#${CSS.escape(id)} image, #${CSS.escape(id)} use`);
  });
  for (const el of els) {
    const k = Number(el.getAttribute("data-k"));
    if (effects.has(k)) continue;
    const m = el.getScreenCTM();
    if (!m) continue;
    const angle = Math.atan2(m.b, m.a);
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const unrot = (p: Pt): Pt => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos });
    const box = (pts: Pt[]) => {
      const u = pts.map(unrot);
      return { x0: Math.min(...u.map((p) => p.x)), y0: Math.min(...u.map((p) => p.y)), x1: Math.max(...u.map((p) => p.x)), y1: Math.max(...u.map((p) => p.y)) };
    };
    let r = box(corners(el));
    for (let a: Element | null = el; a && a !== live; a = a.parentElement) {
      const ref = a.getAttribute("clip-path")?.match(/url\(#([^)]+)\)/)?.[1];
      const clip = ref ? live.querySelector(`#${CSS.escape(ref)}`) : null;
      if (!clip) continue;
      const shapes = Array.from(clip.children).filter((c): c is SVGGraphicsElement => c instanceof SVGGraphicsElement);
      // Clip shapes are in the user space of the clipped element.
      const owner = a as SVGGraphicsElement;
      const om = owner.getScreenCTM?.();
      if (!om || !shapes.length) continue;
      const pts = shapes.flatMap((sh) => {
        const b = sh.getBBox();
        const t = sh.transform?.baseVal?.consolidate()?.matrix;
        return [
          [b.x, b.y],
          [b.x + b.width, b.y],
          [b.x + b.width, b.y + b.height],
          [b.x, b.y + b.height],
        ].map(([x, y]) => {
          const px = t ? t.a * x + t.c * y + t.e : x;
          const py = t ? t.b * x + t.d * y + t.f : y;
          return { x: om.a * px + om.c * py + om.e, y: om.b * px + om.d * py + om.f };
        });
      });
      const c = box(pts);
      r = { x0: Math.max(r.x0, c.x0), y0: Math.max(r.y0, c.y0), x1: Math.min(r.x1, c.x1), y1: Math.min(r.y1, c.y1) };
    }
    const rw = r.x1 - r.x0;
    const rh = r.y1 - r.y0;
    if (rw <= 1 || rh <= 1) continue;
    // Back to screen space: centre, plus the axis-aligned visible box.
    const back = (p: Pt): Pt => ({ x: p.x * Math.cos(angle) - p.y * Math.sin(angle), y: p.x * Math.sin(angle) + p.y * Math.cos(angle) });
    const pts = [
      { x: r.x0, y: r.y0 },
      { x: r.x1, y: r.y0 },
      { x: r.x1, y: r.y1 },
      { x: r.x0, y: r.y1 },
    ].map(back);
    const c = back({ x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 });
    const ax0 = Math.min(...pts.map((p) => p.x));
    const ay0 = Math.min(...pts.map((p) => p.y));
    const ax1 = Math.max(...pts.map((p) => p.x));
    const ay1 = Math.max(...pts.map((p) => p.y));
    const w = (ax1 - ax0) / R.width;
    const h = (ay1 - ay0) / R.height;
    // Skip specks and full-width backgrounds/textures.
    if (w * h < 0.004 || w > 0.85) continue;
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? "";
    let format: SvgPicture["format"] = "other";
    const target = href.startsWith("#") ? live.querySelector(`#${CSS.escape(href.slice(1))}`) : null;
    const src = target ? (target.getAttribute("href") ?? target.getAttribute("xlink:href") ?? "") : href;
    if (/^data:image\/jpe?g/i.test(src)) format = "jpeg";
    else if (/^data:image\/png/i.test(src)) format = "png";
    out.push({
      n: 0,
      k,
      x: (ax0 - R.left) / R.width,
      y: (ay0 - R.top) / R.height,
      w,
      h,
      cx: (c.x - R.left) / R.width,
      cy: (c.y - R.top) / R.height,
      rw: rw / R.width,
      rh: rh / R.height,
      rotate: +((angle * 180) / Math.PI).toFixed(2),
      format,
      src: /^data:image\//.test(src) ? src : "",
    });
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x).map((p, i) => ({ ...p, n: i + 1 }));
}

/**
 * Section boundaries for long designs: edges of full-width background
 * bands where no other element crosses (searched a little either side, so
 * an edge with a sticker overlapping it can still be cut nearby).
 */
function findCuts(leaves: SvgLeaf[], aspect: number): number[] {
  const bg = leaves.filter((l) => l.w > 0.95 && l.h * aspect > 0.05);
  const others = leaves.filter((l) => !bg.includes(l) && l.w < 0.95);
  const crosses = (y: number) => others.some((l) => l.y < y && l.y + l.h > y);
  const edges = [...new Set(bg.flatMap((b) => [b.y, b.y + b.h]).map((y) => +y.toFixed(4)))].filter((y) => y > 0.02 && y < 0.98).sort((a, b) => a - b);
  const step = 0.0005;
  const cuts: number[] = [];
  for (const e of edges) {
    let found: number | null = null;
    for (let d = 0; d <= 0.02 && found === null; d += step) {
      if (!crosses(e - d)) found = e - d;
      else if (!crosses(e + d)) found = e + d;
    }
    if (found !== null && !cuts.some((c) => Math.abs(c - found!) < 0.03)) cuts.push(+found.toFixed(4));
  }
  return cuts.sort((a, b) => a - b);
}

/**
 * A line's tilt from its letters: fit a straight line through their bottom
 * edges (in square units). Level text → 0. A tilted card's text gets its
 * angle plus its true (unrotated) length and height.
 */
function tilt(letters: SvgLeaf[], aspect: number, box: { x0: number; y0: number; x1: number; y1: number }) {
  const level = { rotate: 0, cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2, rw: box.x1 - box.x0, rh: box.y1 - box.y0 };
  if (letters.length < 4) return level;
  const pts = letters.map((q) => ({ x: q.x + q.w / 2, y: (q.y + q.h) * aspect }));
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let sxy = 0, sxx = 0;
  for (const p of pts) ((sxy += (p.x - mx) * (p.y - my)), (sxx += (p.x - mx) ** 2));
  if (!sxx || letters.length < 6) return level;
  const slope = sxy / sxx;
  const angle = Math.atan(slope);
  const deg = (angle * 180) / Math.PI;
  if (Math.abs(deg) < 1.5 || Math.abs(deg) > 40) return level;
  // Only a genuinely straight slanted baseline counts: handwriting swashes
  // make letter bottoms wander, which isn't tilt.
  const hs = letters.map((q) => q.h * aspect).sort((a, b) => a - b);
  const rms = Math.sqrt(pts.reduce((s, p) => s + (p.y - (my + slope * (p.x - mx))) ** 2, 0) / pts.length);
  if (rms > hs[hs.length >> 1] * 0.12) return level;
  // Project every letter corner onto the tilted axes for the true size.
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const us: number[] = [], vs: number[] = [];
  for (const q of letters)
    for (const [x, y] of [[q.x, q.y * aspect], [q.x + q.w, q.y * aspect], [q.x, (q.y + q.h) * aspect], [q.x + q.w, (q.y + q.h) * aspect]]) {
      us.push(x * cos + y * sin);
      vs.push(-x * sin + y * cos);
    }
  const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
  const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
  // Letter boxes are axis-aligned, so they overstate a tilted line's height a little.
  const rhSquare = (v1 - v0) * 0.85;
  return {
    rotate: +deg.toFixed(2),
    cx: uc * cos - vc * sin,
    cy: (uc * sin + vc * cos) / aspect,
    rw: u1 - u0,
    rh: rhSquare / aspect,
  };
}

const median = (a: number[]) => [...a].sort((m, n) => m - n)[a.length >> 1];

/**
 * Letter runs → lines. A run is consecutive (paint order) same-colour solid
 * shapes that stay near each other; within a run, shapes are split into
 * rows by vertical overlap. A row counts as a text candidate when its shapes
 * look like letters: several similar-height shapes side by side, or one
 * compact shape sitting inside a text run.
 */
export function findLetterLines(leaves: SvgLeaf[], aspect: number): SvgCandidate[] {
  const shapes = leaves.filter((l) => l.tag === "path" || l.tag === "polygon" || l.tag === "rect" || l.tag === "circle" || l.tag === "ellipse");
  const runs: SvgLeaf[][] = [];
  let cur: SvgLeaf[] = [];
  let lastK = -2;
  for (const s of shapes) {
    const solid = s.fill.startsWith("rgb") && s.opacity > 0.05;
    // Letters are small: under 18% of the design's width-scaled height.
    const small = s.h * aspect < 0.18 && s.w < 0.35;
    const prev = cur[cur.length - 1];
    const near =
      prev &&
      s.k === lastK + 1 &&
      s.fill === prev.fill &&
      Math.abs(s.y + s.h / 2 - (prev.y + prev.h / 2)) * aspect < Math.max(s.h, prev.h) * aspect * 3 &&
      Math.abs(s.x - (prev.x + prev.w)) < 0.25;
    if (solid && small && near) cur.push(s);
    else {
      if (cur.length) runs.push(cur);
      cur = solid && small ? [s] : [];
    }
    lastK = s.k;
  }
  if (cur.length) runs.push(cur);

  // Split each run into rows: sort by vertical centre, start a new row when
  // a shape's centre falls outside every existing row's vertical band.
  const folded = new Set<SvgLeaf>();
  const rowsOf = (run: SvgLeaf[]) => {
    const rows: SvgLeaf[][] = [];
    for (const s of [...run].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2))) {
      // A letter joins a row when it covers the row's CORE band (where most
      // of its letters sit, by median top/bottom). A swash capital covers
      // it and joins; a small body line tucked under a script heading's
      // swashes sits below it and starts its own row.
      const row = rows.find((r) => {
        const top = median(r.map((q) => q.y));
        const bottom = median(r.map((q) => q.y + q.h));
        const overlap = Math.min(bottom, s.y + s.h) - Math.max(top, s.y);
        return overlap >= 0.5 * Math.min(bottom - top, s.h);
      });
      if (row) row.push(s);
      else rows.push([s]);
    }
    // Dots of i/j, accents and commas sit outside the letters' band: fold
    // tiny rows into the nearest real row they line up with.
    const hOf = (r: SvgLeaf[]) => Math.max(...r.map((q) => q.y + q.h)) - Math.min(...r.map((q) => q.y));
    const big = rows.filter((r) => r.length > 1 || hOf(r) * aspect > 0.004);
    const typical = big.length ? median(big.map(hOf)) : 0;
    for (const r of [...rows]) {
      // Only dot-like rows fold: 1–3 tiny shapes, never a line of letters.
      if (r.length > 3 || (big.includes(r) && hOf(r) > typical * 0.45)) continue;
      const cx = r[0].x + r[0].w / 2;
      const cy = r[0].y + r[0].h / 2;
      const host = rows
        .filter((o) => o !== r && hOf(o) > typical * 0.45)
        .filter((o) => cx >= Math.min(...o.map((q) => q.x)) - 0.01 && cx <= Math.max(...o.map((q) => q.x + q.w)) + 0.01)
        .map((o) => {
          const top = Math.min(...o.map((q) => q.y));
          const bottom = Math.max(...o.map((q) => q.y + q.h));
          return { o, gap: cy < top ? top - cy : cy > bottom ? cy - bottom : 0, h: bottom - top };
        })
        .filter((c) => c.gap < c.h * 0.6)
        .sort((a, b) => a.gap - b.gap)[0];
      if (host) {
        r.forEach((q) => folded.add(q));
        host.o.push(...r);
        rows.splice(rows.indexOf(r), 1);
      }
    }
    return rows;
  };
  const allRows = runs.flatMap((run) => rowsOf(run).map((row) => ({ row, run })));
  const shape = (row: SvgLeaf[]) => {
    const hm = median(row.map((s) => s.h));
    const similar = row.filter((s) => s.h > hm * 0.35 && s.h < hm * 3).length / row.length;
    const x0 = Math.min(...row.map((s) => s.x));
    const x1 = Math.max(...row.map((s) => s.x + s.w));
    const y0 = Math.min(...row.map((s) => s.y));
    const y1 = Math.max(...row.map((s) => s.y + s.h));
    return { hm, similar, x0, x1, y0, y1, wide: (x1 - x0) / ((y1 - y0) * aspect) };
  };

  // Lines of 3+ similar letters side by side are unmistakable. Their colours
  // and heights tell us what this design's text looks like.
  const strong = allRows.filter(({ row }) => {
    const letters = row.filter((q) => !folded.has(q));
    if (letters.length < 3) return false;
    const m = shape(letters);
    // Real lettering is at least ~0.6% of the design's width tall.
    return m.similar > 0.7 && m.wide > 1 && (m.y1 - m.y0) * aspect > 0.006;
  });
  const textColors = new Set(strong.map(({ row }) => row[0].fill));
  const textHeights = strong.map(({ row }) => shape(row).y1 - shape(row).y0);
  const minH = textHeights.length ? Math.min(...textHeights) * 0.4 : 0;
  const maxH = textHeights.length ? Math.max(...textHeights) * 3 : 1;

  // Everything else counts only when it's in one of those text colours and
  // a plausible size: single letters ("&"), short words ("23", "PM"). Bits
  // of illustration in other colours are left in the artwork.
  const lines: SvgCandidate[] = [];
  for (const { row } of allRows) {
    const m = shape(row);
    const h = m.y1 - m.y0;
    const isStrong = strong.some((r) => r.row === row);
    const lettery = isStrong || (textColors.has(row[0].fill) && h >= minH && h <= maxH && (row.length === 1 || m.similar > 0.6));
    if (!lettery) continue;
    lines.push({
      n: 0,
      ks: row.sort((a, b) => a.x - b.x).map((q) => q.k),
      x: m.x0,
      y: m.y0,
      w: m.x1 - m.x0,
      h,
      color: rgbToHex(row[0].fill),
      effects: [],
      ...tilt(row.filter((q) => !folded.has(q)), aspect, { x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1 }),
    });
  }

  // Effects: Canva bakes a text shadow/glow into a picture drawn right
  // before (or after) the letters, covering them. Attach those to the line
  // so they're removed with the text (and recreated as a CSS shadow).
  const pictures = leaves.filter((l) => l.tag === "image" || l.tag === "use");
  for (const line of lines) {
    const lo = Math.min(...line.ks);
    const hi = Math.max(...line.ks);
    for (const p of pictures) {
      if (p.k < lo - 3 || p.k > hi + 3) continue;
      const ix = Math.max(0, Math.min(p.x + p.w, line.x + line.w) - Math.max(p.x, line.x));
      const iy = Math.max(0, Math.min(p.y + p.h, line.y + line.h) - Math.max(p.y, line.y));
      const covers = (ix * iy) / (line.w * line.h);
      // A shadow/glow hugs its text: roughly the line's size (≤ ~3× either
      // way) and centred on it. Anything else nearby is real artwork.
      const sameSize = p.w < line.w * 1.6 + 0.02 && p.h < line.h * 3 + 0.01 && p.w > line.w * 0.7;
      const centred = Math.abs(p.x + p.w / 2 - (line.x + line.w / 2)) < line.w * 0.15 && Math.abs(p.y + p.h / 2 - (line.y + line.h / 2)) < line.h * 0.8 + 0.005;
      if (covers > 0.6 && sameSize && centred) line.effects.push(p.k);
    }
  }
  return lines
    .sort((a, b) => (Math.abs(a.y - b.y) < 0.004 ? a.x - b.x : a.y - b.y))
    .map((c, i) => ({ ...c, n: i + 1 }));
}

/** Render the tagged SVG to a canvas, optionally without some elements (or with only some). */
export async function renderSvg(
  tagged: string,
  width: number,
  opts: { hide?: Set<number>; only?: Set<number>; background?: string | null } = {},
): Promise<HTMLCanvasElement> {
  const doc = new DOMParser().parseFromString(tagged, "image/svg+xml");
  for (const el of Array.from(doc.querySelectorAll("[data-k]"))) {
    const k = Number(el.getAttribute("data-k"));
    if (opts.hide?.has(k) || (opts.only && !opts.only.has(k))) el.remove();
  }
  const blob = new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const vbw = img.naturalWidth || width;
    const vbh = img.naturalHeight || width;
    const h = Math.round((width * vbh) / vbw);
    const c = document.createElement("canvas");
    c.width = width;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    if (opts.background !== null) {
      ctx.fillStyle = opts.background ?? "#ffffff";
      ctx.fillRect(0, 0, width, h);
    }
    ctx.drawImage(img, 0, 0, width, h);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}
