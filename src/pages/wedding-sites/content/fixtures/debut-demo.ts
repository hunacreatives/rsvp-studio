import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for the Debut template — invented sample data,
 * never a client's, never written into a real event.
 */
export const debutDemo: EventContent = {
  id: "demo-debut",
  slug: "debut-demo",
  hosts: [{ id: "db-host-1", name: "Sofia Isabel Reyes" }],
  eventDate: "2030-11-23T18:00:00",
  story:
    "Eighteen years of love, laughter and the people who made them. I would be so happy to have you there as I start this new chapter.\n\nPlease come in your loveliest, and save me a dance.",
  primaryLocation: { id: "db-loc", name: "The Rosewood Pavilion", addressLine: "Tagaytay City, Cavite" },
  schedule: [
    { id: "db-s1", startTime: "2030-11-23T18:00:00", label: "Guest arrival & cocktails" },
    { id: "db-s2", startTime: "2030-11-23T19:00:00", label: "Grand entrance", description: "With the cotillion de honor" },
    { id: "db-s3", startTime: "2030-11-23T19:30:00", label: "Dinner" },
    { id: "db-s4", startTime: "2030-11-23T20:30:00", label: "18 Roses, Candles & Treasures" },
    { id: "db-s5", startTime: "2030-11-23T21:30:00", endTime: "2030-11-23T23:00:00", label: "Party" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  faqs: [
    { id: "db-f1", question: "Can I bring a plus one?", answer: "We’ve reserved a seat in your name. Kindly reply for the number shown on your invitation.", order: 0 },
    { id: "db-f2", question: "Is there parking?", answer: "Free parking at the pavilion; valet from 5:30 PM.", order: 1 },
  ],
  keyPeople: [],
  rsvpTableName: "debut_demo_rsvps",
  occasion: "birthday",
  motifColors: ["#6B1F2B", "#B8914A", "#F4EDE1"],
  entourage: [
    { id: "db-g1", title: "18 Roses", people: ["Miguel Santos", "Paolo Reyes", "Carlo Mendoza", "Andre Villanueva", "Joaquin Cruz", "Rafael Lim", "Nico Bautista", "Gabriel Tan", "Luis Garcia", "Marco Dela Rosa", "Enzo Aquino", "Diego Ramos", "Javi Navarro", "Tomas Ocampo", "Sebastian Uy", "Lorenzo Castillo", "Adrian Torres", "Daddy Ramon Reyes"] },
    { id: "db-g2", title: "18 Candles", people: ["Bea Castillo", "Ysabel Ong", "Andrea Lim", "Patricia Gomez", "Camille Santos", "Nicole Tan", "Gabbie Cruz", "Mika Rivera", "Jasmine Reyes", "Kaye Mendoza", "Alyssa Uy", "Trisha Garcia", "Danica Lopez", "Hannah Sy", "Erika Ramos", "Faye Ocampo", "Lara Bautista", "Mommy Tess Reyes"] },
    { id: "db-g3", title: "18 Treasures", people: ["Tita Grace Reyes", "Tito Ben Reyes", "Lola Pilar Santos", "Lolo Ernesto Santos", "Ninang Liza Cruz", "Ninong Jun Cruz", "Tita Mae Lim", "Tito Ricky Tan", "Ate Joanna Reyes", "Kuya Mark Reyes", "Ninang Cora Uy", "Ninong Al Uy", "Tita Jen Garcia", "Tito Dan Garcia", "Tita Weng Ocampo", "Tito Boy Ocampo", "Lola Nena Reyes", "Ate Sam Lim"] },
    { id: "db-g4", title: "Escort", people: ["Miguel Santos"] },
  ],
  custom: {
    dressCode: "Formal. Ladies in long gowns, gentlemen in suits, in shades of wine and gold.",
  },
};
