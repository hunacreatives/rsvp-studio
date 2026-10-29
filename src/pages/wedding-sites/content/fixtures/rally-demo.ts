import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Rally: invented sample data, never a client's. A pickleball player's
 * 35th at an invented club in Pasig. (Everything on the page is drawn in code: the court, the
 * ball, the paddles, the lights.)
 */
export const rallyDemo: EventContent = {
  id: "demo-rally",
  slug: "rally-demo",
  hosts: [{ id: "ra-h1", name: "Nico Aranda" }],
  eventDate: "2027-06-12T16:00:00",
  primaryLocation: { id: "ra-loc", name: "Hilera Pickleball Club", addressLine: "Kapitolyo, Pasig" },
  schedule: [
    { id: "ra-s1", startTime: "2027-06-12T16:00:00", label: "Warm-up and open play", description: "Quick lessons for first-timers" },
    { id: "ra-s2", startTime: "2027-06-12T17:00:00", label: "Round-robin doubles", description: "Partners drawn from a hat" },
    { id: "ra-s3", startTime: "2027-06-12T18:30:00", label: "The birthday final under the lights" },
    { id: "ra-s4", startTime: "2027-06-12T19:00:00", label: "Dinner and cake courtside" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "ra-f1", order: 1, question: "I’ve never played. Can I still come?", answer: "Yes. There’s a short lesson at four, and spare paddles for everyone." },
    { id: "ra-f2", order: 2, question: "Is there parking?", answer: "A few slots at the club, more on the street behind it." },
    { id: "ra-f3", order: 3, question: "What if it rains?", answer: "We move to the covered courts next door." },
  ],
  keyPeople: [],
  rsvpTableName: "rally_demo_rsvps",
  rsvpDeadline: "2027-05-29",
  occasion: "birthday",
  custom: {
    milestone: "35",
    dressCode: "Court shoes with non-marking soles, and anything you can move in. Bonus points for neon.",
    bring: "Your paddle, if you have one\nA water bottle\nA towel and a change of shirt",
    giftNote: "Your company is the gift. If you’d like to give something, new balls for the club are always welcome.",
  },
};
