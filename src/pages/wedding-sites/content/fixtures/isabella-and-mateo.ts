import type { EventContent } from "../types";

/**
 * Development fixture only — never shipped as a client's content.
 *
 * Deliberately COMPLETE: two hosts, a multi-paragraph story, date,
 * venue, four schedule events, two accommodations, travel info, nine
 * photos, four key people, two registry links and five FAQs. Templates
 * (especially the collage-heavy Scrapbook one) can't be judged against
 * a half-empty draft — missing data hides real layout problems, which
 * is exactly how the Scrapbook template first looked "finished" while
 * most of its sections were quietly collapsed.
 *
 * Photos point at real files already in public/ so previews show
 * actual photographs rather than broken-image placeholders.
 */
export const isabellaAndMateo: EventContent = {
  id: "fixture-isabella-mateo",
  slug: "isabella-and-mateo",
  hosts: [
    { id: "host-1", name: "Isabella" },
    { id: "host-2", name: "Mateo" },
  ],
  eventDate: "2027-06-14T16:00:00",
  story:
    "We met in a crowded Florence market, both reaching for the last basket of figs. Mateo let Isabella have them, then spent twenty minutes pretending to shop for something else so the conversation wouldn't end.\n\nFour years, two cities and one very opinionated cat later, he asked her to marry him on the same street corner — with figs.\n\nWe're bringing everyone we love to the hills outside Florence to celebrate, and we can't quite believe it's finally happening.",
  primaryLocation: {
    id: "loc-main",
    name: "Villa Aurelia",
    addressLine: "Via delle Colline 12, Florence, Italy",
  },
  schedule: [
    {
      id: "sch-1",
      startTime: "2027-06-13T18:30:00",
      label: "Welcome Drinks",
      description: "Aperitivo on the terrace the evening before — come as you are.",
    },
    {
      id: "sch-2",
      startTime: "2027-06-14T16:00:00",
      label: "Ceremony",
      description: "In the chapel courtyard, under the cypress trees. Please be seated by 3:45 PM.",
    },
    {
      id: "sch-3",
      startTime: "2027-06-14T17:00:00",
      label: "Cocktail Hour",
      description: "Negronis and Tuscan snacks in the garden while we steal away for photographs.",
    },
    {
      id: "sch-4",
      startTime: "2027-06-14T19:00:00",
      label: "Dinner & Dancing",
      description: "One long table, far too many courses, and dancing until the candles burn out.",
    },
  ],
  accommodations: [
    {
      id: "acc-1",
      name: "Hotel Santa Chiara",
      addressLine: "Via dei Fossi 8, Florence",
      bookingUrl: "https://example.com/santa-chiara",
      notes: "Ten minutes from the station; mention our names for the group rate.",
    },
    {
      id: "acc-2",
      name: "Agriturismo Le Colline",
      addressLine: "Strada di Montebeni 4, Fiesole",
      bookingUrl: "https://example.com/le-colline",
      notes: "Closest to the villa — best for anyone bringing children.",
    },
  ],
  travelInformation: [
    {
      id: "trv-1",
      title: "Getting There",
      body: "Fly into Florence (FLR) for the shortest transfer, or Pisa (PSA) for cheaper fares and a one-hour train. Trains from Rome take about ninety minutes.",
    },
    {
      id: "trv-2",
      title: "Transportation",
      body: "A shuttle runs from Hotel Santa Chiara to the villa at 2:30 PM and returns at midnight and 1:00 AM. Taxis are scarce in the hills, so please use the shuttle if you can.",
    },
  ],
  galleries: [
    {
      id: "gal-1",
      title: "Us, lately",
      items: [
        {
          id: "gi-1",
          order: 1,
          layoutHint: "wide",
          image: {
            id: "img-1",
            masterUrl: "/instagram/post-01.jpg",
            width: 1200,
            height: 1200,
            alt: "Sunset over the Tuscan hills",
            focalPoint: { x: 0.5, y: 0.45 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-2",
          order: 2,
          layoutHint: "standard",
          image: {
            id: "img-2",
            masterUrl: "/instagram/post-02.jpg",
            width: 1200,
            height: 1200,
            alt: "Villa Aurelia's garden terrace",
            focalPoint: { x: 0.5, y: 0.5 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-3",
          order: 3,
          layoutHint: "portrait",
          image: {
            id: "img-3",
            masterUrl: "/instagram/post-03.jpg",
            width: 1200,
            height: 1200,
            alt: "Isabella and Mateo in the olive grove",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-4",
          order: 4,
          layoutHint: "portrait",
          image: {
            id: "img-4",
            masterUrl: "/instagram/post-04.jpg",
            width: 1200,
            height: 1200,
            alt: "Laughing on the villa steps",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-5",
          order: 5,
          layoutHint: "wide",
          image: {
            id: "img-5",
            masterUrl: "/instagram/post-05.jpg",
            width: 1200,
            height: 1200,
            alt: "The chapel courtyard at golden hour",
            focalPoint: { x: 0.5, y: 0.5 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-6",
          order: 6,
          layoutHint: "standard",
          image: {
            id: "img-6",
            masterUrl: "/instagram/post-06.jpg",
            width: 1200,
            height: 1200,
            alt: "Long table set for dinner",
            focalPoint: { x: 0.5, y: 0.5 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-7",
          order: 7,
          layoutHint: "portrait",
          image: {
            id: "img-7",
            masterUrl: "/instagram/post-07.jpg",
            width: 1200,
            height: 1200,
            alt: "Walking the cypress path",
            focalPoint: { x: 0.5, y: 0.42 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-8",
          order: 8,
          layoutHint: "wide",
          image: {
            id: "img-8",
            masterUrl: "/instagram/post-08.jpg",
            width: 1200,
            height: 1200,
            alt: "Florence rooftops at dusk",
            focalPoint: { x: 0.5, y: 0.5 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
        {
          id: "gi-9",
          order: 9,
          layoutHint: "standard",
          image: {
            id: "img-9",
            masterUrl: "/instagram/post-09.jpg",
            width: 1200,
            height: 1200,
            alt: "The two of us, the night we got engaged",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2026-05-02T00:00:00Z",
          },
        },
      ],
    },
  ],
  registryLinks: [
    { id: "reg-1", storeName: "Our Honeymoon Fund", url: "https://example.com/registry/honeymoon" },
    { id: "reg-2", storeName: "The House List", url: "https://example.com/registry/home" },
  ],
  faqs: [
    {
      id: "faq-1",
      order: 1,
      question: "What should I wear?",
      answer: "Garden formal. The ceremony is on grass and the evening cools down quickly, so bring a wrap and think twice about stiletto heels.",
    },
    {
      id: "faq-2",
      order: 2,
      question: "Can I bring a plus-one?",
      answer: "The villa seats seventy, so we've had to keep it to named guests only. Your invitation lists everyone we've saved a seat for.",
    },
    {
      id: "faq-3",
      order: 3,
      question: "Are children welcome?",
      answer: "Yes, very. There's a shaded play area beside the terrace and we can arrange a sitter for the evening — just let us know.",
    },
    {
      id: "faq-4",
      order: 4,
      question: "Where should I park?",
      answer: "There's free parking at the villa gate, but the drive is narrow and unlit. If you're staying in the city, the shuttle is much easier.",
    },
    {
      id: "faq-5",
      order: 5,
      question: "When should I RSVP by?",
      answer: "Please reply by 1 March 2027 so we can confirm numbers with the villa. Tell us about any dietary needs in the message box.",
    },
  ],
  keyPeople: [
    { id: "kp-1", name: "Sofia Rossi", role: "Maid of Honour" },
    { id: "kp-2", name: "Diego Alvarez", role: "Best Man" },
    { id: "kp-3", name: "Elena Bianchi", role: "Bridesmaid" },
    { id: "kp-4", name: "Tomas Ferrari", role: "Groomsman" },
  ],
  rsvpTableName: "",
};
