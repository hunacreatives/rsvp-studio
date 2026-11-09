import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A first-run walkthrough of the builder (Nov 10, from a host's feedback: "it's fine once you
// get it, but a run-through at the start would help"). A few cards, each pointing at the real
// thing on screen with the rest dimmed; Next / Skip, Esc skips. Steps whose target isn't on
// screen (the next-step bar after publishing, the size switch on phones) are left out.
// Shown once per browser (BuilderShellPage decides); "Show me around" in the ⋯ menu replays it.

export type TourStep = {
  /** what to point at; null shows the card in the middle of the screen */
  target: () => HTMLElement | null;
  title: string;
  body: string;
};

const PAD = 6; // room around the highlighted thing
const GAP = 14; // between it and the card
const CARD_W = 320;

export const TOUR_SEEN = "rsvp.builder-tour";
export function tourSeen() {
  try {
    return !!localStorage.getItem(TOUR_SEEN);
  } catch {
    return true; // storage blocked: don't show it on every visit
  }
}
function markSeen() {
  try {
    localStorage.setItem(TOUR_SEEN, "1");
  } catch {
    /* fine */
  }
}

type Box = { top: number; left: number; width: number; height: number };
const same = (a: Box | null, b: Box | null) => !!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

export default function BuilderTour({ steps: all, onClose }: { steps: TourStep[]; onClose: () => void }) {
  // Which steps can point at something right now (decided once, when the tour opens).
  const [steps] = useState(() => all.filter((s, i) => i === 0 || s.target()));
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  // the page's own "Click any text or photo to edit it" chip repeats step 1: retire it
  useEffect(() => {
    window.dispatchEvent(new Event("rb-tour-open"));
  }, []);

  const close = () => {
    markSeen();
    onClose();
  };

  // Follow the target (it can move: the panel animates, the page reflows, the window resizes).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = step?.target();
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 ? { top: Math.round(r.top - PAD), left: Math.round(r.left - PAD), width: Math.round(r.width + PAD * 2), height: Math.round(r.height + PAD * 2) } : null;
      setBox((b) => (same(b, next) || (!b && !next) ? b : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // The card goes below the target, else above, else beside it; always kept on screen.
  useLayoutEffect(() => {
    const c = cardRef.current;
    if (!c) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(CARD_W, vw - 24);
    const h = c.offsetHeight;
    const clampX = (x: number) => Math.max(12, Math.min(x, vw - w - 12));
    const clampY = (y: number) => Math.max(12, Math.min(y, vh - h - 12));
    if (!box) return setCard({ top: clampY((vh - h) / 2), left: clampX((vw - w) / 2) });
    const midX = box.left + box.width / 2 - w / 2;
    if (box.top + box.height + GAP + h <= vh - 12) return setCard({ top: box.top + box.height + GAP, left: clampX(midX) });
    if (box.top - GAP - h >= 12) return setCard({ top: box.top - GAP - h, left: clampX(midX) });
    const right = box.left + box.width + GAP;
    if (right + w <= vw - 12) return setCard({ top: clampY(box.top + box.height / 2 - h / 2), left: right });
    setCard({ top: clampY(box.top + box.height / 2 - h / 2), left: clampX(box.left - GAP - w) });
  }, [box, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" || e.key === "Enter") (last ? close() : setI((n) => n + 1));
      if (e.key === "ArrowLeft" && i > 0) setI((n) => n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, last]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [i]);

  if (!step) return null;

  return createPortal(
    <div className="rb-tour" style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      {/* the dim, with a window cut around the target; clicks on the page wait until it's done */}
      {box ? (
        <div aria-hidden className="rb-tour-spot" style={{ position: "fixed", ...box, borderRadius: 12, boxShadow: "0 0 0 2px #fff, 0 0 0 9999px rgba(0,7,39,0.55)", pointerEvents: "none" }} />
      ) : (
        <div aria-hidden style={{ position: "fixed", inset: 0, background: "rgba(0,7,39,0.55)" }} />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rb-tour-title"
        aria-describedby="rb-tour-body"
        tabIndex={-1}
        key={i}
        className="rb-tour-card"
        style={{
          position: "fixed",
          top: card?.top ?? -9999,
          left: card?.left ?? 0,
          width: `min(${CARD_W}px, calc(100vw - 24px))`,
          padding: "18px 18px 14px",
          borderRadius: 16,
          background: "#fff",
          color: "var(--ink)",
          boxShadow: "0 24px 60px -18px rgba(0,7,39,0.5)",
          outline: "none",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "var(--slate)" }}>
          {i + 1} of {steps.length}
        </p>
        <h2 id="rb-tour-title" style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 650, lineHeight: 1.3, textWrap: "balance" }}>
          {step.title}
        </h2>
        <p id="rb-tour-body" style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--slate)", textWrap: "pretty" }}>
          {step.body}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          {last ? null : (
            <button type="button" onClick={close} style={{ minHeight: 40, padding: "0 4px", border: "none", background: "none", color: "var(--slate)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Skip
            </button>
          )}
          <span style={{ flex: 1 }} />
          {i > 0 ? (
            <button type="button" onClick={() => setI(i - 1)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Back
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => (last ? close() : setI(i + 1))}
            style={{ minHeight: 40, padding: "0 18px", borderRadius: 999, border: "none", background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {last ? "Start editing" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
