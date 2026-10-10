import { BESPOKE_COLLECTIONS, OCCASIONS, SEMI_COLLECTIONS, SERVICES } from "./occasions";

// Deep links into the inquiry form, so a CTA carries what the visitor clicked:
//   inquiryLink({ service: "monogram", pkg: "Signature" })
//   → /enquire?service=monogram&package=Signature#start
// The form opens on that choice (services ticked, Custom/Semi-Custom picked,
// collection or suite selected) with a "You're asking about…" line they can clear,
// and the studio's email + Studio → Leads show it as "Asked about".

export type ServiceKey = "website" | "monogram" | "save-the-date" | "stationery" | "rsvp";

const SERVICE_LABEL: Record<ServiceKey, string> = {
  website: "Milestone Events Website",
  monogram: "Monogram",
  "save-the-date": "Digital Save the Date",
  stationery: "Stationery Design",
  rsvp: "RSVP Management",
};
// How the summary line names each service.
const SERVICE_SHORT: Record<ServiceKey, string> = {
  website: "Event website",
  monogram: "Monogram",
  "save-the-date": "Digital save the date",
  stationery: "Printed stationery",
  rsvp: "RSVP management",
};

export type InquiryContext = {
  service?: ServiceKey | ServiceKey[];
  /** The package, tier, suite or item as shown on the page ("Signature", "Heirloom", "Semi-Custom"). */
  pkg?: string;
  /** OCCASIONS key or label ("wedding", "Baby Shower"). */
  occasion?: string;
  design?: "custom" | "semi-custom";
  /** A Semi-Custom website collection ("Garden"). */
  collection?: string;
};

export function inquiryLink(ctx: InquiryContext = {}) {
  const q = new URLSearchParams();
  for (const s of ([] as ServiceKey[]).concat(ctx.service ?? [])) q.append("service", s);
  if (ctx.pkg) q.set("package", ctx.pkg);
  if (ctx.occasion) q.set("occasion", ctx.occasion);
  if (ctx.design) q.set("design", ctx.design);
  if (ctx.collection) q.set("collection", ctx.collection);
  const qs = q.toString();
  return `/enquire${qs ? `?${qs}` : ""}#start`;
}

const ci = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
/** Keep only ordinary characters (letters, numbers, spaces and simple punctuation). */
const clean = (s: string | null) => (s ?? "").replace(/[^\p{L}\p{N} &'’.,()/-]/gu, "").trim().slice(0, 80);

/**
 * Read a deep link into form values. Only known values are applied to the form's
 * own fields; the raw choice always survives as `interested_in` (never the
 * honeypot or contact fields).
 */
export function readInquiryParams(search: string): { values: Record<string, string | string[]>; summary: string | null } {
  const p = new URLSearchParams(search);
  const values: Record<string, string | string[]> = {};
  const keys = [...new Set(p.getAll("service").flatMap((s) => s.split(",")).map((s) => s.trim().toLowerCase()))].filter((s): s is ServiceKey => s in SERVICE_LABEL);
  const services = keys.map((k) => SERVICE_LABEL[k]).filter((l) => SERVICES.includes(l));
  // RSVP management comes with every website.
  if (keys.includes("rsvp") && !services.includes(SERVICE_LABEL.website)) services.unshift(SERVICE_LABEL.website);
  if (services.length) values.services = services;

  const pkg = clean(p.get("package"));
  const collectionRaw = clean(p.get("collection"));
  const collection = SEMI_COLLECTIONS.find((c) => ci(c, collectionRaw));
  let design = clean(p.get("design")).toLowerCase();
  if (!design && keys.includes("website") && /^semi/i.test(pkg)) design = "semi-custom";
  if (!design && keys.includes("website") && /^custom$/i.test(pkg)) design = "custom";
  if (collection) design = "semi-custom";
  // A stationery suite ("Heirloom" → "Heirloom Suite") is picked on the Custom branch.
  const suite = keys.includes("stationery") ? BESPOKE_COLLECTIONS.find((s) => ci(s, pkg) || ci(s, `${pkg} Suite`)) : undefined;
  if (suite && !design) design = "custom";
  if (design === "custom" || design === "bespoke") values.design_type = "bespoke";
  else if (design === "semi-custom") values.design_type = "semi-custom";
  if (collection) values.semi_collections = [collection];
  if (suite) values.bespoke_collections = [suite];

  const occRaw = clean(p.get("occasion"));
  const occ = OCCASIONS.find((o) => ci(o.key, occRaw) || ci(o.label, occRaw));
  if (occ) values.occasion = occ.key;

  // The one-line summary ("Monogram — Signature"), also sent to the studio.
  const first = keys.find((k) => k !== "rsvp") ?? keys[0];
  const parts = [
    first ? SERVICE_SHORT[first] : "",
    suite ?? (collection ? `${collection} collection` : first && pkg && !/^(semi-)?custom$/i.test(pkg) ? pkg : ""),
    // (a collection is always Semi-Custom, so it isn't said twice)
    values.design_type === "semi-custom" && !collection ? "Semi-Custom" : values.design_type === "bespoke" && keys.includes("website") ? "Custom" : "",
    occ ? occ.label : "",
  ].filter(Boolean);
  const summary = parts.length ? parts.join(" — ") : null;
  if (summary) values.interested_in = summary;
  return { values, summary };
}
