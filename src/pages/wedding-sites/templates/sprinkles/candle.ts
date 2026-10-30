import { mix, rgba, type Flavour } from "./flavours";
import { rng } from "./sample";

/**
 * The number candle on top of the cake: the age in wax (a stripe wound round it, a little
 * glitter, lit from the top left, its long shadow on the buttercream), a wick, and a live flame.
 *  - The flame flickers on its own and leans away from a finger or the pointer near it, and with
 *    the page's movement; its glow warms the icing round it.
 *  - blow(): the flame gutters and goes out, the wick glows for a moment and a wisp of smoke curls
 *    up. Lit again (light()) when the page comes back to the top.
 *  - The wax is drawn once; each frame redraws only the flame and the smoke on top of it, and the
 *    frames stop while the candle is off screen, and once the smoke has gone.
 *  - Still (builder, gallery card, reduced motion): drawn once, lit, the flame upright.
 */

export type Candle = { blow: () => boolean; light: () => void; lit: () => boolean; lean: (v: number) => void; dispose: () => void };

export function createCandle(cv: HTMLCanvasElement, o: { text: string; font: string; size: number; f: Flavour; animate: boolean }): Candle {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const txt = o.text || "";
  const size = o.size;
  const font = `800 ${size}px ${o.font}`;
  const m = document.createElement("canvas").getContext("2d")!;
  m.font = font;
  const met = m.measureText(txt || "0");
  const tw = Math.ceil(met.width), asc = met.actualBoundingBoxAscent || size * 0.72, desc = met.actualBoundingBoxDescent || 0;
  const th = Math.ceil(asc + desc);
  const pad = { l: 24, r: Math.round(size * 0.75), t: Math.round(size * 1.6), b: Math.round(size * 0.35) };
  const W = tw + pad.l + pad.r, H = th + pad.t + pad.b;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  // the canvas reaches past the digits (the flame and smoke above, the shadow to the right);
  // the digits themselves sit exactly in the candle's own box
  cv.style.left = `${-pad.l}px`;
  cv.style.top = `${-pad.t}px`;
  const box = cv.parentElement;
  if (box) { box.style.width = `${tw}px`; box.style.height = `${th}px`; }
  const ctx = cv.getContext("2d")!;
  const base = { x: pad.l, y: pad.t + asc }; // the text's baseline origin
  const r = rng(txt.length * 131 + 7);

  // ---- the wax, once
  const body = document.createElement("canvas");
  body.width = cv.width;
  body.height = cv.height;
  const b = body.getContext("2d")!;
  b.scale(dpr, dpr);
  b.font = font;
  b.textBaseline = "alphabetic";
  // its long shadow on the icing (light from the top left)
  b.save();
  b.filter = `blur(${Math.max(3, size * 0.05)}px)`;
  b.globalAlpha = 0.28;
  b.fillStyle = "#2a0d05";
  // the digits laid flat from their base line, away from the light
  const yb = base.y;
  b.setTransform(dpr, 0, -0.62 * dpr, -0.26 * dpr, 0.62 * yb * dpr, 1.26 * yb * dpr);
  b.fillText(txt, base.x, yb);
  b.restore();
  // the digits in wax: the colour lit from above, the stripe, the bevel, a little glitter
  const wax = document.createElement("canvas");
  wax.width = cv.width;
  wax.height = cv.height;
  const w = wax.getContext("2d")!;
  w.scale(dpr, dpr);
  w.font = font;
  w.fillStyle = "#000";
  w.fillText(txt, base.x, base.y);
  w.globalCompositeOperation = "source-atop";
  const g = w.createLinearGradient(base.x, base.y - asc, base.x + tw, base.y);
  g.addColorStop(0, mix(o.f.wax, "#ffffff", 0.45));
  g.addColorStop(0.5, o.f.wax);
  g.addColorStop(1, mix(o.f.wax, "#000000", 0.18));
  w.fillStyle = g;
  w.fillRect(0, 0, W, H);
  w.strokeStyle = rgba(o.f.waxStripe, 0.9);
  w.lineWidth = size * 0.07;
  for (let x = -H; x < W + H; x += size * 0.2) { w.beginPath(); w.moveTo(x, base.y + desc + 4); w.lineTo(x + th * 0.8, base.y - asc - 4); w.stroke(); }
  // bevel: dark on the lower right, light on the upper left
  w.lineJoin = "round";
  w.lineWidth = size * 0.07;
  w.strokeStyle = "rgba(60, 20, 10, 0.28)";
  w.strokeText(txt, base.x + size * 0.035, base.y + size * 0.035);
  w.strokeStyle = "rgba(255, 255, 255, 0.6)";
  w.lineWidth = size * 0.04;
  w.strokeText(txt, base.x - size * 0.03, base.y - size * 0.03);
  for (let i = 0; i < tw * th * 0.012; i++) {
    w.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.6})`;
    w.fillRect(base.x + r() * tw, base.y - asc + r() * th, 1, 1);
  }
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.drawImage(wax, 0, 0);
  b.setTransform(dpr, 0, 0, dpr, 0, 0);
  // a wick on each digit: where its stroke is highest, near the digit's middle
  const alpha = w.getImageData(0, 0, wax.width, wax.height).data;
  const tips: { x: number; y: number }[] = [];
  let acc = 0;
  for (const ch of [...txt]) {
    const cw = m.measureText(ch).width;
    let best = { x: base.x + acc + cw / 2, y: base.y - asc };
    let bestY = Infinity;
    for (let x = base.x + acc + cw * 0.3; x <= base.x + acc + cw * 0.7; x += 1) {
      const px = Math.round(x * dpr);
      for (let py = 0; py < wax.height; py++) {
        if (alpha[(py * wax.width + px) * 4 + 3] > 140) {
          const y = py / dpr, score = y + Math.abs(x - (base.x + acc + cw / 2)) * 0.25;
          if (score < bestY) { bestY = score; best = { x, y }; }
          break;
        }
      }
    }
    acc += cw;
    b.strokeStyle = "#2b1d16";
    b.lineWidth = Math.max(1.6, size * 0.022);
    b.lineCap = "round";
    b.beginPath();
    b.moveTo(best.x, best.y + 3);
    b.quadraticCurveTo(best.x + 1, best.y - size * 0.06, best.x + 2, best.y - size * 0.1);
    b.stroke();
    tips.push({ x: best.x + 2, y: best.y - size * 0.1 });
  }

  // ---- the flame and the smoke, each frame
  let lit = true, out = 0, lean = 0, leanV = 0, push = 0, raf = 0, alive = true, last = 0, visible = true, t0 = performance.now();
  const smoke: { x: number; y: number; vx: number; vy: number; age: number; life: number }[] = [];
  const ph = [r() * 9, r() * 9, r() * 9];
  const fh = size * 0.36, fw = size * 0.11;
  const flame = (t: number, k: number) => { for (const tp of tips) flameAt(tp, t, k); };
  const flameAt = (tip: { x: number; y: number }, t: number, k: number) => {
    // k: 1 burning, falling to 0 as it goes out
    const fl = 1 + 0.06 * Math.sin(t * 13 + ph[0]) + 0.05 * Math.sin(t * 23 + ph[1]) + 0.04 * Math.sin(t * 7.3 + ph[2]);
    const h = fh * fl * k, wd = fw * (0.9 + 0.1 * Math.sin(t * 17)) * Math.max(0.35, k);
    const lx = lean * h * 0.9 + Math.sin(t * 5 + ph[1]) * h * 0.03;
    const x = tip.x, y = tip.y;
    // the glow on the icing
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(x + lx * 0.4, y - h * 0.35, 0, x + lx * 0.4, y - h * 0.35, size * 0.9);
    glow.addColorStop(0, `rgba(255, 170, 70, ${0.24 * k})`);
    glow.addColorStop(1, "rgba(255, 140, 40, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const shape = (sc: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + wd * 0.2 * sc);
      ctx.bezierCurveTo(x + wd * 1.15 * sc, y, x + wd * 0.6 * sc + lx * 0.5, y - h * 0.55 * sc, x + lx * sc, y - h * sc);
      ctx.bezierCurveTo(x - wd * 0.6 * sc + lx * 0.5, y - h * 0.55 * sc, x - wd * 1.15 * sc, y, x, y + wd * 0.2 * sc);
    };
    shape(1);
    const og = ctx.createLinearGradient(x, y, x + lx, y - h);
    og.addColorStop(0, `rgba(255, 140, 40, ${0.95 * k})`);
    og.addColorStop(0.6, `rgba(255, 190, 90, ${0.9 * k})`);
    og.addColorStop(1, `rgba(255, 230, 160, ${0.2 * k})`);
    ctx.fillStyle = og;
    ctx.fill();
    shape(0.6);
    ctx.fillStyle = `rgba(255, 250, 225, ${0.95 * k})`;
    ctx.fill();
    // the blue at its root
    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.04, wd * 0.5, h * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(90, 130, 255, ${0.5 * k})`;
    ctx.fill();
  };
  const paint = (t: number, dt: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(body, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the lean: a spring toward the push (the finger, the page's movement), easing back upright
    leanV += ((push - lean) * 90 - leanV * 11) * dt;
    lean = Math.max(-1.1, Math.min(1.1, lean + leanV * dt));
    push *= Math.exp(-3 * dt);
    if (lit) flame(t, 1);
    else if (out < 1) {
      out = Math.min(1, out + dt / 0.22);
      flame(t, 1 - out);
    }
    if (!lit) {
      // the ember on the wick
      const e = Math.max(0, 1 - (t - outAt) / 1.6);
      if (e > 0)
        for (const tip of tips) {
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, Math.max(1.2, size * 0.014), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 110, 40, ${e})`;
          ctx.fill();
        }
      // the smoke: a thread that curls as it rises, widening and fading
      for (const p of smoke) {
        p.age += dt;
        p.vx += Math.sin(p.age * 3.2 + p.life * 5) * 30 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy *= Math.exp(-0.4 * dt);
      }
      while (smoke.length && smoke[0].age > smoke[0].life) smoke.shift();
      if (t - outAt < 0.9) smoke.push({ x: tips[0].x, y: tips[0].y - 2, vx: (r() - 0.5) * 6 + lean * 20, vy: -size * (0.55 + r() * 0.2), age: 0, life: 1.8 + r() * 0.6 });
      if (smoke.length > 1) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < smoke.length; i++) {
          const a = smoke[i - 1], p = smoke[i], k = 1 - p.age / p.life;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(200, 196, 190, ${0.5 * k * k})`;
          ctx.lineWidth = 1.4 + p.age * 5;
          ctx.stroke();
        }
      }
    }
  };
  let outAt = 0;
  const busy = () => lit || out < 1 || smoke.length > 0;
  const frame = (ms: number) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.05, (ms - last) / 1000);
    last = ms;
    paint((ms - t0) / 1000, dt);
    if (visible && busy()) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (o.animate && alive && !raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const io = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); wake(); });
  io.observe(cv);
  // a finger or the pointer near the flame pushes it away
  const near = (e: PointerEvent) => {
    const rc = cv.getBoundingClientRect();
    const tip = tips[0] ?? { x: 0, y: 0 };
    const dx = rc.left + tip.x - e.clientX, dy = rc.top + tip.y - e.clientY, d = Math.hypot(dx, dy);
    if (d < size * 1.6) { push = Math.max(-1, Math.min(1, (Math.sign(dx) * (1 - d / (size * 1.6))) * 1.4)); wake(); }
  };
  if (o.animate) window.addEventListener("pointermove", near, { passive: true });
  paint(0.4, 0);
  wake();

  return {
    blow() {
      if (!lit) return false;
      lit = false;
      out = 0;
      outAt = (performance.now() - t0) / 1000;
      push = 1;
      smoke.length = 0;
      wake();
      return true;
    },
    light() {
      if (lit) return;
      lit = true;
      wake();
    },
    lit: () => lit,
    lean(v) { push = Math.max(-1, Math.min(1, v)); wake(); },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", near);
    },
  };
}
