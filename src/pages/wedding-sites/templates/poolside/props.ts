// Poolside's props, drawn top-down as SVG: palm fronds, loungers with striped towels,
// umbrellas, rings, beach balls, an air mattress, a ladder, flip-flops, a potted plant, a side
// table with drinks. Each takes a prefix so two on one page don't share gradient ids.

const PAL: Record<string, [string, string]> = {
  coral: ["#ff7a6b", "#fff4ec"], sun: ["#ffc54d", "#fff7e6"], mint: ["#3cc7a6", "#effcf7"],
  pink: ["#ff6fa8", "#fff1f6"], sky: ["#4fb3ff", "#f1f8ff"], orange: ["#ff8a3d", "#ffffff"],
};

function frond(uid: string, len = 520, bend = 0.28, leaflets = 22) {
  // a midrib curving away, with leaflets either side, longest in the middle
  const P = (t: number): [number, number] => {
    const x = t * len, y = Math.sin(t * Math.PI * 0.9) * len * bend * t;
    return [x, y];
  };
  let leaves = "";
  for (let i = 2; i < leaflets; i++) {
    const t = i / leaflets;
    const [x, y] = P(t), [x2, y2] = P(t + 0.01);
    const ang = Math.atan2(y2 - y, x2 - x);
    const L = len * 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.85 + 0.15 * Math.sin(i * 1.7));
    for (const side of [-1, 1]) {
      const a = ang + side * (0.95 - t * 0.35);
      const tx = x + Math.cos(a) * L, ty = y + Math.sin(a) * L;
      const mx = x + Math.cos(a + side * 0.18) * L * 0.55, my = y + Math.sin(a + side * 0.18) * L * 0.55;
      const w = 9 + 7 * (1 - t);
      const nx = Math.cos(a + Math.PI / 2) * w, ny = Math.sin(a + Math.PI / 2) * w;
      leaves += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${(mx + nx).toFixed(1)} ${(my + ny).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} Q${(mx - nx * 0.4).toFixed(1)} ${(my - ny * 0.4).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}Z" fill="url(#${uid}-lf)" opacity="${(0.92 + 0.08 * Math.sin(i)).toFixed(2)}"/>`;
    }
  }
  const rib = Array.from({ length: 21 }, (_, i) => P(i / 20).map((v) => v.toFixed(1)).join(" ")).join(" L");
  const W = len * 1.0, H = len * 0.9;
  return `<svg viewBox="${-len * 0.1} ${-H * 0.5} ${W * 1.05} ${H}" overflow="visible"><defs><linearGradient id="${uid}-lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2fae63"/><stop offset=".6" stop-color="#1e8f4f"/><stop offset="1" stop-color="#16733f"/></linearGradient></defs>${leaves}<path d="M${rib}" fill="none" stroke="#7fd08f" stroke-width="5" stroke-linecap="round"/></svg>`;
}

function lounger(uid: string, c?: string) {
  const [a] = PAL[c] || PAL.coral;
  let slats = "";
  for (let y = 70; y < 236; y += 13) slats += `<rect x="10" y="${y}" width="80" height="9" rx="2" fill="url(#${uid}-wd)"/>`;
  let stripes = "";
  for (let x = 14; x < 86; x += 12) stripes += `<rect x="${x}" y="108" width="6" height="92" fill="${a}"/>`;
  return `<svg viewBox="0 0 100 250"><defs><linearGradient id="${uid}-wd" x1="0" x2="1"><stop offset="0" stop-color="#e9b98d"/><stop offset=".5" stop-color="#f7d3ac"/><stop offset="1" stop-color="#e4ae80"/></linearGradient></defs>
    <rect x="4" y="4" width="92" height="242" rx="12" fill="#d99a6c"/>
    <rect x="8" y="8" width="84" height="58" rx="10" fill="#f4e7da"/><rect x="8" y="8" width="84" height="58" rx="10" fill="none" stroke="#e7d3c1" stroke-width="2"/>
    ${slats}
    <rect x="9" y="104" width="82" height="100" rx="6" fill="#fffaf4"/>${stripes}
    <rect x="9" y="104" width="82" height="100" rx="6" fill="none" stroke="rgba(0,0,0,.06)"/>
    <path d="M9 196 q41 10 82 0 v8 h-82z" fill="rgba(0,0,0,.08)"/></svg>`;
}

function umbrella(uid: string, c?: string) {
  const [a, b] = PAL[c] || PAL.coral;
  let panels = "";
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2, a2 = ((i + 1) / 8) * Math.PI * 2;
    const p = (ang: number) => `${(100 + Math.cos(ang) * 96).toFixed(1)} ${(100 + Math.sin(ang) * 96).toFixed(1)}`;
    panels += `<path d="M100 100 L${p(a1)} L${p(a2)}Z" fill="${i % 2 ? b : a}"/>`;
  }
  return `<svg viewBox="0 0 200 200"><defs><radialGradient id="${uid}-sh" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient></defs>
    ${panels}<circle cx="100" cy="100" r="96" fill="url(#${uid}-sh)"/><circle cx="100" cy="100" r="9" fill="#fff"/><circle cx="100" cy="100" r="4" fill="#e7dccd"/></svg>`;
}

function ring(uid: string, c?: string) {
  const [a, b] = PAL[c] || PAL.orange;
  let seg = "";
  for (let i = 0; i < 8; i++) {
    const a1 = (i / 8) * Math.PI * 2, a2 = ((i + 1) / 8) * Math.PI * 2;
    const pt = (r: number, ang: number) => `${(60 + Math.cos(ang) * r).toFixed(2)} ${(60 + Math.sin(ang) * r).toFixed(2)}`;
    seg += `<path d="M${pt(56, a1)} A56 56 0 0 1 ${pt(56, a2)} L${pt(28, a2)} A28 28 0 0 0 ${pt(28, a1)}Z" fill="${i % 2 ? b : a}"/>`;
  }
  return `<svg viewBox="0 0 120 120"><defs><radialGradient id="${uid}-tor" cx=".5" cy=".5" r=".5"><stop offset=".5" stop-color="#000" stop-opacity=".2"/><stop offset=".62" stop-color="#fff" stop-opacity=".25"/><stop offset=".78" stop-color="#fff" stop-opacity="0"/><stop offset=".97" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>
    ${seg}<circle cx="60" cy="60" r="56" fill="url(#${uid}-tor)"/><path d="M28 34 A40 40 0 0 1 64 18" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/></svg>`;
}

function ball(uid: string) {
  const cols = ["#ff5f6d", "#ffffff", "#ffc54d", "#ffffff", "#3cc7a6", "#ffffff"];
  let s = "";
  for (let i = 0; i < 6; i++) {
    const a1 = (i / 6) * Math.PI * 2 - 0.4, a2 = ((i + 1) / 6) * Math.PI * 2 - 0.4;
    s += `<path d="M50 50 L${(50 + Math.cos(a1) * 48).toFixed(1)} ${(50 + Math.sin(a1) * 48).toFixed(1)} A48 48 0 0 1 ${(50 + Math.cos(a2) * 48).toFixed(1)} ${(50 + Math.sin(a2) * 48).toFixed(1)}Z" fill="${cols[i]}"/>`;
  }
  return `<svg viewBox="0 0 100 100"><defs><radialGradient id="${uid}-b" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>${s}<circle cx="50" cy="50" r="48" fill="url(#${uid}-b)"/><circle cx="50" cy="50" r="7" fill="#fff"/></svg>`;
}

function mattress(uid: string, c?: string) {
  const [a] = PAL[c] || PAL.pink;
  let ridges = "";
  for (let x = 22; x < 98; x += 15) ridges += `<rect x="${x}" y="70" width="9" height="200" rx="4.5" fill="#fff" opacity=".22"/>`;
  return `<svg viewBox="0 0 120 290"><defs><linearGradient id="${uid}-m" x1="0" x2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${a}" stop-opacity=".82"/><stop offset="1" stop-color="${a}"/></linearGradient></defs>
    <rect x="6" y="6" width="108" height="278" rx="26" fill="url(#${uid}-m)"/>
    <rect x="14" y="14" width="92" height="46" rx="20" fill="#fff" opacity=".35"/>${ridges}
    <rect x="6" y="6" width="108" height="278" rx="26" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/>
    <path d="M22 26 Q60 12 98 26" stroke="#fff" stroke-opacity=".7" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
}

function ladder(uid: string) {
  return `<svg viewBox="0 0 90 150"><defs><linearGradient id="${uid}-cr" x1="0" x2="1"><stop offset="0" stop-color="#b8c4cc"/><stop offset=".4" stop-color="#ffffff"/><stop offset="1" stop-color="#9eabb5"/></linearGradient></defs>
    <path d="M14 0 v120 q0 22 14 22" fill="none" stroke="url(#${uid}-cr)" stroke-width="9" stroke-linecap="round"/>
    <path d="M76 0 v120 q0 22 -14 22" fill="none" stroke="url(#${uid}-cr)" stroke-width="9" stroke-linecap="round"/>
    ${[46, 82, 116].map((y) => `<rect x="14" y="${y}" width="62" height="9" rx="4.5" fill="#e9eef1" opacity=".85"/>`).join("")}</svg>`;
}

function flops(uid: string, c?: string) {
  const [a] = PAL[c] || PAL.mint;
  const one = (x: number, r: number) => `<g transform="translate(${x} 0) rotate(${r} 22 50)"><path d="M22 4 C40 4 42 30 40 52 C38 78 34 96 22 96 C10 96 6 78 4 52 C2 30 4 4 22 4Z" fill="${a}"/><path d="M8 40 Q22 22 36 40" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="22" cy="24" r="3.5" fill="#fff"/></g>`;
  return `<svg viewBox="0 0 100 100">${one(4, -8)}${one(50, 10)}</svg>`;
}

function plant(uid: string) {
  let leaves = "";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * 360;
    leaves += `<path d="M60 60 Q${60 + 14} ${60 - 30} 60 ${60 - 56} Q${60 - 14} ${60 - 30} 60 60Z" fill="${i % 2 ? "#2fae63" : "#249a55"}" transform="rotate(${a} 60 60)"/>`;
  }
  return `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="34" fill="#e2875f"/><circle cx="60" cy="60" r="28" fill="#6b4a36"/>${leaves}<circle cx="60" cy="60" r="8" fill="#3ec774"/></svg>`;
}

function table(uid: string) {
  return `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#fffaf4"/><circle cx="60" cy="60" r="56" fill="none" stroke="#efe2d3" stroke-width="3"/>
    <circle cx="46" cy="52" r="17" fill="#fff" stroke="#e8edf0" stroke-width="3"/><circle cx="46" cy="52" r="12" fill="#ff9a4d"/><circle cx="41" cy="47" r="4" fill="#fff" opacity=".6"/>
    <circle cx="78" cy="74" r="14" fill="#fff" stroke="#e8edf0" stroke-width="3"/><circle cx="78" cy="74" r="9.5" fill="#ff6f8a"/><path d="M84 60 l14 -16" stroke="#3cc7a6" stroke-width="3" stroke-linecap="round"/></svg>`;
}


export type PropKind = "frond" | "lounger" | "umbrella" | "ring" | "ball" | "mattress" | "ladder" | "flops" | "plant" | "table";

const MAKE: Record<PropKind, (uid: string, c?: string) => string> = {
  frond: (uid) => frond(uid),
  lounger,
  umbrella,
  ring,
  ball: (uid) => ball(uid),
  mattress,
  ladder: (uid) => ladder(uid),
  flops,
  plant: (uid) => plant(uid),
  table: (uid) => table(uid),
};

export const propSvg = (kind: PropKind, uid: string, c?: string) => MAKE[kind](uid, c);
