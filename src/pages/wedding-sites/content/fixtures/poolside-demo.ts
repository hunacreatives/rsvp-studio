import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Poolside: invented sample data, never a client's. A 30th birthday
 * by the pool. (Everything on the deck is drawn; the water's wave normals are three.js's
 * waternormals.jpg, MIT.)
 */
export const poolsideDemo: EventContent = {
  id: "demo-poolside",
  slug: "poolside-demo",
  hosts: [{ id: "ps-h1", name: "Bianca Soriano" }],
  eventDate: "2027-04-03T11:30:00",
  primaryLocation: { id: "ps-loc", name: "Casa Marea", addressLine: "Nasugbu, Batangas" },
  schedule: [
    { id: "ps-s1", startTime: "2027-04-03T11:30:00", label: "Doors open", description: "Towels at the gate" },
    { id: "ps-s2", startTime: "2027-04-03T13:00:00", label: "Long lunch under the umbrellas" },
    { id: "ps-s3", startTime: "2027-04-03T15:30:00", label: "Cake by the pool" },
    { id: "ps-s4", startTime: "2027-04-03T18:05:00", label: "Sunset, then the music gets louder" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "ps-f1", order: 1, question: "Should I bring a towel?", answer: "No need. There are towels at the gate, and showers by the pool." },
    { id: "ps-f2", order: 2, question: "Can I bring the kids?", answer: "This one’s for grown-ups, so please leave the little ones at home." },
  ],
  keyPeople: [],
  rsvpTableName: "poolside_demo_rsvps",
  rsvpDeadline: "2027-03-15",
  occasion: "birthday",
  custom: {
    milestone: "30",
    dressCode: "Swimwear and resort whites. Bring a change of clothes for the evening.",
  },
};
