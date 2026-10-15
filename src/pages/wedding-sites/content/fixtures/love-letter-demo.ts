import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for the Love Letter template — invented sample data,
 * never a client's, never written into a real event. No photos: the oval mat
 * shows the monogram until a couple adds theirs.
 */
export const loveLetterDemo: EventContent = {
  id: "demo-love-letter",
  slug: "love-letter-demo",
  hosts: [
    { id: "ll-h1", name: "Lia Santos" },
    { id: "ll-h2", name: "Marco Reyes" },
  ],
  eventDate: "2030-06-22T15:30:00",
  story: "We met over a borrowed umbrella on a rainy afternoon in Tagaytay. Seven years later, we’d love you there when we say yes in the same town.",
  primaryLocation: { id: "ll-loc", name: "Villa Esperanza", addressLine: "Tagaytay, Cavite" },
  schedule: [
    { id: "ll-s1", startTime: "2030-06-22T15:30:00", label: "Ceremony", description: "In the garden chapel" },
    { id: "ll-s2", startTime: "2030-06-22T17:00:00", label: "Cocktails on the lawn" },
    { id: "ll-s3", startTime: "2030-06-22T18:30:00", label: "Dinner & dancing" },
  ],
  accommodations: [{ id: "ll-a1", name: "The Ridge Hotel", addressLine: "Tagaytay, Cavite", notes: "Mention our names for the wedding rate." }],
  travelInformation: [{ id: "ll-t1", title: "From Manila", body: "About an hour and a half by car via SLEX. Shuttles leave Makati at 12:30 PM." }],
  galleries: [],
  registryLinks: [],
  faqs: [{ id: "ll-f1", question: "Can I bring a plus one?", answer: "We’ve saved a seat in your name. Kindly reply for the number on your invitation.", order: 0 }],
  keyPeople: [],
  rsvpTableName: "love_letter_demo_rsvps",
  occasion: "wedding",
  motifColors: ["#5B6234", "#E9E1CE", "#8C2632"],
  custom: { dressCode: "Garden formal, in soft neutrals and greens.", note: "Formal invitation to follow" },
};
