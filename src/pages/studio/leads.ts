import type { Lead } from "./studioApi";

/** What a lead tells us for a new project: name, type, date and services. */
export function projectFromLead(l: Pick<Lead, "values" | "name">) {
  const v = l.values ?? {};
  const s = (k: string) => (Array.isArray(v[k]) ? (v[k] as string[]).join(", ") : (v[k] as string) ?? "");
  const occasion = s("occasion").toLowerCase();
  const type = /wedding|engagement|bridal/.test(occasion) ? "wedding" : /birthday|debut/.test(occasion) ? "birthday" : /anniversary/.test(occasion) ? "anniversary" : "other";
  const name = s("couple_names") || s("celebrant_name") || s("parents_names") || l.name || "";
  const date = /^\d{4}-\d{2}-\d{2}/.test(s("event_date")) ? s("event_date").slice(0, 10) : "";
  const wanted = (Array.isArray(v.services) ? (v.services as string[]) : []).concat(Array.isArray(v.addons) ? (v.addons as string[]) : []);
  const map: Record<string, string> = {
    "Milestone Events Website": type === "wedding" ? "Wedding Website" : "Event Website",
    Monogram: "Monogram Design",
    "Digital Save the Date": "Digital Save the Date",
    "Stationery Design": "Stationery Design",
    "Printed stationery": "Stationery Design",
    "RSVP Management": "RSVP Management",
  };
  const services = [...new Set(wanted.map((w) => map[w]).filter(Boolean))];
  return { name, type, date, services };
}
