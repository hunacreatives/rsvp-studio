import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Sprinkles: invented sample data, never a client's. A girl's 7th.
 * (Everything on the page is drawn in code: the frosting and every sprinkle.)
 */
export const sprinklesDemo: EventContent = {
  id: "demo-sprinkles",
  slug: "sprinkles-demo",
  hosts: [{ id: "sp-h1", name: "Mia Laurente" }],
  eventDate: "2027-03-20T14:00:00",
  primaryLocation: { id: "sp-loc", name: "The Sugar Room", addressLine: "12 Acacia Lane, San Juan" },
  schedule: [
    { id: "sp-s1", startTime: "2027-03-20T14:00:00", label: "Hello and games", description: "Face painting by the window" },
    { id: "sp-s2", startTime: "2027-03-20T15:00:00", label: "Decorate your own cupcake" },
    { id: "sp-s3", startTime: "2027-03-20T16:00:00", label: "Cake and the birthday song" },
    { id: "sp-s4", startTime: "2027-03-20T17:00:00", label: "Party bags, then home" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "sp-f1", order: 1, question: "Can parents stay?", answer: "Please do. There’s coffee and a seat for you." },
    { id: "sp-f2", order: 2, question: "Is there parking?", answer: "Yes, in the lot behind the building." },
    { id: "sp-f3", order: 3, question: "Any allergies on the menu?", answer: "The cake and the snacks are nut-free." },
  ],
  keyPeople: [],
  rsvpTableName: "sprinkles_demo_rsvps",
  rsvpDeadline: "2027-03-06",
  occasion: "birthday",
  custom: {
    milestone: "7",
    dressCode: "Party clothes you can play in. Something pink if you have it.",
    giftNote: "Your company is the best gift. If you’d like to bring something, Mia loves books and art supplies.",
    whereNote: "Parking is free in the lot behind the building.",
  },
};
