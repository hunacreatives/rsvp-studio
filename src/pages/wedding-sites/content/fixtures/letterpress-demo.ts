import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Letterpress: invented sample data, never a client's. A December
 * wedding at an invented garden estate in Cavite. (Everything on the table is drawn in code or
 * cut from Pexels photos; no photos of people.)
 */
export const letterpressDemo: EventContent = {
  id: "demo-letterpress",
  slug: "letterpress-demo",
  hosts: [
    { id: "lp-h1", name: "Clarisse Valdez" },
    { id: "lp-h2", name: "Miguel Aragon" },
  ],
  eventDate: "2027-12-11T16:00:00",
  primaryLocation: { id: "lp-loc", name: "Casa Lirio Estate", addressLine: "Barangay Halang, Amadeo, Cavite" },
  schedule: [
    { id: "lp-s1", startTime: "2027-12-11T15:30:00", label: "Guests arrive", description: "Iced calamansi under the acacias" },
    { id: "lp-s2", startTime: "2027-12-11T16:00:00", label: "The ceremony", description: "In the garden chapel" },
    { id: "lp-s3", startTime: "2027-12-11T17:00:00", label: "Cocktails on the lawn" },
    { id: "lp-s4", startTime: "2027-12-11T18:30:00", label: "Dinner and toasts" },
    { id: "lp-s5", startTime: "2027-12-11T20:30:00", label: "First dance, then the party" },
  ],
  accommodations: [
    { id: "lp-a1", name: "Hotel Alta Vista", addressLine: "Tagaytay City", notes: "Twenty minutes away. Mention our names for the wedding rate." },
    { id: "lp-a2", name: "The Coffee Farm Cottages", addressLine: "Amadeo, Cavite", notes: "A short walk from the estate." },
  ],
  travelInformation: [
    { id: "lp-t1", title: "From Manila", body: "About two hours by car. A shuttle leaves Bonifacio Global City at 1:00 PM and returns at midnight." },
  ],
  galleries: [],
  registryLinks: [],
  cashGifts: [{ id: "lp-cg1", label: "GCash", accountName: "Clarisse Valdez", accountNumber: "0917 555 0186" }],
  rsvpDeadline: "2027-11-01",
  faqs: [
    { id: "lp-f1", order: 0, question: "Are children invited?", answer: "We love your little ones, but this will be an adults-only evening." },
    { id: "lp-f2", order: 1, question: "Can I bring a guest?", answer: "Seats are reserved as named on your invitation." },
    { id: "lp-f3", order: 2, question: "Is there parking?", answer: "Yes, free parking at the estate, with valet from 3:00 PM." },
    { id: "lp-f4", order: 3, question: "What if it rains?", answer: "The ceremony moves into the glass pavilion beside the lawn." },
  ],
  keyPeople: [],
  rsvpTableName: "letterpress_demo_rsvps",
  occasion: "wedding",
  motifColors: ["#2f3b55", "#8ea0b2", "#c9b28a", "#e8dfd0"],
  custom: {
    dressCode: "Formal. Gentlemen in suits or barong, ladies in long gowns in the colours below. Kindly leave white to the bride.",
  },
};
