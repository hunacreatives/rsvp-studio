import { useEffect, type MutableRefObject, type RefObject } from "react";
import { createCourt, project, type DrawState, type Paddle } from "./court";
import { BALL_R, COURT, SAMPLE_DT, buildRally, sampleAt, type Flight, type Quat, type Rally, type V3 } from "./physics";

/**
 * Rally's court and its rally, in two modes:
 *  - `deck` (the published page and the design preview): one frame, a card at a time. The
 *    template calls `api.go(stop, play)`: `play` flies the next shot at real speed (the
 *    simulation's own timing), otherwise it cuts straight there; `onArrive` says when the ball
 *    has reached the stop, so the card can come up. One broadcast camera, high behind the near
 *    baseline, panning gently after the ball: it never swaps sides.
 *  - scroll (the builder): the sections stacked, each card docked as it's edited; the court
 *    shows the moment of the section in view, still.
 * The rest of this note is the scroll mode's.
 *  - Each section is a stop ([data-ra-stop]); the title holds the host's serve, each later stop
 *    holds the next contact, a freeze-frame: the ball at the paddle. The gap before a stop is the
 *    shot (or two) that brings the ball there, flown as simulated (physics.ts).
 *  - Every card ([data-ra-dock]) pauses in the same place, its dock: the bottom-left corner of a
 *    wide frame, the bottom edge on a phone (sticky for the length of its hold; a card taller
 *    than the frame docks by its bottom edge). The dock is measured here and set as the card's
 *    `top`. The ball and the camera hold still while a card is docked and move in the gap.
 *  - The scroll sets a target in rally time; the rally plays toward it at about real speed,
 *    faster when it has far to go (a quick scroll catches up).
 *  - The camera: beside the hitter at each contact, the ball large, then craning up over the
 *    court to follow the flight and down to the next contact.
 *  - The HUD: the shot's speed, spin and height over the net, the shots played, the line call.
 *  - `smash` (a ref the reply card calls when a guest calls "In"): the host's winning overhead,
 *    in real time, with the court's dust, the lamps flaring and the score.
 *  - Kept light: ≤30 frames a second at ≤1.25× pixels, only while on screen and the tab is
 *    shown. `animate` false (builder, gallery card, reduced motion): a still frame redrawn on
 *    scroll, the lamps on, no idle motion.
 */

export type RallyHud = {
  speed: RefObject<HTMLElement | null>;
  spin: RefObject<HTMLElement | null>;
  clear: RefObject<HTMLElement | null>;
  ticks: RefObject<HTMLElement | null>;
  call: RefObject<HTMLElement | null>;
  callTag: RefObject<HTMLElement | null>;
};
export type RallyApi = { smash: () => void; go: (stop: number, play: boolean) => void };

const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t: number) => sstep(0, 1, t);
/** Rotates v about the unit axis k by angle a (Rodrigues). */
const rot = (v: V3, k: V3, a: number): V3 => { const c = Math.cos(a), s = Math.sin(a), kv = cross(k, v), kd = dot(k, v); return [v[0] * c + kv[0] * s + k[0] * kd * (1 - c), v[1] * c + kv[1] * s + k[1] * kd * (1 - c), v[2] * c + kv[2] * s + k[2] * kd * (1 - c)]; };
const clampIn = (p: V3): V3 => [Math.max(-6.1, Math.min(6.1, p[0])), Math.max(0.2, p[1]), Math.max(-10.9, Math.min(10.9, p[2]))];

type View = { eye: V3; at: V3; shift: [number, number]; fov: number };

/** The paddle that meets the ball at `p` for `kind`, swung to `swing` (0 at contact). */
function paddleAt(p: V3, out: Flight, swing: number, away: number): Paddle {
  const n = norm(out.v0), s = out.side, f: V3 = [0, 0, s], right: V3 = [-s, 0, 0], down: V3 = [0, -1, 0];
  let hd: V3;
  // the handle's direction from the face to the hand: under the hand for an underhand serve,
  // a dink and a scoop; level for a drive; over it for a volley and the smash
  const up: V3 = [0, 1, 0];
  switch (out.kind) {
    case "serve": hd = add(add(scale(up, 0.6), right, 0.55), f, -0.3); break;
    case "dink": hd = add(scale(up, 0.45), right, 0.7); break;
    case "lob": hd = add(scale(up, 0.4), right, 0.75); break;
    case "erne": hd = add(scale([1, 0, 0], 0.75), down, 0.45); break;
    case "smash": hd = add(scale(down, 0.9), f, -0.25); break;
    default: hd = add(scale(right, 0.9), down, 0.15);
  }
  hd = norm(sub(hd, scale(n, dot(hd, n))));
  // at contact: the face square behind the ball, the handle toward the hand
  let z = n, y = scale(hd, -1);
  let face = add(p, n, -(BALL_R + 0.012));
  if (swing < 0) {
    // the backswing: drawn back along the shot's line, the wrist laid back
    const k = -swing;
    face = add(add(face, n, -0.34 * k), [0, 0.04 * k, 0]);
    z = rot(z, y, 0.4 * k);
  } else if (swing > 0) {
    // the follow-through: on along the line and up, the face turning over
    const x0 = norm(cross(y, z));
    face = add(add(face, n, 0.32 * swing), [0, 0.2 * swing, 0]);
    y = rot(y, x0, -0.55 * swing);
    z = rot(z, x0, -0.55 * swing);
  }
  let pivot = add(face, y, -0.27);
  // coming into or going out of frame: back toward the player
  if (away > 0) pivot = add(add(pivot, hd, away * 1.4), [0, -1, 0], away * 0.5);
  z = norm(z);
  const x = norm(cross(y, z));
  return { pivot, x, y: norm(y), z, look: s > 0 ? 0 : 1 };
}
function scale(a: V3, k: number): V3 { return [a[0] * k, a[1] * k, a[2] * k]; }

export function useRally(
  refs: { root: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; gl: RefObject<HTMLCanvasElement | null>; intro: RefObject<number>; api: MutableRefObject<RallyApi | null> },
  hud: RallyHud,
  { stops, animate, onPoint, deck = false, start = 0, onArrive }: { stops: number; animate: boolean; onPoint: RefObject<(() => void) | null>; deck?: boolean; start?: number; onArrive?: RefObject<((stop: number) => void) | null> },
) {
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current, cv = refs.gl.current;
    if (!root || !stage || !cv) return;
    const court = createCourt(cv);
    if (!court) cv.style.display = "none";
    const rally: Rally = buildRally(Math.max(1, stops - 1));
    const contactT = rally.at; // contact k at rally time at[k]
    const lastC = rally.flights.length; // the smash contact
    // each stop freezes a moment before its contact: the ball arriving, the paddle drawn back
    const LEAD = 0.03;
    const stopT = rally.stopContact.map((k) => contactT[k] - LEAD);
    const tMin = stopT[0], tMax = contactT[lastC] - LEAD;
    const flightOut = (k: number) => (k < rally.flights.length ? rally.flights[k] : rally.smash);
    const contactP = (k: number): V3 => { const f = flightOut(k); return [f.samples[0], f.samples[1], f.samples[2]]; };
    // every bounce in rally time
    const bounces = rally.flights.flatMap((f, i) => f.bounces.map((b) => ({ ...b, t: contactT[i] + b.t })));

    // ---- the camera: one broadcast angle, high behind the near baseline, panning a little after
    // the ball (never swapping sides). The court sits right of the cards on a wide frame, in the
    // top part of a phone's.
    let tall = false, asp = 1.6;
    const broadcast = (follow: V3): View => {
      const px = Math.max(-3.2, Math.min(3.2, follow[0])), pz = Math.max(-7, Math.min(7, follow[2]));
      const eye: V3 = tall ? [px * 0.1, 11.2, -10.6] : [px * 0.16, 7.0, -10.6];
      const at: V3 = tall ? [px * 0.2, 0, -0.9 + (pz + 0.9) * 0.06] : [px * 0.26, 0, -0.5 + (pz + 0.5) * 0.08];
      // the lens shift puts `at` where the court should sit on the frame: right of the cards on
      // a wide frame, the top half of a phone's (the card is below)
      return tall ? { eye, at, fov: 1.26, shift: [0, 0.34] } : { eye, at, fov: 0.98, shift: [0.27, 0.03] };
    };
    const buildViews = () => {};

    // the ball, its smoothed place (what the camera follows mid-flight)
    const tmp = { p: [0, 0, 0] as V3, q: [0, 0, 0, 1] as Quat, shot: 0 };
    const ballT = (t: number) => {
      // before the serve: the ball dropped from the server's hand
      if (t < 0) {
        const tr = 0.3, u = Math.max(-tr, t), y = 0.5 * 9.81 * (tr * tr - (u + tr) * (u + tr));
        const p0 = contactP(0);
        return { p: [p0[0], p0[1] + y, p0[2]] as V3, q: [0, 0, 0, 1] as Quat, i: 0 };
      }
      let i = 0;
      while (i < rally.flights.length - 1 && t >= contactT[i + 1]) i++;
      sampleAt(rally.flights[i], t - contactT[i], tmp);
      return { p: tmp.p, q: tmp.q, i };
    };
    const smooth = (t: number) => { let s: V3 = [0, 0, 0]; for (const d of [-0.24, -0.12, 0, 0.12, 0.24]) s = add(s, ballT(Math.max(tMin, Math.min(tMax, t + d))).p, 0.2); return s; };

    const cameraAt = (t: number): View => broadcast(smooth(t));

    // ---- the docks (as Level Up's quest.ts): each stop's hold, [a, b] in scroll
    let holds: { a: number; b: number }[] = [{ a: 0, b: 0 }];
    const scrolled = () => stage.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const measure = () => {
      const rt = root.getBoundingClientRect();
      const H = Math.max(1, stage.getBoundingClientRect().height);
      const max = Math.max(0, rt.height - H);
      const phone = rt.width <= 700;
      const list = Array.from(root.querySelectorAll<HTMLElement>("[data-ra-stop]"));
      holds = list.map((s) => {
        const wrap = s.querySelector<HTMLElement>(".ra-dock"), card = wrap?.querySelector<HTMLElement>("[data-ra-dock]");
        if (!wrap || !card) { const r = s.getBoundingClientRect(); const y = Math.min(max, Math.max(0, r.top - rt.top + Math.min(r.height, H) / 2 - H / 2)); return { a: y, b: y }; }
        const h = card.offsetHeight;
        const top = phone ? H - h - 12 : H - h - 32;
        card.style.top = `${Math.round(top)}px`;
        const w = wrap.getBoundingClientRect(), y0 = w.top - rt.top - top;
        return { a: Math.min(max, Math.max(0, y0)), b: Math.min(max, Math.max(0, y0 + w.height - h)) };
      });
      if (!holds.length) holds = [{ a: 0, b: 0 }];
    };
    const stopAt = (y: number) => {
      if (y <= holds[0].b) return 0;
      for (let i = 0; i < holds.length - 1; i++) {
        const { b } = holds[i], { a } = holds[i + 1];
        if (y <= a) { const t = Math.min(1, Math.max(0, (y - b) / Math.max(1, a - b))); const m = Math.min(1, t / 0.88); return i + m; }
        if (y <= holds[i + 1].b) return i + 1;
      }
      return holds.length - 1;
    };
    const timeOfX = (x: number) => { const i = Math.max(0, Math.min(stopT.length - 1, Math.floor(x))), f = x - i; return i >= stopT.length - 1 ? stopT[stopT.length - 1] : stopT[i] + (stopT[i + 1] - stopT[i]) * f; };

    // ---- the HUD
    let lastHud = "";
    const fmt = (n: number) => n.toLocaleString("en-US");
    const setHud = (t: number, flying: boolean) => {
      const b = ballT(t), f = rally.flights[b.i];
      let speed = f.kmh;
      if (flying) { const a = ballT(t - 0.02).p, c = ballT(t + 0.02).p; speed = Math.round((Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / 0.04) * 3.6); }
      const played = rally.flights.filter((_, i) => contactT[i + 1] - LEAD <= t + 1e-4).length;
      const key = `${speed}|${f.rpm}|${f.clear}|${played}`;
      if (key === lastHud) return;
      lastHud = key;
      if (hud.speed.current) hud.speed.current.textContent = String(speed);
      if (hud.spin.current) hud.spin.current.textContent = fmt(f.rpm);
      if (hud.clear.current) hud.clear.current.textContent = f.clear === null ? "–" : `${f.clear > 0 ? "+" : ""}${f.clear}`;
      const ticks = hud.ticks.current;
      if (ticks) Array.from(ticks.children).forEach((c, i) => c.classList.toggle("is-on", i < played));
    };

    // ---- the frame
    let target = 0, T = 0, vel = 0, prevT = 0, lastDraw = -1e9, raf = 0, visible = true, prevBall: V3 | null = null;
    let smashAt = 0, scored = false;
    const t0 = performance.now();
    const pointAt = rally.smash.bounces[0]?.t ?? 0.3;
    // deck mode: the stop being flown to, and whether the shot plays (at real speed) or cuts
    let goal = -1, playing = false;
    refs.api.current = {
      smash: () => {
        if (!animate) return;
        smashAt = performance.now();
        scored = false;
        kick();
      },
      go: (stop, play) => {
        const k = Math.max(0, Math.min(stopT.length - 1, stop));
        goal = k; target = stopT[k];
        playing = play && animate && target > T;
        if (!playing) { T = target; vel = 0; }
        kick();
      },
    };

    const draw = (now: number) => {
      if (!court) return;
      const time = animate ? (now - t0) / 1000 : 0;
      const intro = refs.intro.current ?? 1;
      const st = smashAt ? Math.min(rally.smash.duration, ((now - smashAt) / 1000) * 0.92 - LEAD) : -9;
      const tt = Math.max(tMin, Math.min(T, tMax));
      // the camera
      let v = cameraAt(tt);
      if (intro < 1) {
        const k = 1 - ease(intro);
        v = { ...v, eye: add(add(v.eye, norm(sub(v.eye, v.at)), k * 2.4), [0, k * 1.1, 0]) };
      }
      let ball: DrawState["ball"] = null;
      const paddles: Paddle[] = [];
      let dust: DrawState["dust"] = null, flare = 0;
      const marks: DrawState["marks"] = [];
      let ring: DrawState["ring"] = null;
      const trail: DrawState["trail"] = { pts: [], alpha: [] };
      if (st > -9) {
        // the smash: the host's overhead into the far court, to the back fence
        const sm = rally.smash;
        const o = st < 0 ? ballT(contactT[lastC] + st) : sampleAt(sm, st, { p: [0, 0, 0], q: [0, 0, 0, 1] });
        ball = { p: o.p, q: o.q, blur: prevBall ? scale(sub(o.p, prevBall), 0.85) : [0, 0, 0] };
        prevBall = o.p;
        const sw = st < 0 ? -1 * sstep(0, 0.16, -st) : 1.5 * sstep(0, 0.22, st);
        if (st < 0.45) paddles.push(paddleAt(contactP(lastC), sm, Math.min(sw, 0.6), sstep(0.06, 0.32, st)));
        // the camera whips after the ball, then settles wide on the far court: the bounce, the
        // ball at the back fence
        const k = ease(Math.min(1, Math.max(0, st) / 1.1));
        const bc = broadcast(o.p);
        v = { ...bc, eye: add(bc.eye, [0, -0.7 * k, 2.2 * k]), at: add(bc.at, [0, 0, 1.6 * k]), fov: bc.fov - 0.08 * k };
        const since = st - pointAt;
        if (since >= 0) {
          if (!scored) { scored = true; onPoint.current?.(); }
          const b0 = sm.bounces[0];
          dust = { p: b0.p, age: since };
          flare = Math.exp(-since * 3.5);
          const sh = 0.05 * Math.exp(-since * 7);
          v = { ...v, eye: add(v.eye, [Math.sin(now * 0.09) * sh, Math.cos(now * 0.11) * sh, 0]) };
          ring = { x: b0.p[0], z: b0.p[2], dx: b0.dir[0], dz: b0.dir[1], a: 1, grow: sstep(0, 0.4, since) };
        }
        for (const b of [...bounces, ...sm.bounces.filter((b) => b.t <= st).map((b) => ({ ...b, t: 1e9 }))].slice(-8)) marks.push({ x: b.p[0], z: b.p[2], dx: b.dir[0], dz: b.dir[1], a: 0.9 });
        for (let s = 0; s <= Math.max(0, st); s += SAMPLE_DT * 4) { const q = sampleAt(sm, s, { p: [0, 0, 0], q: [0, 0, 0, 1] }).p; trail.pts.push(...q); trail.alpha.push(0.8 * Math.exp(-(st - s) / 1.2)); }
      } else {
        const b = ballT(tt);
        ball = { p: b.p, q: b.q, blur: prevBall && animate ? scale(sub(b.p, prevBall), 0.85) : [0, 0, 0] };
        if (Math.hypot(ball.blur[0], ball.blur[1], ball.blur[2]) > 0.6) ball.blur = scale(norm(ball.blur), 0.6);
        prevBall = b.p;
        // the paddles near this moment: coming in, at contact, following through, leaving
        for (let k = 0; k <= lastC; k++) {
          const d = tt - contactT[k];
          if (d < -0.75 || d > 0.62) continue;
          const sw = d < 0 ? -1 * sstep(0, 0.16, -d) : 1.35 * sstep(0, 0.22, d);
          const away = d < 0 ? sstep(0.4, 0.75, -d) : sstep(0.28, 0.62, d);
          paddles.push(paddleAt(contactP(k), flightOut(k), sw, away));
        }
        const past = bounces.filter((x) => x.t <= tt + 1e-4);
        for (const x of past.slice(-8)) marks.push({ x: x.p[0], z: x.p[2], dx: x.dir[0], dz: x.dir[1], a: 0.55 + 0.45 * Math.exp(-(tt - x.t) / 6) });
        const lb = past[past.length - 1];
        if (lb && tt - lb.t < 4) ring = { x: lb.p[0], z: lb.p[2], dx: lb.dir[0], dz: lb.dir[1], a: 1 - 0.35 * sstep(0.6, 2.2, tt - lb.t), grow: sstep(0, 0.4, tt - lb.t) };
        // the tracked path: this shot so far and the one before it, fading with time
        const from = Math.max(0, contactT[Math.max(0, b.i - 1)]);
        for (let s = from; s <= tt; s += SAMPLE_DT * 4) { const q = ballT(s).p; trail.pts.push(...q); trail.alpha.push(0.75 * Math.exp(-(tt - s) / 1.6)); }
        if (trail.pts.length) { trail.pts.push(...b.p); trail.alpha.push(0.75); }
      }
      const intro4 = [0.12, 0.42, 0.3, 0.6].map((d) => (intro >= 1 ? 1 : flick(intro, d)));
      const dusk = Math.min(1, Math.max(0, tt) / Math.max(1, tMax)) * 0.85 + (st > 0 ? 0.15 * Math.min(1, st / 2) : 0);
      const vp = court.draw({
        eye: v.eye, at: v.at, shift: v.shift, fov: v.fov, time,
        ball, paddles, marks, ring, trail, dusk, lamps: intro4, flare, dust,
      });
      // the line call, pinned to the ring on the court
      const tag = hud.callTag.current;
      if (tag) {
        if (ring && ring.a > 0.5) {
          const [x, y, front] = project(vp, [ring.x, 0.02, ring.z]);
          const ok = front && x > 0.04 && x < 0.96 && y > 0.08 && y < 0.96;
          tag.style.opacity = ok ? "1" : "0";
          if (ok) tag.style.transform = `translate(${(x * 100).toFixed(2)}cqw, ${(y * stage.offsetHeight).toFixed(1)}px)`;
          const kit = Math.abs(ring.z) < COURT.kitchen;
          const label = tag.querySelector("i");
          if (label) label.textContent = kit ? "Kitchen" : "";
        } else tag.style.opacity = "0";
      }
    };
    // each bank of lights fades up in turn (no strobing: a flicker read as the page glitching)
    const flick = (t: number, d: number) => ease(Math.min(1, Math.max(0, (t - d) / 0.3)));

    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, prevT ? (now - prevT) / 1000 : 0.016);
      prevT = now;
      if (!animate) { T = target; vel = 0; }
      else if (deck) {
        // the shot at real speed (the simulation's own time); a cut is already there
        if (playing) T = Math.min(target, T + dt);
        else T = target;
        if (T >= target) playing = false;
      } else {
        const d = target - T, vmax = Math.max(0.9, Math.abs(d) / 1.4), acc = 5;
        const want = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * acc * Math.abs(d)));
        vel += Math.max(-acc * 2 * dt, Math.min(acc * 2 * dt, want - vel));
        if (Math.abs(vel * dt) >= Math.abs(d) || (Math.abs(d) < 0.002 && Math.abs(vel) < 0.05)) { T = target; vel = 0; } else T += vel * dt;
      }
      if (smashAt && T < tMax - 0.02) smashAt = 0;
      const smashing = smashAt > 0 && (now - smashAt) / 1000 < rally.smash.duration / 0.92 + 1.5;
      const intro = refs.intro.current ?? 1;
      if (now - lastDraw >= 32 || (deck && T === target && goal >= 0)) {
        lastDraw = now;
        draw(now);
        setHud(Math.max(0, Math.min(T, tMax)), T !== target);
      }
      if (deck && goal >= 0 && T === target) { const g = goal; goal = -1; onArrive?.current?.(g); }
      if (visible && !document.hidden && (animate || smashing || intro < 1 || T !== target)) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) { prevT = 0; lastDraw = -1e9; raf = requestAnimationFrame(loop); } };
    const onScroll = () => { if (deck) return; target = timeOfX(stopAt(scrolled())); kick(); };

    const fit = () => { const r = stage.getBoundingClientRect(); asp = r.width / Math.max(1, r.height); tall = asp < 0.8; buildViews(); };
    court?.size();
    fit();
    if (!deck) measure();
    target = deck ? stopT[Math.max(0, Math.min(stopT.length - 1, start))] : timeOfX(stopAt(scrolled())); T = target;
    kick();
    const ro = new ResizeObserver(() => { court?.size(); fit(); if (!deck) measure(); onScroll(); lastDraw = -1e9; kick(); });
    ro.observe(stage); ro.observe(root);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(stage);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll, { capture: true });
      refs.api.current = null;
      court?.dispose();
    };
    // the refs are stable; stops stands for the page's shape
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, animate, deck]);
}
