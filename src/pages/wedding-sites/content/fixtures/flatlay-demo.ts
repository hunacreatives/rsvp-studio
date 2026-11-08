import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Flat Lay: invented sample data, never a client's. A pickleball
 * player's 35th at an invented club in Pasig. (Every prop is a Blender render made for the design.)
 */
export const flatlayDemo: EventContent = {
  id: "demo-flatlay",
  slug: "flatlay-demo",
  hosts: [{ id: "fl-h1", name: "Nico Aranda" }],
  eventDate: "2027-06-12T16:00:00",
  primaryLocation: { id: "fl-loc", name: "Hilera Pickleball Club", addressLine: "Kapitolyo, Pasig" },
  story: "Come play, come watch, or just come for the food. Beginners welcome. We’ll have extra paddles and plenty of balls.",
  schedule: [
    { id: "fl-s1", startTime: "2027-06-12T16:00:00", label: "Warm-up & open play" },
    { id: "fl-s2", startTime: "2027-06-12T17:30:00", label: "Round robin" },
    { id: "fl-s3", startTime: "2027-06-12T19:00:00", label: "Dinner by the court" },
    { id: "fl-s4", startTime: "2027-06-12T20:00:00", label: "Cake & awards" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [],
  keyPeople: [],
  rsvpTableName: "flatlay_demo_rsvps",
  rsvpDeadline: "2027-05-30",
  occasion: "birthday",
  custom: {
    milestone: "35",
    dressCode: "Court shoes (non-marking soles) and something you can move in. White if you have it.",
    bring: "A water bottle, a towel, and your own paddle if you have one.",
  },
};
