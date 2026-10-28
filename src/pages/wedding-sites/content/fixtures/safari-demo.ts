import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Safari: invented sample data, never a client's. A fifth birthday at
 * a zoo. (Everything on the page is drawn in code: the paper, the animals, the jeep.)
 */
export const safariDemo: EventContent = {
  id: "demo-safari",
  slug: "safari-demo",
  hosts: [{ id: "sf-h1", name: "Maya Santos" }],
  eventDate: "2027-06-12T15:00:00",
  primaryLocation: { id: "sf-loc", name: "Avilon Zoo", addressLine: "Rodriguez, Rizal" },
  schedule: [
    { id: "sf-s1", startTime: "2027-06-12T15:00:00", label: "The gates open", description: "Face painting by the entrance" },
    { id: "sf-s2", startTime: "2027-06-12T15:30:00", label: "Meet the animals" },
    { id: "sf-s3", startTime: "2027-06-12T16:30:00", label: "Cake and songs" },
    { id: "sf-s4", startTime: "2027-06-12T17:30:00", label: "Goodie bags, then home" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "sf-f1", order: 1, question: "Can siblings come?", answer: "Of course. Just add them when you reply." },
    { id: "sf-f2", order: 2, question: "Is there parking?", answer: "Yes, right by the gate." },
  ],
  keyPeople: [],
  rsvpTableName: "safari_demo_rsvps",
  rsvpDeadline: "2027-06-01",
  occasion: "birthday",
  custom: {
    milestone: "5",
    dressCode: "Safari khaki and comfy shoes. Hats and binoculars welcome.",
  },
};
