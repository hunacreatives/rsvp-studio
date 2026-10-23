import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { dateStamp, deckle, eraOf, type Print } from "./content";

// A print, in the look of its era, and turning one over: tap a print and it slides out from
// under the glass, lifts, and turns to show its back, the handwriting (GalleryItem.back, else
// its caption) and the year in pencil, on photo paper.

function Front({ p, seed, eager }: { p: Print; seed: number; eager?: boolean }) {
  const era = eraOf(p.year);
  const ratio = p.image.width && p.image.height ? `${p.image.width} / ${p.image.height}` : "4 / 5";
  return (
    <figure className={`ug-print ug-print--${era}`} style={era === "deckle" ? { clipPath: deckle(seed) } : undefined}>
      <span className="ug-print__photo" style={{ aspectRatio: era === "seventies" ? "1 / 1" : ratio }}>
        <img src={p.image.masterUrl} alt={p.image.alt || p.label || ""} loading={eager ? "eager" : "lazy"} decoding="async" style={{ objectPosition: `${(p.image.focalPoint?.x ?? 0.5) * 100}% ${(p.image.focalPoint?.y ?? 0.4) * 100}%` }} />
        {era === "gloss" && p.year ? <span className="ug-stamp">{dateStamp(p.year, seed)}</span> : null}
      </span>
    </figure>
  );
}

/** A print on the table. The shadow sits on the wrapper (a deckled print is clipped to its edge). */
export function PrintCard({ p, seed, eager = false, className = "", style, onOpen }: { p: Print; seed: number; eager?: boolean; className?: string; style?: CSSProperties; onOpen?: () => void }) {
  if (!onOpen) {
    return (
      <div className={`ug-pw ${className}`} style={style}>
        <Front p={p} seed={seed} eager={eager} />
      </div>
    );
  }
  return (
    <button type="button" className={`ug-pw ug-pw--tap ${className}`} style={style} onClick={onOpen} aria-label={`Turn over: ${[p.label, p.year].filter(Boolean).join(", ") || "photo"}`}>
      <Front p={p} seed={seed} eager={eager} />
    </button>
  );
}

/** The print lifted off the table, turning over. */
export function Flip({ p, seed, vars, css, motion, onClose }: { p: Print; seed: number; vars: CSSProperties; css: string; motion: boolean; onClose: () => void }) {
  const [turned, setTurned] = useState(!motion);
  const closeRef = useRef<HTMLButtonElement>(null);
  const era = eraOf(p.year);
  const back = (p.back ?? "").trim() || p.label;
  const ar = p.image.width && p.image.height && era !== "seventies" ? p.image.width / p.image.height : 1;

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const t = motion ? window.setTimeout(() => setTurned(true), 750) : 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [motion, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={`ug-root ug-flip${motion ? " is-motion" : ""}`} style={vars} role="dialog" aria-modal="true" aria-label={[p.label, p.year].filter(Boolean).join(", ") || "Photo"} onClick={onClose}>
      <style>{css}</style>
      <div className="ug-flip__stage" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={`ug-flip__card${turned ? " is-turned" : ""}`} style={{ ["--ar" as string]: ar } as CSSProperties} onClick={() => setTurned((t) => !t)} aria-label={turned ? "Show the photo" : "Turn it over"}>
          <span className="ug-flip__face ug-flip__front">
            <Front p={p} seed={seed} eager />
          </span>
          <span className={`ug-flip__face ug-flip__back${era === "deckle" ? " is-deckle" : ""}`} style={era === "deckle" ? { clipPath: deckle(seed) } : undefined}>
            {back ? <span className="ug-flip__hand">{back}</span> : <span className="ug-flip__hand ug-flip__hand--none">Nothing written on this one.</span>}
            {p.year ? <span className="ug-flip__year">{p.year}</span> : null}
          </span>
        </button>
        <p className="ug-flip__bar">
          <button type="button" className="ug-btn ug-btn--paper" onClick={() => setTurned((t) => !t)}>
            {turned ? "Show the photo" : "Turn it over"}
          </button>
          <button ref={closeRef} type="button" className="ug-btn ug-btn--paper" onClick={onClose}>
            Put it back
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}
