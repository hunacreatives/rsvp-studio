import { useEffect, useRef, useState } from "react";

export type CenterItem = { img: string; title: string; subtitle: string; alt: string };

/**
 * Centre-focus gallery ("…, brought to life." on Monogram and Collections): the active
 * piece is large, its neighbours smaller and faded either side. Timed like the Save the
 * Date deck — 500ms on the site curve, neighbours at 0.85 / 0.8, pill dots — so every
 * carousel on the site moves the same way. Auto-advances; arrows, side pieces and
 * swipes also move it.
 *
 * `variant`: "art" shows cut-out artwork as is (monograms); "card" shows a portrait
 * design on a rounded card (collections).
 */
export default function CenterCarousel({
  items,
  label,
  start = 1,
  variant = "art",
  intervalMs = 4500,
}: {
  items: CenterItem[];
  label: string;
  start?: number;
  variant?: "art" | "card";
  intervalMs?: number;
}) {
  const n = items.length;
  const [active, setActive] = useState(start);
  const touchX = useRef<number | null>(null);
  const go = (dir: 1 | -1) => setActive((i) => (i + dir + n) % n);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Restarts after every change, so a click gets the full interval.
    const t = window.setTimeout(() => setActive((i) => (i + 1) % n), intervalMs);
    return () => window.clearTimeout(t);
  }, [active, n, intervalMs]);

  const card = variant === "card";
  const current = items[active];

  return (
    <>
      <div
        className={`relative mx-auto h-[240px] sm:h-[300px] md:h-[340px] max-w-[1040px] ${
          card ? "[--step:36vw] sm:[--step:220px] md:[--step:290px]" : "[--step:40vw] sm:[--step:250px] md:[--step:330px]"
        }`}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {items.map((it, i) => {
          // Signed distance from the active slide, wrapped to the nearest side.
          let off = (i - active + n) % n;
          if (off > n / 2) off -= n;
          const far = Math.abs(off) > 1;
          return (
            <button
              key={it.img + it.title}
              type="button"
              tabIndex={off === 0 || far ? -1 : 0}
              aria-hidden={far || undefined}
              aria-label={off === 0 ? undefined : `Show ${it.title}`}
              onClick={() => off !== 0 && setActive(i)}
              className={`absolute left-1/2 top-1/2 h-full transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                card ? "aspect-[3/4] w-auto" : "w-[58%] sm:w-[260px] md:w-[300px]"
              }`}
              style={{
                transform: `translate(-50%, -50%) translateX(calc(var(--step) * ${off})) scale(${off === 0 ? 1 : far ? 0.72 : 0.85})`,
                opacity: off === 0 ? 1 : far ? 0 : 0.8,
                zIndex: 10 - Math.abs(off),
                pointerEvents: far ? "none" : undefined,
              }}
            >
              <img
                src={it.img}
                alt={off === 0 ? it.alt : ""}
                className={
                  card
                    ? "h-full w-full rounded-2xl object-cover shadow-[0_24px_50px_-24px_rgba(0,7,39,0.35)]"
                    : "h-full w-full object-contain drop-shadow-[0_24px_40px_rgba(0,7,39,0.16)]"
                }
              />
            </button>
          );
        })}

        {[-1, 1].map((dir) => (
          <button
            key={dir}
            type="button"
            aria-label={dir < 0 ? "Previous" : "Next"}
            onClick={() => go(dir as 1 | -1)}
            className={`absolute top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-[#c9c9cf] text-white transition hover:bg-[#a9a9b3] ${
              dir < 0 ? "left-0" : "right-0"
            }`}
          >
            <i className={`${dir < 0 ? "ri-arrow-left-s-line" : "ri-arrow-right-s-line"} text-xl`} />
          </button>
        ))}
      </div>

      {/* Caption for the centre piece */}
      <div className="mt-8 text-center" aria-live="polite">
        <p key={current.title} className="mono-caption font-semibold text-lg text-[var(--ink)]">
          {current.title}
        </p>
        <p key={`${current.title}-sub`} className="mono-caption text-[var(--slate)]">
          {current.subtitle}
        </p>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {items.map((it, i) => (
          <span
            key={it.img + it.title}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-5 bg-[var(--ink)]" : "w-1.5 bg-[rgba(0,7,39,0.2)]"
            }`}
          />
        ))}
      </div>
    </>
  );
}
