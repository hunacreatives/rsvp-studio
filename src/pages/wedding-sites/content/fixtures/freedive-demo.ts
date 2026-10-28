import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for The Blue: invented sample data, never a client's. A freediver's
 * 30th off Moalboal. (The diver is a Pexels photo, Pexels licence: pexels.com/photo/35065919;
 * the boat and the ocean are drawn.)
 */
export const freediveDemo: EventContent = {
  id: "demo-freedive",
  slug: "freedive-demo",
  hosts: [{ id: "fd-h1", name: "Kai Navarro" }],
  eventDate: "2027-05-15T06:30:00",
  primaryLocation: { id: "fd-loc", name: "Pescador Island", addressLine: "Moalboal, Cebu" },
  schedule: [
    { id: "fd-s1", startTime: "2027-05-15T06:30:00", label: "The bangka leaves Panagsama Beach", description: "Bring your mask and fins" },
    { id: "fd-s2", startTime: "2027-05-15T07:30:00", label: "First dive at Pescador" },
    { id: "fd-s3", startTime: "2027-05-15T11:00:00", label: "Lunch on the beach" },
    { id: "fd-s4", startTime: "2027-05-15T15:00:00", label: "The sardine run, then cake" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "fd-f1", order: 1, question: "I’ve never freedived. Can I come?", answer: "Of course. Snorkel at the surface with us, or try a first dive with our instructor." },
    { id: "fd-f2", order: 2, question: "What if the sea is rough?", answer: "We’ll move to the next calm morning, and tell you here first." },
  ],
  keyPeople: [],
  rsvpTableName: "freedive_demo_rsvps",
  rsvpDeadline: "2027-05-01",
  occasion: "birthday",
  custom: {
    milestone: "30",
    dressCode: "Mask, fins and reef‑safe sunscreen. A wetsuit if you run cold.",
  },
};
