import { useEffect, useLayoutEffect, useRef, useState } from "react";

// The red thread (紅線) that runs down the page: out of the seal, down the margin, once around
// each section's Chinese label (like the thread tied around the gold bangles at a ting hun),
// and at the end across to the papercut 囍, which hangs from it.
//
// The path is measured from the page itself (.rp-seal, .rp-knot, .rp-xi), so it follows any
// content. With `play` (published page / design preview, motion allowed) it draws itself as you
// scroll, a little ahead of where you're reading, once `go` (the seal has settled); otherwise
// it is simply there, whole.

type Box = { x: number; y: number; w: number; h: number };

function buildPath(root: HTMLElement): { d: string; w: number; h: number } | null {
  const R = root.getBoundingClientRect();
  const scale = R.width / (root.offsetWidth || 1) || 1;
  const rel = (el: Element): Box | null => {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: (r.left - R.left) / scale, y: (r.top - R.top) / scale, w: r.width / scale, h: r.height / scale };
  };
  const seal = root.querySelector(".rp-seal");
  const s = seal ? rel(seal) : null;
  if (!s) return null;
  const knots = [...root.querySelectorAll(".rp-knot")].map(rel).filter((b): b is Box => !!b).sort((a, b) => a.y - b.y);
  const xiEl = root.querySelector(".rp-xi");
  const xi = xiEl ? rel(xiEl) : null;

  const f = (n: number) => n.toFixed(1);
  let cx = s.x + s.w / 2;
  let cy = s.y + s.h + 6;
  let d = `M${f(cx)} ${f(cy)}`;
  // Down to (x, y), arriving (and leaving) vertically. `early`: make the sideways move at the
  // start (out of the hero, before the text below it); otherwise just before arriving.
  const to = (x: number, y: number, early: boolean) => {
    const dy = y - cy;
    if (dy <= 1 || Math.abs(x - cx) < 0.5) d += ` L${f(x)} ${f(Math.max(y, cy))}`;
    else {
      const span = Math.min(dy, Math.max(70, Math.min(220, Math.abs(x - cx) * 1.5)));
      if (early) {
        d += ` C${f(cx)} ${f(cy + span * 0.5)} ${f(x)} ${f(cy + span * 0.5)} ${f(x)} ${f(cy + span)}`;
        if (dy > span) d += ` L${f(x)} ${f(y)}`;
      } else {
        if (dy > span) d += ` L${f(cx)} ${f(y - span)}`;
        d += ` C${f(cx)} ${f(y - span * 0.5)} ${f(x)} ${f(y - span * 0.5)} ${f(x)} ${f(y)}`;
      }
    }
    cx = x;
    cy = Math.max(y, cy);
  };

  knots.forEach((k, i) => {
    const rx = k.w / 2 + Math.max(9, k.w * 0.55);
    const ry = k.h / 2 + Math.max(9, k.w * 0.5);
    const X = k.x + k.w / 2 - rx;
    const Y = k.y + k.h / 2;
    to(X, Y, i === 0);
    // Once around, from its left side: under, up the right, back over the top, and on down,
    // the second half a touch wider (a thread wound by hand, not a drawn circle).
    const r2 = rx * 1.07;
    d += ` A${f(rx)} ${f(ry)} 0 0 0 ${f(X + 2 * rx)} ${f(Y)} A${f(r2)} ${f(ry * 1.03)} 0 0 0 ${f(X + 2 * rx - 2 * r2)} ${f(Y)}`;
    cx = X + 2 * rx - 2 * r2;
    cy = Y;
  });

  if (xi) to(xi.x + xi.w / 2, xi.y + xi.h * 0.018, false);
  return { d, w: root.offsetWidth, h: root.offsetHeight };
}

/** Measures and draws over its parent element (the page), which must be position:relative. */
export function Thread({ play, go, deps }: { play: boolean; go: boolean; deps: unknown[] }) {
  const [geo, setGeo] = useState<{ d: string; w: number; h: number } | null>(null);
  // Its own element, not a ref from the page: a parent's ref isn't attached yet when a child's
  // layout effect first runs.
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const goRef = useRef(go);
  const kick = useRef<() => void>(() => {});

  // Measure now, after every change of content, and whenever the page changes size (fonts,
  // photos loading, edits in the builder).
  useLayoutEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const g = buildPath(el);
      setGeo((cur) => (g && cur && cur.d === g.d && cur.w === g.w && cur.h === g.h ? cur : g));
    };
    const soon = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(soon) : null;
    ro?.observe(el);
    document.fonts?.ready.then(soon).catch(() => {});
    window.addEventListener("resize", soon);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", soon);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Drawing with the scroll: the length that reaches a little below the fold, eased.
  useEffect(() => {
    const path = pathRef.current;
    const el = svgRef.current?.parentElement;
    if (!play || !path || !el || !geo) return;
    const total = path.getTotalLength();
    const step = 6;
    const maxY: number[] = [];
    let m = -Infinity;
    for (let l = 0; l <= total; l += step) {
      m = Math.max(m, path.getPointAtLength(l).y);
      maxY.push(m);
    }
    path.style.strokeDasharray = `${total} ${total + 2}`;
    path.style.opacity = "1"; // hidden by the stylesheet until the dash is set
    let shown = Number(path.dataset.shown ?? 0);
    let raf = 0;
    const target = () => {
      if (!goRef.current) return 0;
      // At the foot of the page the thread reaches the 囍, wherever it sits on the screen.
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) return total;
      const R = el.getBoundingClientRect();
      const scale = R.width / (el.offsetWidth || 1) || 1;
      const y = (window.innerHeight * 0.82 - R.top) / scale;
      let lo = 0;
      let hi = maxY.length - 1;
      if (maxY[hi] <= y) return total;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (maxY[mid] <= y) lo = mid + 1;
        else hi = mid;
      }
      return lo * step;
    };
    const paint = () => {
      path.style.strokeDashoffset = String(total - shown);
      path.dataset.shown = String(shown);
    };
    const tick = () => {
      raf = 0;
      // Once drawn it stays drawn (scrolling back up doesn't unpick it).
      const t = Math.max(target(), shown);
      const diff = t - shown;
      if (Math.abs(diff) < 0.5) {
        shown = t;
        paint();
        return;
      }
      // An unhurried pen: never faster than about 1400px a second.
      shown += Math.max(-24, Math.min(24, diff * 0.09));
      paint();
      raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    kick.current = onScroll;
    paint();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      kick.current = () => {};
    };
  }, [play, geo]);

  useEffect(() => {
    goRef.current = go;
    kick.current();
  }, [go]);

  return (
    <svg ref={svgRef} className={`rp-thread${play ? " is-drawing" : ""}`} width={geo?.w ?? 0} height={geo?.h ?? 0} viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : undefined} aria-hidden>
      {geo ? <path ref={pathRef} d={geo.d} /> : null}
    </svg>
  );
}
