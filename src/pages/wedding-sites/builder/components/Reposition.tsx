import { useRef, useState, type CSSProperties } from "react";

type Focus = { x: number; y: number };

/**
 * Drag a photo inside its frame to choose what shows (like repositioning a cover photo). The
 * frame shows the photo cropped the way a site crops it (object-fit: cover); dragging moves
 * the photo with the finger, which moves the focal point (0–1) the templates crop around.
 * Arrow keys nudge it. Only the axis the photo overflows on moves.
 */
export default function Reposition({
  url,
  width,
  height,
  focus,
  onChange,
  zoom = 1,
  onZoom,
  aspect = "4 / 3",
  style,
}: {
  url: string;
  width: number;
  height: number;
  focus: Focus;
  onChange: (f: Focus) => void;
  /** 1–3. With onZoom: a zoom slider under the frame, pinch on phones, ⌘/Ctrl-scroll or trackpad pinch. */
  zoom?: number;
  onZoom?: (z: number) => void;
  aspect?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; f: Focus; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const clamp = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;

  const z = Math.min(3, Math.max(1, zoom));
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /** How far the photo overflows the frame on each axis, in pixels (0 = it fits that way), zoom included. */
  const overflow = () => {
    const r = ref.current!.getBoundingClientRect();
    const s = Math.max(r.width / (width || 1), r.height / (height || 1)) * z;
    return { ox: Math.max(0, (width || 1) * s - r.width), oy: Math.max(0, (height || 1) * s - r.height) };
  };
  const setZoom = (v: number) => onZoom?.(Math.round(Math.min(3, Math.max(1, v)) * 100) / 100);

  return (
    <div style={style}>
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Drag the photo to choose what shows. Arrow keys move it."
      aria-valuetext={`${Math.round(focus.x * 100)}% across, ${Math.round(focus.y * 100)}% down`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && onZoom) {
          const [a, b] = [...pointers.current.values()];
          pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z };
          drag.current = null;
          return;
        }
        drag.current = { px: e.clientX, py: e.clientY, f: focus, ...overflow() };
        setDragging(true);
        setTouched(true);
      }}
      onWheel={(e) => {
        // Trackpad pinch arrives as ctrl+wheel; ⌘/Ctrl-scroll zooms too. Plain scrolling scrolls the panel.
        if (!onZoom || !(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        setTouched(true);
        setZoom(z * Math.exp(-e.deltaY * 0.01));
      }}
      onPointerMove={(e) => {
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch.current && pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          setZoom(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.d)));
          return;
        }
        const d = drag.current;
        if (!d) return;
        // The photo follows the pointer: moving it right reveals more of its left side.
        onChange({
          x: d.ox ? clamp(d.f.x - (e.clientX - d.px) / d.ox) : d.f.x,
          y: d.oy ? clamp(d.f.y - (e.clientY - d.py) / d.oy) : d.f.y,
        });
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        drag.current = null;
        setDragging(false);
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        pinch.current = null;
        drag.current = null;
        setDragging(false);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.03;
        const k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!k) return;
        e.preventDefault();
        setTouched(true);
        onChange({ x: clamp(focus.x + k[0]), y: clamp(focus.y + k[1]) });
      }}
      style={{
        position: "relative",
        aspectRatio: aspect,
        width: "100%",
        overflow: "hidden",
        borderRadius: 10,
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
        background: "#eee",
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focus.x * 100}% ${focus.y * 100}%`, transform: z > 1.001 ? `scale(${z})` : undefined, transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`, pointerEvents: "none" }}
      />
      {/* a rule-of-thirds grid while dragging, and a hint until the first drag */}
      {dragging ? (
        <span aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(90deg, transparent calc(33.33% - .5px), rgba(255,255,255,.6) calc(33.33% - .5px) calc(33.33% + .5px), transparent calc(33.33% + .5px) calc(66.66% - .5px), rgba(255,255,255,.6) calc(66.66% - .5px) calc(66.66% + .5px), transparent calc(66.66% + .5px)), linear-gradient(180deg, transparent calc(33.33% - .5px), rgba(255,255,255,.6) calc(33.33% - .5px) calc(33.33% + .5px), transparent calc(33.33% + .5px) calc(66.66% - .5px), rgba(255,255,255,.6) calc(66.66% - .5px) calc(66.66% + .5px), transparent calc(66.66% + .5px))" }} />
      ) : !touched ? (
        <span aria-hidden style={{ position: "absolute", left: "50%", bottom: 10, translate: "-50% 0", padding: "6px 12px", borderRadius: 999, background: "rgba(0,7,39,.66)", color: "#fff", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none" }}>
          ✥ Drag to reposition{onZoom ? " · pinch to zoom" : ""}
        </span>
      ) : null}
    </div>
    {onZoom ? (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <button type="button" aria-label="Zoom out" disabled={z <= 1} onClick={() => setZoom(z - 0.2)} style={zoomBtn(z <= 1)}>−</button>
        <input type="range" min={1} max={3} step={0.01} value={z} aria-label="Zoom" onChange={(e) => { setTouched(true); setZoom(Number(e.target.value)); }} style={{ flex: 1, accentColor: "var(--ink)" }} />
        <button type="button" aria-label="Zoom in" disabled={z >= 3} onClick={() => setZoom(z + 0.2)} style={zoomBtn(z >= 3)}>+</button>
      </div>
    ) : null}
    </div>
  );
}

const zoomBtn = (off: boolean): CSSProperties => ({ width: 36, height: 36, flex: "none", borderRadius: 999, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", fontSize: 18, lineHeight: 1, cursor: off ? "default" : "pointer", opacity: off ? 0.4 : 1 });
