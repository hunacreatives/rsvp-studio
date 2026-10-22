import { useEffect, type RefObject } from "react";
import type { EventContent, GalleryItem } from "../../content/types";

// Shared by Editorial Formal and Modern Minimal (the free designs):
//   useReveal: elements marked [data-reveal] get the class "is-in" as they scroll into
//     view, once; each template styles what "in" looks like. In the builder (editorPreview)
//     or with reduced motion everything is shown at once, so nothing ever hides while a
//     couple edits. A safety timer reveals anything still hidden after a while.
//   photosOf: the couple's photos in order (PhotoSlot.tsx shows one).

export function useReveal(root: RefObject<HTMLElement | null>, enabled: boolean, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const all = () => [...el.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)")];
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || reduce || typeof IntersectionObserver === "undefined") {
      all().forEach((n) => n.classList.add("is-in"));
      return;
    }
    el.classList.add("rv-on");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    all().forEach((n) => io.observe(n));
    const safety = window.setTimeout(() => all().forEach((n) => n.classList.add("is-in")), 6000);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
}

/** Every gallery photo, in order. */
export function photosOf(content: EventContent): GalleryItem[] {
  return content.galleries.flatMap((g) => [...g.items].sort((a, b) => a.order - b.order)).filter((i) => i.image?.masterUrl);
}
