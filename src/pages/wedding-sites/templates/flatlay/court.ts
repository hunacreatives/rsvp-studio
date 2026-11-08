import { FL, asset } from "./meta";

/**
 * The court's moving parts, laid on the page by hand (no 3D engine): every piece is a Blender
 * render under one low sun (flatlay.py), drawn at true scale from its frame in metres (meta.ts).
 *  - The court lines follow the stops: a baseline under the first, the far baseline under the
 *    reply, the net and the two kitchen lines on the stops' edges in the middle.
 *  - Things off the ground (the balloons at the reply, the net tape) are seen from a camera 6 m
 *    up: a thing h metres up looks 6/(6−h) bigger and moves that much faster as the page scrolls,
 *    so it slides over its own shadow, which stays on the court.
 *  - The player just out of frame: only their long shadow, swinging (48 frames, one canvas).
 *  - Resting balls roll in when their stop comes on screen; the reply's IN / OUT boxes catch the
 *    ball (the first pick drops it in, changing your mind rolls it across).
 *  - The opening (`intro`): a line-marking robot paints the baseline, then the kicker, the name
 *    lane by lane, then the facts, in wet paint that dries. Any scroll, tap or key skips it.
 * Positions are court coordinates (offsets inside the court), so the builder's scaled preview
 * lays out like the real page. Only the camera reads the screen, and only on the moving page.
 */

const D = 6; // camera height (m)
const SX = 0.88, SY = 1.336; // shadow reach per metre of height (the 32° sun)
const PF = { cx: 0.924, cy: 1.404, w: 3.54, h: 3.94 }; // the player-shadow render's frame, from the feet
const proj = (h: number) => D / (D - h);
const seq = (name: string, n: number) => Array.from({ length: n }, (_, i) => asset(`${name}-${String(i).padStart(2, "0")}`));
const DROP = seq("ball-roll", 24); // the ball rolling away from the camera's top-left (a drop)
const ROLLX = seq("ball-rollx", 24); // rolling sideways
const PLAYER = seq("player", 48);
const TURN = 0.232; // metres the ball rolls in one turn
const BALLOONS: [string, number, number, number][] = [
  ["gold", 0.02, -0.62, 1.35],
  ["terracotta", 0.3, -0.42, 1.2],
  ["cream", -0.28, -0.36, 1.1],
  ["sage", 0.16, -0.2, 1.0],
  ["blush", -0.14, -0.78, 1.25],
];

/** Load and decode images (a frame that isn't decoded yet flashes blank when shown). */
function decoded(srcs: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(
    srcs.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().then(
        () => img,
        () => img,
      );
    }),
  );
}
/** After the page's own images: big frame sets never hold up the first screen. */
function afterLoad(fn: () => void): () => void {
  if (document.readyState === "complete") {
    const t = window.setTimeout(fn, 60);
    return () => window.clearTimeout(t);
  }
  window.addEventListener("load", fn, { once: true });
  return () => window.removeEventListener("load", fn);
}
/** An element's offset inside the court (unaffected by the builder's scaling). */
function offsetIn(el: HTMLElement, court: HTMLElement) {
  let x = 0, y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== court) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y };
}
/** How wide an element's text really is (its widest line), in layout px. */
function textWidth(el: HTMLElement): number {
  const box = el.getBoundingClientRect();
  if (!box.width) return el.offsetWidth;
  const range = document.createRange();
  range.selectNodeContents(el);
  const r = range.getBoundingClientRect();
  return Math.min(el.offsetWidth, (r.right - box.left) * (el.offsetWidth / box.width));
}

type Item = { img: HTMLImageElement; sh: HTMLImageElement; str: HTMLElement; gs: HTMLElement; dx: number; dy: number; h: number; ph: number };
type Roller = HTMLElement & { rb?: HTMLElement; rs?: HTMLImageElement; rolling?: boolean; done?: boolean };
type Pt = { x: number; y: number };

export type CourtApi = {
  /** A guest picked In or Out: the ball goes to that box. */
  pick: (box: HTMLElement) => void;
  relayout: () => void;
  dispose: () => void;
};

export function startCourt(root: HTMLElement, court: HTMLElement, opts: { motion: boolean; intro: boolean; onIntroEnd: () => void }): CourtApi {
  const { motion } = opts;
  const q = <T extends HTMLElement = HTMLElement>(k: string) => court.querySelector<T>(`[data-fl="${k}"]`);
  const cleanups: (() => void)[] = [];
  let disposed = false;
  let W = 0, m = 1, phone = false;
  let stops: HTMLElement[] = [];
  let netY = -1;
  let anchor: Pt | null = null;

  // ---------------------------------------------------------------- layout
  function layout() {
    W = court.clientWidth;
    if (!W) return;
    phone = W <= 720;
    m = phone ? W / 1.15 : W / 2.2;
    stops = Array.from(court.querySelectorAll<HTMLElement>(":scope > [data-stop]"));
    if (!stops.length) return;
    const CH = court.offsetHeight;
    const first = stops[0], last = stops[stops.length - 1];
    const base1 = first.offsetTop + m * 0.12;
    const set = (k: string, css: string) => {
      const el = q(k);
      if (el) el.style.cssText = css;
    };
    set("run1", `top:0;height:${base1}px`);
    set("baseline1", `top:${base1}px`);
    if (stops.length < 2) {
      // the gallery card: the first screen only
      set("centre1", `top:${base1}px;height:${CH - base1}px`);
      ["run2", "baseline2", "kitchen1", "kitchen2", "centre2", "netshadow"].forEach((k) => set(k, "display:none"));
      netY = -1;
    } else {
      const base2 = last.offsetTop + last.offsetHeight - 56; // the reply and the credit stay on the court
      const B = stops.slice(1).map((s) => s.offsetTop);
      let k1: number, k2: number;
      if (B.length >= 3) {
        const mid = Math.floor(B.length / 2);
        netY = B[mid] + m * 0.02;
        k1 = B[mid - 1] - m * 0.05;
        k2 = B[mid + 1] - m * 0.05;
      } else {
        netY = (base1 + base2) / 2;
        k1 = netY - 0.32 * (netY - base1);
        k2 = netY + 0.32 * (base2 - netY);
      }
      set("run2", `top:${base2}px;height:${Math.max(0, CH - base2)}px`);
      set("baseline2", `top:${base2}px`);
      set("kitchen1", `top:${k1}px`);
      set("kitchen2", `top:${k2}px`);
      set("centre1", `top:${base1}px;height:${Math.max(0, k1 - base1)}px`);
      set("centre2", `top:${k2}px;height:${Math.max(0, base2 - k2)}px`);
      // the net's shadow render starts 0.1 m above the net line (flatlay.py net_split)
      set("netshadow", `top:${netY - 0.1 * m}px;height:${1.376 * m}px`);
    }
    // palm shade over the far edge of the message, and again over what to bring
    const stopOf = (k: string) => stops.find((s) => s.dataset.stop === k);
    const s1 = stopOf("message") ?? stops[1];
    const s2 = stopOf("bring");
    const shade = (k: string, s: HTMLElement | undefined, dx: number, dy: number, flip: boolean) => {
      const el = q(k);
      if (!el) return;
      if (!s) {
        el.style.display = "none";
        return;
      }
      el.style.cssText = `display:block;width:${3.9 * m}px;transform:translate(${W - dx * m}px,${s.offsetTop + dy * m}px)${flip ? " scaleX(-1)" : ""}`;
    };
    shade("shade1", s1, 1.1, 0.15, false);
    shade("shade2", s2 && s2 !== s1 ? s2 : undefined, 1.0, 0.35, true);
    placePlayer();
    const rs = stopOf("rsvp");
    const H = window.innerHeight || 800;
    anchor = rs ? (phone ? { x: W * 0.84, y: rs.offsetTop + H * 0.14 } : { x: m * 0.32, y: rs.offsetTop + H * 0.62 }) : null;
    sizeAir();
    placeRollers();
    if (!ballBusy && ballRest) {
      // the reply was sent (its boxes are gone) or reopened (the picked box is back)
      if (boxNow && !boxNow.isConnected) {
        const again = court.querySelector<HTMLElement>('.fl-box[aria-pressed="true"]');
        boxNow = again;
        ballRest = again ? boxSpot(again) : null;
        if (!again) {
          ball?.classList.remove("is-on");
          bsh?.classList.remove("is-on");
        }
      }
      restBall();
    }
    if (!motion) frame(performance.now(), true);
  }

  // ---------------------------------------------------------------- the player's shadow
  const player = q<HTMLCanvasElement>("player");
  function placePlayer() {
    const hero = stops[0];
    const w = hero?.querySelector<HTMLElement>(".fl-words");
    if (!player || !w) return;
    const o = offsetIn(w, court);
    // measured to the words' end without the map / calendar links (the shadow stays where the design put it)
    const links = w.querySelector<HTMLElement>(".fl-links");
    const wh = w.offsetHeight - (links ? links.offsetHeight + (parseFloat(getComputedStyle(links).marginTop) || 0) : 0);
    const PS = phone ? 1.15 : 1.35; // a bigger, closer shadow on a computer
    const reach = { x: 1.54 * m * PS, y: 2.34 * m * PS }; // feet → head end
    // the head-and-arm end lands in the open court below / right of the details
    const target = phone ? { x: 0.5 * m, y: o.y + wh + 0.22 * m } : { x: o.x + 0.42 * m, y: o.y + wh + 0.2 * m };
    const feet = { x: target.x - reach.x, y: target.y - reach.y };
    player.style.width = `${PF.w * m * PS}px`;
    player.style.transform = `translate(${feet.x + (PF.cx - PF.w / 2) * m * PS}px, ${feet.y + (PF.cy - PF.h / 2) * m * PS}px)`;
  }
  if (player) {
    const ctx = player.getContext("2d");
    const draw = (img: HTMLImageElement) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, player.width, player.height);
      ctx.drawImage(img, 0, 0, player.width, player.height);
    };
    if (!motion) {
      decoded([PLAYER[0]]).then(([img]) => !disposed && draw(img));
    } else {
      // the swing: a 2 s loop that never stops (24 fps), drawn only while it's on screen
      let frames: HTMLImageElement[] = [];
      let raf = 0, last = -1, seen = false;
      const t0 = performance.now();
      const tick = (now: number) => {
        raf = 0;
        if (disposed || !seen || !frames.length) return;
        const f = Math.floor(((now - t0) / 1000) * 24) % 48;
        if (f !== last) {
          last = f;
          draw(frames[f]);
        }
        raf = requestAnimationFrame(tick);
      };
      const io = new IntersectionObserver((es) => {
        seen = es.some((e) => e.isIntersecting);
        if (seen && !raf) raf = requestAnimationFrame(tick);
      });
      io.observe(player);
      cleanups.push(
        afterLoad(() =>
          introOver.then(() => decoded(PLAYER)).then((imgs) => {
            if (disposed) return;
            frames = imgs;
            draw(frames[0]);
            if (seen && !raf) raf = requestAnimationFrame(tick);
          }),
        ),
        () => {
          io.disconnect();
          cancelAnimationFrame(raf);
        },
      );
    }
  }

  // ---------------------------------------------------------------- the air: balloons and the net tape
  const air = q("air"), ground = q("ground"), tape = q("tape");
  let items: Item[] = [];
  function makeBalloons() {
    if (items.length || !air || !ground) return;
    items = BALLOONS.map(([color, dx, dy, h], i) => {
      const img = new Image();
      img.src = asset(`balloon-${color}`);
      img.alt = "";
      const sh = new Image();
      sh.src = asset(`balloon-${color}-shadow`);
      sh.alt = "";
      const str = document.createElement("i");
      str.className = "fl-str";
      const gs = document.createElement("i");
      gs.className = "fl-str";
      ground.append(gs, sh);
      air.append(str, img);
      cleanups.push(() => [img, sh, str, gs].forEach((el) => el.remove()));
      return { img, sh, str, gs, dx, dy, h, ph: i * 1.7 };
    });
    sizeAir();
  }
  function sizeAir() {
    for (const it of items) {
      it.img.style.width = `${0.2 * m}px`; // the balloon render is 0.32 m; these read as 10-inch balloons
      it.sh.style.width = `${0.275 * m}px`;
    }
    if (tape) {
      tape.style.width = `${W}px`;
      tape.style.height = `${0.08 * m}px`;
    }
  }
  let airShown = false, tapeShown = false, lastCam = NaN, lastBob = -1e9;
  const vis = (el: HTMLElement, on: boolean) => (el.style.visibility = on ? "visible" : "hidden");
  /** Place everything above the ground for a camera over (W/2, camY) on the court. */
  function frame(now: number, force = false) {
    const H = window.innerHeight || 800;
    const camX = W / 2;
    const camY = motion ? -court.getBoundingClientRect().top + H / 2 : anchor ? anchor.y - 0.3 * m : H / 2;
    const toS = (px: number, py: number, h: number): [number, number, number] => {
      const f = proj(h);
      return [camX + (px - camX) * f, camY + (py - camY) * f, f];
    };
    const moved = force || camY !== lastCam;
    lastCam = camY;
    // the balloons, while near the screen
    const near = !!anchor && Math.abs(anchor.y - camY) < H * 1.6;
    // the balloons bob at 30 fps while the page rests, and follow the camera every frame while it moves
    const idle = !moved && now - lastBob < 30;
    if (near && anchor && items.length && !idle) {
      lastBob = now;
      const t = now / 1000;
      const ax = anchor.x, ay = anchor.y;
      const [ax2, ay2] = toS(ax, ay, 0);
      const b0 = 0.2 * m;
      for (const it of items) {
        const bob = motion ? Math.sin(t * 0.9 + it.ph) * 0.03 : 0;
        const sway = motion ? Math.sin(t * 0.6 + it.ph * 1.3) * 0.025 : 0;
        const h = it.h + bob;
        const gx = ax + (it.dx + sway) * m, gy = ay + it.dy * m; // the point under the balloon
        const [sx, sy, f] = toS(gx, gy, h);
        it.img.style.transform = `translate(${sx - (b0 * f) / 2}px, ${sy - (b0 * f) / 2}px) scale(${f})`;
        // its shadow on the court: the ground point + h·(SX, SY), its render framed on that spot
        const shs = 0.275 * m;
        it.sh.style.transform = `translate(${gx + h * SX * m - shs / 2}px, ${gy + h * SY * m - shs / 2}px)`;
        // the string: from the knot (0.17 m under the balloon's middle) straight to the anchor; the
        // balloon is drawn over it, so it comes out from underneath
        const kh = Math.max(0, h - 0.17);
        const [kx, ky] = toS(gx, gy, kh);
        line(it.str, kx, ky, ax2, ay2);
        line(it.gs, gx + kh * SX * m, gy + kh * SY * m, ax, ay);
      }
      if (!airShown) {
        airShown = true;
        items.forEach((it) => [it.img, it.sh, it.str, it.gs].forEach((el) => vis(el, true)));
      }
    } else if (!near && airShown) {
      airShown = false;
      items.forEach((it) => [it.img, it.sh, it.str, it.gs].forEach((el) => vis(el, false)));
    }
    // the net tape, 0.88 m up, drawn over its shadow
    if (tape) {
      const on = netY >= 0 && Math.abs(netY - camY) < H * 1.2;
      if (on && moved) {
        const [, ty, tf] = toS(0, netY, 0.88);
        tape.style.transform = `translate(${camX - camX * tf}px, ${ty - 0.04 * m * tf}px) scale(${tf})`;
      }
      if (on !== tapeShown) {
        tapeShown = on;
        vis(tape, on);
      }
    }
  }
  /** A string from (x0, y0) to (x1, y1): a 100px stick, turned and stretched (no repaint). */
  function line(el: HTMLElement, x0: number, y0: number, x1: number, y1: number) {
    const dx = x1 - x0, dy = y1 - y0;
    el.style.transform = `translate(${x0}px, ${y0}px) rotate(${Math.atan2(-dx, dy)}rad) scaleY(${Math.hypot(dx, dy) / 100})`;
  }
  if (motion) {
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (W) frame(now);
    };
    raf = requestAnimationFrame(loop);
    cleanups.push(() => cancelAnimationFrame(raf));
  }
  // the balloons and the net's shadow load as the reply / the net come near
  const near = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (el.dataset.stop === "rsvp") makeBalloons();
        if (el.dataset.fl === "netshadow") el.classList.add("is-near");
        near.unobserve(el);
      }
      if (!motion) frame(performance.now(), true);
    },
    { rootMargin: "150% 0px" },
  );
  cleanups.push(() => near.disconnect());

  // ---------------------------------------------------------------- the ball
  const ball = q("ball"), bsh = q("bshadow");
  let ballBusy = false;
  let ballRest: (() => Pt | null) | null = null;
  let ballAt: Pt | null = null;
  const dropFrames = decoded([DROP[0]]);
  let dropReady: Promise<unknown> = dropFrames;
  const xReady = motion ? decoded(ROLLX) : decoded([ROLLX[0]]);
  if (motion) cleanups.push(afterLoad(() => (dropReady = introOver.then(() => decoded(DROP)))));
  function place(x: number, y: number, h: number, fr: number, set = DROP) {
    if (!ball || !bsh) return;
    const r = m * 0.049, f = proj(h);
    ball.classList.add("is-on");
    bsh.classList.add("is-on");
    const src = `url("${set[((fr % 24) + 24) % 24]}")`;
    if (ball.style.backgroundImage !== src) ball.style.backgroundImage = src;
    ball.style.transform = `translate(${x - r}px, ${y - r}px) scale(${f})`;
    const bs = FL["ball-shadow"];
    const sw = m * bs.w, sh = m * bs.h;
    bsh.style.width = `${sw}px`;
    bsh.style.transform = `translate(${x + h * SX * m - sw * (bs.fx ?? 0.35)}px, ${y + h * SY * m - sh * (bs.fy ?? 0.3)}px)`;
    bsh.style.opacity = String(Math.max(0.3, 1 - h * 0.3));
    bsh.style.filter = h > 0.01 ? `blur(${h * 5}px)` : "none";
    ballAt = { x, y };
  }
  function restBall() {
    const p = ballRest?.();
    if (p) place(p.x, p.y, 0, 0, ROLLX);
  }
  /** Drop from h0 metres while drifting to (x1, y1); it bounces and rolls to a stop. */
  async function drop(x0: number, y0: number, x1: number, y1: number, h0 = 2.6) {
    await dropReady;
    if (disposed) return;
    ballBusy = true;
    const g = 9.8, e = 0.6;
    let h = h0, v = 0, bounces = 0, rest = false;
    const t0 = performance.now();
    let last = t0;
    await new Promise<void>((done) => {
      const step = (now: number) => {
        if (disposed) return done();
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        if (!rest) {
          v -= g * dt;
          h += v * dt;
          if (h <= 0) {
            h = 0;
            v = -v * e;
            if (++bounces > 3 || v < 0.45) {
              v = 0;
              rest = true;
            }
          }
        }
        const k = Math.min(1, (now - t0) / 2300), ease = 1 - Math.pow(1 - k, 3);
        const x = x0 + (x1 - x0) * ease, y = y0 + (y1 - y0) * ease;
        place(x, y, h, Math.round((Math.hypot(x - x0, y - y0) / (m * TURN)) * 24));
        if (rest && k >= 1) done();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    ballBusy = false;
  }
  function nameSpot(): Pt | null {
    const name = q("name");
    if (!name) return null;
    const o = offsetIn(name, court);
    const x = phone ? W * 0.8 : Math.min(o.x + name.offsetWidth + m * 0.12, W - m * 0.15);
    return { x, y: o.y + name.offsetHeight * 0.42 };
  }
  function dropIntro() {
    const p = nameSpot();
    if (!p) return;
    ballRest = nameSpot;
    drop(p.x - m * 0.45, p.y - m * 0.7, p.x, p.y);
  }
  let boxNow: HTMLElement | null = null;
  const boxSpot = (b: HTMLElement) => () => {
    if (!b.isConnected) return null;
    const o = offsetIn(b, court);
    return { x: o.x + b.offsetWidth * 0.84, y: o.y + b.offsetHeight * 0.74 }; // the box's corner, clear of the word
  };
  function pick(box: HTMLElement) {
    if (box === boxNow) return;
    const from = boxNow && boxNow.isConnected ? ballAt : null;
    boxNow = box;
    ballRest = boxSpot(box);
    const p = ballRest();
    if (!p) return;
    if (!motion) return restBall();
    if (!from || ballBusy) {
      drop(p.x - m * 0.3, p.y - m * 0.55, p.x, p.y, 1.8);
      return;
    }
    // changing your mind: it rolls across
    ballBusy = true;
    const t0 = performance.now(), T = 650;
    const step = (now: number) => {
      if (disposed) return;
      const k = Math.min(1, (now - t0) / T), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const bx = from.x + (p.x - from.x) * e, by = from.y + (p.y - from.y) * e;
      place(bx, by, 0, Math.round(((bx - from.x) / (m * TURN)) * 24), ROLLX);
      if (k < 1) requestAnimationFrame(step);
      else ballBusy = false;
    };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- balls that roll in
  let introOver: Promise<void> = Promise.resolve();
  function setRoller(el: Roller, x: number, fr: number) {
    if (!el.rb || !el.rs) return;
    const bs = FL["ball-shadow"];
    const d = 0.098 * m, sw = bs.w * m, sh = bs.h * m;
    el.rb.style.width = el.rb.style.height = `${d}px`;
    const src = `url("${ROLLX[((fr % 24) + 24) % 24]}")`;
    if (el.rb.style.backgroundImage !== src) el.rb.style.backgroundImage = src;
    el.rb.style.transform = `translate(${x - d / 2}px, ${-d / 2}px)`;
    el.rs.style.width = `${sw}px`;
    el.rs.style.transform = `translate(${x - sw * (bs.fx ?? 0.35)}px, ${-sh * (bs.fy ?? 0.3)}px)`;
  }
  const rollIO = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        rollIO.unobserve(e.target);
        const r = e.target.querySelector<Roller>(".fl-roller");
        if (r) roll(r);
      }
    },
    { threshold: 0.35 },
  );
  cleanups.push(() => rollIO.disconnect());
  const watched = new WeakSet<HTMLElement>();
  function placeRollers() {
    court.querySelectorAll<Roller>(".fl-roller").forEach((el) => {
      if (!el.rb) {
        el.rb = document.createElement("div");
        el.rb.className = "fl-rb";
        el.rs = document.createElement("img");
        el.rs.className = "fl-rs";
        el.rs.src = asset("ball-shadow");
        el.rs.alt = "";
        el.append(el.rs, el.rb);
      }
      if (!watched.has(el)) {
        // (a court restarted on the same page watches its rollers again)
        watched.add(el);
        const stop = el.closest<HTMLElement>("[data-stop]");
        if (motion && stop && !el.done) rollIO.observe(stop);
        else el.done = true;
      }
      if (!el.rolling) setRoller(el, el.done ? 0 : -0.9 * m, 0);
      if (el.done) xReady.then(() => el.classList.add("is-on"));
    });
  }
  async function roll(el: Roller) {
    el.rolling = true;
    await xReady;
    await introOver;
    if (disposed) return;
    el.classList.add("is-on");
    const dist = 0.9 * m, t0 = performance.now(), T = 1700;
    const step = (now: number) => {
      if (disposed) return;
      const k = Math.min(1, (now - t0) / T), ease = 1 - Math.pow(1 - k, 3); // rolls in and slows to a stop
      const x = -dist * (1 - ease);
      setRoller(el, x, Math.round(((x + dist) / (m * TURN)) * 24));
      if (k < 1) requestAnimationFrame(step);
      else {
        el.rolling = false;
        el.done = true;
      }
    };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- the opening: the line painter
  function intro(): Promise<void> {
    return new Promise((done) => {
      const html = document.documentElement;
      const prevOverflow = html.style.overflow;
      html.style.overflow = "hidden"; // the page holds still; the swipe that skips it is spent
      const els = [q("baseline1"), ...Array.from(stops[0]?.querySelectorAll<HTMLElement>("[data-fl-paint]") ?? [])].filter(Boolean) as HTMLElement[];
      const lanes: HTMLElement[] = [];
      let bot: HTMLImageElement | null = null;
      let stopped = false, raf = 0;
      const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
      /** The painted word, for good: wet a moment, then it dries (a composited filter fade). */
      const reveal = (el: HTMLElement, wet: boolean) => {
        el.style.clipPath = "none";
        if (!wet || !el.classList.contains("fl-paint")) return;
        el.classList.add("is-wet", "is-drying");
        window.setTimeout(() => el.classList.remove("is-wet"), 500);
        window.setTimeout(() => el.classList.remove("is-drying"), 2200);
      };
      const finish = (e?: Event) => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(raf);
        // skipped or done: painted for good; torn down (the court restarts): back to the page's own state
        els.forEach((el) => (disposed ? (el.style.clipPath = "") : el.style.clipPath === "none" || reveal(el, false)));
        lanes.forEach((l) => l.remove());
        bot?.remove();
        evs.forEach((ev) => window.removeEventListener(ev, finish));
        // a skip lets go of the page just after the input that skipped it, so the one-swipe engine
        // still sees the page held and spends that gesture (it doesn't also move a stop)
        const unlock = () => (html.style.overflow = prevOverflow);
        if (e instanceof Event && !disposed) window.setTimeout(unlock, 0);
        else unlock();
        done();
      };
      evs.forEach((e) => window.addEventListener(e, finish, { passive: true }));
      cleanups.push(() => finish());
      const robots = decoded([asset("robot-r"), asset("robot-l")]);
      Promise.all([document.fonts?.ready, robots, new Promise((ok) => window.setTimeout(ok, 350))]).then(([, imgs]) => {
        if (stopped || disposed) return;
        const [right, left] = imgs as HTMLImageElement[];
        layout();
        // Each lane of a word is a window onto a copy of it, painted once: the window slides open
        // behind the nozzle by transform alone (its copy slides back the other way), so nothing is
        // repainted while the robot drives (the paint is a background clipped to the letters).
        type Pass = { el: HTMLElement; i: number; n: number; h: number; w: number; top: number; left: number; x0: number; x1: number; dir: number; win: HTMLElement; copy: HTMLElement };
        const passes: Pass[] = [];
        els.forEach((el) => {
          const o = offsetIn(el, court), line = el.dataset.fl === "baseline1";
          const h = el.offsetHeight, w = line ? W : el.offsetWidth;
          const x0 = line ? 0 : o.x, x1 = line ? W : o.x + textWidth(el) + 4;
          const n = line ? 1 : Math.max(1, Math.ceil(h / (0.28 * m)));
          for (let i = 0; i < n; i++) {
            const yt = Math.floor((h * i) / n), yb = Math.ceil((h * (i + 1)) / n);
            const win = document.createElement("div");
            win.className = "fl-lane";
            win.style.cssText = `left:${line ? 0 : o.x}px;top:${o.y + yt}px;width:${w}px;height:${yb - yt}px`;
            const copy = el.cloneNode(true) as HTMLElement;
            copy.removeAttribute("data-fl-paint");
            copy.removeAttribute("data-fl");
            copy.removeAttribute("id");
            copy.setAttribute("aria-hidden", "true");
            copy.classList.add("is-wet");
            copy.style.cssText = `position:absolute;left:0;right:auto;top:${-yt}px;width:${w}px;height:${h}px;margin:0;clip-path:none`;
            win.appendChild(copy);
            court.appendChild(win);
            lanes.push(win);
            passes.push({ el, i, n, h, w, top: o.y, left: line ? 0 : o.x, x0, x1, dir: passes.length % 2 ? -1 : 1, win, copy });
          }
        });
        bot = new Image();
        bot.className = "fl-robot";
        bot.alt = "";
        court.appendChild(bot);
        const put = (x: number, y: number, dir: number) => {
          if (!bot) return;
          const g = FL[dir > 0 ? "robot-r" : "robot-l"];
          const img = dir > 0 ? right : left;
          if (bot.src !== img.src) bot.src = img.src;
          bot.style.width = `${g.w * m}px`;
          bot.style.transform = `translate(${x + (g.x0 ?? -0.23) * m}px, ${y - (g.y1 ?? 0.195) * m}px)`;
        };
        /** Open a lane's window up to the paint's edge (xn, in the word's own box). */
        const open = (p: Pass, xn: number) => {
          const k = p.dir > 0 ? Math.min(0, Math.max(-p.w, xn - p.w)) : Math.max(0, Math.min(p.w, xn));
          p.win.style.transform = `translateX(${k}px)`;
          p.copy.style.transform = `translateX(${-k}px)`;
        };
        // every window shut to start with (on screen, so each copy is painted now, not mid-drive)
        passes.forEach((p) => open(p, p.dir > 0 ? -p.w : p.w * 2));
        const v = (3.4 * m) / 1000, off = 0.36 * m, nozzle = 0.18 * m; // speed (px/ms), run-in, nozzle behind centre
        let k = 0, t0 = performance.now();
        const step = (now: number) => {
          if (stopped) return;
          const p = passes[k];
          if (!p) {
            // it drives off, then the court is ready
            const t = now - t0, lp = passes[passes.length - 1];
            if (!lp) return finish();
            const x = (lp.dir > 0 ? lp.x1 + off : lp.x0 - off) + v * t * lp.dir;
            put(x, lp.top + (lp.h * (lp.i + 0.5)) / lp.n, lp.dir);
            if (t > 600) return finish();
            raf = requestAnimationFrame(step);
            return;
          }
          const sx = p.dir > 0 ? p.x0 - off : p.x1 + off, ex = p.dir > 0 ? p.x1 + off : p.x0 - off;
          const T = Math.abs(ex - sx) / v, t = Math.min(T, now - t0);
          const x = sx + (ex - sx) * (t / T), y = p.top + (p.h * (p.i + 0.5)) / p.n;
          put(x, y, p.dir);
          open(p, x - p.dir * nozzle - p.left);
          if (t >= T) {
            open(p, p.dir > 0 ? p.w : 0);
            if (p.i === p.n - 1) {
              // the whole word is down: the real one takes over from its lanes, and dries
              reveal(p.el, true);
              const el = p.el;
              requestAnimationFrame(() => passes.forEach((o) => o.el === el && o.win.remove()));
            }
            k++;
            t0 = now;
          }
          raf = requestAnimationFrame(step);
        };
        // two frames for those first paints, then it sets off
        raf = requestAnimationFrame(() => (raf = requestAnimationFrame((now) => ((t0 = now), step(now)))));
      });
    });
  }

  // ---------------------------------------------------------------- start
  layout();
  court.querySelectorAll<HTMLElement>('[data-stop="rsvp"], [data-fl="netshadow"]').forEach((el) => near.observe(el));
  const ro = new ResizeObserver(() => layout());
  ro.observe(court);
  cleanups.push(() => ro.disconnect());
  document.fonts?.ready.then(() => !disposed && layout());

  if (opts.intro && motion) {
    let end: () => void = () => {};
    introOver = new Promise((ok) => (end = ok));
    intro().then(() => {
      if (disposed) return;
      opts.onIntroEnd();
      end();
      window.setTimeout(() => !disposed && dropIntro(), 150);
    });
  } else if (motion) {
    window.setTimeout(() => !disposed && dropIntro(), 400);
  } else {
    // the builder, the gallery card, reduced motion: the ball at rest beside the name
    ballRest = nameSpot;
    dropFrames.then(() => xReady).then(() => !disposed && !ballBusy && restBall());
  }

  return {
    pick,
    relayout: layout,
    dispose: () => {
      disposed = true;
      cleanups.splice(0).forEach((f) => f());
    },
  };
}
