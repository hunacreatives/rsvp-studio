import { useEffect, type RefObject } from "react";
import { createWorld, heightAt, PLACES, VIEW_OF, type Camera, type PlaceKey } from "./world";

/**
 * Level Up's flight: the world on the sticky frame, the camera flying between the stops as the
 * guest scrolls (each stop a section, [data-lu-stop], with data-lu-view: which viewpoint), the
 * minimap and the XP bar.
 *  - The camera holds still while a stop is in view and flies between them, taking at least
 *    TRIP seconds however fast the scroll (it catches up after a fast one).
 *  - `intro` (a ref, 0→1, the title screen's swoop) is read every frame.
 *  - Kept light: the world draws ≤30 frames a second at ≤1.25× pixels, only while on screen
 *    and the tab is shown. `animate` false (builder, gallery card, reduced motion): no easing,
 *    a still frame redrawn on scroll.
 */

const TRIP = 1.9;

export function useQuest(
  refs: {
    root: RefObject<HTMLElement | null>;
    stage: RefObject<HTMLElement | null>;
    gl: RefObject<HTMLCanvasElement | null>;
    map: RefObject<HTMLCanvasElement | null>;
    xp: RefObject<HTMLElement | null>;
    xpLabel: RefObject<HTMLElement | null>;
    where: RefObject<HTMLElement | null>;
    intro: RefObject<number>;
  },
  { routeKey, names, animate }: { routeKey: string; names: string[]; animate: boolean },
) {
  const namesKey = names.join("|");
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current, cv = refs.gl.current;
    if (!root || !stage || !cv) return;
    const world = createWorld(cv);
    if (!world) cv.style.display = "none";
    const route = routeKey.split(",").map(Number);
    const labels = namesKey.split("|");

    // ---- the minimap: the island drawn once from its heights
    const map = refs.map.current, mc = map?.getContext("2d") ?? null, base = document.createElement("canvas");
    base.width = base.height = 320;
    {
      const b = base.getContext("2d");
      if (b) {
        const img = b.createImageData(320, 320);
        for (let j = 0; j < 320; j++) for (let i = 0; i < 320; i++) {
          const h = heightAt((i / 320 - 0.5) * 180, (j / 320 - 0.5) * 180);
          const c = h < -3 ? [24, 86, 140] : h < 0.1 ? [64, 178, 196] : h < 1.6 ? [233, 214, 160] : h > 16 ? [170, 168, 160] : [96 - h * 2, 176 - h * 3, 92 - h * 2];
          img.data.set([c[0], c[1], c[2], 255], (j * 320 + i) * 4);
        }
        b.putImageData(img, 0, 0);
      }
    }
    const toMap = (x: number, z: number) => [(x / 180 + 0.5) * 320, (z / 180 + 0.5) * 320];
    const places = (Object.keys(VIEW_OF) as PlaceKey[]).filter((k) => route.includes(VIEW_OF[k])).sort((a, b) => route.indexOf(VIEW_OF[a]) - route.indexOf(VIEW_OF[b]));
    const drawMap = (cam: Camera | null) => {
      if (!mc) return;
      mc.clearRect(0, 0, 320, 320);
      mc.drawImage(base, 0, 0);
      mc.setLineDash([6, 8]); mc.strokeStyle = "rgba(255,255,255,0.8)"; mc.lineWidth = 3; mc.beginPath();
      places.forEach((k, i) => { const [x, y] = toMap(PLACES[k].x, PLACES[k].z); if (i) mc.lineTo(x, y); else mc.moveTo(x, y); });
      mc.stroke(); mc.setLineDash([]);
      places.forEach((k) => {
        const [x, y] = toMap(PLACES[k].x, PLACES[k].z);
        mc.fillStyle = "#7ff0ff"; mc.strokeStyle = "#0a1628"; mc.lineWidth = 3;
        mc.beginPath(); mc.moveTo(x, y - 11); mc.lineTo(x + 8, y); mc.lineTo(x, y + 11); mc.lineTo(x - 8, y); mc.closePath(); mc.fill(); mc.stroke();
      });
      if (cam) {
        const [x, y] = toMap(cam.eye[0], cam.eye[2]), a = Math.atan2(cam.at[2] - cam.eye[2], cam.at[0] - cam.eye[0]);
        mc.save(); mc.translate(Math.max(14, Math.min(306, x)), Math.max(14, Math.min(306, y))); mc.rotate(a);
        mc.fillStyle = "#ffd24a"; mc.strokeStyle = "#0a1628"; mc.lineWidth = 3;
        mc.beginPath(); mc.moveTo(16, 0); mc.lineTo(-10, 10); mc.lineTo(-5, 0); mc.lineTo(-10, -10); mc.closePath(); mc.fill(); mc.stroke(); mc.restore();
      }
    };

    // ---- the stops, and where the camera is for a scroll position
    let centres: number[] = [0], H = 1;
    const scrolled = () => stage.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const measure = () => {
      const rt = root.getBoundingClientRect();
      H = Math.max(1, stage.getBoundingClientRect().height);
      const max = Math.max(0, rt.height - H);
      const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-lu-stop]"));
      centres = stops.map((s) => { const r = s.getBoundingClientRect(); return Math.min(max, Math.max(0, r.top - rt.top + Math.min(r.height, H) / 2 - H / 2)); });
      if (!centres.length) centres = [0];
    };
    const stopAt = (y: number) => {
      if (y <= centres[0]) return 0;
      for (let i = 0; i < centres.length - 1; i++) {
        const a = centres[i], b = centres[i + 1];
        if (y <= b) { const t = Math.min(1, Math.max(0, (y - a) / Math.max(1, b - a))); const m = Math.min(1, Math.max(0, (t - 0.15) / 0.7)); return i + m * m * (3 - 2 * m); }
      }
      return centres.length - 1;
    };

    let target = 0, X = 0, vel = 0, prevT = 0, lastDraw = -1e9, raf = 0, visible = true;
    const t0 = performance.now();
    const hud = () => {
      const p = Math.min(1, Math.max(0, scrolled() / Math.max(1, root.getBoundingClientRect().height - H)));
      if (refs.xp.current) refs.xp.current.style.width = `${(p * 100).toFixed(1)}%`;
      if (refs.xpLabel.current) refs.xpLabel.current.textContent = `XP ${Math.round(p * 100)}%`;
      if (refs.where.current) refs.where.current.textContent = labels[Math.round(X)] ?? labels[0] ?? "";
    };
    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(0.12, prevT ? (now - prevT) / 1000 : 0.016); prevT = now;
      if (!animate) { X = target; vel = 0; }
      else {
        const D = 1, vmax = (D / TRIP) * 1.4, acc = (vmax * vmax) / (D * 0.35), d = target - X;
        const want = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * acc * Math.abs(d)));
        vel += Math.max(-acc * dt, Math.min(acc * dt, want - vel));
        if (Math.abs(vel * dt) >= Math.abs(d) || (Math.abs(d) < 0.001 && Math.abs(vel) < 0.05)) { X = target; vel = 0; } else X += vel * dt;
      }
      if (now - lastDraw >= 32) {
        lastDraw = now;
        const cam = world ? world.draw({ route, at: X, intro: refs.intro.current ?? 1, time: animate ? (now - t0) / 1000 : 12 }) : null;
        drawMap(cam);
        hud();
      }
      if (visible && !document.hidden && (animate || X !== target)) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) { prevT = 0; lastDraw = -1e9; raf = requestAnimationFrame(loop); } };
    const onScroll = () => { target = stopAt(scrolled()); kick(); };

    world?.size();
    measure();
    target = stopAt(scrolled()); X = target;
    kick();
    const ro = new ResizeObserver(() => { world?.size(); measure(); onScroll(); lastDraw = -1e9; kick(); });
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
      world?.dispose();
    };
    // the refs are stable; routeKey and namesKey stand for the route and the stop names
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, namesKey, animate]);
}
