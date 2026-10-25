import type { ObjType } from "./model";

// Shared by the canvas (Canvas.tsx) and the printouts (exporting.ts).

/** Small line drawings for the room's things (24 × 24, drawn with a stroke). */
export const OBJ_ICON: Partial<Record<ObjType, string>> = {
  stage: "M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6",
  dance: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  buffet: "M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.2 0-3.5 2.5-3.5 6v4H17",
  dj: "M6 3h12v18H6zM12 7.2v.1M15 14.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  bar: "M5 4h14l-7 8zM12 12v8M8 20h8",
  photo: "M4 8h3l2-3h6l2 3h3v11H4zM15.5 13.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z",
  gifts: "M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7C10.5 3.5 7 3.8 7 5.6S10 7 12 7s5-.6 5-1.4S13.5 3.5 12 7",
  entrance: "M6 21V4h12v17M3 21h18M14.5 12.5v.1",
  exit: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
  restroom: "M7 5.5a1.5 1.5 0 1 0 0-.1M17 5.5a1.5 1.5 0 1 0 0-.1M5 9h4l1 6H8.5v6h-3v-6H4zM15 9h4v6h-1v6h-2v-6h-1z",
  lechon: "M3 17h18M5 17a7 7 0 0 1 14 0M12 8V6.5M10.5 6.5h3",
};
