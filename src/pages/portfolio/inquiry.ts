import type { InquiryContext } from "@/pages/enquire/prefill";
import type { Category, Work } from "./works";

// "Ask about something like this": the inquiry a portfolio piece implies —
// its service, Custom/Semi-Custom, occasion, monogram tier or stationery suite.

const OCCASION_FROM_TAG: [RegExp, string][] = [
  [/wedding/i, "wedding"],
  [/engagement|tinghun/i, "engagement"],
  [/bridal shower/i, "bridal-shower"],
  [/baby shower/i, "baby-shower"],
  [/birthday/i, "birthday"],
  [/anniversary/i, "anniversary"],
];
const SERVICE: Record<Category, NonNullable<InquiryContext["service"]>> = {
  "Milestone Events Website": "website",
  Monogram: "monogram",
  "Digital Save the Date": "save-the-date",
  Stationery: "stationery",
};
/** Portfolio hashes the category filter reads (/portfolio#monogram). */
export const CATEGORY_HASH: Record<Category, string> = {
  "Milestone Events Website": "milestone",
  Monogram: "monogram",
  "Digital Save the Date": "save-the-date",
  Stationery: "stationery",
};

export function inquiryFor(w: Work): InquiryContext {
  const occasion = OCCASION_FROM_TAG.find(([re]) => w.tags.some((t) => re.test(t)))?.[1];
  const service = SERVICE[w.category];
  if (w.category === "Monogram") return { service, pkg: ["Signature", "Duo", "Crest"].find((t) => w.tags.includes(t)) };
  if (w.category === "Stationery") {
    const suite = w.meta.split("·")[0].trim();
    return { service, pkg: /suite$/i.test(suite) ? suite : undefined, occasion };
  }
  if (w.category === "Milestone Events Website") {
    return { service, occasion, design: w.tags.includes("Semi-Custom") ? "semi-custom" : w.tags.includes("Custom") ? "custom" : undefined };
  }
  return { service, occasion };
}
