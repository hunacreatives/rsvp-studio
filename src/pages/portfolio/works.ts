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
  description?: string;
};

export const WORKS: Work[] = [
  {
    slug: "claudy-at-30",
    title: "Claudy at 30",
    category: "Milestone Events Website",
    meta: "Bespoke Milestone Website · Adult Birthday",
    tags: ["Tailored", "Adult Birthday"],
    liveUrl: "https://claudyat30.com",
    thumbnail: "/portfolio/claudy-at-30.png",
    description:
      "A tailored milestone event website built for Claudy's 30th, with a full interactive experience — event details, RSVP, and a shareable landing page guests can revisit.",
    seed: 1,
  },
  {
    slug: "tercel-at-41",
    title: "Tercel at 41",
    category: "Milestone Events Website",
    meta: "Bespoke Milestone Website · Adult Birthday",
    tags: ["Tailored", "Adult Birthday"],
    liveUrl: "https://tercelat41.com",
    thumbnail: "/portfolio/tercel-at-41.png",
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
    meta: "Bespoke Milestone Website · 1st Birthday",
    tags: ["Tailored", "1st Birthday"],
    liveUrl: "https://francesjash.vercel.app",
    thumbnail: "/portfolio/frances-jash.png",
    description:
      "A Disney Princess watercolor-themed milestone website for Frances Jash's 1st birthday, built to guide guests through the celebration details in one place.",
    seed: 4,
  },
  {
    slug: "carlo-and-trixia",
    title: "Carlo & Trixia",
    category: "Milestone Events Website",
    meta: "Bespoke Milestone Website · Wedding",
    tags: ["Tailored", "Wedding"],
    liveUrl: "https://carloandtrixia.com",
    thumbnail: "/portfolio/carlo-and-trixia.png",
    description:
      "A wedding website for Carlo and Trixia — event details, entourage, and RSVP brought together in one bespoke, on-brand experience for their guests.",
    seed: 5,
  },
  { slug: "t-and-h", title: "T & H", category: "Monogram", meta: "Monogram // Couple", tags: ["Couple"], seed: 6 },
  { slug: "monogram-m", title: "Monogram M", category: "Monogram", meta: "Monogram // Single", tags: ["Single"], seed: 7 },
  { slug: "r-and-a-crest", title: "R & A Crest", category: "Monogram", meta: "Monogram // Crest", tags: ["Crest"], seed: 8 },
  { slug: "camille-and-rafael", title: "Camille & Rafael", category: "Stationery", meta: "Signature Suite · Tinghun / Engagement", tags: ["Semi-Custom", "Tinghun / Engagement"], seed: 10 },
  { slug: "arianne-and-marco", title: "Arianne & Marco", category: "Stationery", meta: "Essential Suite · Wedding", tags: ["Semi-Custom", "Wedding"], seed: 11 },
  { slug: "the-bautistas", title: "The Bautistas", category: "Stationery", meta: "Heirloom Suite · Anniversary", tags: ["Tailored", "Anniversary"], seed: 12 },
];
