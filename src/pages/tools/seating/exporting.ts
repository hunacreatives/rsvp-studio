import { CHAIR, contentBounds, dims, initials, isHonorific, isRound, seatOffsets, tablePath, topRadius, type Chart, type Guest } from "./model";
import { downloadCsv } from "@/lib/csv";

// Downloads: a print-ready floor plan (SVG → PNG, or the print dialog for PDF), an A–Z
// "find your table" list, table-by-table lists, and a spreadsheet. Printed pages use the
// paper look whatever the editor looks like, and carry a small credit line.

const INK = "#000727";
const MUTED = "#8a8478";
const GOLD = "#b8913a";
const LINE = "#cfc8b8";
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

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const tableName = (label: string) => (/^\d+$/.test(label) ? `Table ${label}` : label);

/** The floor plan as a standalone SVG (inline styles, system fonts so it renders anywhere). */
export function planSvg(chart: Chart, opts: { title?: boolean; credit?: boolean; initials?: boolean } = {}) {
  const b = contentBounds(chart);
  const pad = 80;
  const head = opts.title ? 170 : 0;
  const foot = opts.credit ? 70 : 0;
  const W = b.w + pad * 2;
  const H = b.h + pad * 2 + head + foot;
  const ox = pad - b.x;
  const oy = pad - b.y + head;
  const cat = new Map(chart.groups.map((g) => [g.id, g.cat]));
  const seatedAt = new Map<string, Guest[]>();
  for (const g of chart.guests) if (g.tableId) seatedAt.set(g.tableId, [...(seatedAt.get(g.tableId) ?? []), g]);
  const sans = "Helvetica, Arial, sans-serif";
  const serif = "Georgia, 'Times New Roman', serif";
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>`;
  if (opts.title) {
    s += `<text x="${W / 2}" y="${pad + 50}" text-anchor="middle" font-family="${serif}" font-size="72" font-weight="600" fill="${INK}">${esc(chart.title)}</text>`;
    s += `<text x="${W / 2}" y="${pad + 108}" text-anchor="middle" font-family="${sans}" font-size="22" letter-spacing="5" fill="${MUTED}">SEATING PLAN · ${chart.guests.filter((g) => g.tableId).length} GUESTS · ${chart.tables.length} TABLES</text>`;
  }
  s += `<g transform="translate(${ox} ${oy})">`;
  s += `<rect x="0" y="0" width="${chart.room.w}" height="${chart.room.h}" rx="8" fill="#fffef9" stroke="${INK}" stroke-width="4"/>`;
  for (const o of chart.objects) {
    const tall = o.h > o.w * 1.6;
    s += `<g transform="translate(${o.x} ${o.y}) rotate(${o.rot})">`;
    s += o.type === "cake" ? `<circle r="${Math.min(o.w, o.h) / 2}" fill="#f4f1e9" stroke="${LINE}" stroke-width="2"/>` : `<rect x="${-o.w / 2}" y="${-o.h / 2}" width="${o.w}" height="${o.h}" rx="10" fill="#f4f1e9" stroke="${LINE}" stroke-width="2"/>`;
    s += `<text transform="rotate(${tall ? -90 - o.rot : -o.rot})" y="${o.type === "cake" ? Math.min(o.w, o.h) / 2 + 24 : 8}" text-anchor="middle" font-family="${sans}" font-size="${o.type === "cake" ? 16 : 22}" font-weight="600" letter-spacing="3" fill="${MUTED}">${esc(o.label.toUpperCase())}</text></g>`;
  }
  for (const t of chart.tables) {
    const seated = seatedAt.get(t.id) ?? [];
    const bySeat = new Map(seated.map((g) => [g.seat, g]));
    s += `<g transform="translate(${t.x} ${t.y}) rotate(${t.rot})">`;
    if (isRound(t)) s += `<circle r="${topRadius(t)}" fill="#ffffff" stroke="${INK}" stroke-width="5"/>`;
    else s += `<path d="${tablePath(t)}" fill="#ffffff" stroke="${INK}" stroke-width="5"/>`;
    seatOffsets(t).forEach(([dx, dy], i) => {
      const g = bySeat.get(i);
      const fill = g ? (CAT_FILL[(g.groupId && cat.get(g.groupId)) || "other"] ?? CAT_FILL.other) : "#ffffff";
      s += `<g transform="translate(${dx} ${dy})"><circle r="${CHAIR}" fill="${fill}" stroke="${g ? "none" : LINE}" stroke-width="2.4"/>`;
      if (g && opts.initials !== false) s += `<text transform="rotate(${-t.rot})" y="5.5" text-anchor="middle" font-family="${sans}" font-size="15" font-weight="700" fill="${INK}">${esc(initials(g.name))}</text>`;
      s += `</g>`;
    });
    const long = t.label.length > 3 || t.shape === "cocktail" || t.shape === "sweetheart";
    const { h: th } = isRound(t) ? { h: 0 } : dims(t);
    const ly = t.shape === "ushape" ? th / 2 - 38 : t.shape === "lshape" ? -th / 2 + 38 : 0;
    const lx = t.shape === "lshape" ? 38 : 0;
    s += `<g transform="translate(${lx} ${ly}) rotate(${-t.rot})"><text y="${t.note && t.shape === "round" ? 6 : 12}" text-anchor="middle" font-family="${serif}" font-size="${t.shape === "cocktail" ? 22 : long ? 30 : 46}" font-weight="600" fill="${INK}">${esc(t.label)}</text>`;
    if (t.note && t.shape === "round") s += `<text y="38" text-anchor="middle" font-family="${sans}" font-size="14" font-weight="600" letter-spacing="2" fill="${MUTED}">${esc((t.note.length > 16 ? t.note.split(" ")[0] : t.note).toUpperCase())}</text>`;
    s += `</g></g>`;
  }
  s += `</g>`;
  if (opts.credit) s += `<text x="${W / 2}" y="${H - 34}" text-anchor="middle" font-family="${sans}" font-size="18" letter-spacing="2" fill="${GOLD}">Made with Mesa by The RSVP Studio · thersvpstudio.com</text>`;
  return s + `</svg>`;
}

export async function downloadPng(chart: Chart, credit = true) {
  await svgToPng(planSvg(chart, { title: true, credit }), `${slug(chart.title)}.png`);
}

export async function downloadBoardPng(chart: Chart) {
  await svgToPng(boardSvg(chart), `${slug(chart.title)}-find-your-table.png`, 1);
}

async function svgToPng(svg: string, fileName: string, maxScale = 2.4) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
  const w = Number(vb[1]);
  const h = Number(vb[2]);
  // Up to 4096 px wide: sharp when printed, still small enough for phones to share.
  const scale = Math.min(4096 / w, 4096 / h, maxScale);
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

export const slug = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "seating-plan";

/** Surname for sorting: the last word that isn't a title or a household number. */
export function surname(name: string) {
  const w = name.replace(/·.*$/, "").split(/\s+/).filter((x) => x && !isHonorific(x));
  return (w.length > 1 ? w[w.length - 1] : (w[0] ?? name)).toLowerCase();
}

/** The entrance list. Kids and plus-ones are found under the person they came with, and
 *  "Reyes family · 1…5" is one line. */
export function azList(chart: Chart) {
  const tables = new Map(chart.tables.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const out: { name: string; table: string; key: string }[] = [];
  for (const g of chart.guests) {
    if (!g.tableId || !tables.has(g.tableId) || g.tags?.includes("kid") || g.tags?.includes("plusone")) continue;
    const name = g.name.replace(/\s*·\s*\d+$/, "");
    const table = tableName(tables.get(g.tableId)!.label);
    const k = `${name}|${table}`;
    if (seen.has(k)) continue;
    seen.add(k);
    // Sorted by surname, then first name, ignoring titles (Ninong Jun Cruz under "Cruz, Jun").
    const first = name.split(/\s+/).filter((w) => !isHonorific(w)).join(" ").toLowerCase();
    out.push({ name, table, key: `${surname(name)} ${first}` });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
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

/** The entrance board: "Find your table", everyone A–Z by surname with their table, on one
 *  A3 page (portrait, 297 × 420). Columns and type size adjust to the guest count. */
export function boardSvg(chart: Chart) {
  const W = 2970;
  const H = 4200;
  const rows = azList(chart);
  const serif = "Georgia, 'Times New Roman', serif";
  const sans = "Helvetica, Arial, sans-serif";
  const names = chart.names || chart.title;
  const mono = (chart.names ?? "")
    .split(/\s*(?:&|\band\b)\s*/i)
    .map((n) => n.trim()[0])
    .filter(Boolean)
    .join(" & ");
  // Entries plus a letter heading each time the first letter changes.
  type Item = { kind: "letter"; text: string } | { kind: "row"; name: string; table: string };
  const items: Item[] = [];
  let letter = "";
  for (const r of rows) {
    const l = r.key.charAt(0).toUpperCase();
    if (l !== letter) items.push({ kind: "letter", text: l });
    letter = l;
    items.push({ kind: "row", name: r.name, table: r.table });
  }
  const top = mono ? 900 : 760;
  const bottom = 260;
  const side = 220;
  const gap = 110;
  let cols = 2;
  let line = 0;
  for (cols = 2; cols <= 6; cols++) {
    line = (H - top - bottom) / Math.ceil(items.length / cols);
    if (line >= 64 || cols === 6) break;
  }
  line = Math.min(line, 96);
  const font = Math.max(26, Math.round(line * 0.58));
  const colW = (W - side * 2 - gap * (cols - 1)) / cols;
  const maxChars = Math.floor((colW * 0.72) / (font * 0.52));
  const perCol = Math.ceil(items.length / cols);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  s += `<rect width="${W}" height="${H}" fill="#fffef9"/>`;
  s += `<rect x="70" y="70" width="${W - 140}" height="${H - 140}" fill="none" stroke="#b8913a" stroke-width="4"/>`;
  s += `<rect x="96" y="96" width="${W - 192}" height="${H - 192}" fill="none" stroke="#b8913a" stroke-width="1.5"/>`;
  let y = 330;
  if (mono) {
    s += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="120" fill="#b8913a" letter-spacing="10">${esc(mono)}</text>`;
    y += 170;
  }
  s += `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${serif}" font-size="150" font-weight="600" fill="#000727">Find your table</text>`;
  s += `<text x="${W / 2}" y="${y + 110}" text-anchor="middle" font-family="${sans}" font-size="44" letter-spacing="14" fill="#6b6b7c">${esc(names.toUpperCase())}</text>`;
  items.forEach((it, i) => {
    const c = Math.floor(i / perCol);
    const r = i % perCol;
    const x = side + c * (colW + gap);
    const yy = top + r * line + line * 0.7;
    if (it.kind === "letter") {
      s += `<text x="${x}" y="${yy}" font-family="${serif}" font-size="${Math.round(font * 1.25)}" font-weight="600" fill="#b8913a">${esc(it.text)}</text>`;
    } else {
      const nm = it.name.length > maxChars ? it.name.slice(0, maxChars - 1) + "…" : it.name;
      s += `<text x="${x}" y="${yy}" font-family="${sans}" font-size="${font}" fill="#000727">${esc(nm)}</text>`;
      s += `<text x="${x + colW}" y="${yy}" text-anchor="end" font-family="${serif}" font-size="${font}" font-weight="600" fill="#000727">${esc(it.table.replace(/^Table /, ""))}</text>`;
    }
  });
  s += `<text x="${W / 2}" y="${H - 150}" text-anchor="middle" font-family="${sans}" font-size="30" letter-spacing="4" fill="#b8913a">Made with Mesa by The RSVP Studio · thersvpstudio.com</text>`;
  return s + `</svg>`;
}
