import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for the Scrapbook template — never a client's
 * data, and never written into a real event.
 *
 * Used wherever the template is shown as a sample rather than as
 * someone's wedding: the template gallery card and the dev harness.
 * Copy and structure deliberately mirror the reference design (a Canva
 * "Dark Red Beige Romantic Scrapbook" export) so the gallery preview
 * reads as the finished template instead of a page of empty-state
 * placeholders.
 *
 * Nine photos of one couple: the hero, the collages, and a few for the album pages.
 */
export const scrapbookDemoWedding: EventContent = {
  id: "demo-scrapbook",
  slug: "scrapbook-demo",
  hosts: [
    { id: "sd-host-1", name: "Luis" },
    { id: "sd-host-2", name: "Briana" },
  ],
  eventDate: "2030-12-07T16:00:00",
  story:
    "We met in a crowded market on a Sunday in Madrid, both reaching for the last basket of figs. Luis let Briana have them, then spent twenty minutes pretending to shop for something else so the conversation wouldn\u2019t end.\n\nFour years, two cities and one very opinionated cat later, he asked her to marry him on the same corner \u2014 with figs.\n\nWe\u2019re bringing everyone we love back to Madrid to celebrate, and we still can\u2019t quite believe it\u2019s happening.",
  primaryLocation: {
    id: "sd-loc",
    name: "Palacio del Retiro",
    addressLine: "123 Calle Dondequeria, Madrid, Spain",
  },
  schedule: [
    {
      id: "sd-s1",
      startTime: "2030-12-07T16:00:00",
      label: "The Ceremony",
      description:
        "In the palace garden just outside central Madrid. Please be seated a little before four.",
    },
    {
      id: "sd-s2",
      startTime: "2030-12-07T17:00:00",
      label: "Cocktail Hour",
      description:
        "Vermouth and tapas under the colonnade while we steal away for photographs.",
    },
    {
      id: "sd-s3",
      startTime: "2030-12-07T19:00:00",
      label: "Dinner & Dancing",
      description:
        "One long table, far too many courses, and dancing until the candles burn out.",
    },
  ],
  accommodations: [
    {
      id: "sd-a1",
      name: "Hotel Maravillosa",
      addressLine: "8 Calle del Prado, Madrid",
      bookingUrl: "https://example.com/maravillosa",
      notes: "We\u2019ve held a block of rooms \u2014 mention our names for the group rate.",
    },
    {
      id: "sd-a2",
      name: "Casa Retiro",
      addressLine: "22 Calle de Alfonso XII, Madrid",
      bookingUrl: "https://example.com/casa-retiro",
      notes: "Five minutes from the venue on foot; best for anyone bringing children.",
    },
  ],
  travelInformation: [
    {
      id: "sd-t1",
      title: "Getting There",
      body:
        "Fly into Madrid-Barajas (MAD). The Metro runs from the airport to the centre in about forty minutes, and taxis are a flat fare into town.",
    },
    {
      id: "sd-t2",
      title: "Transportation",
      body:
        "A shuttle runs from Hotel Maravillosa to the palace at 3:00 PM, returning at midnight and again at 1:00 AM.",
    },
  ],
  // Stock photos of one couple (Vlada Karpovich on Pexels, Pexels licence; pexels.com/photo/4873512–4873594).
  galleries: [
    {
      id: "sd-gal",
      title: "Us, lately",
      items: [
        {
          id: "sd-gi-1",
          order: 1,
          layoutHint: "portrait",
          image: {
            id: "sd-img-1",
            masterUrl: "/event-templates/scrapbook/demo/pic-1.webp",
            width: 1000,
            height: 1500,
            alt: "Briana and Luis, close",
            focalPoint: { x: 0.5, y: 0.3 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-2",
          order: 2,
          layoutHint: "portrait",
          image: {
            id: "sd-img-2",
            masterUrl: "/event-templates/scrapbook/demo/pic-7.webp",
            width: 1000,
            height: 1500,
            alt: "Luis spinning Briana",
            focalPoint: { x: 0.5, y: 0.35 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-3",
          order: 3,
          layoutHint: "portrait",
          image: {
            id: "sd-img-3",
            masterUrl: "/event-templates/scrapbook/demo/pic-3.webp",
            width: 1000,
            height: 1500,
            alt: "A kiss in the long grass",
            focalPoint: { x: 0.5, y: 0.35 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-4",
          order: 4,
          layoutHint: "portrait",
          image: {
            id: "sd-img-4",
            masterUrl: "/event-templates/scrapbook/demo/pic-4.webp",
            width: 1000,
            height: 1500,
            alt: "Briana with wildflowers",
            focalPoint: { x: 0.5, y: 0.35 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-5",
          order: 5,
          layoutHint: "portrait",
          image: {
            id: "sd-img-5",
            masterUrl: "/event-templates/scrapbook/demo/pic-5.webp",
            width: 1000,
            height: 1500,
            alt: "Strawberries and a bouquet on the blanket",
            focalPoint: { x: 0.5, y: 0.5 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-6",
          order: 6,
          layoutHint: "wide",
          image: {
            id: "sd-img-6",
            masterUrl: "/event-templates/scrapbook/demo/pic-6.webp",
            width: 1500,
            height: 1000,
            alt: "Holding each other at sunset",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-7",
          order: 7,
          layoutHint: "portrait",
          image: {
            id: "sd-img-7",
            masterUrl: "/event-templates/scrapbook/demo/pic-2.webp",
            width: 1000,
            height: 1500,
            alt: "The ring",
            focalPoint: { x: 0.5, y: 0.35 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-8",
          order: 8,
          layoutHint: "portrait",
          image: {
            id: "sd-img-8",
            masterUrl: "/event-templates/scrapbook/demo/pic-8.webp",
            width: 1000,
            height: 1500,
            alt: "The last of the sun",
            focalPoint: { x: 0.5, y: 0.45 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
        {
          id: "sd-gi-9",
          order: 9,
          layoutHint: "portrait",
          image: {
            id: "sd-img-9",
            masterUrl: "/event-templates/scrapbook/demo/pic-9.webp",
            width: 1000,
            height: 1500,
            alt: "Forehead to forehead",
            focalPoint: { x: 0.5, y: 0.3 },
            createdAt: "2030-01-01T00:00:00Z",
          },
        },
      ],
    },
  ],
  registryLinks: [
    { id: "sd-r1", storeName: "Our Honeymoon Fund", url: "https://example.com/registry/honeymoon" },
    { id: "sd-r2", storeName: "The House List", url: "https://example.com/registry/home" },
  ],
  faqs: [
    {
      id: "sd-f1",
      order: 1,
      question: "What should I wear?",
      answer:
        "Garden formal. The ceremony is on grass and December evenings in Madrid are cold, so bring a coat you don\u2019t mind dancing in.",
    },
    {
      id: "sd-f2",
      order: 2,
      question: "Can I bring a plus one?",
      answer:
        "This is an intimate destination wedding with limited seating. Kindly note that only named guests on the invitation are included.",
    },
    {
      id: "sd-f3",
      order: 3,
      question: "Do I need a visa to travel to Spain?",
      answer:
        "Many guests will need a Schengen visa. We recommend applying at least three months ahead \u2014 we\u2019ll share a guide to help with this.",
    },
    {
      id: "sd-f4",
      order: 4,
      question: "Will transportation be provided?",
      answer:
        "Yes. A shuttle runs to and from the venue for guests staying at the partner hotel. Accessibility assistance is available \u2014 just ask.",
    },
    {
      id: "sd-f5",
      order: 5,
      question: "When should I RSVP by?",
      answer:
        "Please reply by 15 October 2030 so we can confirm numbers, and tell us about any dietary needs in the message box.",
    },
  ],
  keyPeople: [],
  rsvpTableName: "",
  occasion: "wedding",
};
