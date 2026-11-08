import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for The Paddle Case: invented sample data, never a client's. A pickleball
 * player's 35th at an invented club in Pasig. (The case, the paddle and everything in it are a
 * Blender render made for this design.)
 */
export const paddlecaseDemo: EventContent = {
  id: "demo-paddlecase",
  slug: "paddlecase-demo",
  hosts: [{ id: "pc-h1", name: "Nico Santos" }],
  eventDate: "2027-06-12T16:00:00",
  primaryLocation: { id: "pc-loc", name: "Hilera Pickleball Club", addressLine: "Kapitolyo, Pasig" },
  story: "Come play, or just come cheer. Beginners welcome, there are spare paddles, and dinner’s by the court.",
  schedule: [
    { id: "pc-s1", startTime: "2027-06-12T16:00:00", label: "Warm-up & open play" },
    { id: "pc-s2", startTime: "2027-06-12T17:30:00", label: "Round robin" },
    { id: "pc-s3", startTime: "2027-06-12T19:00:00", label: "Dinner by the court" },
    { id: "pc-s4", startTime: "2027-06-12T20:00:00", label: "Cake & awards" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [],
  keyPeople: [],
  rsvpTableName: "paddlecase_demo_rsvps",
  rsvpDeadline: "2027-05-30",
  occasion: "birthday",
  custom: {
    milestone: "35",
    dressCode: "Court shoes\nsomething light\na cap for the sun",
    bring: "A water bottle, a towel, and your paddle if you have one",
  },
};
