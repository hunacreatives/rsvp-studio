import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for the Cinematic template — never a client's
 * data, never written into a real event. Mirrors the "gel-at-30"
 * reference's own birthday-invite copy/tone (generalized), so the
 * gallery preview reads as a finished page rather than empty states.
 */
export const cinematicDemoBirthday: EventContent = {
  id: "demo-cinematic",
  slug: "cinematic-demo",
  hosts: [{ id: "cd-host-1", name: "Mia" }],
  eventDate: "2030-05-11T19:00:00",
  story:
    "Thirty years, give or take a few dramatic detours, and I still can't believe how lucky I've been to spend them with people like you.\n\nCome dance badly with me under string lights, eat too much cake, and help me pretend thirty is basically still twenty-nine.",
  primaryLocation: {
    id: "cd-loc",
    name: "La Terraza",
    addressLine: "Montebello Gardens",
  },
  schedule: [],
  accommodations: [],
  travelInformation: [],
  galleries: [
    {
      id: "cd-gallery",
      items: [
        {
          id: "cd-photo-1",
          order: 0,
          image: {
            id: "cd-img-1",
            masterUrl: "/instagram/post-01.jpg",
            width: 1080,
            height: 1080,
            alt: "Mia laughing at a birthday party",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2030-01-01T00:00:00",
          },
        },
        {
          id: "cd-photo-2",
          order: 1,
          image: {
            id: "cd-img-2",
            masterUrl: "/instagram/post-05.jpg",
            width: 1080,
            height: 1080,
            alt: "Mia and friends celebrating",
            focalPoint: { x: 0.5, y: 0.45 },
            createdAt: "2030-01-01T00:00:00",
          },
        },
      ],
    },
  ],
  registryLinks: [],
  faqs: [
    {
      id: "cd-faq-1",
      question: "What should I wear?",
      answer: "Garden party chic — think soft colors, comfortable shoes, maybe a little sparkle.",
      order: 0,
    },
    {
      id: "cd-faq-2",
      question: "Can I bring a plus one?",
      answer: "This one's an intimate gathering, so we're keeping it to named guests only. Thank you for understanding!",
      order: 1,
    },
  ],
  keyPeople: [],
  rsvpTableName: "cinematic_demo_rsvps",
};
