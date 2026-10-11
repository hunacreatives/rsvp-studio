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
  story: "Join me for an intimate dinner\nas we celebrate this milestone together!",
  primaryLocation: {
    id: "cd-loc",
    name: "La Terraza",
    addressLine: "Montebello",
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
            masterUrl: "/instagram/post-03.jpg",
            width: 640,
            height: 800,
            alt: "Mia at the beach",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2030-01-01T00:00:00",
          },
        },
        {
          id: "cd-photo-2",
          order: 1,
          image: {
            id: "cd-img-2",
            masterUrl: "/instagram/post-02.jpg",
            width: 640,
            height: 800,
            alt: "Mia with friends",
            focalPoint: { x: 0.5, y: 0.45 },
            createdAt: "2030-01-01T00:00:00",
          },
        },
      ],
    },
  ],
  registryLinks: [],
  faqs: [],
  keyPeople: [],
  rsvpTableName: "cinematic_demo_rsvps",
  occasion: "birthday",
  custom: {
    headline: "Mia is\nturning thirty!",
    dressCode: "Think soft pastels, garden florals, or anything that feels like a warm spring afternoon \u273f",
  },
};
