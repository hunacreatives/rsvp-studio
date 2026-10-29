import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Pixel Quest: invented sample data, never a client's. A kid's 8th.
 * (Everything on the page is drawn in code: the level, the hero, the set pieces, the HUD.)
 */
export const pixelQuestDemo: EventContent = {
  id: "demo-pixel-quest",
  slug: "pixel-quest-demo",
  hosts: [{ id: "pq-h1", name: "Enzo Villacorta" }],
  eventDate: "2027-06-12T15:00:00",
  primaryLocation: { id: "pq-loc", name: "Bitbox Party Hall", addressLine: "Kapitolyo, Pasig" },
  schedule: [
    { id: "pq-s1", startTime: "2027-06-12T15:00:00", label: "Doors open", description: "Grab your tokens at the door" },
    { id: "pq-s2", startTime: "2027-06-12T15:30:00", label: "Arcade games and prizes" },
    { id: "pq-s3", startTime: "2027-06-12T16:30:00", label: "Cake and the birthday song" },
    { id: "pq-s4", startTime: "2027-06-12T17:30:00", label: "Loot bags, then home" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "pq-f1", order: 1, question: "Can parents stay?", answer: "Of course. There’s coffee and a comfy corner for you." },
    { id: "pq-f2", order: 2, question: "Is there parking?", answer: "Yes, along the street and in the lot next door." },
    { id: "pq-f3", order: 3, question: "Any allergies on the menu?", answer: "The cake and the snacks are nut-free." },
  ],
  keyPeople: [],
  rsvpTableName: "pixel_quest_demo_rsvps",
  rsvpDeadline: "2027-05-29",
  occasion: "birthday",
  custom: {
    milestone: "8",
    dressCode: "Comfy play clothes you can run around in. Bonus points for anything in your favourite game colour.",
    giftNote: "Your company is the best gift. If you’d like to bring something, Enzo loves building sets and comic books.",
  },
};
