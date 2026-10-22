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
      {/* Track runs past the container to the right edge of the screen. */}
      <div
        ref={track}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 mr-[calc(50%-50vw)] pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <button
          aria-label={`${ariaLabel} — previous`}
          onClick={() => by(-1)}
          disabled={atStart}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#c9c9cf] text-white transition hover:bg-[#a9a9b3] disabled:cursor-default disabled:opacity-50"
        >
          <i className="ri-arrow-left-s-line text-xl" />
        </button>
        <button
          aria-label={`${ariaLabel} — next`}
          onClick={() => by(1)}
          disabled={atEnd}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#c9c9cf] text-white transition hover:bg-[#a9a9b3] disabled:cursor-default disabled:opacity-50"
        >
          <i className="ri-arrow-right-s-line text-xl" />
        </button>
      </div>
    </div>
  );
}
