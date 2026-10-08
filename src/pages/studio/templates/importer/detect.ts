// AI import, step 1 (deterministic, in the browser): find the editable text
// in a design by comparing two exports of it — the full design, and the
// same design with its text hidden. Every pixel that differs belongs to
// text, so text boxes and colours are MEASURED here, never guessed by the
// AI. (Canva/Figma exports turn text into shapes, so the SVG itself can't
// tell us where the text is.)

export interface DetectedBox {
  /** 1-based number drawn on the annotated image the AI sees. */
  n: number;
  /** Normalized 0..1 of the design. */
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface Detection {
  /** Design size in px at analysis resolution (only the ratio matters). */
  width: number;
  height: number;
  boxes: DetectedBox[];
  /** JPEG tiles (base64, no prefix) of the design with numbered boxes. */
  tiles: string[];
  /** Full design as a data URL, for the review overlay. */
  designUrl: string;
  /** The text-free artwork, ready to upload. */
  art: File;
  artSize: { w: number; h: number };
}

const ANALYSIS_MAX_W = 1000;
const ART_MAX_W = 1400;
const DIFF_THRESHOLD = 48;
const CELL = 3;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error(`Couldn't open ${file.name}. Use PNG, JPG, WebP or SVG.`);
  }
}

const isSvg = (f: File) => f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg");

/** Natural size, upscaling SVGs (they're vector, and Canva exports them tiny). */
function sourceSize(img: HTMLImageElement, file: File) {
  const w = img.naturalWidth || 1000;
  const h = img.naturalHeight || 1000;
  if (isSvg(file) && w < 1200) return { w: 1200, h: Math.round((h * 1200) / w) };
  return { w, h };
}

function draw(img: HTMLImageElement, w: number, h: number, bg = "#ffffff") {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = bg; // transparent PNGs compare on white
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function toBlob(c: HTMLCanvasElement, type: string, q: number) {
  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode image."))), type, q));
}

async function exportArt(img: HTMLImageElement, size: { w: number; h: number }) {
  let w = Math.min(size.w, ART_MAX_W);
  let q = 0.86;
  for (let attempt = 0; attempt < 4; attempt++) {
    const h = Math.round((size.h * w) / size.w);
    const blob = await toBlob(draw(img, w, h), "image/webp", q);
    if (blob.size < 900_000 || attempt === 3) return { file: new File([blob], "artwork.webp", { type: "image/webp" }), w, h };
    q -= 0.08;
    w = Math.round(w * 0.85);
  }
  throw new Error("unreachable");
}

export async function detectText(designFile: File, artFile: File): Promise<Detection> {
  const [design, art] = await Promise.all([loadImage(designFile), loadImage(artFile)]);
  const ds = sourceSize(design, designFile);
  const as = sourceSize(art, artFile);
  if (Math.abs(ds.w / ds.h - as.w / as.h) > 0.01) {
    throw new Error(
      `The two images aren't the same shape (${ds.w}×${ds.h} vs ${as.w}×${as.h}). Export both from the same page, at the same size.`,
    );
  }

  const W = Math.min(ds.w, ANALYSIS_MAX_W);
  const H = Math.round((ds.h * W) / ds.w);
  const dc = draw(design, W, H);
  const ac = draw(art, W, H);
  const dp = dc.getContext("2d")!.getImageData(0, 0, W, H).data;
  const ap = ac.getContext("2d")!.getImageData(0, 0, W, H).data;

  // Per-pixel difference, tolerant of the two exports being up to a pixel
  // apart: a pixel only counts as changed if NO artwork pixel within 1px
  // matches it (artwork edges shift; text doesn't exist in the artwork).
  const diff = new Uint8Array(W * H);
  let changed = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      let best = 255;
      for (let oy = -1; oy <= 1 && best > 0; oy++) {
        const yy = y + oy;
        if (yy < 0 || yy >= H) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const xx = x + ox;
          if (xx < 0 || xx >= W) continue;
          const q = (yy * W + xx) * 4;
          const d = Math.max(Math.abs(dp[p] - ap[q]), Math.abs(dp[p + 1] - ap[q + 1]), Math.abs(dp[p + 2] - ap[q + 2]));
          if (d < best) best = d;
        }
      }
      diff[y * W + x] = best;
      if (best > DIFF_THRESHOLD) changed++;
    }
  }
  if (changed === 0) throw new Error("The two images are identical — the second one should have the text hidden.");
  if (changed / diff.length > 0.3) {
    throw new Error("Too much of the design changed between the two images. Hide only the text (keep everything else exactly where it is) and export both again.");
  }

  // Coarse grid of "text here" cells, dilated sideways so a line's letters
  // and words join into one box, but not vertically so lines stay apart.
  const gw = Math.ceil(W / CELL);
  const gh = Math.ceil(H / CELL);
  const on = new Uint8Array(gw * gh);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (diff[y * W + x] > DIFF_THRESHOLD) on[Math.floor(y / CELL) * gw + Math.floor(x / CELL)]++;
    }
  }
  for (let i = 0; i < on.length; i++) on[i] = on[i] >= 2 ? 1 : 0;
  const dx = Math.max(2, Math.round((W * 0.014) / CELL));
  const grown = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!on[gy * gw + gx]) continue;
      for (let k = -dx; k <= dx; k++) {
        const x = gx + k;
        if (x >= 0 && x < gw) grown[gy * gw + x] = 1;
      }
    }
  }

  // Connected components → boxes (bounds from the undilated cells).
  const label = new Int32Array(gw * gh).fill(-1);
  const raw: { x0: number; y0: number; x1: number; y1: number; cells: number }[] = [];
  const stack: number[] = [];
  for (let start = 0; start < grown.length; start++) {
    if (!grown[start] || label[start] !== -1) continue;
    const id = raw.length;
    const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, cells: 0 };
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      const gx = i % gw;
      const gy = (i - gx) / gw;
      if (on[i]) {
        b.cells++;
        b.x0 = Math.min(b.x0, gx);
        b.y0 = Math.min(b.y0, gy);
        b.x1 = Math.max(b.x1, gx);
        b.y1 = Math.max(b.y1, gy);
      }
      for (const [nx, ny] of [
        [gx - 1, gy],
        [gx + 1, gy],
        [gx, gy - 1],
        [gx, gy + 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const j = ny * gw + nx;
        if (grown[j] && label[j] === -1) {
          label[j] = id;
          stack.push(j);
        }
      }
    }
    if (b.cells >= 4) raw.push(b);
  }
  if (raw.length > 70) {
    throw new Error(`Found ${raw.length} separate changes — far more than a design's text. Check that both images come from the same export settings.`);
  }

  // Text colour: the most-changed pixels in each box are the glyph cores.
  const boxes: DetectedBox[] = raw
    .map((b) => {
      // Tighten the cell-sized bounds to the exact changed pixels.
      let px0 = Infinity, py0 = Infinity, px1 = -Infinity, py1 = -Infinity;
      for (let y = b.y0 * CELL; y < Math.min(H, (b.y1 + 1) * CELL); y++) {
        for (let x = b.x0 * CELL; x < Math.min(W, (b.x1 + 1) * CELL); x++) {
          if (diff[y * W + x] <= DIFF_THRESHOLD) continue;
          px0 = Math.min(px0, x);
          py0 = Math.min(py0, y);
          px1 = Math.max(px1, x + 1);
          py1 = Math.max(py1, y + 1);
        }
      }
      let max = 0;
      for (let y = py0; y < py1; y++) for (let x = px0; x < px1; x++) max = Math.max(max, diff[y * W + x]);
      const rs: number[] = [];
      const gs: number[] = [];
      const bs: number[] = [];
      for (let y = py0; y < py1; y++) {
        for (let x = px0; x < px1; x++) {
          if (diff[y * W + x] >= max * 0.75) {
            const p = (y * W + x) * 4;
            rs.push(dp[p]);
            gs.push(dp[p + 1]);
            bs.push(dp[p + 2]);
          }
        }
      }
      const med = (a: number[]) => a.sort((m, n) => m - n)[a.length >> 1] ?? 0;
      return { n: 0, x: px0 / W, y: py0 / H, w: (px1 - px0) / W, h: (py1 - py0) / H, color: hex(med(rs), med(gs), med(bs)) };
    })
    .sort((a, b) => (Math.abs(a.y - b.y) < 0.004 ? a.x - b.x : a.y - b.y))
    .map((b, i) => ({ ...b, n: i + 1 }));

  if (!boxes.length) throw new Error("Couldn't find any text differences between the two images.");

  // Annotated tiles for the AI: numbered magenta boxes, sliced so tall
  // designs stay legible (~1.1 megapixels per tile).
  const ann = draw(design, W, H);
  const ctx = ann.getContext("2d")!;
  ctx.lineWidth = 2;
  ctx.font = "bold 13px sans-serif";
  for (const b of boxes) {
    const x = b.x * W - 3;
    const y = b.y * H - 3;
    ctx.strokeStyle = "#ff00aa";
    ctx.strokeRect(x, y, b.w * W + 6, b.h * H + 6);
    const tag = String(b.n);
    const tw = ctx.measureText(tag).width + 8;
    const lx = x - tw - 2 >= 0 ? x - tw - 2 : x;
    const ly = x - tw - 2 >= 0 ? y : Math.max(0, y - 18);
    ctx.fillStyle = "#ff00aa";
    ctx.fillRect(lx, ly, tw, 17);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(tag, lx + 4, ly + 13);
  }
  const tileH = Math.max(600, Math.round(1_100_000 / W));
  const tiles: string[] = [];
  for (let top = 0; top < H; top += tileH - 60) {
    const h = Math.min(tileH, H - top);
    const t = document.createElement("canvas");
    t.width = W;
    t.height = h;
    t.getContext("2d")!.drawImage(ann, 0, top, W, h, 0, 0, W, h);
    tiles.push(t.toDataURL("image/jpeg", 0.85).split(",")[1]);
    if (top + h >= H) break;
  }

  const exported = await exportArt(art, as);
  return {
    width: W,
    height: H,
    boxes,
    tiles,
    designUrl: dc.toDataURL("image/jpeg", 0.85),
    art: exported.file,
    artSize: { w: exported.w, h: exported.h },
  };
}
