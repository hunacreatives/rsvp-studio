import { useRef } from "react";
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
  const by = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="mb-5 flex justify-end gap-3">
        <button
          aria-label={`${ariaLabel} — previous`}
          onClick={() => by(-1)}
          className="grid place-items-center w-11 h-11 rounded-full border border-[var(--line)] bg-white hover:bg-black/5 transition-colors"
        >
          <i className="ri-arrow-left-line text-lg" />
        </button>
        <button
          aria-label={`${ariaLabel} — next`}
          onClick={() => by(1)}
          className="grid place-items-center w-11 h-11 rounded-full bg-[var(--ink)] text-white hover:opacity-90 transition-opacity"
        >
          <i className="ri-arrow-right-line text-lg" />
        </button>
      </div>
      <div
        ref={track}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
