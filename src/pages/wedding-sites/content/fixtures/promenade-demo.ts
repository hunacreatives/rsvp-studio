import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for the Promenade template — invented sample data,
 * never a client's, never written into a real event. No photos.
 */
export const promenadeDemo: EventContent = {
  id: "demo-promenade",
  slug: "promenade-demo",
  hosts: [
    { id: "pm-h1", name: "Andrea Villanueva" },
    { id: "pm-h2", name: "Diego Ramos" },
  ],
  eventDate: "2030-06-21T15:00:00",
  story:
    "2021 · How We Met\nIt started at a rooftop dinner one rainy June. Diego spent the evening working up the courage to say hello.\n\n2023 · First Adventure\nSix months in, we packed our bags for a last-minute trip to Siargao and knew this was something real.\n\n2025 · The Proposal\nOn a quiet evening by the sea, Diego got down on one knee. Andrea said yes before he could finish.",
  primaryLocation: { id: "pm-loc", name: "Casa Esmeralda Garden Pavilion", addressLine: "Tagaytay City, Cavite" },
  schedule: [
    { id: "pm-s1", startTime: "2030-06-21T15:00:00", label: "Guest arrival & welcome drinks" },
    { id: "pm-s2", startTime: "2030-06-21T15:30:00", label: "Ceremony" },
    { id: "pm-s3", startTime: "2030-06-21T16:30:00", label: "Cocktail hour" },
    { id: "pm-s4", startTime: "2030-06-21T18:00:00", label: "Dinner & speeches" },
    { id: "pm-s5", startTime: "2030-06-21T20:00:00", label: "First dance & celebration" },
    { id: "pm-s6", startTime: "2030-06-21T22:30:00", label: "Farewell" },
  ],
  accommodations: [
    { id: "pm-a1", name: "The Ridge Hotel", addressLine: "Tagaytay City", notes: "Mention our names for the wedding rate." },
    { id: "pm-a2", name: "Pine Hill Suites", addressLine: "5 minutes from the venue" },
  ],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "pm-f1", question: "What is the dress code?", answer: "Formal. Gentlemen in dark suits, ladies in floor-length gowns.", order: 0 },
    { id: "pm-f2", question: "Are children welcome?", answer: "We love your little ones, but this will be an adults-only celebration.", order: 1 },
    { id: "pm-f3", question: "Can I bring a plus-one?", answer: "We’ve reserved seats as named on your invitation.", order: 2 },
    { id: "pm-f4", question: "Is there parking at the venue?", answer: "Yes, free parking on site.", order: 3 },
  ],
  keyPeople: [],
  rsvpTableName: "promenade_demo_rsvps",
  occasion: "wedding",
  motifColors: ["#1A1A2E", "#8B0000", "#C9A96E", "#F5F0E8"],
  custom: { dressCode: "Garden formal. Gentlemen in dark suits, ladies in long dresses. The lawns are soft, so leave the stilettos at home, and kindly avoid white or ivory." },
};
