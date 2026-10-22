import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for the Pickleball template — invented sample
 * data, never a client's, never written into a real event.
 */
export const pickleballDemoBirthday: EventContent = {
  id: "demo-pickleball",
  slug: "pickleball-demo",
  hosts: [{ id: "pb-host-1", name: "Rina Santos" }],
  eventDate: "2030-03-16T15:00:00",
  story:
    "Thirty years in, and I finally found a sport I’m good at. Come rally, dink and toast with me, no experience needed.\n\nPaddles, balls and drinks are on us. Just bring your best trash talk.",
  primaryLocation: {
    id: "pb-loc",
    name: "Rally Point Pickleball Club",
    addressLine: "Bonifacio Global City, Taguig",
  },
  schedule: [
    { id: "pb-s1", startTime: "2030-03-16T15:00:00", label: "Warm-up rally", description: "Quick lessons for first-timers." },
    { id: "pb-s2", startTime: "2030-03-16T16:00:00", label: "Round-robin doubles", description: "Partners drawn from a hat." },
    { id: "pb-s3", startTime: "2030-03-16T18:00:00", label: "Drinks & dinner", description: "Courtside, with cake." },
  ],
  accommodations: [],
  travelInformation: [],
  // Stock photos (HONG SON on Pexels, Pexels licence; pexels.com/photo/32975180–32975184).
  galleries: [
    {
      id: "pb-gal",
      title: "Court moments",
      items: [
        { id: "pb-g1", order: 1, image: { id: "pb-img1", masterUrl: "/event-templates/pickleball/demo/court-1.webp", width: 800, height: 1200, alt: "Rina mid-swing", focalPoint: { x: 0.5, y: 0.35 }, createdAt: "2030-01-01T00:00:00Z" } },
        { id: "pb-g2", order: 2, image: { id: "pb-img2", masterUrl: "/event-templates/pickleball/demo/court-2.webp", width: 1200, height: 799, alt: "Rina returning a shot", focalPoint: { x: 0.5, y: 0.45 }, createdAt: "2030-01-01T00:00:00Z" } },
        { id: "pb-g3", order: 3, image: { id: "pb-img3", masterUrl: "/event-templates/pickleball/demo/court-3.webp", width: 1200, height: 799, alt: "Rina at the baseline", focalPoint: { x: 0.5, y: 0.45 }, createdAt: "2030-01-01T00:00:00Z" } },
      ],
    },
  ],
  registryLinks: [],
  faqs: [
    { id: "pb-f1", question: "I’ve never played. Can I still come?", answer: "Yes! There’s a quick lesson at the start, and nobody is keeping score.", order: 0 },
    { id: "pb-f2", question: "Is there parking?", answer: "Free parking at the club’s basement, entrance on 26th Street.", order: 1 },
  ],
  keyPeople: [],
  rsvpTableName: "pickleball_demo_rsvps",
  occasion: "birthday",
  motifColors: ["#FFFFFF", "#1F6F55", "#EEB8C6"],
  custom: {
    occasionLine: "to celebrate the 30th birthday of",
    dressCode: "Court whites, or anything pink and green.",
    bring: "Comfy court shoes\nA water bottle\nYour own paddle (we have spares)\nYour best trick shot",
  },
};
