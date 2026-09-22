import type { EventContent } from "../types";

/**
 * Development fixture only — a deliberately BARELY-FILLED draft, the
 * state a real couple is in moments after creating their event.
 *
 * It exists because a template that looks finished against complete
 * content can still collapse to almost nothing here, which is exactly
 * what happened to the Scrapbook template: every empty section was
 * hidden, leaving a hero and two collages. Check new templates against
 * this fixture with the editor toggle on, not just against
 * isabella-and-mateo.
 */
export const sparseDraft: EventContent = {
  id: "fixture-sparse-draft",
  slug: "sparse-draft",
  hosts: [
    { id: "host-1", name: "Testing" },
    { id: "host-2", name: "Testing" },
  ],
  eventDate: "",
  primaryLocation: { id: "loc-main", name: "Francis", addressLine: "" },
  schedule: [],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [],
  keyPeople: [],
  rsvpTableName: "",
};
