import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Level Up: invented sample data, never a client's. A gamer's 30th.
 * (Everything on the page is drawn in code: the island, the landmarks, the HUD.)
 */
export const levelUpDemo: EventContent = {
  id: "demo-levelup",
  slug: "levelup-demo",
  hosts: [{ id: "lu-h1", name: "Kai Navarro" }],
  eventDate: "2027-05-15T14:00:00",
  primaryLocation: { id: "lu-loc", name: "Sentro Hall", addressLine: "Legazpi Village, Makati" },
  schedule: [
    { id: "lu-s1", startTime: "2027-05-15T14:00:00", label: "Arrive and grab a controller", description: "Snacks at the door" },
    { id: "lu-s2", startTime: "2027-05-15T15:00:00", label: "The tournament begins" },
    { id: "lu-s3", startTime: "2027-05-15T17:00:00", label: "Cake and the boss battle" },
    { id: "lu-s4", startTime: "2027-05-15T19:00:00", label: "Free play till late" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "lu-f1", order: 1, question: "Do I need to be good at games?", answer: "Not at all. There’s a beginners’ bracket." },
    { id: "lu-f2", order: 2, question: "Is there parking?", answer: "Yes, in the building’s basement." },
  ],
  keyPeople: [],
  rsvpTableName: "levelup_demo_rsvps",
  rsvpDeadline: "2027-05-01",
  occasion: "birthday",
  custom: {
    milestone: "30",
    dressCode: "Come as your favourite character, or in your comfiest gaming clothes. Bring your own controller if you have one.",
  },
};
