import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Ink and vows: invented sample data, never a client's. A January
 * wedding at an invented old house in the hills of Batangas. (The paper, the ink, the pen, the
 * gold leaf and the wax are all drawn in code; no photos.)
 */
export const inkvowsDemo: EventContent = {
  id: "demo-inkvows",
  slug: "inkvows-demo",
  hosts: [
    { id: "iv-h1", name: "Clara Montemayor" },
    { id: "iv-h2", name: "Mateo Ilagan" },
  ],
  eventDate: "2028-01-22T16:00:00",
  story:
    "We met in a bookshop in Escolta, both reaching for the last copy of the same old atlas. Mateo let Clara have it, then asked to borrow it.\n\nSix years and many borrowed books later, we are getting married at the house where Clara’s grandmother kept her letters.\n\nWe would love you to be there.",
  primaryLocation: { id: "iv-loc", name: "Casa Alcala", addressLine: "Barangay San Isidro, Lipa, Batangas" },
  schedule: [
    { id: "iv-s1", startTime: "2028-01-22T15:30:00", label: "Guests arrive", description: "Kapeng barako on the veranda" },
    { id: "iv-s2", startTime: "2028-01-22T16:00:00", label: "The ceremony", description: "In the garden, under the old mango tree" },
    { id: "iv-s3", startTime: "2028-01-22T17:15:00", label: "Cocktails in the courtyard" },
    { id: "iv-s4", startTime: "2028-01-22T18:30:00", label: "Dinner and toasts" },
    { id: "iv-s5", startTime: "2028-01-22T20:30:00", label: "First dance, then the party" },
  ],
  accommodations: [
    { id: "iv-a1", name: "The Lipa Garden Hotel", addressLine: "Lipa City", notes: "Fifteen minutes away. Mention our names for the wedding rate." },
    { id: "iv-a2", name: "Casa Alcala guest rooms", addressLine: "At the house", notes: "A few rooms for family. Ask us." },
  ],
  travelInformation: [
    { id: "iv-t1", title: "From Manila", body: "About two hours by car. A shuttle leaves Makati at 1:00 PM and returns at midnight." },
  ],
  galleries: [],
  registryLinks: [],
  cashGifts: [{ id: "iv-cg1", label: "GCash", accountName: "Clara Montemayor", accountNumber: "0917 555 0142" }],
  rsvpDeadline: "2027-12-15",
  faqs: [
    { id: "iv-f1", order: 0, question: "Are children invited?", answer: "We love your little ones, but this will be an adults-only evening." },
    { id: "iv-f2", order: 1, question: "Can I bring a guest?", answer: "Seats are reserved as named on your invitation." },
    { id: "iv-f3", order: 2, question: "Is there parking?", answer: "Yes, in the field beside the house, with attendants from 3:00 PM." },
    { id: "iv-f4", order: 3, question: "What if it rains?", answer: "The ceremony moves to the covered veranda." },
  ],
  keyPeople: [],
  rsvpTableName: "inkvows_demo_rsvps",
  occasion: "wedding",
  entourage: [
    { id: "iv-e1", title: "Parents of the Bride", people: ["Mr. & Mrs. Ramon Montemayor"] },
    { id: "iv-e2", title: "Parents of the Groom", people: ["Mr. & Mrs. Jaime Ilagan"] },
    { id: "iv-e3", title: "Principal Sponsors", people: ["Mr. & Mrs. Alfredo Reyes", "Dr. & Mrs. Victor Lacson", "Mr. & Mrs. Eduardo Panganiban", "Atty. & Mrs. Luis Marasigan"] },
    { id: "iv-e4", title: "Best Man", people: ["Paolo Ilagan"] },
    { id: "iv-e5", title: "Maid of Honor", people: ["Bianca Montemayor"] },
  ],
  motifColors: ["#1f2a44", "#7d8fa6", "#c3a46a", "#e9e1d2"],
  custom: {
    dressCode: "Formal. Gentlemen in suits or barong, ladies in long gowns in the colours below. Kindly leave white to the bride.",
  },
};
