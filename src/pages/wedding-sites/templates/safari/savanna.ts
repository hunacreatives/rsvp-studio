import { useEffect, type RefObject } from "react";
import * as A from "./art";
import { centredSpans, createStopSnap } from "../shared/stopSnap";

/**
 * Safari's diorama and the drive, built into the stage (a sticky frame inside the page):
 *  - The land: paper layers, far to near, each one tile of a hill line that loops, baked once
 *    into a canvas (paper grain multiplied in, a soft paper shadow round it) and slid at its own
 *    speed as the jeep drives (it drives left, so the land slides right, near layers faster).
 *  - The puppets: one or two at each stop (the hero is 0, the reply the last), on the plain.
 *  - The jeep on the track, its wheels rolling with the ground, bouncing while it moves.
 *  - The drive: each stop is a section ([data-sf-stop]). Every speech bubble ([data-sf-say])
 *    pauses in the same place, its dock near the top of the scene (sticky for the length of its
 *    hold); the jeep holds still while a bubble is docked and drives in the gap between bubbles,
 *    taking at least TRIP seconds whatever the scroll.
 *  - Each bubble sits over its animal, its tail stretched down to it.
 * `animate` false (builder, gallery card, reduced motion): no easing, the drive follows the
 * scroll exactly, the clouds stay put.
 */

export type Who = "giraffe" | "zebra" | "elephants" | "lion";
export type Cast = { who: Who; at: number }[];

const LAYERS = [
  { top: 0.47, k: 0.035, fill: A.C.mount, edge: A.C.mountDark, mountain: true },
  { top: 0.555, k: 0.07, fill: A.C.far, edge: "#8ea069", amp: 0.035, waves: [2, 3], trees: 5, treeH: 0.05 },
  { top: 0.6, k: 0.14, fill: A.C.mid, edge: "#a9963f", amp: 0.03, waves: [3, 5], trees: 3, treeH: 0.09 },
  { top: 0.66, k: 0.3, fill: A.C.plain, edge: "#c49e45", amp: 0.012, waves: [4, 7], ground: true },
  { top: 0.8, k: 0.55, fill: A.C.front, edge: "#b88633", amp: 0.008, waves: [5, 9], track: true },
  { top: 0.9, k: 0.9, fill: A.C.tuft, edge: A.C.tuftDark, amp: 0, tufts: true },
] as const;
type Layer = (typeof LAYERS)[number];
const PLAIN = LAYERS[3], TRACK = LAYERS[4];
const DRIVE = 1.6; // how far the jeep drives per unit, in frame heights
const D = 4.2; // the drive between two stops
const TRIP = 1.8; // a drive from one stop to the next takes at least this long (seconds)

// where each puppet stands (fraction across the frame) and how tall (fraction of its height);
// m: on a phone. The elephants are a mother and her calf.
const PLACE: Record<Who, { x: number; h: number; mx: number; mh: number }[]> = {
  giraffe: [{ x: 0.64, h: 0.5, mx: 0.7, mh: 0.29 }],
  zebra: [{ x: 0.38, h: 0.27, mx: 0.4, mh: 0.23 }],
  elephants: [{ x: 0.34, h: 0.31, mx: 0.34, mh: 0.24 }, { x: 0.52, h: 0.17, mx: 0.64, mh: 0.14 }],
  lion: [{ x: 0.38, h: 0.25, mx: 0.4, mh: 0.22 }],
};
// the giraffe at the reply stands beside the card (on a phone the card fills the frame: none)
const AT_REPLY = { x: 0.62, h: 0.5, mx: 0, mh: 0 };

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// one layer's tile as SVG markup (no filters: grain and shadow are added on the canvas)
function tileSvg(L: Layer, li: number, T: number, h: number, H: number, pad: number) {
  const pts: [number, number][] = [];
  const ph = [rnd() * 6.28, rnd() * 6.28];
  for (let x = 0; x <= T; x += 6) {
    let y = 0;
    if ("waves" in L) y = Math.sin((x / T) * 6.283 * L.waves[0] + ph[0]) * 0.6 + Math.sin((x / T) * 6.283 * L.waves[1] + ph[1]) * 0.4;
    y = ("amp" in L ? L.amp : 0) * H * (1 + y) * 0.5 + Math.sin(x * 0.35) * 0.6;
    if ("tufts" in L) {
      // a grass edge: blades of different heights, cut with scissors
      const n = Math.floor(x / 14), f = (x % 14) / 14, hgt = 10 + ((n * 7919) % 11) * 2.2;
      y = 30 - hgt * (1 - Math.abs(f * 2 - 1));
    }
    pts.push([x, y]);
  }
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  let extra = "";
  if ("trees" in L) {
    for (let i = 0; i < L.trees; i++) {
      const tx = ((i + 0.3 + rnd() * 0.5) / L.trees) * T, th = L.treeH * H * (0.8 + rnd() * 0.5), tw = th * 1.1;
      const ty = pts[Math.min(pts.length - 1, Math.round(tx / 6))][1];
      extra += `<svg x="${tx - tw / 2}" y="${ty - th + 3}" width="${tw}" height="${th}" viewBox="0 0 220 200" overflow="visible">${A.acacia(`t${li}${i}`).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg>`;
    }
  }
  if ("ground" in L) for (let i = 0; i < 26; i++) { const gx = rnd() * T, gy = 20 + rnd() * (h * 0.5); extra += `<path d="M${gx},${gy} l4,-12 l3,10 l4,-14 l3,14 l4,-10 l3,12z" fill="${A.C.tuftDark}" opacity="0.55"/>`; }
  if ("track" in L) {
    extra += `<path d="M0,${h * 0.22} H${T}" stroke="#c48a3a" stroke-width="${H * 0.012}" opacity="0.7"/><path d="M0,${h * 0.42} H${T}" stroke="#c48a3a" stroke-width="${H * 0.014}" opacity="0.7"/>`;
    for (let i = 0; i < 18; i++) { const gx = rnd() * T, gy = h * (0.55 + rnd() * 0.35); extra += `<ellipse cx="${gx}" cy="${gy}" rx="${3 + rnd() * 5}" ry="${2 + rnd() * 2}" fill="#b98a4a" opacity="0.6"/>`; }
  }
  const d = `M-2,${pts[0][1].toFixed(1)}${line.replace(/^M/, "L")}L${T + 2},${pts[pts.length - 1][1].toFixed(1)}L${T + 2},${h}L-2,${h}z`;
  const art = `<path d="${d}" fill="${L.fill}"/><path d="${line}" fill="none" stroke="${L.edge}" stroke-width="1.1"/>${extra}`.replace(/ filter="url\(#[^)]*\)"/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${h + pad}" viewBox="0 ${-pad} ${T} ${h + pad}">${art}</svg>`;
}

// the far mountain: one great peak with a snow cap
function mountainSvg(W: number, H: number) {
  const mw = Math.min(W * 0.75, H * 1.2), mh = H * 0.2, x0 = W * 0.18, w = W * 1.4;
  const d = `M${x0},${mh + 30} C${x0 + mw * 0.2},${mh * 0.6} ${x0 + mw * 0.36},${mh * 0.08} ${x0 + mw * 0.44},${mh * 0.04} L${x0 + mw * 0.58},${mh * 0.02} C${x0 + mw * 0.66},${mh * 0.1} ${x0 + mw * 0.82},${mh * 0.6} ${x0 + mw},${mh + 30}z`;
  const snow = `M${x0 + mw * 0.39},${mh * 0.17} C${x0 + mw * 0.42},${mh * 0.08} ${x0 + mw * 0.45},${mh * 0.04} ${x0 + mw * 0.47},${mh * 0.04} L${x0 + mw * 0.57},${mh * 0.03} C${x0 + mw * 0.6},${mh * 0.08} ${x0 + mw * 0.63},${mh * 0.14} ${x0 + mw * 0.65},${mh * 0.2} L${x0 + mw * 0.6},${mh * 0.16} L${x0 + mw * 0.55},${mh * 0.22} L${x0 + mw * 0.5},${mh * 0.15} L${x0 + mw * 0.45},${mh * 0.21}z`;
  return { w, h: mh + 40, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${mh + 40}" viewBox="0 0 ${w} ${mh + 40}">${A.cut(d, LAYERS[0].fill, LAYERS[0].edge)}${A.cut(snow, A.C.snow, "#e2d8c8")}</svg>` };
}

let grainImg: Promise<HTMLImageElement> | null = null;
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// paint an SVG into a canvas: the art, the grain multiplied into it, a soft paper shadow round it
async function bake(svg: string, w: number, h: number, copies: number, step: number, dpr: number) {
  const [art, grain] = await Promise.all([loadImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`), (grainImg ??= loadImg("/event-templates/safari/grain.png"))]);
  const cw = Math.ceil((step * (copies - 1) + w) * dpr), ch = Math.ceil(h * dpr);
  const flat = document.createElement("canvas");
  flat.width = cw; flat.height = ch;
  const f = flat.getContext("2d")!;
  f.scale(dpr, dpr);
  for (let i = 0; i < copies; i++) f.drawImage(art, i * step, 0, w, h);
  // the grain, only where there's paper
  const g = document.createElement("canvas");
  g.width = cw; g.height = ch;
  const gc = g.getContext("2d")!;
  gc.fillStyle = gc.createPattern(grain, "repeat")!;
  gc.fillRect(0, 0, cw, ch);
  gc.globalCompositeOperation = "destination-in";
  gc.drawImage(flat, 0, 0);
  f.setTransform(1, 0, 0, 1, 0, 0);
  f.globalCompositeOperation = "multiply";
  f.drawImage(g, 0, 0);
  // the shadow the paper casts on the paper behind it
  const out = document.createElement("canvas");
  out.width = cw; out.height = ch;
  const o = out.getContext("2d")!;
  o.shadowColor = "rgba(88, 56, 26, 0.32)";
  o.shadowBlur = 12 * dpr;
  o.drawImage(flat, 0, 0);
  return out;
}

export function useSavanna(
  stageRef: RefObject<HTMLDivElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  { cast, flag, animate, onlyHero }: { cast: Cast; flag: string; animate: boolean; onlyHero?: boolean },
) {
  const castKey = cast.map((c) => `${c.who}@${c.at}`).join(",");
  useEffect(() => {
    const stage = stageRef.current, root = rootRef.current;
    if (!stage || !root) return;
    let alive = true;
    type Piece = { node: HTMLDivElement; at: number; p: { x: number; h: number; mx: number; mh: number }; reply?: boolean };
    let layers: { el: HTMLDivElement; k: number; span: number; mountain?: boolean }[] = [];
    let pieces: Piece[] = [];
    let jeep: HTMLDivElement, ride: HTMLDivElement, wheels: SVGGElement[] = [];
    let clouds: { el: HTMLDivElement; x: number; v: number }[] = [];
    let W = 1, H = 1, small = false;

    const build = () => {
      stage.replaceChildren();
      seed = 11;
      const r = stage.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height); small = W < 700;
      const add = (cls: string, html = "") => { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; stage.appendChild(d); return d; };
      add("sf-sun", A.sun("sfsun"));
      clouds = Array.from({ length: 4 }, (_, i) => {
        const el = add("sf-cloud", A.cloud(`sfc${i}`));
        el.style.width = (110 + rnd() * 90) * (small ? 0.7 : 1) + "px";
        el.style.top = (6 + rnd() * 26) + "%";
        return { el, x: rnd() * 1.2, v: 0.004 + rnd() * 0.006 };
      });
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      layers = LAYERS.map((L, li) => {
        const el = add("sf-layer");
        el.style.zIndex = String(li < 4 ? 1 + li : li === 4 ? 6 : 8);
        if ("mountain" in L) {
          const m = mountainSvg(W, H);
          el.style.top = L.top * H - m.h * 0.08 + "px"; el.style.height = m.h + "px";
          void bake(m.svg, m.w, m.h, 1, 0, dpr).then((cv) => { if (!alive) return; cv.style.width = m.w + "px"; cv.style.height = m.h + "px"; el.appendChild(cv); });
          return { el, k: L.k, span: 0, mountain: true };
        }
        // room above the hill line for its trees and its shadow
        const T = Math.round(Math.max(W * 1.4, H * 1.6)), h = Math.ceil((1 - L.top) * H + 4), pad = Math.ceil(("trees" in L ? L.treeH * 1.4 * H : 0) + 24);
        el.style.top = L.top * H - pad + "px"; el.style.height = h + pad + "px";
        const svg = tileSvg(L, li, T, h, H, pad);
        void bake(svg, T, h + pad, 2, T - 2, dpr).then((cv) => { if (!alive) return; cv.style.width = 2 * T - 2 + "px"; cv.style.height = h + pad + "px"; el.appendChild(cv); });
        return { el, k: L.k, span: T - 2 };
      });
      pieces = [];
      for (const c of cast) {
        const reply = c.at < 0;
        const at = reply ? Number.MAX_SAFE_INTEGER : c.at;
        const places = reply ? [AT_REPLY] : PLACE[c.who];
        places.forEach((p, i) => {
          const make = c.who === "giraffe" ? A.giraffe : c.who === "zebra" ? A.zebra : c.who === "lion" ? A.lion : i === 0 ? A.elephant : (id: string) => A.elephant(id, "#adb9c6", "#7b8897");
          const node = add(`sf-prop${c.at === 0 && c.who === "giraffe" ? " sf-hero-giraffe" : ""}`, make(`sf${c.who}${c.at}${i}`));
          node.style.zIndex = "5";
          pieces.push({ node, at, p, reply });
        });
      }
      jeep = add("sf-jeep", `<div class="sf-ride">${A.jeep("sfjeep", flag)}</div>`);
      jeep.style.zIndex = "7";
      ride = jeep.querySelector(".sf-ride") as HTMLDivElement;
      wheels = Array.from(jeep.querySelectorAll<SVGGElement>(".wheel"));
      layout();
      measure();
      place();
    };

    // ---- the drive: stop positions, and where the jeep is for a scroll position
    // each stop's hold: the scroll range [a, b] while its bubble is docked (the reply, which has
    // no dock, holds from the moment its section reaches the frame's top)
    let holds: { a: number; b: number }[] = [{ a: 0, b: 0 }];
    let stopCount = 0;
    // one swipe, one stop (the live page and the design preview)
    const snap = createStopSnap(root, animate && !onlyHero);
    const scrolled = () => stage.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const measure = () => {
      const rt = root.getBoundingClientRect(), max = Math.max(0, rt.height - H);
      const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-sf-stop]"));
      stopCount = stops.length;
      const clamp = (v: number) => Math.min(max, Math.max(0, v));
      holds = [{ a: 0, b: 0 }, ...stops.map((s) => {
        const wrap = s.querySelector<HTMLElement>(".sf-dock"), say = wrap?.querySelector<HTMLElement>("[data-sf-say]");
        if (!wrap || !say) { const r = s.getBoundingClientRect(); const y = clamp(r.top - rt.top + Math.min(r.height, H) / 2 - H / 2); return { a: y, b: y }; }
        const w = wrap.getBoundingClientRect(), top = parseFloat(say.style.top) || 0, y0 = w.top - rt.top - top;
        return { a: clamp(y0), b: clamp(y0 + w.height - say.offsetHeight) };
      })];
      // the giraffe at the reply waits at the last stop (none without stops: the gallery card)
      for (const p of pieces) if (p.reply) p.at = stopCount || Number.MAX_SAFE_INTEGER;
      // the reply's pass, after the last stop: centred, or a free zone when it's taller than the screen
      const pass = root.querySelector<HTMLElement>(".sf-passwrap");
      snap.update([...holds.map((h) => ({ from: h.a })), ...(pass ? centredSpans(root, [pass], H) : [])], H);
    };
    // the jeep's place for a scroll position: parked while a bubble is docked, driving (eased)
    // through the gap to the next stop, arriving a little before its bubble docks
    const driveAt = (y: number) => {
      if (y <= holds[0].b) return 0;
      for (let i = 0; i < holds.length - 1; i++) {
        const { b } = holds[i], { a } = holds[i + 1];
        if (y <= a) { const t = Math.min(1, Math.max(0, (y - b) / Math.max(1, a - b))); const m = Math.min(1, t / 0.85); return (i + m * m * (3 - 2 * m)) * D; }
        if (y <= holds[i + 1].b) return (i + 1) * D;
      }
      return (holds.length - 1) * D;
    };
    // every bubble docks at the same height near the top of the scene (lower only if it would
    // cover its animal), over its animal, its tail stretched down to the animal's head
    const layout = () => {
      const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-sf-stop]"));
      stops.forEach((s, i) => {
        const say = s.querySelector<HTMLElement>("[data-sf-say]");
        const here = pieces.filter((p) => p.at === i + 1);
        if (!say || !here.length) return;
        const x = small ? here[0].p.mx : here[0].p.x;
        say.style.setProperty("--at", String(x));
        const r = say.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        const bubble = say.firstElementChild as HTMLElement | null;
        bubble?.style.setProperty("--tail", `${Math.min(80, Math.max(14, ((sr.left + x * W - r.left) / Math.max(1, r.width)) * 100)).toFixed(1)}%`);
        const feetY = (PLAIN.top + 0.06) * H, tallest = Math.max(...here.map((p) => (small ? p.p.mh : p.p.h)));
        const head = feetY - tallest * H, h = say.offsetHeight;
        const top = Math.max(8, Math.min(H * (small ? 0.05 : 0.07), head - h - 34));
        say.style.top = `${Math.round(top)}px`;
        bubble?.style.setProperty("--tailh", `${Math.round(Math.min(H * 0.16, Math.max(26, head - (top + h) - 8)))}px`);
      });
    };

    let target = 0, X = 0, vel = 0, prevT = 0, cloudT = 0, raf = 0, visible = true;
    const place = () => {
      const drive = X * H * DRIVE;
      for (const L of layers) {
        if (L.mountain) { L.el.style.transform = `translate3d(${(-W * 0.2 + drive * L.k).toFixed(1)}px,0,0)`; continue; }
        const off = ((drive * L.k) % L.span + L.span) % L.span;
        L.el.style.transform = `translate3d(${(off - L.span).toFixed(1)}px,0,0)`;
      }
      for (const pc of pieces) {
        const svg = pc.node.querySelector("svg")!, vb = svg.viewBox.baseVal, gr = Number(svg.dataset.ground);
        const hh = small ? pc.p.mh : pc.p.h;
        const hpx = hh * H * (vb.height / gr), wpx = hpx * (vb.width / vb.height);
        const sx = (small ? pc.p.mx : pc.p.x) * W + (X - pc.at * D) * H * DRIVE * PLAIN.k;
        const feet = (1 - PLAIN.top - 0.06) * H;
        pc.node.style.width = wpx + "px";
        pc.node.style.transform = `translate3d(${(sx - wpx / 2).toFixed(1)}px, ${(-feet + hpx * (1 - gr / vb.height)).toFixed(1)}px, 0)`;
        pc.node.style.visibility = hh > 0 && sx > -wpx && sx < W + wpx && !(onlyHero && pc.at > 0) ? "visible" : "hidden";
      }
      const jw = small ? W * 0.66 : Math.min(W * 0.3, 470);
      jeep.style.width = jw + "px"; jeep.style.right = (small ? -W * 0.12 : W * 0.03) + "px";
      jeep.style.bottom = (1 - TRACK.top - 0.075) * H + "px";
      const r = (40 / 420) * jw, ground = drive * TRACK.k;
      wheels.forEach((w) => (w.style.transform = `rotate(${(-ground / r * 57.2958).toFixed(1)}deg)`));
    };
    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, prevT ? (now - prevT) / 1000 : 0.016); prevT = now;
      const vmax = (D / TRIP) * 1.4, acc = (vmax * vmax) / (D * 0.35), d = target - X;
      if (!animate) { X = target; vel = 0; }
      else {
        // pull away, cruise, then brake so it stops exactly at the stop (never past it and back)
        const want = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * acc * Math.abs(d)));
        vel += Math.max(-acc * dt, Math.min(acc * dt, want - vel));
        if (Math.abs(vel * dt) >= Math.abs(d) || (Math.abs(d) < 0.001 && Math.abs(vel) < 0.05)) { X = target; vel = 0; } else X += vel * dt;
      }
      place();
      // moving: the jeep bounces on its springs
      const mv = Math.min(1, Math.abs(vel) / vmax);
      ride.style.transform = mv ? `translateY(${(-Math.abs(Math.sin(now / 90)) * 5 * mv).toFixed(2)}px) rotate(${(Math.sin(now / 140) * 0.8 * mv).toFixed(2)}deg)` : "";
      if (animate) {
        cloudT += dt;
        for (const c of clouds) { const x = (((c.x + cloudT * c.v + X * 0.01) % 1.4) + 1.4) % 1.4 - 0.2; c.el.style.transform = `translate3d(${(x * W).toFixed(1)}px,0,0)`; }
      } else for (const c of clouds) c.el.style.transform = `translate3d(${((c.x - 0.2) * W).toFixed(1)}px,0,0)`;
      // keep going while there's motion to show (and, for the clouds, while on screen)
      if (visible && !document.hidden && (animate || X !== target)) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) { prevT = 0; raf = requestAnimationFrame(loop); } };
    const onScroll = () => { target = driveAt(scrolled()); kick(); };

    build();
    target = driveAt(scrolled()); X = target;
    kick();
    const ro = new ResizeObserver(() => { const r = stage.getBoundingClientRect(); if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) build(); else { layout(); measure(); } onScroll(); });
    ro.observe(stage); ro.observe(root);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(stage);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      snap.dispose();
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll, { capture: true });
      stage.replaceChildren();
    };
    // castKey stands for cast
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageRef, rootRef, castKey, flag, animate, onlyHero]);
}
