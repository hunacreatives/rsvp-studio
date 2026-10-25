import type { EventContent, GalleryItem } from "../types";
import { debutDemo } from "./debut-demo";

/**
 * TEMPLATE DEMO CONTENT for The Debut Issue: the Debut demo (invented: Sofia Isabel Reyes,
 * The Rosewood Pavilion) in blush and rose, with a pictorial.
 * Stock photos from Pexels (Pexels licence), one shoot by Portrait Corvus
 * (pexels.com/@portrait-corvus-45763147): pexels.com/photo/7687396, 7687395, 7687393, 7687394, 7687392.
 */
const pic = (n: number, x = 0.5, y = 0.3): GalleryItem => ({
  id: `di-pic-${n}`,
  order: n,
  image: { id: `di-img-${n}`, masterUrl: `/event-templates/debut-issue/demo/pic-${n}.webp`, width: 1200, height: 1800, alt: "", focalPoint: { x, y }, createdAt: "2030-01-01T00:00:00.000Z" },
});

export const debutIssueDemo: EventContent = {
  ...debutDemo,
  id: "demo-debut-issue",
  slug: "debut-issue-demo",
  rsvpDeadline: "2030-11-01",
  motifColors: ["#9C4A5B", "#E8C9BE", "#B8914A"],
  galleries: [{ id: "di-gallery", items: [pic(1, 0.5, 0.36), pic(2, 0.5, 0.25), pic(3, 0.5, 0.4), pic(4, 0.5, 0.3), pic(5, 0.5, 0.35)] }],
  custom: {
    ...debutDemo.custom,
    dressCode: "Formal. Long gowns and suits, in blush, rose and a little gold.",
  },
};
