export type Category =
  | "Milestone Events Website"
  | "Monogram"
  | "Digital Save the Date"
  | "Stationery";

export type Work = {
  slug: string;
  title: string;
  category: Category;
  meta: string;
  tags: string[];
  seed: number;
  /** Present only for real, delivered projects with a live site to embed. */
  liveUrl?: string;
  thumbnail?: string;
  /**
   * Monogram presentation instead of a 3:4 screenshot:
   * "cover" fills the tile with the artwork (it's already a finished card),
   * "contain" sits cut-out art on a soft tile,
   * "foil" / "press" draw the mark (`mark`, a stroke mask) large, in gold foil on
   * navy or letterpress ink on cream — the way it would actually be printed.
   */
  art?: "cover" | "contain" | "foil" | "press";
  mark?: string;
  description?: string;
};

export const WORKS: Work[] = [
  {
    slug: "claudy-at-30",
    title: "Claudy at 30",
    category: "Milestone Events Website",
    meta: "Custom Milestone Website · Adult Birthday",
    tags: ["Custom", "Adult Birthday"],
    liveUrl: "https://claudyat30.com",
    thumbnail: "/portfolio/claudy-at-30.webp",
    description:
      "A custom milestone event website built for Claudy's 30th, with a full interactive experience — event details, RSVP, and a shareable landing page guests can revisit.",
    seed: 1,
  },
  {
    slug: "tercel-at-41",
    title: "Tercel at 41",
    category: "Milestone Events Website",
    meta: "Custom Milestone Website · Adult Birthday",
    tags: ["Custom", "Adult Birthday"],
    liveUrl: "https://tercelat41.com",
    thumbnail: "/portfolio/tercel-at-41.webp",
    description:
      "Atty. Tercel Mercado-Gephart's 41st birthday website, complete with live RSVP capture, calendar and map integration, and an automated confirmation email flow.",
    seed: 2,
  },
  {
    slug: "gel-at-30",
    title: "Gel at 30",
    category: "Digital Save the Date",
    meta: "Digital Save the Date · Adult Birthday",
    tags: ["Adult Birthday"],
    liveUrl: "https://gelat30.com",
    thumbnail: "/portfolio/gel-at-30.png",
    description:
      "A digital save-the-date built for Gel's 30th birthday celebration — a shareable link guests can open straight from a message or Instagram bio.",
    seed: 3,
  },
  {
    slug: "frances-jash",
    title: "Frances Jash",
    category: "Milestone Events Website",
    meta: "Custom Milestone Website · 1st Birthday",
    tags: ["Custom", "1st Birthday"],
    liveUrl: "https://francesjash.vercel.app",
    thumbnail: "/portfolio/frances-jash.webp",
    description:
      "A Disney Princess watercolor-themed milestone website for Frances Jash's 1st birthday, built to guide guests through the celebration details in one place.",
    seed: 4,
  },
  {
    slug: "carlo-and-trixia",
    title: "Carlo & Trixia",
    category: "Milestone Events Website",
    meta: "Custom Milestone Website · Wedding",
    tags: ["Custom", "Wedding"],
    liveUrl: "https://carloandtrixia.com",
    thumbnail: "/portfolio/carlo-and-trixia.webp",
    description:
      "A wedding website for Carlo and Trixia — event details, entourage, and RSVP brought together in one custom, on-brand experience for their guests.",
    seed: 5,
  },
  { slug: "t-and-h", title: "T & H", category: "Monogram", meta: "Monogram // Duo", tags: ["Duo"], thumbnail: "/services/monogram/crest-th.png", art: "cover", seed: 6 },
  { slug: "monogram-m", title: "Monogram M", category: "Monogram", meta: "Monogram // Signature", tags: ["Signature"], thumbnail: "/services/monogram/mono-m-black.png", art: "foil", mark: "/services/monogram/masks/mono-m-black-mark.png", seed: 7 },
  { slug: "r-and-a", title: "R & A", category: "Monogram", meta: "Monogram // Duo", tags: ["Duo"], thumbnail: "/services/monogram/mono-ra.png", art: "press", mark: "/services/monogram/masks/mono-ra-mark.png", seed: 8 },
  { slug: "j-and-l-crest", title: "J & L Crest", category: "Monogram", meta: "Monogram // Crest", tags: ["Crest"], thumbnail: "/services/monogram/crest-jl.webp", art: "contain", seed: 9 },
];
