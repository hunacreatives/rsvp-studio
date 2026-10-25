import { CHAIR, contentBounds, dims, initials, isHonorific, isRound, seatOffsets, tablePath, topRadius, type Chart, type Guest } from "./model";
import { OBJ_ICON } from "./icons";
import { downloadCsv } from "@/lib/csv";
import { PAPER, drawFit, savePdf, svgImage, type Page, type Paper } from "./pdf";

// Downloads: a print-ready floor plan, an A–Z "find your table" list, table-by-table lists,
// the caterer's sheet, the entrance board, table number cards, escort and place cards, and a
// spreadsheet. Printed pages use the paper look whatever the editor looks like, and carry
// our logo bottom right.

const INK = "#000727";
const MUTED = "#8a8478";
const LINE = "#cfc8b8";
const GOLD_INK = "#b8913a";
const CAT_FILL: Record<string, string> = {
  vip: "#e6cf98",
  entourage: "#e4daf0",
  bride: "#efd8c8",
  groom: "#d4def0",
  family: "#efe3c7",
  friends: "#d7e7dc",
  work: "#d3e8ee",
  court: "#f2d6df",
  kids: "#f6e7b8",
  other: "#e6e5ea",
};

// Our logo, bottom right of every PDF and image (public/tools/mesa/watermark.png, 520 × 241).
const WATERMARK = "/tools/mesa/watermark.png";
const WM_RATIO = 241 / 520;
/** The logo in the bottom-right corner of a W × H page, `w` wide, `inset` from the edges. */
function watermark(W: number, H: number, w: number, inset: number) {
  const h = w * WM_RATIO;
  return `<image href="${WATERMARK}" x="${W - inset - w}" y="${H - inset - h}" width="${w}" height="${h}" opacity="0.9" preserveAspectRatio="xMidYMid meet"/>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const SANS = "Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const tableName = (label: string) => (/^\d+[a-z]?$/i.test(label) ? `Table ${label}` : label);

/** The couple (or the debutante): at the head table, never on the lists guests look through. */
const honorees = (chart: Chart) => new Set(chart.groups.filter((g) => g.cat === "vip" && /^(the couple|debutante)$/i.test(g.name)).map((g) => g.id));

/** "tables 1, 3 and 4" */
const andList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : (xs[0] ?? ""));

/**
 * The floor plan as a standalone SVG (inline styles, system fonts so it renders anywhere).
 * `pageW` is how wide it will be printed, in points: type is sized so nothing comes out
 * smaller than it can be read, and a key under the plan says which tables each group has.
 */
export function planSvg(chart: Chart, opts: { title?: boolean; credit?: boolean; pageW?: number } = {}) {
  const b = contentBounds(chart);
  const pad = 80;
  const roughW = b.w + pad * 2;
  const k = opts.pageW ? opts.pageW / roughW : 1; // points per centimetre once printed
  const pt = (n: number) => n / k; // n points, in plan units
  const cat = new Map(chart.groups.map((g) => [g.id, g.cat]));
  const seatedAt = new Map<string, Guest[]>();
  for (const g of chart.guests) if (g.tableId) seatedAt.set(g.tableId, [...(seatedAt.get(g.tableId) ?? []), g]);
  const tablesById = new Map(chart.tables.map((t) => [t.id, t]));

  // The key: each group with its colour and tables, in columns under the plan.
  const key = chart.groups
    .map((g) => {
      const ts = [...new Set(chart.guests.filter((x) => x.groupId === g.id && x.tableId).map((x) => tablesById.get(x.tableId!)?.label).filter(Boolean) as string[])].sort((p, q) => p.localeCompare(q, undefined, { numeric: true }));
      return { name: g.name, cat: g.cat, tables: ts };
    })
    .filter((g) => g.tables.length);
  const keyFont = Math.max(16, pt(7.5));
  const keyLine = keyFont * 1.9;
  const keyColW = keyFont * 30;
  const keyCols = Math.max(1, Math.floor((roughW - pad * 2) / keyColW));
  const keyH = key.length ? keyFont * 3 + Math.ceil(key.length / keyCols) * keyLine : 0;

  const head = opts.title ? Math.max(170, pt(48)) : 0;
  const foot = (opts.credit ? Math.max(90, b.w * 0.05) : 0) + keyH;
  const W = roughW;
  const H = b.h + pad * 2 + head + foot;
  const ox = pad - b.x;
  const oy = pad - b.y + head;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>`;
  s += `<defs><pattern id="pq" width="90" height="90" patternUnits="userSpaceOnUse"><rect width="90" height="90" fill="#f7f3ea"/><path d="M0 0h45v45H0zM45 45h45v45H45z" fill="#f3eee2"/><path d="M0 15h45M0 30h45M60 0v45M75 0v45M45 60h45M45 75h45M15 45v45M30 45v45" stroke="#e9e1d1" stroke-width="1" fill="none"/></pattern></defs>`;
  if (opts.title) {
    const tf = Math.max(72, pt(22));
    s += `<text x="${W / 2}" y="${pad + tf * 0.75}" text-anchor="middle" font-family="${SERIF}" font-size="${tf}" font-weight="600" fill="${INK}">${esc(chart.title)}</text>`;
    s += `<text x="${W / 2}" y="${pad + tf * 0.75 + Math.max(50, pt(15))}" text-anchor="middle" font-family="${SANS}" font-size="${Math.max(22, pt(7))}" letter-spacing="${Math.max(5, pt(1.6))}" fill="${MUTED}">SEATING PLAN · ${chart.guests.filter((g) => g.tableId).length} GUESTS · ${chart.tables.length} TABLES</text>`;
  }
  s += `<g transform="translate(${ox} ${oy})">`;
  s += `<rect x="0" y="0" width="${chart.room.w}" height="${chart.room.h}" rx="8" fill="#fffef9" stroke="${INK}" stroke-width="${Math.max(4, pt(1.2))}"/>`;
  s += `<rect x="12" y="12" width="${chart.room.w - 24}" height="${chart.room.h - 24}" rx="3" fill="none" stroke="${INK}" stroke-opacity="0.22" stroke-width="${Math.max(1.5, pt(0.4))}"/>`;
  const objFont = Math.max(20, pt(6.5));
  for (const o of chart.objects) {
    const tall = o.h > o.w * 1.6;
    s += `<g transform="translate(${o.x} ${o.y}) rotate(${o.rot})">`;
    if (o.type === "cake") s += `<circle r="${Math.min(o.w, o.h) / 2}" fill="#f4f1e9" stroke="${LINE}" stroke-width="2"/>`;
    else if (o.type === "pillar") s += `<rect x="${-o.w / 2}" y="${-o.h / 2}" width="${o.w}" height="${o.h}" rx="4" fill="${LINE}"/>`;
    else if (o.type === "entrance" || o.type === "exit") {
      s += `<path d="M${-o.w / 2} ${o.h / 2}V${-o.h / 2}H${o.w / 2}V${o.h / 2}" fill="#f4f1e9" stroke="${LINE}" stroke-width="2"/>`;
      if (o.w <= 600) s += `<path d="M${-o.w / 2} ${-o.h / 2}v${-o.w / 2}a${o.w / 2} ${o.w / 2} 0 0 1 ${o.w / 2} ${o.w / 2}M${o.w / 2} ${-o.h / 2}v${-o.w / 2}a${o.w / 2} ${o.w / 2} 0 0 0 ${-o.w / 2} ${o.w / 2}" fill="none" stroke="${LINE}" stroke-width="1.5" stroke-dasharray="6 6"/>`;
    } else s += `<rect x="${-o.w / 2}" y="${-o.h / 2}" width="${o.w}" height="${o.h}" rx="${o.type === "dance" ? 4 : 10}" fill="${o.type === "dance" ? "url(#pq)" : "#f4f1e9"}" stroke="${LINE}" stroke-width="2"/>`;
    if (o.type !== "pillar") {
      const fs = o.type === "cake" ? Math.max(15, pt(5.5)) : objFont;
      const icon = OBJ_ICON[o.type];
      const showIcon = icon && o.type !== "cake" && Math.min(o.w, o.h) >= fs * 2.6;
      const textW = o.label.length * fs * 0.78;
      const iw = showIcon ? fs * 1.5 : 0;
      const total = textW + (showIcon ? iw + 8 : 0);
      s += `<g transform="rotate(${tall ? -90 - o.rot : -o.rot})">`;
      if (showIcon) s += `<g transform="translate(${-total / 2 + iw / 2} 0) scale(${iw / 24}) translate(-12 -12)"><path d="${icon}" fill="none" stroke="${MUTED}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      s += `<text x="${showIcon ? -total / 2 + iw + 8 : 0}" y="${o.type === "cake" ? Math.min(o.w, o.h) / 2 + fs * 1.1 : fs * 0.36}" text-anchor="${showIcon ? "start" : "middle"}" font-family="${SANS}" font-size="${fs}" font-weight="600" letter-spacing="${fs * 0.16}" fill="${MUTED}">${esc(o.label.toUpperCase())}</text></g>`;
    }
    s += `</g>`;
  }
  // Initials only when they'd print at a readable size; otherwise the colours say the group.
  const showInitials = 15 * k >= 4.5 || !opts.pageW;
  for (const t of chart.tables) {
    const seated = seatedAt.get(t.id) ?? [];
    const bySeat = new Map(seated.map((g) => [g.seat, g]));
    s += `<g transform="translate(${t.x} ${t.y}) rotate(${t.rot})">`;
    if (isRound(t)) s += `<circle r="${topRadius(t)}" fill="#ffffff" stroke="${INK}" stroke-width="${Math.max(4, pt(1))}"/>`;
    else s += `<path d="${tablePath(t)}" fill="#ffffff" stroke="${INK}" stroke-width="${Math.max(4, pt(1))}"/>`;
    seatOffsets(t).forEach(([dx, dy], i) => {
      const g = bySeat.get(i);
      const fill = g ? (CAT_FILL[(g.groupId && cat.get(g.groupId)) || "other"] ?? CAT_FILL.other) : "#ffffff";
      s += `<g transform="translate(${dx} ${dy})"><circle r="${CHAIR}" fill="${fill}" stroke="${g ? "#b9b1a0" : LINE}" stroke-width="${g ? 1.3 : 2}"/>`;
      if (g && showInitials) s += `<text transform="rotate(${-t.rot})" y="5.5" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="700" fill="${INK}">${esc(initials(g.name))}</text>`;
      s += `</g>`;
    });
    const long = t.label.length > 3 || t.shape === "cocktail" || t.shape === "sweetheart";
    const { h: th } = isRound(t) ? { h: 0 } : dims(t);
    const ly = t.shape === "ushape" ? th / 2 - 38 : t.shape === "lshape" ? -th / 2 + 38 : 0;
    const lx = t.shape === "lshape" ? 38 : 0;
    // The table's number, as big as the table allows, and never under 11 pt once printed.
    const room = isRound(t) ? topRadius(t) * 1.5 : Math.max(80, (isRound(t) ? 0 : dims(t).w) - 30);
    const want = Math.max(t.shape === "cocktail" ? 22 : long ? 30 : 46, pt(11));
    const nf = Math.min(want, (room / Math.max(1, t.label.length * 0.62)) * (long ? 1 : 1.3));
    s += `<g transform="translate(${lx} ${ly}) rotate(${-t.rot})"><text y="${t.note && t.shape === "round" ? nf * 0.1 : nf * 0.3}" text-anchor="middle" font-family="${SERIF}" font-size="${nf}" font-weight="600" fill="${INK}">${esc(t.label)}</text>`;
    if (t.note && t.shape === "round" && topRadius(t) > pt(8)) {
      const note = (t.note.length > 16 ? t.note.split(" ")[0] : t.note).toUpperCase();
      const fs = Math.min(15, (topRadius(t) * 1.5) / (note.length * 0.8));
      s += `<text y="${nf * 0.1 + fs * 2.2}" text-anchor="middle" font-family="${SANS}" font-size="${fs}" font-weight="600" letter-spacing="${fs * 0.12}" fill="${MUTED}">${esc(note)}</text>`;
    }
    s += `</g></g>`;
  }
  s += `</g>`;
  if (key.length) {
    const y0 = oy + b.y + b.h + pad * 0.6;
    s += `<text x="${pad}" y="${y0 + keyFont}" font-family="${SANS}" font-size="${keyFont * 0.9}" font-weight="700" letter-spacing="${keyFont * 0.14}" fill="${MUTED}">WHO SITS WHERE</text>`;
    key.forEach((g, i) => {
      const c = i % keyCols;
      const r = Math.floor(i / keyCols);
      const x = pad + c * keyColW;
      const y = y0 + keyFont * 2.6 + r * keyLine;
      s += `<circle cx="${x + keyFont * 0.45}" cy="${y - keyFont * 0.34}" r="${keyFont * 0.42}" fill="${CAT_FILL[g.cat] ?? CAT_FILL.other}" stroke="#b9b1a0" stroke-width="${keyFont * 0.06}"/>`;
      const tablesText = g.tables.length > 5 ? `${g.tables.slice(0, 5).join(", ")} +${g.tables.length - 5}` : g.tables.join(", ");
      s += `<text x="${x + keyFont * 1.4}" y="${y}" font-family="${SANS}" font-size="${keyFont}" fill="${INK}"><tspan font-weight="600">${esc(g.name.length > 26 ? g.name.slice(0, 25) + "…" : g.name)}</tspan><tspan fill="${MUTED}">  ${esc(tablesText)}</tspan></text>`;
    });
  }
  if (opts.credit) s += watermark(W, H, Math.max(150, W * 0.09), Math.max(24, W * 0.015));
  return s + `</svg>`;
}

export async function downloadPng(chart: Chart, credit = true) {
  await svgToPng(planSvg(chart, { title: true, credit, pageW: 1700 }), `${slug(chart.title)}.png`);
}

export async function downloadBoardPng(chart: Chart, size: BoardSize = "A3") {
  await svgToPng(boardSvg(chart, size), `${slug(chart.title)}-find-your-table.png`, 1);
}

/** An SVG drawn as an image can't fetch files, so the logo goes in as data. */
async function withLogo(svg: string) {
  return svg.includes(WATERMARK) ? svg.split(`href="${WATERMARK}"`).join(`href="${await logoData()}"`) : svg;
}

let logoCache: Promise<string> | null = null;
function logoData(): Promise<string> {
  logoCache ??= fetch(WATERMARK)
    .then((r) => r.blob())
    .then(
      (b) =>
        new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.readAsDataURL(b);
        }),
    )
    .catch(() => "");
  return logoCache;
}

async function svgToPng(svg: string, fileName: string, maxScale = 2.4) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
  const w = Number(vb[1]);
  const h = Number(vb[2]);
  // Up to 4096 px wide: sharp when printed, still small enough for phones to share.
  const scale = Math.min(4096 / w, 4096 / h, maxScale);
  svg = await withLogo(svg);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("render"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("png");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const slug = (s: string) =>
  s
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "seating-plan";

/** Surname for sorting: the last word that isn't a title or a household number. */
export function surname(name: string) {
  const w = name
    .replace(/·.*$/, "")
    .split(/\s+/)
    .filter((x) => x && !isHonorific(x));
  return (w.length > 1 ? w[w.length - 1] : (w[0] ?? name)).toLowerCase();
}

const sortKey = (name: string) =>
  `${surname(name)} ${name
    .split(/\s+/)
    .filter((w) => !isHonorific(w))
    .join(" ")
    .toLowerCase()}`;

/** The entrance list. Kids and plus-ones are found under the person they came with, the
 *  couple aren't on it, and "Reyes family · 1…5" is one line. */
export function azList(chart: Chart) {
  const tables = new Map(chart.tables.map((t) => [t.id, t]));
  const skip = honorees(chart);
  const seen = new Set<string>();
  const out: { name: string; table: string; key: string }[] = [];
  for (const g of chart.guests) {
    if (!g.tableId || !tables.has(g.tableId) || g.tags?.includes("kid") || g.tags?.includes("plusone") || (g.groupId && skip.has(g.groupId))) continue;
    const name = g.name.replace(/\s*·\s*\d+$/, "");
    const table = tableName(tables.get(g.tableId)!.label);
    const k = `${name}|${table}`;
    if (seen.has(k)) continue;
    seen.add(k);
    // Sorted by surname, then first name, ignoring titles (Ninong Jun Cruz under "Cruz, Jun").
    out.push({ name, table, key: sortKey(name) });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

/** A–Z entries with a letter before each new initial. */
type Entry = { letter: string; cont?: boolean } | { name: string; table: string };
function lettered(chart: Chart): Entry[] {
  const items: Entry[] = [];
  let letter = "";
  for (const r of azList(chart)) {
    const l = r.key.charAt(0).toUpperCase();
    if (l !== letter) items.push({ letter: l });
    letter = l;
    items.push({ name: r.name, table: r.table.replace(/^Table /, "") });
  }
  return items;
}

/**
 * Entries poured into columns of `rows(i)` lines. A letter never sits alone at the foot of a
 * column, and a column that starts mid-letter opens with "R cont." so no one hunts.
 */
function pour(items: Entry[], rows: (col: number) => number): Entry[][] {
  const cols: Entry[][] = [];
  let col: Entry[] = [];
  let letter = "";
  const next = () => {
    cols.push(col);
    col = [];
  };
  for (const it of items) {
    const isLetter = "letter" in it;
    if (col.length >= rows(cols.length) || (isLetter && col.length >= rows(cols.length) - 1)) next();
    if (!col.length && !isLetter && letter) col.push({ letter, cont: true });
    if (isLetter) letter = it.letter;
    col.push(it);
  }
  if (col.length) cols.push(col);
  return cols;
}

export function tableLists(chart: Chart) {
  return chart.tables
    .map((t) => ({ t, people: chart.guests.filter((g) => g.tableId === t.id).sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0)) }))
    .sort((a, b) => {
      const na = Number(a.t.label);
      const nb = Number(b.t.label);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      if (Number.isFinite(na)) return 1;
      if (Number.isFinite(nb)) return -1;
      return a.t.y - b.t.y;
    });
}

export function downloadSheet(chart: Chart) {
  const tables = new Map(chart.tables.map((t) => [t.id, t]));
  const groups = new Map(chart.groups.map((g) => [g.id, g.name]));
  const rows = chart.guests.map((g) => [g.name, g.groupId ? (groups.get(g.groupId) ?? "") : "", g.tableId ? tableName(tables.get(g.tableId)?.label ?? "") : "Not seated", g.seat != null ? String(g.seat + 1) : "", g.meal ?? ""]);
  downloadCsv(`${slug(chart.title)}.csv`, ["Name", "Group", "Table", "Seat", "Meal or note"], rows);
}

// ---- the entrance board --------------------------------------------------------------
export type BoardSize = "A3" | "A2" | "A1" | "24x36";
/** Width × height in millimetres. */
export const BOARD_MM: Record<BoardSize, [number, number]> = { A3: [297, 420], A2: [420, 594], A1: [594, 841], "24x36": [609.6, 914.4] };
export const BOARD_LABEL: Record<BoardSize, string> = { A3: "A3", A2: "A2", A1: "A1", "24x36": "24 × 36 in" };

/** The entrance board: "Find your table", everyone A–Z by surname with their table, on one
 *  page of the chosen size. Columns and type size adjust to the guest count. */
export function boardSvg(chart: Chart, size: BoardSize = "A3") {
  const W = 2970;
  const [mw, mh] = BOARD_MM[size];
  const H = Math.round((W * mh) / mw);
  const items = lettered(chart);
  const names = chart.names || chart.title;
  const mono = (chart.names ?? "")
    .split(/\s*(?:&|\band\b)\s*/i)
    .map((n) => n.trim()[0])
    .filter(Boolean)
    .join(" & ");
  const top = mono ? 900 : 760;
  const bottom = 260;
  const side = 220;
  const gap = 110;
  // The fewest columns that keep lines at least 64 units tall, then pour, then check it fits.
  let cols = 2;
  let perCol = 1;
  let poured: Entry[][] = [];
  for (cols = 2; cols <= 6; cols++) {
    perCol = Math.ceil((items.length + cols) / cols);
    if ((H - top - bottom) / perCol >= 64 || cols === 6) break;
  }
  for (;;) {
    poured = pour(items, () => perCol);
    if (poured.length <= cols) break;
    perCol++;
  }
  const line = Math.min((H - top - bottom) / Math.max(1, perCol), 96);
  const font = Math.max(26, Math.round(line * 0.58));
  const colW = (W - side * 2 - gap * (cols - 1)) / cols;
  const maxChars = Math.floor((colW * 0.72) / (font * 0.52));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  s += `<rect width="${W}" height="${H}" fill="#fffef9"/>`;
  s += `<rect x="70" y="70" width="${W - 140}" height="${H - 140}" fill="none" stroke="${GOLD_INK}" stroke-width="4"/>`;
  s += `<rect x="96" y="96" width="${W - 192}" height="${H - 192}" fill="none" stroke="${GOLD_INK}" stroke-width="1.5"/>`;
  let y = 330;
  if (mono) {
    s += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${SERIF}" font-size="120" fill="${GOLD_INK}" letter-spacing="10">${esc(mono)}</text>`;
    y += 170;
  }
  s += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${SERIF}" font-size="150" font-weight="600" fill="${INK}">Find your table</text>`;
  s += `<text x="${W / 2}" y="${y + 110}" text-anchor="middle" font-family="${SANS}" font-size="44" letter-spacing="14" fill="#6b6b7c">${esc(names.toUpperCase())}</text>`;
  poured.forEach((col, c) =>
    col.forEach((it, r) => {
      const x = side + c * (colW + gap);
      const yy = top + r * line + line * 0.7;
      if ("letter" in it) {
        s += `<text x="${x}" y="${yy}" font-family="${SERIF}" font-size="${Math.round(font * 1.25)}" font-weight="600" fill="${GOLD_INK}">${esc(it.letter)}${it.cont ? `<tspan font-family="${SANS}" font-size="${Math.round(font * 0.7)}" font-weight="400" fill="${MUTED}"> cont.</tspan>` : ""}</text>`;
      } else {
        const nm = it.name.length > maxChars ? it.name.slice(0, maxChars - 1) + "…" : it.name;
        s += `<text x="${x}" y="${yy}" font-family="${SANS}" font-size="${font}" fill="${INK}">${esc(nm)}</text>`;
        s += `<text x="${x + colW}" y="${yy}" text-anchor="end" font-family="${SERIF}" font-size="${font}" font-weight="600" fill="${INK}">${esc(it.table)}</text>`;
      }
    }),
  );
  s += watermark(W - 96, H - 96, 300, 40);
  return s + `</svg>`;
}

// ---- PDF pages ------------------------------------------------------------------------
const fit = (t: string, size: number, width: number) => {
  const max = Math.floor(width / (size * 0.52));
  return t.length > max ? t.slice(0, Math.max(1, max - 1)) + "…" : t;
};
const svgPage = (W: number, H: number, body: string, logo = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${body}${logo ? watermark(W, H, 74, 22) : ""}</svg>`;

function header(W: number, title: string, sub: string, first: boolean) {
  return first
    ? `<text x="${W / 2}" y="62" text-anchor="middle" font-family="${SERIF}" font-size="24" font-weight="600" fill="${INK}">${esc(title)}</text>` +
        `<text x="${W / 2}" y="82" text-anchor="middle" font-family="${SANS}" font-size="8" letter-spacing="2" fill="${MUTED}">${esc(sub.toUpperCase())}</text>`
    : `<text x="40" y="34" font-family="${SANS}" font-size="8" letter-spacing="1.5" fill="${MUTED}">${esc(`${title} · ${sub}`.toUpperCase())}</text>`;
}

/** "Find your table": everyone A–Z with their table, in columns, as many pages as it takes. */
export function azPages(chart: Chart, paper: Paper): string[] {
  const [W, H] = PAPER[paper];
  const cols = paper === "A3" ? 4 : 3;
  const m = 40;
  const gap = 18;
  const colW = (W - m * 2 - gap * (cols - 1)) / cols;
  const line = 14.5;
  const topOf = (page: number) => (page === 0 ? 112 : 58);
  const rowsOf = (page: number) => Math.floor((H - 64 - topOf(page)) / line);
  const poured = pour(lettered(chart), (i) => rowsOf(Math.floor(i / cols)));
  const pages: string[] = [];
  const count = Math.max(1, Math.ceil(poured.length / cols));
  for (let p = 0; p < count; p++) {
    let body = header(W, "Find your table", chart.names || chart.title, p === 0);
    poured.slice(p * cols, p * cols + cols).forEach((col, c) => {
      const x = m + c * (colW + gap);
      col.forEach((it, r) => {
        const y = topOf(p) + r * line;
        if ("letter" in it) {
          body += `<text x="${x}" y="${y}" font-family="${SERIF}" font-size="11.5" font-weight="600" fill="${GOLD_INK}">${it.letter}${it.cont ? `<tspan font-family="${SANS}" font-size="7.5" font-weight="400" fill="${MUTED}"> cont.</tspan>` : ""}</text>`;
        } else {
          body += `<text x="${x}" y="${y}" font-family="${SANS}" font-size="9" fill="${INK}">${esc(fit(it.name, 9, colW - 26))}</text>`;
          body += `<text x="${x + colW}" y="${y}" text-anchor="end" font-family="${SERIF}" font-size="9" font-weight="600" fill="${INK}">${esc(it.table)}</text>`;
          body += `<line x1="${x}" x2="${x + colW}" y1="${y + 4}" y2="${y + 4}" stroke="#ddd6c6" stroke-width="0.5" stroke-dasharray="1 2"/>`;
        }
      });
    });
    pages.push(svgPage(W, H, body));
  }
  return pages;
}

/** Table by table, for the coordinator: cards in columns, new pages as needed. */
export function tablePages(chart: Chart, paper: Paper): string[] {
  const [W, H] = PAPER[paper];
  const cols = paper === "A3" ? 4 : 3;
  const m = 40;
  const gap = 12;
  const colW = (W - m * 2 - gap * (cols - 1)) / cols;
  const row = 12;
  const pages: string[] = [];
  let body = "";
  let heights: number[] = [];
  const start = (first: boolean) => {
    body = header(W, "Table lists", chart.names || chart.title, first);
    heights = Array(cols).fill(first ? 104 : 52);
  };
  start(true);
  for (const { t, people } of tableLists(chart)) {
    const h = 30 + Math.max(1, people.length) * row + 8;
    let c = heights.indexOf(Math.min(...heights));
    if (heights[c] + h > H - 64) {
      pages.push(svgPage(W, H, body));
      start(false);
      c = 0;
    }
    const x = m + c * (colW + gap);
    const y = heights[c];
    body += `<rect x="${x}" y="${y}" width="${colW}" height="${h}" rx="6" fill="#ffffff" stroke="#d8d2c4" stroke-width="0.7"/>`;
    body += `<text x="${x + 10}" y="${y + 19}" font-family="${SERIF}" font-size="12" font-weight="600" fill="${INK}">${esc(fit(tableName(t.label), 12, colW - 70))}</text>`;
    body += `<text x="${x + colW - 10}" y="${y + 19}" text-anchor="end" font-family="${SANS}" font-size="8" fill="${MUTED}">${people.length}/${t.seats}</text>`;
    if (!people.length) body += `<text x="${x + 10}" y="${y + 38}" font-family="${SANS}" font-size="8.5" fill="${MUTED}">Empty</text>`;
    people.forEach((g, k) => {
      const txt = `${k + 1}. ${g.name}${g.meal ? ` — ${g.meal}` : ""}`;
      body += `<text x="${x + 10}" y="${y + 38 + k * row}" font-family="${SANS}" font-size="8.5" fill="${INK}">${esc(fit(txt, 8.5, colW - 20))}</text>`;
    });
    heights[c] = y + h + gap;
  }
  pages.push(svgPage(W, H, body));
  return pages;
}

/** Meals and notes, counted the same whatever the spelling ("fish", "Fish "). */
function tally(people: Guest[]) {
  const m = new Map<string, { label: string; n: number }>();
  for (const g of people) {
    const v = g.meal?.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    const e = m.get(k) ?? { label: v, n: 0 };
    e.n++;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}

/** The caterer's sheet: how many at each table, how many are kids, and every meal and note. */
export function catererPages(chart: Chart, paper: Paper): string[] {
  const [W, H] = PAPER[paper];
  const m = 40;
  const seated = chart.guests.filter((g) => g.tableId);
  const kids = seated.filter((g) => g.tags?.includes("kid")).length;
  const meals = tally(seated);
  const care = (ps: Guest[]) => {
    const sen = ps.filter((g) => g.tags?.includes("senior")).length;
    const acc = ps.filter((g) => g.tags?.includes("access")).length;
    return [sen ? `${sen} senior${sen > 1 ? "s" : ""}` : "", acc ? `${acc} easy access` : ""].filter(Boolean).join(", ");
  };
  const cols = { table: m, guests: m + 150, kids: m + 205, meals: m + 250 };
  const pages: string[] = [];
  let body = "";
  let y = 0;
  const start = (first: boolean) => {
    body = header(W, "Caterer sheet", chart.names || chart.title, first);
    y = first ? 108 : 56;
    if (first) {
      body += `<text x="${m}" y="${y}" font-family="${SERIF}" font-size="15" font-weight="600" fill="${INK}">${seated.length} guests · ${seated.length - kids} adults · ${kids} kids</text>`;
      y += 16;
      if (meals.length) {
        body += `<text x="${m}" y="${y}" font-family="${SANS}" font-size="9" fill="${INK}">${esc(fit(meals.map((x) => `${x.label} ${x.n}`).join(" · "), 9, W - m * 2))}</text>`;
        y += 12;
      }
      y += 14;
    }
    body += `<text x="${cols.table}" y="${y}" font-family="${SANS}" font-size="7.5" font-weight="700" letter-spacing="1.2" fill="${MUTED}">TABLE</text>`;
    body += `<text x="${cols.guests + 30}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="7.5" font-weight="700" letter-spacing="1.2" fill="${MUTED}">GUESTS</text>`;
    body += `<text x="${cols.kids + 24}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="7.5" font-weight="700" letter-spacing="1.2" fill="${MUTED}">KIDS</text>`;
    body += `<text x="${cols.meals}" y="${y}" font-family="${SANS}" font-size="7.5" font-weight="700" letter-spacing="1.2" fill="${MUTED}">MEALS AND NOTES</text>`;
    y += 8;
    body += `<line x1="${m}" x2="${W - m}" y1="${y}" y2="${y}" stroke="${INK}" stroke-width="0.8"/>`;
    y += 14;
  };
  start(true);
  for (const { t, people } of tableLists(chart)) {
    if (!people.length) continue;
    const notes = [...tally(people).map((x) => `${x.label} ${x.n}`), care(people)].filter(Boolean).join(" · ") || "—";
    const words = notes.split(" · ");
    // Long notes wrap onto more lines rather than being cut.
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} · ${w}` : w;
      if (next.length * 9 * 0.5 > W - m - cols.meals && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    lines.push(cur);
    const h = Math.max(1, lines.length) * 12 + 8;
    if (y + h > H - 60) {
      pages.push(svgPage(W, H, body));
      start(false);
    }
    const k = people.filter((g) => g.tags?.includes("kid")).length;
    body += `<text x="${cols.table}" y="${y}" font-family="${SERIF}" font-size="11" font-weight="600" fill="${INK}">${esc(fit(tableName(t.label), 11, 140))}</text>`;
    body += `<text x="${cols.guests + 30}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="10" fill="${INK}">${people.length}</text>`;
    body += `<text x="${cols.kids + 24}" y="${y}" text-anchor="end" font-family="${SANS}" font-size="10" fill="${k ? INK : MUTED}">${k || "–"}</text>`;
    lines.forEach((l, i) => (body += `<text x="${cols.meals}" y="${y + i * 12}" font-family="${SANS}" font-size="9" fill="${INK}">${esc(l)}</text>`));
    y += h;
    body += `<line x1="${m}" x2="${W - m}" y1="${y - 10}" y2="${y - 10}" stroke="#e3ddcf" stroke-width="0.5"/>`;
    y += 4;
  }
  pages.push(svgPage(W, H, body));
  return pages;
}

// ---- cards ----------------------------------------------------------------------------
/** A QR code (from the qrcode package's SVG) placed at x, y, `size` wide. */
function placeQr(qrSvg: string, x: number, y: number, size: number) {
  return qrSvg.replace(/<\?xml[^>]*>/, "").replace(/<svg([^>]*)>/, (_, a: string) => `<svg${a.replace(/\s(width|height)="[^"]*"/g, "")} x="${x}" y="${y}" width="${size}" height="${size}">`);
}

/** Table numbers for the centre of each table: two to a page, cut along the dashed line. */
export function tableCardPages(chart: Chart, paper: Paper, qr?: string): string[] {
  const [W, H] = PAPER[paper];
  const half = H / 2;
  const pages: string[] = [];
  const tables = tableLists(chart).filter(({ t, people }) => people.length && t.shape !== "head" && t.shape !== "sweetheart");
  for (let i = 0; i < tables.length; i += 2) {
    let body = `<line x1="20" x2="${W - 20}" y1="${half}" y2="${half}" stroke="#cfc8b8" stroke-width="0.6" stroke-dasharray="4 4"/>`;
    tables.slice(i, i + 2).forEach(({ t }, k) => {
      const y0 = k * half;
      const label = t.label;
      const numeric = /^\d+[a-z]?$/i.test(label);
      const big = numeric ? Math.min(190, (W * 0.7) / Math.max(1, label.length * 0.62)) : Math.min(72, (W * 0.8) / Math.max(1, label.length * 0.55));
      const cy = y0 + half * (qr ? 0.42 : 0.5);
      body += `<rect x="36" y="${y0 + 36}" width="${W - 72}" height="${half - 72}" fill="none" stroke="${GOLD_INK}" stroke-width="1.2"/>`;
      if (chart.names) body += `<text x="${W / 2}" y="${y0 + 78}" text-anchor="middle" font-family="${SANS}" font-size="9" letter-spacing="3" fill="${MUTED}">${esc(chart.names.toUpperCase())}</text>`;
      if (numeric) body += `<text x="${W / 2}" y="${cy - big * 0.55}" text-anchor="middle" font-family="${SANS}" font-size="11" letter-spacing="5" fill="${GOLD_INK}">TABLE</text>`;
      body += `<text x="${W / 2}" y="${cy + big * 0.34}" text-anchor="middle" font-family="${SERIF}" font-size="${big}" font-weight="600" fill="${INK}">${esc(label)}</text>`;
      if (qr) {
        const size = 74;
        body += placeQr(qr, W / 2 - size / 2, y0 + half - 72 - size - 22, size);
        body += `<text x="${W / 2}" y="${y0 + half - 72 - 8}" text-anchor="middle" font-family="${SANS}" font-size="7.5" letter-spacing="1.5" fill="${MUTED}">SCAN TO FIND YOUR SEAT</text>`;
      }
    });
    pages.push(svgPage(W, H, body, false));
  }
  return pages;
}

/** Everyone seated, A–Z, the couple left out, kids and plus-ones included (they get a card). */
function everyoneAZ(chart: Chart) {
  const tables = new Map(chart.tables.map((t) => [t.id, t]));
  const skip = honorees(chart);
  return chart.guests
    .filter((g) => g.tableId && tables.has(g.tableId) && !(g.groupId && skip.has(g.groupId)))
    .map((g) => ({ g, t: tables.get(g.tableId!)!, key: sortKey(g.name) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Escort cards for the entrance table: name and table, ten to a page (2 × 5), cut marks. */
export function escortPages(chart: Chart, paper: Paper): string[] {
  const [W, H] = PAPER[paper];
  const cols = 2;
  const rows = 5;
  const m = 34;
  const cw = (W - m * 2) / cols;
  const ch = (H - m * 2) / rows;
  const people = everyoneAZ(chart);
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, people.length); i += cols * rows) {
    let body = "";
    // Cut lines between the cards.
    for (let c = 0; c <= cols; c++) body += `<line x1="${m + c * cw}" x2="${m + c * cw}" y1="${m - 14}" y2="${H - m + 14}" stroke="#e3ddcf" stroke-width="0.5"/>`;
    for (let r = 0; r <= rows; r++) body += `<line x1="${m - 14}" x2="${W - m + 14}" y1="${m + r * ch}" y2="${m + r * ch}" stroke="#e3ddcf" stroke-width="0.5"/>`;
    people.slice(i, i + cols * rows).forEach(({ g, t }, k) => {
      const x = m + (k % cols) * cw + cw / 2;
      const y = m + Math.floor(k / cols) * ch;
      const size = Math.min(17, (cw * 0.8) / Math.max(1, g.name.length * 0.58));
      body += `<text x="${x}" y="${y + ch * 0.48}" text-anchor="middle" font-family="${SERIF}" font-size="${size}" font-weight="600" fill="${INK}">${esc(g.name)}</text>`;
      body += `<text x="${x}" y="${y + ch * 0.48 + 22}" text-anchor="middle" font-family="${SANS}" font-size="8.5" letter-spacing="2.5" fill="${GOLD_INK}">${esc(tableName(t.label).toUpperCase())}</text>`;
    });
    pages.push(svgPage(W, H, body, false));
  }
  return pages;
}

/** Place cards that fold into a tent: name on both faces, six to a page, in table order so
 *  they can be set out table by table. */
export function placeCardPages(chart: Chart, paper: Paper): string[] {
  const [W, H] = PAPER[paper];
  const cols = 2;
  const rows = 3;
  const m = 34;
  const cw = (W - m * 2) / cols;
  const ch = (H - m * 2) / rows;
  const tables = new Map(chart.tables.map((t) => [t.id, t]));
  const order = new Map(tableLists(chart).map((x, i) => [x.t.id, i]));
  const people = everyoneAZ(chart).sort((a, b) => (order.get(a.t.id) ?? 0) - (order.get(b.t.id) ?? 0) || (a.g.seat ?? 0) - (b.g.seat ?? 0));
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, people.length); i += cols * rows) {
    let body = "";
    for (let c = 0; c <= cols; c++) body += `<line x1="${m + c * cw}" x2="${m + c * cw}" y1="${m - 14}" y2="${H - m + 14}" stroke="#e3ddcf" stroke-width="0.5"/>`;
    for (let r = 0; r <= rows; r++) body += `<line x1="${m - 14}" x2="${W - m + 14}" y1="${m + r * ch}" y2="${m + r * ch}" stroke="#e3ddcf" stroke-width="0.5"/>`;
    people.slice(i, i + cols * rows).forEach(({ g }, k) => {
      const x = m + (k % cols) * cw;
      const y = m + Math.floor(k / cols) * ch;
      const t = tables.get(g.tableId!)!;
      const size = Math.min(20, (cw * 0.8) / Math.max(1, g.name.length * 0.58));
      // The fold, across the middle; the top face is upside down so both read once folded.
      body += `<line x1="${x + 10}" x2="${x + cw - 10}" y1="${y + ch / 2}" y2="${y + ch / 2}" stroke="#cfc8b8" stroke-width="0.6" stroke-dasharray="3 3"/>`;
      body += `<g transform="rotate(180 ${x + cw / 2} ${y + ch / 4})"><text x="${x + cw / 2}" y="${y + ch / 4 + size * 0.35}" text-anchor="middle" font-family="${SERIF}" font-size="${size}" font-weight="600" fill="${INK}">${esc(g.name)}</text></g>`;
      body += `<text x="${x + cw / 2}" y="${y + (ch * 3) / 4 + size * 0.2}" text-anchor="middle" font-family="${SERIF}" font-size="${size}" font-weight="600" fill="${INK}">${esc(g.name)}</text>`;
      body += `<text x="${x + cw / 2}" y="${y + (ch * 3) / 4 + size * 0.2 + 18}" text-anchor="middle" font-family="${SANS}" font-size="7.5" letter-spacing="2" fill="${GOLD_INK}">${esc(tableName(t.label).toUpperCase())}</text>`;
    });
    pages.push(svgPage(W, H, body, false));
  }
  return pages;
}

export type PdfPart = "plan" | "az" | "tables" | "caterer";

/** The PDF: floor plan, A–Z list, table lists and the caterer sheet, on the paper chosen. */
export async function downloadPdf(chart: Chart, parts: Record<PdfPart, boolean>, paper: Paper) {
  const pages: Page[] = [];
  if (parts.plan) {
    const [a, b] = PAPER[paper];
    const bounds = contentBounds(chart);
    const land = bounds.w >= bounds.h;
    const [w, h] = land ? [b, a] : [a, b];
    const svg = await withLogo(planSvg(chart, { title: true, credit: true, pageW: w - 48 }));
    const img = await svgImage(svg);
    pages.push({ w, h, draw: (ctx) => drawFit(ctx, img, 24, 24, w - 48, h - 48) });
  }
  const svgs = [...(parts.az ? azPages(chart, paper) : []), ...(parts.tables ? tablePages(chart, paper) : []), ...(parts.caterer ? catererPages(chart, paper) : [])];
  await addPages(pages, svgs, paper);
  await savePdf(pages, `${slug(chart.title)}.pdf`);
}

async function addPages(pages: Page[], svgs: string[], paper: Paper) {
  for (const raw of svgs) {
    const img = await svgImage(await withLogo(raw));
    const [w, h] = PAPER[paper];
    pages.push({ w, h, draw: (ctx) => ctx.drawImage(img, 0, 0, w, h) });
  }
}

export type CardKind = "numbers" | "escort" | "place";

/** Cards for the venue, as a PDF on the paper chosen. */
export async function downloadCards(chart: Chart, kind: CardKind, paper: Paper, qr?: string) {
  const svgs = kind === "numbers" ? tableCardPages(chart, paper, qr) : kind === "escort" ? escortPages(chart, paper) : placeCardPages(chart, paper);
  const pages: Page[] = [];
  await addPages(pages, svgs, paper);
  const name = { numbers: "table-numbers", escort: "escort-cards", place: "place-cards" }[kind];
  await savePdf(pages, `${slug(chart.title)}-${name}.pdf`, 220);
}

/** The entrance board as a PDF of the chosen size, ready for a print shop. */
export async function downloadBoardPdf(chart: Chart, size: BoardSize = "A3") {
  const img = await svgImage(await withLogo(boardSvg(chart, size)));
  const [mw, mh] = BOARD_MM[size];
  const w = (mw * 72) / 25.4;
  const h = (mh * 72) / 25.4;
  await savePdf([{ w, h, draw: (ctx) => ctx.drawImage(img, 0, 0, w, h) }], `${slug(chart.title)}-find-your-table-${size.toLowerCase()}.pdf`, 220);
}


/** The welcome team's card: the day-of check-in link as a big QR code, for the team only. */
export async function downloadTeamCard(chart: Chart, url: string, qr: string, hasPin: boolean) {
  const [W, H] = PAPER.A4;
  let body = `<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="18" fill="none" stroke="${GOLD_INK}" stroke-width="1.5"/>`;
  body += `<text x="${W / 2}" y="118" text-anchor="middle" font-family="${SANS}" font-size="10" letter-spacing="3" fill="${GOLD_INK}">WELCOME TEAM ONLY · DON’T SHARE WITH GUESTS</text>`;
  body += `<text x="${W / 2}" y="170" text-anchor="middle" font-family="${SERIF}" font-size="34" font-weight="600" fill="${INK}">Day-of check-in</text>`;
  body += `<text x="${W / 2}" y="200" text-anchor="middle" font-family="${SANS}" font-size="12" letter-spacing="2" fill="${MUTED}">${esc((chart.names || chart.title).toUpperCase())}</text>`;
  const size = 300;
  body += placeQr(qr, W / 2 - size / 2, 240, size);
  const lines = ["Scan with your phone’s camera, then type your name.", hasPin ? "You’ll need the 4-digit PIN from the couple." : "", "Search a guest, check in their household, and point them to their table.", "It works with a weak signal: check-ins send when it can."].filter(Boolean);
  lines.forEach((l, i) => (body += `<text x="${W / 2}" y="${590 + i * 22}" text-anchor="middle" font-family="${SANS}" font-size="12" fill="${INK}">${esc(l)}</text>`));
  body += `<text x="${W / 2}" y="${H - 80}" text-anchor="middle" font-family="${SANS}" font-size="8.5" fill="${MUTED}">${esc(url)}</text>`;
  const pages: Page[] = [];
  await addPages(pages, [svgPage(W, H, body)], "A4");
  await savePdf(pages, `${slug(chart.title)}-team-check-in.pdf`, 220);
}
