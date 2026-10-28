import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Summit: invented sample data, never a client's. A climber's 30th
 * on Mt. Pulag. (The climber is cut from a Pexels photo, Pexels licence: pexels.com/photo/17244574;
 * the mountains, the cloud and the marker are drawn.)
 */
export const summitDemo: EventContent = {
  id: "demo-summit",
  slug: "summit-demo",
  hosts: [{ id: "sm-h1", name: "Kai Navarro" }],
  eventDate: "2027-05-15T02:00:00",
  primaryLocation: { id: "sm-loc", name: "Mt. Pulag", addressLine: "Ambangeg Trail, Kabayan, Benguet" },
  schedule: [
    { id: "sm-s1", startTime: "2027-05-15T02:00:00", label: "We set off from the ranger station", description: "Headlamps on" },
    { id: "sm-s2", startTime: "2027-05-15T05:30:00", label: "Sunrise above the sea of clouds" },
    { id: "sm-s3", startTime: "2027-05-15T08:00:00", label: "Breakfast at camp" },
    { id: "sm-s4", startTime: "2027-05-15T12:00:00", label: "Lunch and cake in town" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "sm-f1", order: 1, question: "Is it a hard climb?", answer: "It’s a gentle trail. If you can walk for three hours, you can do it." },
    { id: "sm-f2", order: 2, question: "What if it rains?", answer: "We’ll move to the next clear weekend, and tell you here first." },
  ],
  keyPeople: [],
  rsvpTableName: "summit_demo_rsvps",
  rsvpDeadline: "2027-05-01",
  occasion: "birthday",
  custom: {
    milestone: "30",
    summitHeight: "2922",
    dressCode: "A jacket and layers: it gets cold before sunrise. Rain gear, a headlamp and good boots.",
  },
};
