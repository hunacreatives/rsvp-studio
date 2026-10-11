import { useEffect, useRef, useState } from "react";
import { lenisRef } from "@/lib/lenis";

type DeviceType = "laptop" | "phone";

const INTRINSIC: Record<DeviceType, { width: number; height: number }> = {
  laptop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
};

// Non-screen chrome height (bezel padding + laptop base tray), subtracted
// from the shared --frame-h so both mockups' screens end up the same height.
const CHROME: Record<DeviceType, number> = { laptop: 12 + 14, phone: 10 };

// Wheel events inside a cross-origin iframe chain to the page once the
// embedded site can't scroll further (or never scrolls, like an intro
// screen), and CSS overscroll-behavior on the <iframe> can't stop that.
// So while a mouse is over a screen, freeze the page scroll itself.
// gutter: stable keeps the scrollbar's space so nothing shifts sideways.
function lockPageScroll(locked: boolean) {
  const root = document.documentElement.style;
  if (locked) {
    lenisRef.current?.stop();
    root.overflow = "hidden";
    root.scrollbarGutter = "stable";
  } else {
    root.overflow = "";
    root.scrollbarGutter = "";
    lenisRef.current?.start();
  }
}

export default function DeviceFrame({
  type,
  src,
  title,
}: {
  type: DeviceType;
  src: string;
  title: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const { width, height } = INTRINSIC[type];
  const isLaptop = type === "laptop";
  const bezelPaddingH = isLaptop ? 12 : 10;
  const bezelWidthPx = scale * width + bezelPaddingH;
  // Touch screens: a swipe that starts on an embedded site scrolls the site,
  // not the page, so a big frame can trap the visitor. Keep the iframe inert
  // until they tap "Tap to explore", and offer "Done" to hand scrolling back.
  const [isTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches,
  );
  const [exploring, setExploring] = useState(false);
  const inert = isTouch && !exploring;
  // Too small to use by touch (the laptop on a phone): just a picture.
  const tooSmall = scale > 0 && scale < 0.3;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setScale(entries[0].contentRect.width / width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  // Release the lock if we navigate away mid-hover.
  useEffect(() => () => lockPageScroll(false), []);

  return (
    <div className="inline-flex flex-col items-center">
      <div
        className="relative bg-[#161616]"
        style={{
          borderRadius: isLaptop ? "12px 12px 3px 3px" : "26px",
          padding: isLaptop ? "6px 6px 8px" : "5px",
          boxShadow: "0 40px 70px -35px rgba(0,7,39,0.45)",
        }}
      >
        {isLaptop && (
          <span className="absolute left-1/2 top-[3px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#3a3a3a]" />
        )}

        <div
          ref={wrapRef}
          onPointerEnter={(e) => e.pointerType === "mouse" && lockPageScroll(true)}
          onPointerLeave={() => lockPageScroll(false)}
          className="relative overflow-hidden bg-white"
          style={{
            borderRadius: isLaptop ? "3px" : "21px",
            // Explicit width (not aspect-ratio alone): some engines size the
            // box from the unscaled 1440px iframe otherwise, stretching the
            // bezel edge to edge.
            height: `calc(var(--frame-h) - ${CHROME[type]}px)`,
            width: `calc((var(--frame-h) - ${CHROME[type]}px) * ${width / height})`,
          }}
        >
          {scale > 0 && (
            <iframe
              src={src}
              title={title}
              width={width}
              height={height}
              className="absolute left-0 top-0"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                border: 0,
                pointerEvents: inert || (isTouch && tooSmall) ? "none" : undefined,
              }}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
          {isTouch && scale > 0 && !tooSmall && (
            exploring ? (
              <button
                type="button"
                onClick={() => setExploring(false)}
                className="absolute right-2 top-2 z-10 inline-flex min-h-[40px] items-center rounded-full bg-black/70 px-4 text-[13px] font-medium text-white backdrop-blur"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setExploring(true)}
                aria-label={`Tap to explore ${title}`}
                className="absolute inset-0 z-10 flex items-end justify-center pb-5"
              >
                <span className="inline-flex min-h-[40px] items-center rounded-full bg-white/95 px-4 text-[13px] font-semibold text-[var(--ink)] shadow-lg">
                  Tap to explore
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {isLaptop && bezelWidthPx > 0 && (
        <div
          style={{
            width: bezelWidthPx * 1.16,
            height: 14,
            borderRadius: "0 0 10px 10px",
            background: "linear-gradient(to bottom, #d9d9d9, #b7b7b7)",
          }}
        >
          <div
            className="mx-auto h-1.5 w-16 rounded-b-md bg-[#9a9a9a]"
            style={{ transform: "translateY(-1px)" }}
          />
        </div>
      )}
    </div>
  );
}
