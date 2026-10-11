import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Horizontal scroll-snap carousel with prev/next controls. */
export default function Carousel({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel: string;
}) {
  const track = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const by = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: "smooth" });
  };

  // Dim the arrow that can't go any further.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="relative">
      <div className="mb-5 flex justify-end gap-3">
        <button
          aria-label={`${ariaLabel} — previous`}
          onClick={() => by(-1)}
          disabled={atStart}
          className="grid place-items-center w-11 h-11 rounded-full border border-[var(--line)] bg-white hover:bg-black/5 transition disabled:opacity-40 disabled:cursor-default"
        >
          <i className="ri-arrow-left-line text-lg" />
        </button>
        <button
          aria-label={`${ariaLabel} — next`}
          onClick={() => by(1)}
          disabled={atEnd}
          className="grid place-items-center w-11 h-11 rounded-full bg-[var(--ink)] text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-default"
        >
          <i className="ri-arrow-right-line text-lg" />
        </button>
      </div>
      <div
        ref={track}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 scroll-pl-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
