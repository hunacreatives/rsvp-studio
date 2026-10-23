import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for In Bloom (id "cinematic") — never a client's
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
  schedule: [
    { id: "cd-s1", startTime: "2030-05-11T19:00:00", label: "Dinner on the terrace", description: "Four courses, long table" },
    { id: "cd-s2", startTime: "2030-05-11T20:30:00", label: "Cake & toasts" },
    { id: "cd-s3", startTime: "2030-05-11T21:30:00", label: "Dancing", description: "Until they kick us out" },
  ],
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
            // Stock: Kampus Production on Pexels (pexels.com/photo/5935252), Pexels licence.
            masterUrl: "/event-templates/cinematic/demo-mia-1.webp",
            width: 640,
            height: 800,
            alt: "Mia celebrating with a sparkler",
            focalPoint: { x: 0.5, y: 0.3 },
            createdAt: "2030-01-01T00:00:00",
          },
        },
        {
          id: "cd-photo-2",
          order: 1,
          image: {
            id: "cd-img-2",
            // Stock: same shoot (pexels.com/photo/5935248).
            masterUrl: "/event-templates/cinematic/demo-mia-2.webp",
            width: 640,
            height: 800,
            alt: "Mia with friends",
            focalPoint: { x: 0.5, y: 0.3 },
            createdAt: "2030-01-01T00:00:00",
          },
        },
        // Same shoot (pexels.com/photo/5935244, 5935229, 5935235, 5935247, 5935268, 5935231).
        {
          id: "cd-photo-3",
          order: 2,
          image: { id: "cd-img-3", masterUrl: "/event-templates/cinematic/demo-mia-3.webp", width: 1000, height: 667, alt: "Mia with friends at sunset", focalPoint: { x: 0.5, y: 0.4 }, createdAt: "2030-01-01T00:00:00" },
        },
        {
          id: "cd-photo-4",
          order: 3,
          image: { id: "cd-img-4", masterUrl: "/event-templates/cinematic/demo-mia-4.webp", width: 1000, height: 667, alt: "A toast on the rooftop", focalPoint: { x: 0.5, y: 0.4 }, createdAt: "2030-01-01T00:00:00" },
        },
        {
          id: "cd-photo-5",
          order: 4,
          image: { id: "cd-img-5", masterUrl: "/event-templates/cinematic/demo-mia-5.webp", width: 1000, height: 667, alt: "Laughing together", focalPoint: { x: 0.5, y: 0.4 }, createdAt: "2030-01-01T00:00:00" },
        },
        {
          id: "cd-photo-6",
          order: 5,
          image: { id: "cd-img-6", masterUrl: "/event-templates/cinematic/demo-mia-6.webp", width: 1000, height: 667, alt: "Cake with candles", focalPoint: { x: 0.5, y: 0.4 }, createdAt: "2030-01-01T00:00:00" },
        },
        {
          id: "cd-photo-7",
          order: 6,
          image: { id: "cd-img-7", masterUrl: "/event-templates/cinematic/demo-mia-7.webp", width: 1000, height: 1500, alt: "Mia, smiling", focalPoint: { x: 0.5, y: 0.4 }, createdAt: "2030-01-01T00:00:00" },
        },
        {
          id: "cd-photo-8",
          order: 7,
          image: { id: "cd-img-8", masterUrl: "/event-templates/cinematic/demo-mia-8.webp", width: 1000, height: 667, alt: "Dancing at golden hour", focalPoint: { x: 0.5, y: 0.4 }, createdAt: "2030-01-01T00:00:00" },
        },
      ],
    },
  ],
  registryLinks: [],
  faqs: [
    { id: "cd-f1", order: 1, question: "Can I bring a plus one?", answer: "Of course. Just add them when you RSVP so we can save a seat." },
    { id: "cd-f2", order: 2, question: "Where do I park?", answer: "There’s valet at the front of La Terraza, or street parking a short walk away." },
    { id: "cd-f3", order: 3, question: "Gifts?", answer: "Your company is the gift. Truly." },
  ],
  keyPeople: [],
  rsvpTableName: "cinematic_demo_rsvps",
  occasion: "birthday",
  motifColors: ["#f2c6cf", "#f6e3b4", "#c9d8ef", "#cfdcc0"],
  custom: {
    headline: "Mia is\nturning thirty!",
    dressCode: "Think soft pastels, garden florals, or anything that feels like a warm spring afternoon \u273f",
  },
};
