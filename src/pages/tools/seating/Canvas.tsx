import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { OBJ_ICON } from "./icons";
import { CHAIR, contentBounds, dims, footprint, squareTurn, initials, isHonorific, isRound, objBox, ruleBreaks, rotate, seatOffsets, tablePath, tableSize, topRadius, type Box, type Category, type Chart, type Guest, type Table, type VenueObject } from "./model";
import { trackDrag, type DropTarget } from "./drag";
import { WALKWAY, WALL_GAP } from "./check";
import { itemsOf, nearestGaps, rulerStep, shift, snapEdge, snapMove, unionItem, type GapMark, type Guide, type Item, type Measure } from "./guides";
import { fmtLen, fmtSize, type Units } from "./units";
import { bgImage, useStore } from "./store";

// The floor plan: plain SVG, a camera (pan/zoom) applied straight to the DOM so panning
// never re-renders React, and Pointer Events for mouse, pen and touch alike.
//   Drag empty floor to pan, pinch or ctrl/⌘-scroll to zoom, scroll to pan.
//   Drag a table or object to move it (snaps to 10 cm), the round handle rotates it. While it
//   moves, its walkways to the nearest neighbours and walls are measured on the plan.
//   Things locked in place don't move; dragging one says so (onLockedDrag).
//   Drag a guest's seat onto another table or seat (mouse/pen); tap to select.
//   When guests are "armed" (tap-to-seat), tables that fit them glow; tap one to seat them.

export type Sel = { kind: "table" | "object" | "guest"; id: string };

export interface CanvasHandle {
  fit(animate?: boolean): void;
  focus(tableId: string): void;
  /** Move the view only if this table or object sits under a card (`cover`: the covered part,
   *  in px from the canvas's right or bottom edge). */
  reveal(id: string, cover: { right?: number; bottom?: number }): void;
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
  /** Goes up by one when the last guest gets a seat: a gold ring sweeps across the tables. */
  wave?: number;
  /** Day-of check-in: who has arrived. Seats of guests still to come are faded; empty seats
   *  show as open. Taps on an empty seat come through onTableTap (for a walk-in). */
  arrived?: Set<string>;
  /** Dragging something locked in place (once per drag): the editor offers to unlock it. */
  onLockedDrag?(kind: "table" | "object", id: string): void;
  /** How distances read: metres or feet and inches. */
  units?: Units;
  /** Several tables and objects picked at once (2 or more): drawn as picked, and dragging one
   *  moves them all. */
  multi?: Set<string>;
  /** Shift-click (or a tap in Select mode) toggles one; a box drawn on the floor picks what's in it. */
  onPick?(ids: string[], how: "toggle" | "add" | "set"): void;
  /** Select mode (phones, or the Select button): taps pick, a drag on the floor draws a box. */
  picking?: boolean;
  onMoveMany?(moves: { kind: "table" | "object"; id: string; x: number; y: number }[]): void;
  /** A resize handle let go: the new centre and size (centimetres). */
  onResize?(kind: "table" | "object", id: string, box: { x: number; y: number; w: number; h: number }): void;
  /** Smart guides (Canva-style snapping); Ctrl/⌘ while dragging turns them off for that move. */
  snap?: boolean;
  grid?: "off" | "half" | "m";
  /** Rulers along the top and left (in metres or feet; hidden while the view is turned). */
  rulers?: boolean;
  /** Every walkway on the plan, measured (tight ones in red). */
  walkways?: boolean;
  /** Tape measure: a drag anywhere measures between two points (Shift: straight). */
  measuring?: boolean;
  /** The last measurement, kept on the plan until cleared. */
  tape?: { x1: number; y1: number; x2: number; y2: number } | null;
  onTape?(t: { x1: number; y1: number; x2: number; y2: number } | null): void;
  /** Right-click: what's under the pointer, where on the plan, and where on screen. */
  onContext?(target: CtxTarget, world: { x: number; y: number }, screen: { x: number; y: number }): void;
}

export type CtxTarget =
  | { kind: "seat"; tableId: string; seat: number; guestId?: string }
  | { kind: "table"; id: string }
  | { kind: "object"; id: string }
  | { kind: "floor" };

type Cam = { x: number; y: number; k: number };
const MIN_K = 0.06;
const MAX_K = 3;

const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(props, ref) {
  const { chart, sel, armedIds, hidden, pulse, hits } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const guides = useRef<SVGGElement>(null);
  const rulerX = useRef<HTMLDivElement>(null);
  const rulerY = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const cam = useRef<Cam>({ x: 0, y: 0, k: 0.3 });
  const cb = useRef(props);
  cb.current = props;
  const chartRef = useRef(chart);
  chartRef.current = chart;
  // An upright phone turns a wide room sideways (stage on the left) so it fills the screen.
  const vr = useRef(0);
  const [viewRot, setViewRot] = useState(0);

  // Rulers: ticks every "nice" step (1 · 2 · 5 × 10ⁿ), labelled from the room's top-left
  // corner, with the selection's span shaded. Only while the view is upright.
  const paintRulers = () => {
    const rx = rulerX.current;
    const ry = rulerY.current;
    if (!rx || !ry) return;
    const on = !!cb.current.rulers && vr.current === 0 && !cb.current.readOnly;
    rx.style.display = ry.style.display = on ? "" : "none";
    if (!on) return;
    const { x, y, k } = cam.current;
    const feet = cb.current.units === "ft";
    const step = rulerStep(k, 64, feet);
    const minor = step / (feet ? (step / 30.48) % 5 === 0 ? 5 : 2 : String(step)[0] === "2" ? 4 : 5);
    const label = (v: number) => (feet ? `${Math.round(v / 30.48)}′` : v === 0 ? "0" : `${+(v / 100).toFixed(2)} m`);
    const paint = (el: HTMLDivElement, size: number, offset: number, along: "x" | "y") => {
      let html = "";
      const v0 = Math.floor(-offset / k / minor) * minor;
      for (let v = v0; v * k + offset < size; v += minor) {
        const px = Math.round(v * k + offset);
        if (px < 0) continue;
        const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
        html += `<i class="${major ? "mj" : "mn"}" style="${along === "x" ? "left" : "top"}:${px}px"></i>`;
        if (major) html += `<b style="${along === "x" ? "left" : "top"}:${px}px">${label(v)}</b>`;
      }
      // The selection's span.
      const c = chartRef.current;
      const sel = cb.current.sel;
      const t = sel?.kind === "table" ? c.tables.find((q) => q.id === sel.id) : null;
      const o = sel?.kind === "object" ? c.objects.find((q) => q.id === sel.id) : null;
      const box = t ? footprint(t) : o ? objBox(o) : null;
      if (box) {
        const a = (along === "x" ? box.x0 : box.y0) * k + offset;
        const b = (along === "x" ? box.x1 : box.y1) * k + offset;
        html = `<u style="${along === "x" ? `left:${a}px;width:${b - a}px` : `top:${a}px;height:${b - a}px`}"></u>` + html;
      }
      el.innerHTML = html;
    };
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    paint(rx, r.width, x, "x");
    paint(ry, r.height, y, "y");
  };

  const apply = useCallback(() => {
    const { x, y, k } = cam.current;
    world.current?.setAttribute("transform", `translate(${x} ${y}) scale(${k}) rotate(${vr.current})`);
    if (grid.current) {
      const g = cb.current.grid ?? "m";
      const a = 500 * k;
      const b = (g === "half" ? 50 : 100) * k;
      // A dot every metre (or half metre), a stronger one every five; the small dots go when
      // they'd crowd. Off: none.
      grid.current.style.backgroundSize = g === "off" ? "0 0, 0 0" : b < 14 ? `${a}px ${a}px, 0 0` : `${a}px ${a}px, ${b}px ${b}px`;
      grid.current.style.backgroundPosition = `${x}px ${y}px, ${x}px ${y}px`;
    }
    // Resize handles stay the same size on screen.
    wrap.current?.style.setProperty("--hk", String(1 / k));
    paintRulers();
    // Names on seats: first and full names from 50%, short names (auto) from 90%, so they
    // never crowd into the next table or shrink below a readable size.
    svg.current?.classList.toggle("lod-mid", k > 0.5);
    svg.current?.classList.toggle("lod-hi", k > 0.9);
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
      reveal(id, cover) {
        // Not while it's being dragged (a press-and-hold on a phone selects it too).
        if (mode.current?.t === "item" || mode.current?.t === "resize") return;
        const it = chartRef.current.tables.find((x) => x.id === id) ?? chartRef.current.objects.find((x) => x.id === id);
        const el = wrap.current;
        if (!it || !el) return;
        const r = el.getBoundingClientRect();
        const { k } = cam.current;
        const [ux, uy] = rotate([it.x, it.y], vr.current);
        const sx = cam.current.x + ux * k;
        const sy = cam.current.y + uy * k;
        const right = cover.right ?? 0;
        const bottom = cover.bottom ?? 0;
        const hidden = (right && sx > r.width - right - 40) || (bottom && sy > r.height - bottom - 40);
        if (!hidden) return;
        animateTo({ k, x: (r.width - right) / 2 - ux * k, y: (r.height - bottom) / 2 - uy * k });
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

  // The grid, rulers and the selection's span on them follow the view settings and the plan.
  const selKey = sel ? `${sel.kind}:${sel.id}` : "";
  useEffect(() => {
    apply();
  }, [apply, props.grid, props.rulers, props.units, selKey, chart.tables, chart.objects]);

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
    | {
        t: "item";
        kind: "table" | "object";
        id: string;
        el: SVGGElement;
        sx: number;
        sy: number;
        ox: number;
        oy: number;
        rot: number;
        nx: number;
        ny: number;
        moved: boolean;
        tap: () => void;
        /** Locked in place: nothing moves; the first move says so. */
        locked?: boolean;
        warned?: boolean;
        /** Everything else on the plan, and this item (or the group) where it started (on the first move). */
        others?: Item[];
        foot?: Box;
        self?: Item;
        /** Moving several at once: the others picked with it. */
        group?: { kind: "table" | "object"; id: string; el: SVGGElement; ox: number; oy: number; rot: number }[];
      }
    | { t: "box"; sx: number; sy: number; add: boolean; moved: boolean }
    | { t: "tape"; sx: number; sy: number; ex: number; ey: number; moved: boolean }
    | {
        t: "resize";
        kind: "table" | "object";
        id: string;
        /** Which edge: -1/0/1 on each axis (in the item's own turn). */
        ex: number;
        ey: number;
        x0: number;
        y0: number;
        w0: number;
        h0: number;
        rot: number;
        min: [number, number];
        max: [number, number];
        nx: number;
        ny: number;
        nw: number;
        nh: number;
        moved: boolean;
        others?: Item[];
      }
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

  /** Dragging one of several picked: an item mode carrying the rest (those locked in place stay). */
  const groupMode = (id: string, p: { x: number; y: number }): Extract<Mode, { t: "item" }> | null => {
    const c = chartRef.current;
    const root = svg.current;
    if (!root) return null;
    const group: NonNullable<Extract<Mode, { t: "item" }>["group"]> = [];
    for (const gid of cb.current.multi ?? []) {
      const t = c.tables.find((q) => q.id === gid);
      const o = t ? null : c.objects.find((q) => q.id === gid);
      const it = t ?? o;
      if (!it || it.fixed) continue;
      const el = root.querySelector<SVGGElement>(t ? `[data-table="${gid}"]` : `[data-obj="${gid}"]`);
      if (el) group.push({ kind: t ? "table" : "object", id: gid, el, ox: it.x, oy: it.y, rot: it.rot });
    }
    const lead = group.find((g) => g.id === id);
    if (!lead) return null;
    const tap = () => cb.current.onSelect({ kind: lead.kind, id });
    return { t: "item", kind: lead.kind, id, el: lead.el, sx: p.x, sy: p.y, ox: lead.ox, oy: lead.oy, rot: lead.rot, nx: lead.ox, ny: lead.oy, moved: false, tap, group };
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
      paintGuides(guides.current, [], cam.current.k, vr.current, cb.current.units);
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
      const seatEl = target.closest("[data-seat]");
      const gid = seatEl?.getAttribute("data-guest");
      const tableId = target.closest("[data-table]")?.getAttribute("data-table");
      const tap = () => {
        if (gid) return cb.current.onSelect({ kind: "guest", id: gid });
        // An empty seat (or a table) on a read-only plan: day-of uses it to place a walk-in.
        if (tableId && cb.current.arrived) return cb.current.onTableTap(tableId, seatEl ? Number(seatEl.getAttribute("data-seat")!.split(":")[1]) : undefined);
        cb.current.onSelect(null);
      };
      mode.current = { t: "pan", sx: p.x, sy: p.y, cx: cam.current.x, cy: cam.current.y, moved: false, tap };
      return;
    }
    if (c.measuring) {
      const w = toWorld(p);
      mode.current = { t: "tape", sx: w.x, sy: w.y, ex: w.x, ey: w.y, moved: false };
      return;
    }
    const rsEl = target.closest("[data-rs]");
    if (rsEl) {
      const g = rsEl.closest("[data-table],[data-obj]") as SVGGElement;
      const kind = g.hasAttribute("data-table") ? "table" : "object";
      const id = g.getAttribute(kind === "table" ? "data-table" : "data-obj")!;
      const [ex, ey] = rsEl.getAttribute("data-rs")!.split(",").map(Number);
      const t = kind === "table" ? chartRef.current.tables.find((q) => q.id === id) : null;
      const o = kind === "object" ? chartRef.current.objects.find((q) => q.id === id) : null;
      const it = t ?? o;
      if (!it) return;
      if (it.fixed) {
        cb.current.onLockedDrag?.(kind, id);
        mode.current = null;
        return;
      }
      const { w, h } = t ? dims(t) : { w: o!.w, h: o!.h };
      const min: [number, number] = t ? [t.shape === "ushape" || t.shape === "lshape" ? 152 : 100, 152] : [40, 40];
      mode.current = { t: "resize", kind, id, ex, ey, x0: it.x, y0: it.y, w0: w, h0: h, rot: it.rot, min, max: [3000, 3000], nx: it.x, ny: it.y, nw: w, nh: h, moved: false };
      return;
    }
    const rotEl = target.closest("[data-rot]");
    if (rotEl) {
      const g = rotEl.closest("[data-table],[data-obj]") as SVGGElement;
      const kind = g.hasAttribute("data-table") ? "table" : "object";
      const id = g.getAttribute(kind === "table" ? "data-table" : "data-obj")!;
      const item = kind === "table" ? chartRef.current.tables.find((t) => t.id === id) : chartRef.current.objects.find((o) => o.id === id);
      if (item?.fixed) {
        cb.current.onLockedDrag?.(kind, id);
        mode.current = null;
      } else if (item) mode.current = { t: "rotate", kind, id, el: g, ox: item.x, oy: item.y, rot: item.rot };
      return;
    }

    const seatEl = target.closest("[data-seat]");
    const guestId = seatEl?.getAttribute("data-guest");
    const tableEl = target.closest("[data-table]") as SVGGElement | null;
    const objEl = target.closest("[data-obj]") as SVGGElement | null;
    const picking = !!c.picking || (e.shiftKey && e.pointerType !== "touch");
    const pickId = tableEl?.getAttribute("data-table") ?? objEl?.getAttribute("data-obj") ?? null;
    const inGroup = !!pickId && !!c.multi && c.multi.size > 1 && c.multi.has(pickId);

    // Picking several: a tap adds or takes one off; dragging one already picked moves the group;
    // a drag on the floor draws a box around what to pick.
    if (picking && !armed) {
      if (pickId && inGroup) {
        const m = groupMode(pickId, p);
        if (m) {
          m.tap = () => cb.current.onPick?.([pickId], "toggle");
          mode.current = m;
          return;
        }
      }
      if (pickId) {
        mode.current = { t: "pan", sx: p.x, sy: p.y, cx: cam.current.x, cy: cam.current.y, moved: false, tap: () => cb.current.onPick?.([pickId], "toggle") };
        return;
      }
      const w = toWorld(p);
      mode.current = { t: "box", sx: w.x, sy: w.y, add: e.shiftKey || !!c.picking, moved: false };
      return;
    }
    // One of several picked: dragging it moves them all; a tap picks just it.
    if (inGroup && !armed && e.pointerType !== "touch") {
      const m = groupMode(pickId!, p);
      if (m) {
        mode.current = m;
        return;
      }
    }

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
        mode.current = { t: "item", kind: "table", id, el: tableEl, sx: p.x, sy: p.y, ox: t.x, oy: t.y, rot: t.rot, nx: t.x, ny: t.y, moved: false, tap, locked: !!t.fixed };
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
          mode.current = { t: "item", kind: "table", id, el: tableEl, sx: p.x, sy: p.y, ox: t.x, oy: t.y, rot: t.rot, nx: t.x, ny: t.y, moved: false, tap: () => {}, locked: !!t.fixed };
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
        mode.current = { t: "item", kind: "object", id, el: objEl, sx: p.x, sy: p.y, ox: o.x, oy: o.y, rot: o.rot, nx: o.x, ny: o.y, moved: false, tap, locked: !!o.fixed };
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
      if (m.locked) {
        if (!m.warned) cb.current.onLockedDrag?.(m.kind, m.id);
        m.warned = true;
        return;
      }
      if (!m.moved) {
        // The table's card steps aside while something moves (on a phone it covers the floor).
        document.documentElement.classList.add("sp-dragging");
        const c = chartRef.current;
        const ids = new Set(m.group ? m.group.map((g) => g.id) : [m.id]);
        const all = itemsOf(c, new Set());
        m.others = all.filter((i) => !ids.has(i.id));
        m.self = m.group ? unionItem(all.filter((i) => ids.has(i.id))) ?? undefined : all.find((i) => i.id === m.id);
        m.foot = m.self?.foot;
      }
      m.moved = true;
      const room = chartRef.current.room;
      const rawX = m.ox + dx;
      const rawY = m.oy + dy;
      // Smart guides first (from the raw position, so nothing sticks), then the 10 cm grid on any
      // axis that didn't line up. Alt: 1 cm steps, no guides. Ctrl/⌘: no guides this move.
      let guideLines: Guide[] = [];
      let gapMarks: GapMark[] = [];
      let sx = false;
      let sy = false;
      if ((cb.current.snap ?? true) && !e.altKey && !e.ctrlKey && !e.metaKey && m.self && m.others) {
        const tol = (e.pointerType === "touch" ? 12 : 8) / cam.current.k;
        const at = { ...m.self, top: shift(m.self.top, rawX - m.ox, rawY - m.oy), foot: shift(m.self.foot, rawX - m.ox, rawY - m.oy) };
        const sn = snapMove(at, m.others, room, tol);
        sx = sn.snappedX;
        sy = sn.snappedY;
        m.nx = rawX + sn.dx;
        m.ny = rawY + sn.dy;
        guideLines = sn.guides;
        gapMarks = sn.gaps;
      }
      const step = e.altKey ? 1 : 10;
      if (!sx) m.nx = Math.round(rawX / step) * step;
      if (!sy) m.ny = Math.round(rawY / step) * step;
      m.nx = Math.round(m.nx * 10) / 10;
      m.ny = Math.round(m.ny * 10) / 10;
      const ddx = m.nx - m.ox;
      const ddy = m.ny - m.oy;
      if (m.group) for (const g of m.group) g.el.setAttribute("transform", `translate(${g.ox + ddx} ${g.oy + ddy}) rotate(${g.rot})`);
      else m.el.setAttribute("transform", `translate(${m.nx} ${m.ny}) rotate(${m.rot})`);
      if (m.foot && m.others) paintGuides(guides.current, nearestGaps(shift(m.foot, ddx, ddy), m.others, room), cam.current.k, vr.current, cb.current.units, { guides: guideLines, gaps: gapMarks });
      return;
    }
    if (m.t === "tape") {
      const w = toWorld(p);
      let ex = w.x;
      let ey = w.y;
      // Shift: straight across or straight down.
      if (e.shiftKey) Math.abs(ex - m.sx) > Math.abs(ey - m.sy) ? (ey = m.sy) : (ex = m.sx);
      if (!m.moved && Math.hypot(ex - m.sx, ey - m.sy) * cam.current.k < 4) return;
      m.moved = true;
      m.ex = Math.round(ex);
      m.ey = Math.round(ey);
      paintGuides(guides.current, [{ x1: m.sx, y1: m.sy, x2: m.ex, y2: m.ey, d: Math.hypot(m.ex - m.sx, m.ey - m.sy), wall: false }], cam.current.k, vr.current, cb.current.units);
      return;
    }
    if (m.t === "box") {
      const w = toWorld(p);
      if (!m.moved && Math.hypot(w.x - m.sx, w.y - m.sy) * cam.current.k < 5) return;
      m.moved = true;
      paintGuides(guides.current, [], cam.current.k, vr.current, cb.current.units, { box: { x0: Math.min(m.sx, w.x), y0: Math.min(m.sy, w.y), x1: Math.max(m.sx, w.x), y1: Math.max(m.sy, w.y) } });
      return;
    }
    if (m.t === "resize") {
      const w = toWorld(p);
      if (!m.others) m.others = itemsOf(chartRef.current, new Set([m.id]));
      m.moved = true;
      // The pointer in the item's own axes (it may be turned); the opposite edge stays put.
      const [lx, ly] = rotate([w.x - m.x0, w.y - m.y0], -m.rot);
      const clamp = (v: number, i: 0 | 1) => Math.min(m.max[i], Math.max(m.min[i], v));
      const step = e.altKey ? 1 : 10;
      let nw = m.ex ? clamp(Math.round((m.w0 / 2 + lx * m.ex) / step) * step, 0) : m.w0;
      let nh = m.ey ? clamp(Math.round((m.h0 / 2 + ly * m.ey) / step) * step, 1) : m.h0;
      const guideLines: Guide[] = [];
      // Upright: the edge being dragged snaps to other edges and centres (and the room's).
      if ((cb.current.snap ?? true) && squareTurn(m.rot) && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tol = (e.pointerType === "touch" ? 12 : 8) / cam.current.k;
        const flip = Math.round(((m.rot % 180) + 180) % 180) === 90;
        const room = chartRef.current.room;
        // Where the dragged edges are in the room, and the fixed ones opposite.
        const turnBack = (ax: number, ay: number) => rotate([ax, ay], m.rot);
        if (m.ex) {
          const [ox, oy] = turnBack(-m.ex * (m.w0 / 2), 0);
          const [ex2, ey2] = turnBack(m.ex * (nw - m.w0 / 2), 0);
          const axis = flip ? "y" : "x";
          const edge = axis === "x" ? m.x0 + ex2 : m.y0 + ey2;
          const fixedAt = axis === "x" ? m.x0 + ox : m.y0 + oy;
          const sn = snapEdge(edge, axis, axis === "x" ? [m.y0 - m.h0 / 2, m.y0 + m.h0 / 2] : [m.x0 - m.h0 / 2, m.x0 + m.h0 / 2], m.others, room, tol);
          if (sn.guide) {
            nw = clamp(Math.abs(sn.v - fixedAt), 0);
            guideLines.push(sn.guide);
          }
        }
        if (m.ey) {
          const [ox, oy] = turnBack(0, -m.ey * (m.h0 / 2));
          const [ex2, ey2] = turnBack(0, m.ey * (nh - m.h0 / 2));
          const axis = flip ? "x" : "y";
          const edge = axis === "y" ? m.y0 + ey2 : m.x0 + ex2;
          const fixedAt = axis === "y" ? m.y0 + oy : m.x0 + ox;
          const sn = snapEdge(edge, axis, axis === "y" ? [m.x0 - m.w0 / 2, m.x0 + m.w0 / 2] : [m.y0 - m.w0 / 2, m.y0 + m.w0 / 2], m.others, room, tol);
          if (sn.guide) {
            nh = clamp(Math.abs(sn.v - fixedAt), 1);
            guideLines.push(sn.guide);
          }
        }
      }
      const [cx, cy] = rotate([m.ex * (nw - m.w0) / 2, m.ey * (nh - m.h0) / 2], m.rot);
      m.nw = Math.round(nw);
      m.nh = Math.round(nh);
      m.nx = Math.round((m.x0 + cx) * 10) / 10;
      m.ny = Math.round((m.y0 + cy) * 10) / 10;
      paintGuides(guides.current, [], cam.current.k, vr.current, cb.current.units, { guides: guideLines, outline: { x: m.nx, y: m.ny, w: m.nw, h: m.nh, rot: m.rot } });
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
    document.documentElement.classList.remove("sp-dragging");
    paintGuides(guides.current, [], cam.current.k, vr.current, cb.current.units);
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
    // A touch tap is followed by a click at the same spot. The card a tap opens appears under
    // the finger, so that click would land in it (and focus its first field): drop it.
    if (e.pointerType === "touch" && ((m.t === "pan" && !m.moved) || (m.t === "item" && !m.moved))) {
      const drop = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener("click", drop, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", drop, { capture: true }), 450);
    }
    if (m.t === "pan" && !m.moved) m.tap?.();
    if (m.t === "item") {
      if (m.locked && m.warned) return; // tried to drag something locked: nothing else happens
      if (m.moved && m.group) {
        const ddx = m.nx - m.ox;
        const ddy = m.ny - m.oy;
        cb.current.onMoveMany?.(m.group.map((g) => ({ kind: g.kind, id: g.id, x: Math.round((g.ox + ddx) * 10) / 10, y: Math.round((g.oy + ddy) * 10) / 10 })));
      } else if (m.moved) cb.current.onMove(m.kind, m.id, m.nx, m.ny);
      else m.tap();
    }
    if (m.t === "tape") cb.current.onTape?.(m.moved ? { x1: Math.round(m.sx), y1: Math.round(m.sy), x2: m.ex, y2: m.ey } : null);
    if (m.t === "box" && m.moved) {
      const end = toWorld(local(e));
      const b = { x0: Math.min(m.sx, end.x), y0: Math.min(m.sy, end.y), x1: Math.max(m.sx, end.x), y1: Math.max(m.sy, end.y) };
      const hit = itemsOf(chartRef.current, new Set()).filter((i) => i.foot.x0 < b.x1 && i.foot.x1 > b.x0 && i.foot.y0 < b.y1 && i.foot.y1 > b.y0);
      cb.current.onPick?.(hit.map((i) => i.id), m.add ? "add" : "set");
    } else if (m.t === "box" && !m.moved && !cb.current.picking) cb.current.onSelect(null);
    if (m.t === "resize" && m.moved && (m.nw !== m.w0 || m.nh !== m.h0)) cb.current.onResize?.(m.kind, m.id, { x: m.nx, y: m.ny, w: m.nw, h: m.nh });
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

  // Every walkway (View → Walkways): each table's nearest neighbour or wall on each side, once.
  const walkLines = useMemo(() => {
    if (!props.walkways) return [];
    const items = itemsOf(chart, new Set());
    const seen = new Set<string>();
    const out: (Measure & { warn?: boolean })[] = [];
    for (const t of chart.tables) {
      const foot = footprint(t);
      if (foot.x1 < 0 || foot.y1 < 0 || foot.x0 > chart.room.w || foot.y0 > chart.room.h) continue;
      for (const m of nearestGaps(foot, items.filter((i) => i.id !== t.id), chart.room)) {
        const key = [Math.round(m.x1), Math.round(m.y1), Math.round(m.x2), Math.round(m.y2)].join(",");
        if (seen.has(key)) continue;
        seen.add(key);
        const warn = m.d < (m.wall ? WALL_GAP : WALKWAY);
        // A phone can't show every gap legibly: just the tight ones.
        if (!warn && typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) continue;
        out.push({ ...m, warn });
      }
    }
    return out;
  }, [props.walkways, chart]);
  const tapeLine = props.tape ? [{ ...props.tape, d: Math.hypot(props.tape.x2 - props.tape.x1, props.tape.y2 - props.tape.y1), wall: false, tape: true }] : [];

  const waveFrom = useMemo(() => {
    const ys = chart.tables.map((t) => t.y);
    const y0 = Math.min(...ys, 0);
    return { y0, span: Math.max(...ys, 0) - y0, cx: chart.room.w / 2 };
  }, [chart.tables, chart.room.w]);

  return (
    <div
      ref={wrap}
      className={`sp-canvas${props.measuring ? " measuring" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        const c = cb.current;
        // Touch keeps press-and-hold for moving things; the menu is for a mouse or trackpad.
        if (c.readOnly || !c.onContext || mode.current?.t === "pinch") return;
        const el = e.target as Element;
        const seatEl = el.closest("[data-seat]");
        const tableEl = el.closest("[data-table]");
        const objEl = el.closest("[data-obj]");
        let target: CtxTarget = { kind: "floor" };
        if (seatEl) {
          const [tableId, n] = seatEl.getAttribute("data-seat")!.split(":");
          target = { kind: "seat", tableId, seat: Number(n), guestId: seatEl.getAttribute("data-guest") ?? undefined };
        } else if (tableEl) target = { kind: "table", id: tableEl.getAttribute("data-table")! };
        else if (objEl) target = { kind: "object", id: objEl.getAttribute("data-obj")! };
        c.onContext(target, toWorld(local(e)), { x: e.clientX, y: e.clientY });
      }}
    >
      <div ref={grid} className="sp-grid" />
      <div ref={rulerX} className="sp-ruler x" aria-hidden style={{ display: "none" }} />
      <div ref={rulerY} className="sp-ruler y" aria-hidden style={{ display: "none" }} />
      <svg
        ref={svg}
        className={[
          armedIds?.length ? "armed" : "",
          `names-${props.names ?? "auto"}`,
          props.arrived ? "day" : "",
          // Several picked: everything else steps back. (One alone keeps the room as it is.)
          !armedIds?.length && !props.readOnly && (props.multi?.size ?? 0) > 1 ? "focus" : "",
        ].join(" ")} aria-label="Seating plan" role="img">
        <defs>
          {/* Basket-weave parquet: three planks one way, three the other. */}
          <pattern id="sp-parq" width="90" height="90" patternUnits="userSpaceOnUse">
            <rect className="parq-a" width="90" height="90" />
            <path className="parq-b" d="M0 0h45v45H0zM45 45h45v45H45z" />
            <path className="parq-l" d="M0 15h45M0 30h45M60 0v45M75 0v45M45 60h45M45 75h45M15 45v45M30 45v45" />
          </pattern>
          <radialGradient id="sp-shade">
            <stop offset="0.72" stopColor="#000727" stopOpacity="0.1" />
            <stop offset="1" stopColor="#000727" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g ref={world}>
          {/* The room: a soft shadow, the floor, and a double wall line like an architect's plan. */}
          <rect className="room-sh" x={-10} y={14} width={chart.room.w + 20} height={chart.room.h + 10} rx={22} />
          <rect className="room-sh" x={-4} y={5} width={chart.room.w + 8} height={chart.room.h + 4} rx={14} />
          <rect className="room" x={0} y={0} width={chart.room.w} height={chart.room.h} rx={8} />
          <rect className="room-in" x={12} y={12} width={chart.room.w - 24} height={chart.room.h - 24} rx={3} />
          {/* How big the room is, so measurements read against something real. */}
          {!props.readOnly && viewRot === 0 ? (
            <g pointerEvents="none">
              <g className="sp-fixk" style={{ transform: `rotate(${-viewRot}deg) scale(var(--hk, 1)) translate(2px, -10px)` }}>
                <text className="room-size">Room {props.units === "ft" ? fmtSize(chart.room.w, chart.room.h, "ft") : `${(chart.room.w / 100).toFixed(1)} × ${(chart.room.h / 100).toFixed(1)} m`}</text>
              </g>
            </g>
          ) : null}
          {chart.bg && bg ? <image className="sp-bgimg" href={bg} x={chart.bg.x} y={chart.bg.y} width={chart.bg.w} height={chart.bg.h} opacity={chart.bg.opacity} preserveAspectRatio="none" /> : null}
          {chart.objects.map((o) => (
            <ObjectShape key={o.id} o={o} vr={viewRot} selected={sel?.kind === "object" && sel.id === o.id} picked={!!props.multi?.has(o.id)} handles={!props.readOnly} />
          ))}
          {chart.tables.map((t) => {
            const seated = byTable.get(t.id) ?? [];
            // The wave starts at the front of the room (the stage end) and rolls back.
            const waveDelay = props.wave ? Math.round(((t.y - waveFrom.y0) / Math.max(1, waveFrom.span)) * 900 + Math.abs(t.x - waveFrom.cx) / 8) : 0;
            const incoming = armedIds ? armedIds.filter((id) => !seated.some((g) => g.id === id)).length : 0;
            const free = t.seats - seated.length;
            return (
              <TableShape
                key={t.id}
                t={t}
                seated={seated}
                catOf={catOf}
                selected={sel?.kind === "table" && sel.id === t.id}
                picked={!!props.multi?.has(t.id)}
                handles={!props.readOnly}
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
                waveN={props.wave ?? 0}
                waveDelay={waveDelay}
                arrived={props.arrived}
              />
            );
          })}
          {walkLines.length || tapeLine.length ? <Marks lines={[...walkLines, ...tapeLine]} vr={viewRot} units={props.units} /> : null}
          {/* Walkway measurements while something moves (drawn straight to the DOM). */}
          <g ref={guides} className="sp-guides" pointerEvents="none" />
        </g>
      </svg>
    </div>
  );
});

export default Canvas;

// ---- shapes ---------------------------------------------------------------------

/** At most `n` characters, then "…". */
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

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
  /** One of several picked (Shift-click, Select): outlined, no handles. */
  picked: boolean;
  /** Resize handles when selected (not on view-only plans). */
  handles: boolean;
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
  waveN: number;
  waveDelay: number;
  arrived?: Set<string>;
}

const TableShape = memo(
  function TableShape({ t, seated, catOf, selected, picked, handles, selGuest, fit, hidden, pop, pulseN, hits, armedSet, vr, clash, full, waveN, waveDelay, arrived }: TableProps) {
    const up = -(t.rot + vr); // keeps text upright whatever the table's and the view's turn
    const offs = seatOffsets(t);
    const bySeat = new Map<number, Guest>();
    for (const g of seated) if (g.seat != null && !hidden.has(g.id)) bySeat.set(g.seat, g);
    // A guest who replied they can't come still shows on their seat (greyed) until the host
    // clears it, but their seat counts as free.
    const used = seated.filter((g) => !hidden.has(g.id) && g.reply !== "no").length;
    const pct = Math.min(100, Math.round((used / t.seats) * 100));
    const cls = ["tbl", selected && "sel", picked && "picked", fit, used >= t.seats && "full", (seated.filter((g) => g.reply !== "no").length > t.seats || clash) && "over", pulseN && "pulse"].filter(Boolean).join(" ");
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
            <circle className="shade" r={R + 16} cy={9} />
            <circle key={`h${pulseN}`} className="halo" r={R} />
            <circle className="top" r={R} />
            <circle className="ring" r={R} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} transform="rotate(-90)" />
            {waveN ? <circle key={`w${waveN}`} className="wave" r={R} style={{ animationDelay: `${waveDelay}ms` }} /> : null}
          </>
        ) : (
          <>
            <path className="shade-r" d={path} transform="translate(0 7)" />
            <path key={`h${pulseN}`} className="halo" d={path} />
            <path className="top" d={path} />
            {t.shape === "head" || t.shape === "sweetheart" ? (
              <path className="ring" d={`M${-w / 2 + 16} ${h / 2} H${w / 2 - 16}`} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} />
            ) : (
              <path className="ring" d={path} pathLength={100} strokeDasharray={`${pct} ${100 - pct}`} />
            )}
            {waveN ? <path key={`w${waveN}`} className="wave" d={path} style={{ animationDelay: `${waveDelay}ms` }} /> : null}
          </>
        )}
        <g transform={`translate(${lx} ${ly}) rotate(${up})`}>
          <text className={`num${longLabel || small ? " long" : ""}`} style={t.shape === "cocktail" ? { fontSize: 22 } : t.shape === "sweetheart" ? { fontSize: Math.min(26, (w * 1.6) / Math.max(4, t.label.length)) } : undefined} y={t.note && round && !small ? -8 : round ? 0 : -4}>
            {t.label}
          </text>
          {t.note && !small && (round || h >= 70)
            ? (() => {
                const note = t.note.length > 16 && round ? t.note.split(" ")[0] : t.note;
                // Shrinks to stay inside the table: about 0.8 em a letter with the spacing.
                const room = round ? R * 1.5 : Math.max(80, w - 40);
                return (
                  <text className="note" y={round ? 26 : 20} style={{ fontSize: Math.max(9, Math.min(15, room / (note.length * 0.8))) }}>
                    {note}
                  </text>
                );
              })()
            : null}
          {/* Locked in place: a padlock. Guests kept (but free to move): a small person. */}
          {t.fixed ? (
            <path className="lock" transform={`translate(${round ? -9 : w / 2 - 34} ${round ? 40 : -h / 2 + 10}) scale(1.1)`} d="M3 7V5a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V8a1 1 0 011-1h1zm2 0h6V5a3 3 0 00-6 0v2z" />
          ) : t.locked ? (
            <path className="lock" transform={`translate(${round ? -9 : w / 2 - 34} ${round ? 40 : -h / 2 + 10}) scale(1.1)`} d="M8 8a3.2 3.2 0 100-6.4A3.2 3.2 0 008 8zm-6 7.2C2 12 4.7 9.6 8 9.6s6 2.4 6 5.6V16H2v-.8z" />
          ) : null}
        </g>
        {offs.map(([dx, dy], i) => {
          const g = bySeat.get(i);
          const cat = g ? catOf(g) : null;
          const c = ["seat", g && "on", g?.reply === "no" && "gone", g && arrived && !arrived.has(g.id) && "wait", cat && `c-${cat}`, g && pop.has(g.id) && "pop", g && selGuest === g.id && "sel", g && hits?.has(g.id) && "hit", hits && g && !hits.has(g.id) && "dim", g && armedSet.has(g.id) && "sel"].filter(Boolean).join(" ");
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
                      {clip(full ? g.name : shortName(g.name), full ? 18 : 10)}
                    </text>
                  </g>
                ) : null}
              </g>
            </g>
          );
        })}
        {selected && !t.fixed ? <RotateHandle reach={size.h / 2 + 40} /> : null}
        {selected && handles && !t.fixed && !round && t.shape !== "cocktail" ? (
          <ResizeHandles w={w} h={h} sides={t.shape === "ushape" || t.shape === "lshape" ? "both" : "length"} />
        ) : null}
      </g>
    );
  },
  (a, b) =>
    sameTable(a.t, b.t) &&
    a.selected === b.selected &&
    a.picked === b.picked &&
    a.handles === b.handles &&
    a.fit === b.fit &&
    a.pulseN === b.pulseN &&
    a.catOf === b.catOf &&
    a.hits === b.hits &&
    a.selGuest === b.selGuest &&
    a.armedSet === b.armedSet &&
    a.vr === b.vr &&
    a.clash === b.clash &&
    a.full === b.full &&
    a.waveN === b.waveN &&
    a.arrived === b.arrived &&
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
    if (x !== y && (x.id !== y.id || x.seat !== y.seat || x.name !== y.name || x.groupId !== y.groupId || x.reply !== y.reply)) return false;
    if (a.hidden.has(x.id) !== b.hidden.has(y.id) || a.pop.has(x.id) !== b.pop.has(y.id)) return false;
  }
  return true;
}

/**
 * Walkway measurements while something moves: a line to each neighbour (dashed to a wall),
 * with its length in a pill that stays upright and the same size on screen whatever the zoom
 * and the view's turn. Written straight into the layer: no React render per pointer move.
 */
function paintGuides(
  layer: SVGGElement | null,
  ms: Measure[],
  k: number,
  vr: number,
  units: Units = "m",
  extra: { guides?: Guide[]; gaps?: GapMark[]; box?: Box; outline?: { x: number; y: number; w: number; h: number; rot: number } } = {},
) {
  if (!layer) return;
  if (!ms.length && !extra.guides?.length && !extra.gaps?.length && !extra.box && !extra.outline) {
    if (layer.firstChild) layer.replaceChildren();
    return;
  }
  const tick = 6 / k;
  const pill = (x: number, y: number, text: string, cls = "") => {
    const w = text.length * 6.6 + 14;
    return `<g transform="translate(${x} ${y}) rotate(${-vr}) scale(${1 / k})"><rect class="gd-pill${cls}" x="${-w / 2}" y="-10" width="${w}" height="20" rx="10"/><text class="gd-text" y="0.5">${text}</text></g>`;
  };
  let out = "";
  // Where it lines up, and equal gaps.
  for (const g of extra.guides ?? []) out += `<path class="gd-guide" d="M${g.x1} ${g.y1}L${g.x2} ${g.y2}"/>`;
  for (const g of extra.gaps ?? []) {
    const across = g.y1 === g.y2;
    const e = across ? `M${g.x1} ${g.y1 - tick}V${g.y1 + tick}M${g.x2} ${g.y2 - tick}V${g.y2 + tick}` : `M${g.x1 - tick} ${g.y1}H${g.x1 + tick}M${g.x2 - tick} ${g.y2}H${g.x2 + tick}`;
    out += `<path class="gd-gap" d="M${g.x1} ${g.y1}L${g.x2} ${g.y2}${e}"/>`;
  }
  // The box being drawn to pick several.
  if (extra.box) {
    const b = extra.box;
    out += `<rect class="gd-box" x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0}"/>`;
  }
  // Resizing: the new outline and its size.
  if (extra.outline) {
    const o = extra.outline;
    out += `<g transform="translate(${o.x} ${o.y}) rotate(${o.rot})"><rect class="gd-outline" x="${-o.w / 2}" y="${-o.h / 2}" width="${o.w}" height="${o.h}"/></g>`;
    const [lx, ly] = rotate([0, o.h / 2 + 34 / k], o.rot);
    out += pill(o.x + lx, o.y + ly, fmtSize(o.w, o.h, units), " size");
  }
  for (const m of ms) {
    if (m.d < 1) continue;
    const ends = endTicks(m, tick);
    const label = fmtLen(m.d, units);
    const w = label.length * 6.6 + 14;
    out +=
      `<path class="gd-line${m.wall ? " wall" : ""}" d="M${m.x1} ${m.y1}L${m.x2} ${m.y2}${m.wall ? "" : ends}"/>` +
      `<g transform="translate(${(m.x1 + m.x2) / 2} ${(m.y1 + m.y2) / 2}) rotate(${-vr}) scale(${1 / k})">` +
      `<rect class="gd-pill${m.wall ? " wall" : ""}" x="${-w / 2}" y="-10" width="${w}" height="20" rx="10"/>` +
      `<text class="gd-text" y="0.5">${label}</text></g>`;
  }
  layer.innerHTML = out;
}

/** Square handles on the edges (and corners) of what's selected; the same size on screen at any
 *  zoom (--hk, set by the camera). data-rs: which edge, as -1/0/1 on each axis. */
function ResizeHandles({ w, h, sides }: { w: number; h: number; sides: "length" | "both" | "all" | "corners" }) {
  const at: [number, number][] =
    sides === "length" ? [[1, 0], [-1, 0]] : sides === "both" ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : sides === "corners" ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  return (
    <g>
      {at.map(([ex, ey]) => (
        <g key={`${ex},${ey}`} data-rs={`${ex},${ey}`} className={`sp-rs ${ex && ey ? "c" : ex ? "e" : "n"}`} transform={`translate(${(ex * w) / 2} ${(ey * h) / 2})`}>
          <rect x={-7} y={-7} width={14} height={14} rx={4} />
        </g>
      ))}
    </g>
  );
}

/** Short marks across both ends of a measurement, at right angles to it. */
function endTicks(m: { x1: number; y1: number; x2: number; y2: number }, tick: number) {
  const len = Math.hypot(m.x2 - m.x1, m.y2 - m.y1) || 1;
  const nx = (-(m.y2 - m.y1) / len) * tick;
  const ny = ((m.x2 - m.x1) / len) * tick;
  return `M${m.x1 - nx} ${m.y1 - ny}L${m.x1 + nx} ${m.y1 + ny}M${m.x2 - nx} ${m.y2 - ny}L${m.x2 + nx} ${m.y2 + ny}`;
}

/**
 * Measurements that stay on the plan (every walkway, the tape measure): drawn by React, with
 * pills kept upright and the same size on screen through CSS (--hk from the camera).
 */
const Marks = memo(function Marks({ lines, vr, units }: { lines: (Measure & { warn?: boolean; tape?: boolean })[]; vr: number; units?: Units }) {
  return (
    <g className="sp-marks" pointerEvents="none">
      {lines.map((m, i) => {
        const label = fmtLen(m.d, units);
        const w = label.length * 6.6 + 14;
        const cls = m.tape ? " tape" : m.warn ? " warn" : m.wall ? " wall" : "";
        return (
          <g key={i}>
            <path className={`gd-line${cls}`} d={`M${m.x1} ${m.y1}L${m.x2} ${m.y2}${m.wall ? "" : endTicks(m, 6)}`} />
            <g transform={`translate(${(m.x1 + m.x2) / 2} ${(m.y1 + m.y2) / 2})`}>
              <g className="sp-fixk" style={{ transform: `rotate(${-vr}deg) scale(var(--hk, 1))` }}>
                <rect className={`gd-pill${cls}`} x={-w / 2} y={-10} width={w} height={20} rx={10} />
                <text className="gd-text" y={0.5}>
                  {label}
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
});

function RotateHandle({ reach }: { reach: number }) {
  return (
    <g>
      <line className="sp-rot-line" x1={0} y1={-reach + 20} x2={0} y2={-reach - 4} />
      <circle data-rot="1" className="sp-rot" cy={-reach - 20} r={18} />
    </g>
  );
}

const ObjectShape = memo(
  function ObjectShape({ o, selected, picked, handles, vr }: { o: VenueObject; selected: boolean; picked: boolean; handles: boolean; vr: number }) {
  // Long narrow things (a buffet along a wall) get their label along their length.
  const turn = (((o.rot + vr) % 180) + 180) % 180;
  const sideways = turn > 45 && turn < 135;
  const tall = sideways ? o.w > o.h * 1.6 : o.h > o.w * 1.6;
  return (
    <g data-obj={o.id} className={`obj${selected ? " sel" : ""}${picked ? " picked" : ""}`} transform={`translate(${o.x} ${o.y}) rotate(${o.rot})`}>
      {o.type === "cake" ? (
        <circle r={Math.min(o.w, o.h) / 2} />
      ) : o.type === "entrance" || o.type === "exit" ? (
        <>
          <path className="body" d={`M${-o.w / 2} ${o.h / 2}V${-o.h / 2}H${o.w / 2}V${o.h / 2}`} />
          {/* Double doors swinging into the room. */}
          {o.w <= 600 ? <path className="swing" d={`M${-o.w / 2} ${-o.h / 2}v${-o.w / 2}a${o.w / 2} ${o.w / 2} 0 0 1 ${o.w / 2} ${o.w / 2}M${o.w / 2} ${-o.h / 2}v${-o.w / 2}a${o.w / 2} ${o.w / 2} 0 0 0 ${-o.w / 2} ${o.w / 2}`} /> : null}
        </>
      ) : o.type === "pillar" ? (
        <rect className="pillar" x={-o.w / 2} y={-o.h / 2} width={o.w} height={o.h} rx={4} />
      ) : (
        <>
          <rect x={-o.w / 2} y={-o.h / 2} width={o.w} height={o.h} rx={o.type === "dance" ? 4 : 10} style={o.type === "dance" ? { fill: "url(#sp-parq)" } : undefined} />
          {/* The stage's front edge, facing the guests. */}
          {o.type === "stage" ? <path className="lip" d={`M${-o.w / 2 + 10} ${o.h / 2 - 9}H${o.w / 2 - 10}`} /> : null}
        </>
      )}
      {(() => {
        const icon = OBJ_ICON[o.type];
        const cake = o.type === "cake";
        const thin = Math.min(o.w, o.h);
        const showIcon = icon && !cake && thin >= 60;
        if (o.type === "pillar") return null; // a dark square says pillar on its own
        // Icon and label side by side, centred, read upright (or along a long, narrow thing).
        const fs = cake ? 15 : thin < 70 ? 16 : 20;
        const textW = o.label.length * fs * 0.78;
        const iw = showIcon ? fs * 1.5 : 0;
        const total = textW + (showIcon ? iw + 8 : 0);
        return (
          <g transform={`rotate(${-(o.rot + vr) + (tall ? -90 : 0)})`}>
            {showIcon ? (
              <g className="ico" transform={`translate(${-total / 2 + iw / 2} 0) scale(${iw / 24}) translate(-12 -12)`}>
                <path d={icon} />
              </g>
            ) : null}
            <text x={showIcon ? -total / 2 + iw + 8 : 0} y={cake ? Math.min(o.w, o.h) / 2 + 22 : 0} style={{ fontSize: fs, textAnchor: showIcon ? "start" : "middle" }}>
              {o.label}
            </text>
          </g>
        );
      })()}
      {selected && !o.fixed ? <RotateHandle reach={o.h / 2 + 30} /> : null}
      {selected && handles && !o.fixed ? <ResizeHandles w={o.w} h={o.h} sides={o.type === "pillar" || o.type === "cake" ? "corners" : "all"} /> : null}
    </g>
  );
  },
  (a, b) => a.selected === b.selected && a.picked === b.picked && a.handles === b.handles && a.vr === b.vr && JSON.stringify(a.o) === JSON.stringify(b.o),
);
