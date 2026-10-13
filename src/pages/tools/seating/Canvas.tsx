import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CHAIR, contentBounds, dims, initials, isHonorific, isRound, ruleBreaks, rotate, seatOffsets, tablePath, tableSize, topRadius, type Category, type Chart, type Guest, type Table, type VenueObject } from "./model";
import { trackDrag, type DropTarget } from "./drag";
import { bgImage, useStore } from "./store";

// The floor plan: plain SVG, a camera (pan/zoom) applied straight to the DOM so panning
// never re-renders React, and Pointer Events for mouse, pen and touch alike.
//   Drag empty floor to pan, pinch or ctrl/⌘-scroll to zoom, scroll to pan.
//   Drag a table or object to move it (snaps to 10 cm), the round handle rotates it.
//   Drag a guest's seat onto another table or seat (mouse/pen); tap to select.
//   When guests are "armed" (tap-to-seat), tables that fit them glow; tap one to seat them.

export type Sel = { kind: "table" | "object" | "guest"; id: string };

export interface CanvasHandle {
  fit(animate?: boolean): void;
  focus(tableId: string): void;
  zoomBy(f: number): void;
  /** Centre of the view, in room centimetres (where new tables go). */
  center(): { x: number; y: number };
}

interface Props {
  chart: Chart;
  sel: Sel | null;
  armedIds: string[] | null;
  hidden: Set<string>;
  pulse: { id: string; n: number } | null;
  hits: Set<string> | null;
  onSelect(sel: Sel | null): void;
  onTableTap(tableId: string, seat?: number): void;
  onMove(kind: "table" | "object", id: string, x: number, y: number): void;
  onRotate(kind: "table" | "object", id: string, rot: number): void;
  onGuestDrop(guestId: string, target: DropTarget | null): void;
  onZoom?(pct: number): void;
  /** Shared view: pan, zoom and tap a guest; nothing moves. */
  readOnly?: boolean;
  /** Seat labels: initials, first names, full names, or "auto" (names when zoomed in). */
  names?: "auto" | "initials" | "first" | "full";
}

type Cam = { x: number; y: number; k: number };
const MIN_K = 0.06;
const MAX_K = 3;

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(props, ref) {
  const { chart, sel, armedIds, hidden, pulse, hits } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const cam = useRef<Cam>({ x: 0, y: 0, k: 0.3 });
  const cb = useRef(props);
  cb.current = props;
  const chartRef = useRef(chart);
  chartRef.current = chart;
  // An upright phone turns a wide room sideways (stage on the left) so it fills the screen.
  const vr = useRef(0);
  const [viewRot, setViewRot] = useState(0);

  const apply = useCallback(() => {
    const { x, y, k } = cam.current;
    world.current?.setAttribute("transform", `translate(${x} ${y}) scale(${k}) rotate(${vr.current})`);
    if (grid.current) {
      const a = 500 * k;
      const b = 100 * k;
      grid.current.style.backgroundSize = `${a}px ${a}px, ${a}px ${a}px, ${b}px ${b}px, ${b}px ${b}px`;
      grid.current.style.backgroundPosition = `${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px, ${x}px ${y}px`;
    }
    svg.current?.classList.toggle("lod-hi", k > 0.62);
    cb.current.onZoom?.(Math.round(k * 100));
  }, []);

  // Smooth camera moves (fit, focus).
  const anim = useRef(0);
  const animateTo = useCallback(
    (to: Cam, ms = 380) => {
      cancelAnimationFrame(anim.current);
      const from = { ...cam.current };
      const t0 = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = ease(t);
        cam.current = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e };
        apply();
        if (t < 1) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
    },
    [apply],
  );

  const fitCam = useCallback((): Cam | null => {
    const el = wrap.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;
    const w = r.width;
    const h = r.height - padBottom;
    if (w < 10 || h < 10) return null;
    const b = contentBounds(chartRef.current);
    const turn = h > w * 1.15 && w < 820 && b.w > b.h * 1.15 ? -90 : 0;
    if (turn !== vr.current) {
      vr.current = turn;
      setViewRot(turn);
    }
    const pts4 = ([[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]] as [number, number][]).map((q) => rotate(q, turn));
    const bx = Math.min(...pts4.map((q) => q[0]));
    const by = Math.min(...pts4.map((q) => q[1]));
    const bw = Math.max(...pts4.map((q) => q[0])) - bx;
    const bh = Math.max(...pts4.map((q) => q[1])) - by;
    const m = Math.min(60, w * 0.04);
    const k = Math.max(MIN_K, Math.min(MAX_K, Math.min((w - m * 2) / bw, (h - m * 2) / bh)));
    return { k, x: (w - bw * k) / 2 - bx * k, y: (h - bh * k) / 2 - by * k };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      fit(animate = true) {
        const c = fitCam();
        if (!c) return;
        if (animate) animateTo(c);
        else {
          cam.current = c;
          apply();
        }
      },
      focus(tableId) {
        const t = chartRef.current.tables.find((x) => x.id === tableId);
        const el = wrap.current;
        if (!t || !el) return;
        const r = el.getBoundingClientRect();
        const padBottom = parseFloat(getComputedStyle(el).paddingBottom) || 0;
        const k = Math.max(cam.current.k, 0.75);
        const [ux, uy] = rotate([t.x, t.y], vr.current);
        animateTo({ k, x: r.width / 2 - ux * k, y: (r.height - padBottom) / 2 - uy * k });
      },
      zoomBy(f) {
        const el = wrap.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        zoomAt(r.width / 2, r.height / 2, f, true);
      },
      center() {
        const el = wrap.current;
        const r = el?.getBoundingClientRect();
        const { x, y, k } = cam.current;
        if (!r) return { x: chartRef.current.room.w / 2, y: chartRef.current.room.h / 2 };
        const [wx, wy] = rotate([(r.width / 2 - x) / k, (r.height / 2 - y) / k], -vr.current);
        return { x: wx, y: wy };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const zoomAt = (sx: number, sy: number, f: number, smooth = false) => {
    const { x, y, k } = cam.current;
    const nk = Math.max(MIN_K, Math.min(MAX_K, k * f));
    const wx = (sx - x) / k;
    const wy = (sy - y) / k;
    const to = { k: nk, x: sx - wx * nk, y: sy - wy * nk };
    if (smooth) animateTo(to, 220);
    else {
      cam.current = to;
      apply();
    }
  };

  // First fit, and again when a different chart is opened.
  useLayoutEffect(() => {
    const c = fitCam();
    if (c) {
      cam.current = c;
      apply();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart.id]);

  // Wheel: ctrl/⌘ (and trackpad pinch) zooms, a mouse wheel zooms, a trackpad scroll pans.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mouseWheel = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || e.metaKey || mouseWheel) {
        const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-d * (e.ctrlKey ? 0.012 : 0.0022)));
      } else {
        cam.current = { ...cam.current, x: cam.current.x - e.deltaX, y: cam.current.y - e.deltaY };
        apply();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    // Turning the phone: refit if the room should turn with it.
    const ro = new ResizeObserver(() => {
      const before = vr.current;
      const c = fitCam();
      if (c && vr.current !== before) cam.current = c;
      apply();
    });
    ro.observe(el);
    return () => {
      el.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- pointers -------------------------------------------------------------
  const pts = useRef(new Map<number, { x: number; y: number }>());
  type Mode =
    | { t: "pan"; sx: number; sy: number; cx: number; cy: number; moved: boolean; tap?: () => void; hold?: () => void }
    | { t: "pinch"; d0: number; k0: number; mx: number; my: number; c0: Cam }
    | { t: "item"; kind: "table" | "object"; id: string; el: SVGGElement; sx: number; sy: number; ox: number; oy: number; rot: number; nx: number; ny: number; moved: boolean; tap: () => void }
    | { t: "rotate"; kind: "table" | "object"; id: string; el: SVGGElement; ox: number; oy: number; rot: number }
    | null;
  const mode = useRef<Mode>(null);
  const holdTimer = useRef(0);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (p: { x: number; y: number }) => {
    const [x, y] = rotate([(p.x - cam.current.x) / cam.current.k, (p.y - cam.current.y) / cam.current.k], -vr.current);
    return { x, y };
  };
  // Touch: press and hold (about a third of a second) to pick something up.
  const startHold = (m: Mode) => {
    window.clearTimeout(holdTimer.current);
    if (m?.t !== "pan" || !m.hold) return;
    holdTimer.current = window.setTimeout(() => {
      if (mode.current === m && !m.moved) {
        navigator.vibrate?.(8);
        m.hold!();
      }
    }, 380);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // Stops the browser starting a text selection when a drag begins on a label.
    if (e.pointerType === "mouse") {
      e.preventDefault();
      // preventDefault also stops focus moving, so finish any field being edited.
      const a = document.activeElement as HTMLElement | null;
      if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) a.blur();
    }
    const p = local(e);
    pts.current.set(e.pointerId, p);
    cancelAnimationFrame(anim.current);
    if (pts.current.size === 2) {
      // Second finger: pinch. Whatever the first finger started is dropped.
      if (mode.current?.t === "item") mode.current.el.setAttribute("transform", `translate(${mode.current.ox} ${mode.current.oy}) rotate(${mode.current.rot})`);
      const [a, b] = [...pts.current.values()];
      mode.current = { t: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y), k0: cam.current.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, c0: { ...cam.current } };
      return;
    }
    if (pts.current.size > 2) return;
    wrap.current?.setPointerCapture(e.pointerId);
    const target = e.target as Element;
    const c = cb.current;
    const armed = !!c.armedIds?.length;

    if (c.readOnly) {
      const gid = target.closest("[data-seat]")?.getAttribute("data-guest");
      mode.current = { t: "pan", sx: p.x, sy: p.y, cx: cam.current.x, cy: cam.current.y, moved: false, tap: () => cb.current.onSelect(gid ? { kind: "guest", id: gid } : null) };
      return;
    }
    const rotEl = target.closest("[data-rot]");
    if (rotEl) {
      const g = rotEl.closest("[data-table],[data-obj]") as SVGGElement;
      const kind = g.hasAttribute("data-table") ? "table" : "object";
      const id = g.getAttribute(kind === "table" ? "data-table" : "data-obj")!;
      const item = kind === "table" ? chartRef.current.tables.find((t) => t.id === id) : chartRef.current.objects.find((o) => o.id === id);
      if (item) mode.current = { t: "rotate", kind, id, el: g, ox: item.x, oy: item.y, rot: item.rot };
      return;
    }

    const seatEl = target.closest("[data-seat]");
    const guestId = seatEl?.getAttribute("data-guest");
    const tableEl = target.closest("[data-table]") as SVGGElement | null;
    const objEl = target.closest("[data-obj]") as SVGGElement | null;

    if (seatEl && guestId && !armed && e.pointerType !== "touch") {
      // A seated guest: drag to another seat, or tap to select.
      wrap.current?.releasePointerCapture(e.pointerId);
      pts.current.delete(e.pointerId);
      const g = chartRef.current.guests.find((x) => x.id === guestId);
      trackDrag(e, g?.name ?? "Guest", { source: seatEl, onDrop: (t) => cb.current.onGuestDrop(guestId, t), onTap: () => cb.current.onSelect({ kind: "guest", id: guestId }) });
      return;
    }
    if (seatEl && guestId && !armed) {
      // Touch on a seated guest: tap selects them, press and hold picks them up.
      const pid = e.pointerId;
      const start = { clientX: e.clientX, clientY: e.clientY, pointerId: pid };
      const g = chartRef.current.guests.find((x) => x.id === guestId);
      const m: Mode = {
        t: "pan",
        sx: p.x,
        sy: p.y,
        cx: cam.current.x,
        cy: cam.current.y,
        moved: false,
        tap: () => cb.current.onSelect({ kind: "guest", id: guestId }),
        hold: () => {
          mode.current = null;
          wrap.current?.releasePointerCapture(pid);
          pts.current.delete(pid);
          trackDrag(start, g?.name ?? "Guest", { threshold: 0, source: seatEl, onDrop: (t) => cb.current.onGuestDrop(guestId, t) });
        },
      };
      mode.current = m;
      startHold(m);
      return;
    }
    if (tableEl) {
      const id = tableEl.getAttribute("data-table")!;
      const seat = seatEl ? Number(seatEl.getAttribute("data-seat")!.split(":")[1]) : undefined;
      const tap = () => {
        if (cb.current.armedIds?.length) cb.current.onTableTap(id, seat);
        else if (guestId) cb.current.onSelect({ kind: "guest", id: guestId });
        else cb.current.onSelect({ kind: "table", id });
      };
      const t = chartRef.current.tables.find((x) => x.id === id);
      // Touch: a finger on a table pans unless the table is selected (then it moves it).
      const movable = t && (e.pointerType !== "touch" || (c.sel?.kind === "table" && c.sel.id === id)) && !armed;
      if (t && movable) {
        mode.current = { t: "item", kind: "table", id, el: tableEl, sx: p.x, sy: p.y, ox: t.x, oy: t.y, rot: t.rot, nx: t.x, ny: t.y, moved: false, tap };
        return;
      }
      const m: Mode = {
        t: "pan",
        sx: p.x,
        sy: p.y,
        cx: cam.current.x,
        cy: cam.current.y,
        moved: false,
        tap,
        // Touch: press and hold a table to move it.
        hold: t && !armed ? () => {
          cb.current.onSelect({ kind: "table", id });
          mode.current = { t: "item", kind: "table", id, el: tableEl, sx: p.x, sy: p.y, ox: t.x, oy: t.y, rot: t.rot, nx: t.x, ny: t.y, moved: false, tap: () => {} };
        } : undefined,
      };
      mode.current = m;
      startHold(m);
      return;
    }
    if (objEl && !armed) {
      const id = objEl.getAttribute("data-obj")!;
      const o = chartRef.current.objects.find((x) => x.id === id);
      const movable = o && (e.pointerType !== "touch" || (c.sel?.kind === "object" && c.sel.id === id));
      const tap = () => cb.current.onSelect({ kind: "object", id });
      if (o && movable) {
        mode.current = { t: "item", kind: "object", id, el: objEl, sx: p.x, sy: p.y, ox: o.x, oy: o.y, rot: o.rot, nx: o.x, ny: o.y, moved: false, tap };
        return;
      }
      mode.current = { t: "pan", sx: p.x, sy: p.y, cx: cam.current.x, cy: cam.current.y, moved: false, tap };
      return;
    }
    mode.current = { t: "pan", sx: p.x, sy: p.y, cx: cam.current.x, cy: cam.current.y, moved: false, tap: () => cb.current.onSelect(null) };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    const p = local(e);
    pts.current.set(e.pointerId, p);
    const m = mode.current;
    if (!m) return;
    if (m.t === "pinch") {
      const [a, b] = [...pts.current.values()];
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const nk = Math.max(MIN_K, Math.min(MAX_K, m.k0 * (d / Math.max(1, m.d0))));
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const wx = (m.mx - m.c0.x) / m.c0.k;
      const wy = (m.my - m.c0.y) / m.c0.k;
      cam.current = { k: nk, x: mx - wx * nk, y: my - wy * nk };
      apply();
      return;
    }
    if (m.t === "pan") {
      const dx = p.x - m.sx;
      const dy = p.y - m.sy;
      if (!m.moved && Math.hypot(dx, dy) < (e.pointerType === "touch" ? 9 : 5)) return;
      if (!m.moved) wrap.current?.classList.add("panning");
      window.clearTimeout(holdTimer.current);
      m.moved = true;
      cam.current = { ...cam.current, x: m.cx + dx, y: m.cy + dy };
      apply();
      return;
    }
    if (m.t === "item") {
      const [dx, dy] = rotate([(p.x - m.sx) / cam.current.k, (p.y - m.sy) / cam.current.k], -vr.current);
      if (!m.moved && Math.hypot(p.x - m.sx, p.y - m.sy) < 4) return;
      m.moved = true;
      const snap = e.altKey ? 1 : 10;
      m.nx = Math.round((m.ox + dx) / snap) * snap;
      m.ny = Math.round((m.oy + dy) / snap) * snap;
      m.el.setAttribute("transform", `translate(${m.nx} ${m.ny}) rotate(${m.rot})`);
      return;
    }
    if (m.t === "rotate") {
      const w = toWorld(p);
      let deg = (Math.atan2(w.y - m.oy, w.x - m.ox) * 180) / Math.PI + 90;
      deg = e.shiftKey ? Math.round(deg) : Math.round(deg / 15) * 15;
      m.rot = ((deg % 360) + 360) % 360;
      m.el.setAttribute("transform", `translate(${m.ox} ${m.oy}) rotate(${m.rot})`);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    window.clearTimeout(holdTimer.current);
    pts.current.delete(e.pointerId);
    const m = mode.current;
    wrap.current?.classList.remove("panning");
    if (m?.t === "pinch") {
      if (pts.current.size === 0) mode.current = null;
      else {
        // One finger left: carry on panning from here.
        const [rest] = [...pts.current.values()];
        mode.current = { t: "pan", sx: rest.x, sy: rest.y, cx: cam.current.x, cy: cam.current.y, moved: true };
      }
      return;
    }
    mode.current = null;
    if (!m || e.type === "pointercancel") return;
    if (m.t === "pan" && !m.moved) m.tap?.();
    if (m.t === "item") {
      if (m.moved) cb.current.onMove(m.kind, m.id, m.nx, m.ny);
      else m.tap();
    }
    if (m.t === "rotate") cb.current.onRotate(m.kind, m.id, m.rot);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const tableEl = (e.target as Element).closest("[data-table]");
    if (tableEl) return;
    const p = local(e);
    zoomAt(p.x, p.y, 1.8, true);
  };

  // ---- drawing ------------------------------------------------------------------
  const prevHidden = useRef<Set<string>>(new Set());
  const pop = useMemo(() => {
    const s = new Set<string>();
    for (const id of prevHidden.current) if (!hidden.has(id)) s.add(id);
    return s;
  }, [hidden]);
  useEffect(() => {
    prevHidden.current = hidden;
  }, [hidden]);

  // Keyed by content, not identity: every change copies the chart, and tables only redraw
  // when something on them changed.
  const groupKey = chart.groups.map((g) => g.id + g.cat).join("|");
  const catOf = useMemo(() => {
    const m = new Map(chartRef.current.groups.map((g) => [g.id, g.cat]));
    return (g: Guest): Category => (g.tags?.includes("kid") && !g.groupId ? "kids" : g.groupId ? (m.get(g.groupId) ?? "other") : "other");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);

  const byTable = useMemo(() => {
    const m = new Map<string, Guest[]>();
    for (const t of chart.tables) m.set(t.id, []);
    for (const g of chart.guests) if (g.tableId && m.has(g.tableId)) m.get(g.tableId)!.push(g);
    return m;
  }, [chart.guests, chart.tables]);

  const armedSet = useMemo(() => new Set(armedIds ?? []), [armedIds]);
  // Re-read when a picture is added (setBgImage notifies the store).
  useStore((s) => s.bgv);
  const bg = bgImage(chart.bg?.key);
  // Tables where a seating rule is broken get the warning colour.
  const clashTables = useMemo(() => {
    const set = new Set<string>();
    for (const { a, b } of ruleBreaks(chart)) {
      if (a.tableId) set.add(a.tableId);
      if (b.tableId) set.add(b.tableId);
    }
    return set;
  }, [chart]);

  return (
    <div
      ref={wrap}
      className="sp-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={grid} className="sp-grid" />
      <svg ref={svg} className={[armedIds?.length ? "armed" : "", `names-${props.names ?? "auto"}`].join(" ")} aria-label="Seating plan" role="img">
        <defs>
          <pattern id="sp-parq" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 40L40 0" stroke="var(--parq)" strokeWidth="2" />
          </pattern>
        </defs>
        <g ref={world}>
          <rect className="room" x={0} y={0} width={chart.room.w} height={chart.room.h} rx={8} />
          {chart.bg && bg ? <image className="sp-bgimg" href={bg} x={chart.bg.x} y={chart.bg.y} width={chart.bg.w} height={chart.bg.h} opacity={chart.bg.opacity} preserveAspectRatio="none" /> : null}
          {chart.objects.map((o) => (
            <ObjectShape key={o.id} o={o} vr={viewRot} selected={sel?.kind === "object" && sel.id === o.id} />
          ))}
          {chart.tables.map((t) => {
            const seated = byTable.get(t.id) ?? [];
            const incoming = armedIds ? armedIds.filter((id) => !seated.some((g) => g.id === id)).length : 0;
            const free = t.seats - seated.length;
            return (
              <TableShape
                key={t.id}
                t={t}
                seated={seated}
                catOf={catOf}
                selected={sel?.kind === "table" && sel.id === t.id}
                selGuest={sel?.kind === "guest" ? sel.id : null}
                fit={armedIds ? (free >= incoming ? "fit" : "nofit") : null}
                hidden={hidden}
                pop={pop}
                pulseN={pulse?.id === t.id ? pulse.n : 0}
                hits={hits}
                armedSet={armedSet}
                vr={viewRot}
                clash={clashTables.has(t.id)}
                full={props.names === "full"}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
});

export default Canvas;

// ---- shapes ---------------------------------------------------------------------

function shortName(name: string) {
  if (name.includes("·")) return name;
  const w = name.split(/\s+/);
  if (w.length <= 1) return name;
  if (isHonorific(w[0]) && w.length > 2) return `${w[0]} ${w[1]}`;
  return w[0].length <= 2 && w.length > 2 ? `${w[0]} ${w[1]}` : w[0];
}

interface TableProps {
  t: Table;
  seated: Guest[];
  catOf: (g: Guest) => Category;
  selected: boolean;
  selGuest: string | null;
  fit: "fit" | "nofit" | null;
  hidden: Set<string>;
  pop: Set<string>;
  pulseN: number;
  hits: Set<string> | null;
  armedSet: Set<string>;
  vr: number;
  clash: boolean;
  full: boolean;
}

const TableShape = memo(
  function TableShape({ t, seated, catOf, selected, selGuest, fit, hidden, pop, pulseN, hits, armedSet, vr, clash, full }: TableProps) {
    const up = -(t.rot + vr); // keeps text upright whatever the table's and the view's turn
    const offs = seatOffsets(t);
    const bySeat = new Map<number, Guest>();
    for (const g of seated) if (g.seat != null && !hidden.has(g.id)) bySeat.set(g.seat, g);
    const used = seated.filter((g) => !hidden.has(g.id)).length;
    const pct = Math.min(100, Math.round((used / t.seats) * 100));
    const cls = ["tbl", selected && "sel", fit, used >= t.seats && "full", (seated.length > t.seats || clash) && "over", pulseN && "pulse"].filter(Boolean).join(" ");
    const round = isRound(t);
    const R = topRadius(t);
    const { w, h } = round ? { w: 0, h: 0 } : dims(t);
    const size = tableSize(t);
    const longLabel = t.label.length > 3;
    const small = t.shape === "cocktail" || t.shape === "sweetheart";
    // Where the name sits: the middle, or the base of a U / the top arm of an L.
    const ly = t.shape === "ushape" ? h / 2 - 38 : t.shape === "lshape" ? -h / 2 + 38 : 0;
    const lx = t.shape === "lshape" ? 38 : 0;
    const path = round ? "" : tablePath(t);
    return (
      <g data-table={t.id} className={`${cls}${t.shape === "cocktail" ? " stand" : ""}`} transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`}>
        {round ? (
          <>
            <circle key={`h${pulseN}`} className="halo" r={R} />
            <circle className="top" r={R} />
            <circle className="ring" r={R} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} transform="rotate(-90)" />
          </>
        ) : (
          <>
            <path key={`h${pulseN}`} className="halo" d={path} />
            <path className="top" d={path} />
            {t.shape === "head" || t.shape === "sweetheart" ? (
              <path className="ring" d={`M${-w / 2 + 16} ${h / 2} H${w / 2 - 16}`} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} />
            ) : (
              <path className="ring" d={path} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} />
            )}
          </>
        )}
        <g transform={`translate(${lx} ${ly}) rotate(${up})`}>
          <text className={`num${longLabel || small ? " long" : ""}`} style={t.shape === "cocktail" ? { fontSize: 22 } : t.shape === "sweetheart" ? { fontSize: Math.min(26, (w * 1.6) / Math.max(4, t.label.length)) } : undefined} y={t.note && round && !small ? -8 : round ? 0 : -4}>
            {t.label}
          </text>
          {t.note && !small && (round || h >= 70) ? (
            <text className="note" y={round ? 26 : 20}>
              {t.note.length > 16 && round ? t.note.split(" ")[0] : t.note}
            </text>
          ) : null}
          {t.locked ? <path className="lock" transform={`translate(${round ? -9 : w / 2 - 34} ${round ? 40 : -h / 2 + 10}) scale(1.1)`} d="M3 7V5a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h6V5a3 3 0 00-6 0v2z" /> : null}
        </g>
        {offs.map(([dx, dy], i) => {
          const g = bySeat.get(i);
          const cat = g ? catOf(g) : null;
          const c = ["seat", g && "on", cat && `c-${cat}`, g && pop.has(g.id) && "pop", g && selGuest === g.id && "sel", g && hits?.has(g.id) && "hit", hits && g && !hits.has(g.id) && "dim", g && armedSet.has(g.id) && "sel"].filter(Boolean).join(" ");
          // Name labels (shown when zoomed in) sit outside the table, upright.
          const [wx, wy] = rotate([dx, dy], t.rot + vr);
          const len = Math.hypot(wx, wy) || 1;
          const ux = wx / len;
          const uy = wy / len;
          const anchor = ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle";
          return (
            <g key={i} data-seat={`${t.id}:${i}`} data-guest={g?.id} className={c} transform={`translate(${dx} ${dy})`}>
              <g className="si">
                <circle r={CHAIR} />
                {g ? (
                  <g transform={`rotate(${up})`}>
                    <text className="ini">{initials(g.name)}</text>
                    <text className="nm" x={ux * (CHAIR + 8)} y={uy * (CHAIR + 12)} textAnchor={anchor}>
                      {full ? g.name : shortName(g.name)}
                    </text>
                  </g>
                ) : null}
              </g>
            </g>
          );
        })}
        {selected ? <RotateHandle reach={size.h / 2 + 40} /> : null}
      </g>
    );
  },
  (a, b) =>
    sameTable(a.t, b.t) &&
    a.selected === b.selected &&
    a.fit === b.fit &&
    a.pulseN === b.pulseN &&
    a.catOf === b.catOf &&
    a.hits === b.hits &&
    a.selGuest === b.selGuest &&
    a.armedSet === b.armedSet &&
    a.vr === b.vr &&
    a.clash === b.clash &&
    a.full === b.full &&
    sameSeated(a, b),
);

function sameTable(a: Table, b: Table) {
  if (a === b) return true;
  const ka = Object.keys(a) as (keyof Table)[];
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

function sameSeated(a: TableProps, b: TableProps) {
  if (a.seated.length !== b.seated.length) return false;
  for (let i = 0; i < a.seated.length; i++) {
    const x = a.seated[i];
    const y = b.seated[i];
    if (x !== y && (x.id !== y.id || x.seat !== y.seat || x.name !== y.name || x.groupId !== y.groupId)) return false;
    if (a.hidden.has(x.id) !== b.hidden.has(y.id) || a.pop.has(x.id) !== b.pop.has(y.id)) return false;
  }
  return true;
}

function RotateHandle({ reach }: { reach: number }) {
  return (
    <g>
      <line className="sp-rot-line" x1={0} y1={-reach + 20} x2={0} y2={-reach - 4} />
      <circle data-rot="1" className="sp-rot" cy={-reach - 20} r={18} />
    </g>
  );
}

const ObjectShape = memo(
  function ObjectShape({ o, selected, vr }: { o: VenueObject; selected: boolean; vr: number }) {
  // Long narrow things (a buffet along a wall) get their label along their length.
  const turn = (((o.rot + vr) % 180) + 180) % 180;
  const sideways = turn > 45 && turn < 135;
  const tall = sideways ? o.w > o.h * 1.6 : o.h > o.w * 1.6;
  return (
    <g data-obj={o.id} className={`obj${selected ? " sel" : ""}`} transform={`translate(${o.x} ${o.y}) rotate(${o.rot})`}>
      {o.type === "cake" ? (
        <circle r={Math.min(o.w, o.h) / 2} />
      ) : o.type === "entrance" ? (
        <path className="body" d={`M${-o.w / 2} ${o.h / 2}V${-o.h / 2}H${o.w / 2}V${o.h / 2}`} />
      ) : (
        <rect x={-o.w / 2} y={-o.h / 2} width={o.w} height={o.h} rx={10} style={o.type === "dance" ? { fill: "url(#sp-parq)" } : undefined} />
      )}
      <text transform={`rotate(${-(o.rot + vr) + (tall ? -90 : 0)})`} y={o.type === "cake" ? Math.min(o.w, o.h) / 2 + 22 : 0} style={o.type === "cake" ? { fontSize: 15 } : undefined}>
        {o.label}
      </text>
      {selected ? <RotateHandle reach={o.h / 2 + 30} /> : null}
    </g>
  );
  },
  (a, b) => a.selected === b.selected && a.vr === b.vr && JSON.stringify(a.o) === JSON.stringify(b.o),
);
