import { useCallback, useEffect, useRef, useState, type CSSProperties, type Dispatch, type RefObject, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import type { EventContent, GalleryItem, ImageAsset } from "../../content/types";
import type { PresentationState } from "../../presentation/types";
import { createId } from "../../content/id";
import { uploadEventImage, UploadEventImageError } from "../../content/uploadEventImage";
import { usePageEdit } from "../pageEdit";

// Photos are edited on the page itself, the way Canva does it:
// - an empty "Add a photo" frame (PhotoSlot's data-add-photo) opens the photo picker, or takes
//   photos dropped on it; they join the photos (the design places them in order).
// - hover a photo (tap, on a phone) for Adjust and Replace. Adjust: drag the photo inside its
//   frame, scroll or pinch to zoom, with the cropped-off part shown faded around the frame.
//   Dropping a photo on one replaces it.
// It reads the rendered page, so it works for every design: a photo on the page is matched to
// the ImageAsset with the same address in the content (or the design's settings, the cover
// photo). Photos a design brings itself (its stand-ins) aren't the host's, so they get no tools.

type Path = (string | number)[];
type Found = { where: "content" | "settings"; path: Path; asset: ImageAsset };
type Target = { img: HTMLImageElement; frame: HTMLElement; found: Found };

const isAsset = (v: any): v is ImageAsset => v && typeof v === "object" && typeof v.masterUrl === "string" && "focalPoint" in v;

function findAsset(obj: unknown, url: string, path: Path = []): { path: Path; asset: ImageAsset } | null {
  if (!obj || typeof obj !== "object") return null;
  if (isAsset(obj) && obj.masterUrl === url) return { path, asset: obj };
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const hit = findAsset(v, url, [...path, Array.isArray(obj) ? Number(k) : k]);
    if (hit) return hit;
  }
  return null;
}

function setIn<T>(obj: T, path: Path, value: unknown): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  const copy: any = Array.isArray(obj) ? [...(obj as unknown[])] : { ...(obj as object) };
  copy[k] = setIn(copy[k], rest, value);
  return copy;
}

/** The box that crops a photo: its nearest ancestor that clips, else the photo itself. */
function frameOf(img: HTMLElement): HTMLElement {
  let el: HTMLElement | null = img.parentElement;
  for (let i = 0; el && i < 4; i++, el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.overflow !== "visible" || cs.clipPath !== "none") {
      const a = el.getBoundingClientRect();
      const b = img.getBoundingClientRect();
      // only a box about the photo's size (not a whole section that happens to clip)
      if (a.width <= b.width * 1.6 + 2 && a.height <= b.height * 1.6 + 2) return el;
    }
  }
  return img;
}

const within = (r: DOMRect, x: number, y: number) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

export default function PreviewPhotoTools({
  root,
  scroller,
  eventId,
  content,
  setContent,
  presentation,
  setPresentation,
}: {
  root: RefObject<HTMLElement | null>;
  scroller: RefObject<HTMLElement | null>;
  eventId: string | undefined;
  content: EventContent;
  setContent: Dispatch<SetStateAction<EventContent>>;
  presentation: PresentationState;
  setPresentation: Dispatch<SetStateAction<PresentationState>>;
}) {
  const edit = usePageEdit();
  const latest = useRef({ content, presentation });
  latest.current = { content, presentation };
  const [hover, setHover] = useState<Target | null>(null);
  const [adjust, setAdjust] = useState<Target | null>(null);
  const [drop, setDrop] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0); // re-measure on scroll/resize
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<Target | null>(null); // Replace: which photo; null = add new
  const hideTimer = useRef(0);
  // First visit: say that the page itself is what you edit. Gone after the first click on it.
  const [hint, setHint] = useState(() => {
    try {
      return localStorage.getItem("rs-onpage-hint") !== "seen";
    } catch {
      return true;
    }
  });
  const dismissHint = useCallback(() => {
    setHint(false);
    try {
      localStorage.setItem("rs-onpage-hint", "seen");
    } catch {
      /* private mode: it just shows again next time */
    }
  }, []);

  const lookup = useCallback((img: HTMLImageElement): Found | null => {
    const url = img.getAttribute("src") || "";
    if (!url || url.startsWith("blob:")) return null;
    const { content: c, presentation: p } = latest.current;
    const s = findAsset(p.byTemplate[p.activeTemplateId], url);
    if (s) return { where: "settings", ...s };
    const h = findAsset(c, url);
    return h ? { where: "content", ...h } : null;
  }, []);

  /** The host's photo under a point (the smallest frame there: the one on top). */
  const photoAt = useCallback(
    (x: number, y: number): Target | null => {
      const r = root.current;
      if (!r) return null;
      let best: Target | null = null;
      let area = Infinity;
      for (const img of r.querySelectorAll("img")) {
        const frame = frameOf(img);
        const fr = frame.getBoundingClientRect();
        if (fr.width < 24 || fr.height < 24 || !within(fr, x, y)) continue;
        const found = lookup(img);
        if (!found) continue;
        if (fr.width * fr.height <= area) {
          area = fr.width * fr.height;
          best = { img, frame, found };
        }
      }
      return best;
    },
    [root, lookup],
  );

  const write = useCallback(
    (found: Found, asset: ImageAsset) => {
      if (found.where === "content") setContent((c) => setIn(c, found.path, asset));
      else
        setPresentation((p) => ({
          ...p,
          byTemplate: { ...p.byTemplate, [p.activeTemplateId]: setIn(p.byTemplate[p.activeTemplateId], found.path, asset) },
        }));
    },
    [setContent, setPresentation],
  );

  /** The asset as it is now (it changes while dragging). */
  const current = (found: Found): ImageAsset => {
    const { content: c, presentation: p } = latest.current;
    const base = found.where === "content" ? c : p.byTemplate[p.activeTemplateId];
    let v: any = base;
    for (const k of found.path) v = v?.[k];
    return isAsset(v) ? v : found.asset;
  };

  const upload = useCallback(
    async (files: File[], replace: Target | null) => {
      if (!eventId || !files.length) return;
      setError(null);
      const done: ImageAsset[] = [];
      let failed = "";
      for (let i = 0; i < files.length; i++) {
        setBusy(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : "Uploading…");
        try {
          done.push(await uploadEventImage(files[i], eventId));
        } catch (err) {
          failed = err instanceof UploadEventImageError ? err.message : "Upload failed — please try again.";
        }
      }
      setBusy(null);
      if (failed) setError(failed);
      if (!done.length) return;
      edit?.checkpoint();
      let add = done;
      if (replace) {
        const was = current(replace.found);
        const u = done[0];
        write(replace.found, { ...was, masterUrl: u.masterUrl, width: u.width, height: u.height, focalPoint: { x: 0.5, y: 0.5 }, zoom: undefined });
        add = done.slice(1);
      }
      if (add.length)
        setContent((c) => {
          const g = c.galleries[0] ?? { id: createId("gallery"), items: [] };
          const items: GalleryItem[] = [
            ...g.items,
            ...add.map((img, i) => ({ id: createId("gallery-item"), order: g.items.length + i + 1, image: { ...img, alt: img.alt ?? "", focalPoint: img.focalPoint ?? { x: 0.5, y: 0.5 } } })),
          ];
          return { ...c, galleries: [{ ...g, items }, ...c.galleries.slice(1)] };
        });
    },
    [eventId, write, setContent, edit],
  );

  // Hover, click and drop on the page.
  useEffect(() => {
    const r = root.current;
    if (!r) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || adjust) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const t = photoAt(e.clientX, e.clientY);
        if (t) {
          window.clearTimeout(hideTimer.current);
          setHover((h) => (h?.img === t.img ? h : t));
        } else {
          window.clearTimeout(hideTimer.current);
          hideTimer.current = window.setTimeout(() => setHover(null), 250);
        }
      });
    };
    const onLeave = () => {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setHover(null), 250);
    };
    const onClick = (e: MouseEvent) => {
      if (hint) dismissHint();
      const slot = (e.target as Element).closest?.("[data-add-photo]");
      if (slot && r.contains(slot)) {
        e.preventDefault();
        pickFor.current = null;
        fileRef.current?.click();
        return;
      }
      // Touch has no hover: a tap on a photo shows its tools.
      if ((e as PointerEvent).pointerType === "touch" || (e as PointerEvent).pointerType === "pen") {
        const t = photoAt(e.clientX, e.clientY);
        if (t) setHover(t);
      }
    };
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes("Files");
    const dropTarget = (e: DragEvent): HTMLElement => {
      const slot = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest?.("[data-add-photo]") as HTMLElement | null;
      if (slot && r.contains(slot)) return slot;
      return photoAt(e.clientX, e.clientY)?.frame ?? r;
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      const t = dropTarget(e);
      setDrop((d) => (d === t ? d : t));
    };
    const onDragLeave = (e: DragEvent) => {
      if (!r.contains(e.relatedTarget as Node)) setDrop(null);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDrop(null);
      const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      const slot = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest?.("[data-add-photo]");
      void upload(files, slot ? null : photoAt(e.clientX, e.clientY));
    };
    r.addEventListener("pointermove", onMove);
    r.addEventListener("pointerleave", onLeave);
    r.addEventListener("click", onClick, true);
    r.addEventListener("dragover", onOver);
    r.addEventListener("dragleave", onDragLeave);
    r.addEventListener("drop", onDrop);
    return () => {
      cancelAnimationFrame(raf);
      r.removeEventListener("pointermove", onMove);
      r.removeEventListener("pointerleave", onLeave);
      r.removeEventListener("click", onClick, true);
      r.removeEventListener("dragover", onOver);
      r.removeEventListener("dragleave", onDragLeave);
      r.removeEventListener("drop", onDrop);
    };
  });

  // Keep the tools on their photo while the preview scrolls or resizes.
  useEffect(() => {
    if (!hover && !adjust && !drop) return;
    const s = scroller.current;
    const bump = () => setTick((n) => n + 1);
    s?.addEventListener("scroll", bump, { passive: true });
    window.addEventListener("resize", bump);
    return () => {
      s?.removeEventListener("scroll", bump);
      window.removeEventListener("resize", bump);
    };
  }, [hover, adjust, drop, scroller]);

  // Adjust ends with Esc or Enter.
  useEffect(() => {
    if (!adjust) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") setAdjust(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adjust]);

  // A photo that re-rendered (new src after Replace) or left the page: drop its tools.
  const alive = (t: Target | null) => (t && t.img.isConnected && t.frame.isConnected ? t : null);
  const hv = alive(hover);
  const adj = alive(adjust);
  const paneRect = scroller.current?.getBoundingClientRect();

  return createPortal(
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          const t = pickFor.current;
          void upload(t ? files.slice(0, 1) : files, t);
        }}
      />
      {drop ? <Outline el={drop} label={drop === root.current ? "Drop to add to your photos" : drop.matches("[data-add-photo]") ? "Drop to add" : "Drop to replace"} pane={paneRect} /> : null}
      {adj ? (
        <Adjuster t={adj} asset={current(adj.found)} onChange={(a) => write(adj.found, a)} onDone={() => setAdjust(null)} />
      ) : hv && !drop ? (
        <Toolbar
          t={hv}
          pane={paneRect}
          onEnter={() => window.clearTimeout(hideTimer.current)}
          onLeave={() => (hideTimer.current = window.setTimeout(() => setHover(null), 250))}
          onAdjust={() => {
            edit?.checkpoint();
            setAdjust(hv);
            setHover(null);
          }}
          onReplace={() => {
            pickFor.current = hv;
            fileRef.current?.click();
          }}
        />
      ) : null}
      {hint && paneRect && !adj && scroller.current && getComputedStyle(scroller.current).visibility !== "hidden" ? (
        <div role="note" style={{ ...chip, position: "fixed", top: paneRect.top + 14, left: paneRect.left + paneRect.width / 2, translate: "-50% 0", zIndex: 53, padding: "8px 8px 8px 16px", background: "var(--ink)", color: "#fff", whiteSpace: "nowrap" }}>
          Click any text or photo to edit it
          <button type="button" onClick={dismissHint} aria-label="Got it" style={{ width: 28, height: 28, border: 0, borderRadius: 999, background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 15, lineHeight: 1, cursor: "pointer" }}>
            ×
          </button>
        </div>
      ) : null}
      {busy || error ? (
        <div role="status" style={{ ...chip, position: "fixed", left: (paneRect?.left ?? 0) + 16, bottom: 16, zIndex: 60, background: error ? "#7a1f1f" : "var(--ink)", color: "#fff", pointerEvents: error ? "auto" : "none" }}>
          {busy ?? error}
          {error && !busy ? (
            <button type="button" onClick={() => setError(null)} style={{ marginLeft: 10, border: 0, background: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }} aria-label="Dismiss">
              ×
            </button>
          ) : null}
        </div>
      ) : null}
    </>,
    document.body,
  );
}

const chip: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px -8px rgba(0,7,39,.4)" };
const toolBtn: CSSProperties = { minHeight: 34, padding: "0 12px", border: 0, borderRadius: 999, background: "transparent", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };

/** Clip a rect to the preview pane, so tools never float over the editor. */
function clipTo(r: DOMRect, pane?: DOMRect) {
  if (!pane) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  return { left: Math.max(r.left, pane.left), top: Math.max(r.top, pane.top), right: Math.min(r.right, pane.right), bottom: Math.min(r.bottom, pane.bottom) };
}

function Outline({ el, label, pane }: { el: HTMLElement; label: string; pane?: DOMRect }) {
  const c = clipTo(el.getBoundingClientRect(), pane);
  if (c.right <= c.left || c.bottom <= c.top) return null;
  return (
    <div aria-hidden style={{ position: "fixed", left: c.left, top: c.top, width: c.right - c.left, height: c.bottom - c.top, zIndex: 55, pointerEvents: "none", outline: "2px dashed rgba(47,97,213,.9)", outlineOffset: -2, background: "rgba(47,97,213,.08)", display: "grid", placeItems: "center" }}>
      <span style={{ ...chip, background: "rgba(47,97,213,.95)", color: "#fff" }}>{label}</span>
    </div>
  );
}

function Toolbar({ t, pane, onEnter, onLeave, onAdjust, onReplace }: { t: Target; pane?: DOMRect; onEnter: () => void; onLeave: () => void; onAdjust: () => void; onReplace: () => void }) {
  const r = t.frame.getBoundingClientRect();
  const c = clipTo(r, pane);
  if (c.bottom - c.top < 40 || c.right - c.left < 60) return null;
  return (
    <>
      <div aria-hidden style={{ position: "fixed", left: r.left, top: r.top, width: r.width, height: r.height, zIndex: 54, pointerEvents: "none", outline: "2px solid rgba(47,97,213,.85)", outlineOffset: -2, clipPath: pane ? `inset(${c.top - r.top}px ${r.right - c.right}px ${r.bottom - c.bottom}px ${c.left - r.left}px)` : undefined }} />
      <div
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        style={{ position: "fixed", top: c.top + 10, left: Math.max(c.left + 10, c.right - 10 - 200), width: 200, display: "flex", justifyContent: "flex-end", zIndex: 56, pointerEvents: "none" }}
      >
        <div style={{ ...chip, padding: 3, gap: 0, background: "rgba(0,7,39,.86)", backdropFilter: "blur(6px)", pointerEvents: "auto" }}>
          <button type="button" style={toolBtn} onClick={onAdjust}>
            ✥ Adjust
          </button>
          <button type="button" style={toolBtn} onClick={onReplace}>
            Replace
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Adjust a photo inside its frame. Same maths as the site's crop (shared/photoFit: object-fit
 * cover at the focal point, then scaled about that point), so the faded "outside" copy lines
 * up with the photo in the frame.
 */
function Adjuster({ t, asset, onChange, onDone }: { t: Target; asset: ImageAsset; onChange: (a: ImageAsset) => void; onDone: () => void }) {
  const r = t.frame.getBoundingClientRect();
  const w = asset.width || t.img.naturalWidth || 1;
  const h = asset.height || t.img.naturalHeight || 1;
  const fx = asset.focalPoint?.x ?? 0.5;
  const fy = asset.focalPoint?.y ?? 0.5;
  const z = Math.min(3, Math.max(1, asset.zoom ?? 1));
  const s0 = Math.max(r.width / w, r.height / h);
  const W = w * s0 * z;
  const H = h * s0 * z;
  const ox = Math.max(0, W - r.width);
  const oy = Math.max(0, H - r.height);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number; ox: number; oy: number } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const clamp = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
  const setZoom = (v: number) => onChange({ ...asset, zoom: Math.round(Math.min(3, Math.max(1, v)) * 100) / 100 });

  // Scroll to zoom (a native listener: React's wheel handler can't stop the page scrolling).
  const pad = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(setZoom);
  zoomRef.current = (v: number) => setZoom(v);
  const zRef = useRef(z);
  zRef.current = z;
  useEffect(() => {
    const el = pad.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current(zRef.current * Math.exp(-e.deltaY * 0.004));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const left = r.left - fx * ox;
  const top = r.top - fy * oy;
  const barTop = r.bottom + 56 > window.innerHeight ? Math.max(8, r.bottom - 58) : r.bottom + 10;

  return (
    <>
      {/* a click outside the frame finishes; outside it dims (the frame's shadow), with the
          whole photo showing faded through it */}
      <div onPointerDown={onDone} onWheel={(e) => e.stopPropagation()} style={{ position: "fixed", inset: 0, zIndex: 57 }} />
      <img src={t.img.currentSrc || t.img.src} alt="" draggable={false} style={{ position: "fixed", left, top, width: W, height: H, zIndex: 58, opacity: 0.45, pointerEvents: "none", borderRadius: 2 }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Drag the photo to choose what shows. Scroll or pinch to zoom."
        aria-valuetext={`${Math.round(fx * 100)}% across, ${Math.round(fy * 100)}% down, zoom ${z.toFixed(1)}×`}
        ref={pad}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.current.size === 2) {
            const [a, b] = [...pts.current.values()];
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z };
            drag.current = null;
            return;
          }
          drag.current = { x: e.clientX, y: e.clientY, fx, fy, ox, oy };
        }}
        onPointerMove={(e) => {
          if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && pts.current.size === 2) {
            const [a, b] = [...pts.current.values()];
            setZoom(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.current.d)));
            return;
          }
          const d = drag.current;
          if (!d) return;
          onChange({
            ...asset,
            focalPoint: {
              x: d.ox ? clamp(d.fx - (e.clientX - d.x) / d.ox) : d.fx,
              y: d.oy ? clamp(d.fy - (e.clientY - d.y) / d.oy) : d.fy,
            },
          });
        }}
        onPointerUp={(e) => {
          pts.current.delete(e.pointerId);
          if (pts.current.size < 2) pinch.current = null;
          drag.current = null;
        }}
        onPointerCancel={(e) => {
          pts.current.delete(e.pointerId);
          pinch.current = null;
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.03;
          const k = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
          if (!k) return;
          e.preventDefault();
          onChange({ ...asset, focalPoint: { x: clamp(fx + k[0]), y: clamp(fy + k[1]) } });
        }}
        style={{ position: "fixed", left: r.left, top: r.top, width: r.width, height: r.height, zIndex: 59, cursor: "grab", touchAction: "none", outline: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,7,39,.5), 0 0 0 100vmax rgba(10,12,20,.4)", backgroundImage: thirds, overscrollBehavior: "contain" }}
      />
      <div style={{ position: "fixed", zIndex: 60, top: barTop, left: r.left + r.width / 2, translate: "-50% 0", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 14px", borderRadius: 999, background: "#fff", boxShadow: "0 10px 30px -10px rgba(0,7,39,.45)" }}>
        <button type="button" aria-label="Zoom out" disabled={z <= 1} onClick={() => setZoom(z - 0.2)} style={zoomBtn(z <= 1)}>
          −
        </button>
        <input type="range" min={1} max={3} step={0.01} value={z} aria-label="Zoom" onChange={(e) => setZoom(Number(e.target.value))} style={{ width: 120, accentColor: "var(--ink)" }} />
        <button type="button" aria-label="Zoom in" disabled={z >= 3} onClick={() => setZoom(z + 0.2)} style={zoomBtn(z >= 3)}>
          +
        </button>
        <button type="button" onClick={onDone} style={{ minHeight: 34, padding: "0 16px", marginLeft: 4, border: 0, borderRadius: 999, background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Done
        </button>
      </div>
    </>
  );
}

const thirds =
  "linear-gradient(90deg, transparent calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% - .5px) calc(33.33% + .5px), transparent calc(33.33% + .5px) calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% - .5px) calc(66.66% + .5px), transparent calc(66.66% + .5px)), linear-gradient(180deg, transparent calc(33.33% - .5px), rgba(255,255,255,.55) calc(33.33% - .5px) calc(33.33% + .5px), transparent calc(33.33% + .5px) calc(66.66% - .5px), rgba(255,255,255,.55) calc(66.66% - .5px) calc(66.66% + .5px), transparent calc(66.66% + .5px))";
const zoomBtn = (off: boolean): CSSProperties => ({ width: 32, height: 32, flex: "none", borderRadius: 999, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", fontSize: 17, lineHeight: 1, cursor: off ? "default" : "pointer", opacity: off ? 0.4 : 1 });
