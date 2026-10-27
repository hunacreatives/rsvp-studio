import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Riviera: invented sample data, never a client's. An engagement
 * cruise on Manila Bay at sunset. (Props on deck are Pexels photos, Pexels licence:
 * pexels.com/photo/20817639, 1499477, 7283343; the teak is 14232830. The sea's wave normals
 * are three.js's waternormals.jpg, MIT.)
 */
export const rivieraDemo: EventContent = {
  id: "demo-riviera",
  slug: "riviera-demo",
  hosts: [
    { id: "rv-h1", name: "Celine Navarro" },
    { id: "rv-h2", name: "Marco Villanueva" },
  ],
  eventDate: "2027-06-12T17:00:00",
  story: "Join us on the water as we celebrate our engagement, with the people who made us us.",
  primaryLocation: { id: "rv-loc", name: "Manila Yacht Club", addressLine: "Roxas Boulevard, Manila" },
  schedule: [
    { id: "rv-s1", startTime: "2027-06-12T16:30:00", label: "Board at the club", description: "Gate 2, by the marina office" },
    { id: "rv-s2", startTime: "2027-06-12T17:00:00", label: "Cast off", description: "Champagne on the foredeck" },
    { id: "rv-s3", startTime: "2027-06-12T17:42:00", label: "Sunset over the bay" },
    { id: "rv-s4", startTime: "2027-06-12T19:00:00", label: "Dinner on deck" },
    { id: "rv-s5", startTime: "2027-06-12T21:30:00", label: "Back on shore" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "rv-f1", order: 1, question: "What shoes should I wear?", answer: "Soft soles or barefoot on deck, please. No heels: they mark the teak." },
    { id: "rv-f2", order: 2, question: "What if the weather turns?", answer: "If the coast guard stops sailing, we’ll move to the next evening. You’ll hear from us here and by message first." },
    { id: "rv-f3", order: 3, question: "Is there parking?", answer: "Yes, at the club. Show your name at the gate." },
  ],
  keyPeople: [],
  rsvpTableName: "riviera_demo_rsvps",
  rsvpDeadline: "2027-05-01",
  occasion: "engagement",
  custom: {
    heroLine: "An engagement cruise",
    boardingTime: "4:30 PM",
    returnTime: "9:30 PM",
    eveningTitle: "Manila Bay, at sunset",
    dressCode: "White and navy, linen welcome. Bring a light layer for the evening breeze.",
  },
};
