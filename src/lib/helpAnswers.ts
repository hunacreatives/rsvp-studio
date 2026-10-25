import { FAQ_CATEGORIES } from "@/pages/faqs/faq-data";
import type { QuickAnswer } from "@/components/NeedHand";

// The quick answers "Need a hand?" shows, per place. From the FAQ where it already says it,
// plus the questions people get stuck on in that tool.

const faq = (slug: string, pick: RegExp) => (FAQ_CATEGORIES.find((c) => c.slug === slug)?.items ?? []).filter((i) => pick.test(i.q));

export const BUILDER_ANSWERS: QuickAnswer[] = [
  { q: "My changes aren’t on my live site", a: "Everything you change saves on its own, but guests see it only after you press Update live site at the top. Until then, the header says “Saved · not live yet”." },
  { q: "How do I change the photos?", a: "Tap a photo in the preview to replace it, crop it, or add more." },
  ...faq("build", /free|Premium include|own web address/i),
];

export const MESA_ANSWERS: QuickAnswer[] = [
  { q: "How do I add my guest list?", a: "Use Add guests to paste a list from Excel, Google Sheets or your notes, one household per line. If your event website is with us, From my RSVPs brings in everyone who replied." },
  { q: "A table won’t move", a: "It’s locked in place. Tap the table and turn off Lock in place, or tap Unlock in the message that shows when you try to move it." },
  { q: "How do I seat everyone quickly?", a: "Group your guests (Bride’s family, Friends…), then press Seat everyone. It fills the tables by group and keeps households together. Anything you move yourself stays where you put it." },
  { q: "How do I print or share it?", a: "Download gives you the floor plan, table cards and a list of who sits where. Share makes a view-only link for your family or coordinator. Both need a free account." },
];
