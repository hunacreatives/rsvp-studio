import type { EventContent } from "../types";

/**
 * Primary fixture event. Deliberately exercises every field in the
 * canonical EventContent shape (multi-item schedule, mixed layoutHints in
 * the gallery, 2+ FAQs, registry links, accommodations, travel info, a
 * full "key people" list, 2 hosts) so Template A has real, representative
 * data to render against from day one — not a happy-path-only stub. Using
 * 2 hosts here exercises the "couple" case; a single-host or 3+-host
 * fixture is an easy additive follow-up to prove the schema handles other
 * event shapes just as well.
 */
export const theSmiths: EventContent = {
  id: "event-the-smiths",
  slug: "the-smiths",
  eventDate: "2027-06-04",
  hosts: [
    { id: "host-anna", name: "Anna Smith" },
    { id: "host-james", name: "James Whitfield" },
  ],
  story:
    "We met on a rainy Tuesday at a bookstore in the city, both reaching for the same last copy of a novel neither of us ever finished.\n\nFive years, two apartments, and one very stubborn cat later, James asked Anna to marry him on that same rainy street corner. She said yes before he finished the sentence.\n\nWe can't wait to celebrate with the people who've been part of our story from the very beginning.",
  primaryLocation: {
    id: "location-main",
    name: "The Wildflower Barn",
    addressLine: "482 Orchard Lane, Hudson Valley, NY",
    mapUrl: "https://maps.google.com/?q=The+Wildflower+Barn+Hudson+Valley+NY",
  },
  schedule: [
    {
      id: "schedule-ceremony",
      startTime: "2027-06-04T16:00:00-04:00",
      endTime: "2027-06-04T16:45:00-04:00",
      label: "Ceremony",
      description: "Outdoor ceremony in the orchard, weather permitting.",
    },
    {
      id: "schedule-cocktail",
      startTime: "2027-06-04T17:00:00-04:00",
      endTime: "2027-06-04T18:00:00-04:00",
      label: "Cocktail Hour",
      description: "Drinks and hors d'oeuvres on the barn lawn.",
    },
    {
      id: "schedule-reception",
      startTime: "2027-06-04T18:00:00-04:00",
      endTime: "2027-06-04T23:00:00-04:00",
      label: "Reception",
      location: {
        id: "location-barn-interior",
        name: "The Wildflower Barn — Main Hall",
        addressLine: "482 Orchard Lane, Hudson Valley, NY",
      },
      description: "Dinner, toasts, and dancing under the string lights.",
    },
  ],
  accommodations: [
    {
      id: "accommodation-inn",
      name: "The Hudson Valley Inn",
      addressLine: "12 River Road, Hudson Valley, NY",
      bookingUrl: "https://example.com/hudson-valley-inn",
      notes: "Mention 'Smith-Whitfield' for our room block rate.",
    },
    {
      id: "accommodation-lodge",
      name: "Orchard Ridge Lodge",
      addressLine: "76 Ridge Trail, Hudson Valley, NY",
      bookingUrl: "https://example.com/orchard-ridge-lodge",
    },
  ],
  travelInformation: [
    {
      id: "travel-airport",
      title: "Getting to the Venue",
      body: "The nearest airport is Albany International (ALB), about a 45-minute drive from the venue. We recommend renting a car, as rideshare availability in the area is limited.",
    },
    {
      id: "travel-parking",
      title: "Parking",
      body: "Complimentary parking is available on-site. Follow the signs from the main road — attendants will direct you to the guest lot.",
    },
  ],
  // Dev fixture only: points at real images already in public/ so the
  // builder preview and template gallery show actual photographs
  // instead of broken-image placeholders. Enough items to fill every
  // photo slot the Scrapbook collages can use.
  galleries: [
    {
      id: "gallery-engagement",
      title: "Our Engagement",
      items: [
        {
          id: "gallery-item-1",
          order: 1,
          layoutHint: "wide",
          caption: "The bookstore where it all started.",
          image: {
            id: "image-1",
            masterUrl: "/instagram/post-01.jpg",
            width: 1200,
            height: 1200,
            alt: "Anna and James laughing together outside a bookstore",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2026-01-10T00:00:00Z",
          },
        },
        {
          id: "gallery-item-2",
          order: 2,
          layoutHint: "portrait",
          image: {
            id: "image-2",
            masterUrl: "/instagram/post-02.jpg",
            width: 1200,
            height: 1200,
            alt: "Anna and James on the venue steps",
            focalPoint: { x: 0.5, y: 0.45 },
            createdAt: "2026-01-10T00:00:00Z",
          },
        },
        {
          id: "gallery-item-3",
          order: 3,
          layoutHint: "standard",
          caption: "Celebrating with family the same evening.",
          image: {
            id: "image-3",
            masterUrl: "/instagram/post-03.jpg",
            width: 1200,
            height: 1200,
            alt: "Anna and James with family, celebrating their engagement",
            focalPoint: { x: 0.5, y: 0.35 },
            createdAt: "2026-01-10T00:00:00Z",
          },
        },
        {
          id: "gallery-item-4",
          order: 4,
          layoutHint: "portrait",
          image: {
            id: "image-4",
            masterUrl: "/instagram/post-04.jpg",
            width: 1200,
            height: 1200,
            alt: "Anna laughing in the orchard",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2026-01-10T00:00:00Z",
          },
        },
        {
          id: "gallery-item-5",
          order: 5,
          layoutHint: "wide",
          image: {
            id: "image-5",
            masterUrl: "/instagram/post-05.jpg",
            width: 1200,
            height: 1200,
            alt: "The barn and gardens at golden hour",
            focalPoint: { x: 0.5, y: 0.5 },
            createdAt: "2026-01-10T00:00:00Z",
          },
        },
        {
          id: "gallery-item-6",
          order: 6,
          layoutHint: "standard",
          image: {
            id: "image-6",
            masterUrl: "/instagram/post-06.jpg",
            width: 1200,
            height: 1200,
            alt: "James on the porch of the barn",
            focalPoint: { x: 0.5, y: 0.4 },
            createdAt: "2026-01-10T00:00:00Z",
          },
        },
        {
          id: "gallery-item-7",
          order: 7,
          layoutHint: "standard",
          image: {
            id: "image-7",
            masterUrl: "/instagram/post-07.jpg",
            width: 1200,
            height: 1200,
            alt: "Anna and James walking the grounds",
            focalPoint: { x: 0.5, y: 0.45 },
            createdAt: "2026-01-10T00:00:00Z",
          },
        },
      ],
    },
  ],
  registryLinks: [
    { id: "registry-1", storeName: "Crate & Barrel", url: "https://example.com/registry/crate-and-barrel" },
    { id: "registry-2", storeName: "Zola Registry", url: "https://example.com/registry/zola" },
    { id: "registry-3", storeName: "Honeymoon Fund", url: "https://example.com/registry/honeymoon-fund" },
  ],
  faqs: [
    {
      id: "faq-1",
      order: 1,
      question: "What should I wear?",
      answer: "We're asking guests for semi-formal, garden-party attire. Think linen and soft colors — the ceremony is outdoors on grass, so heels may sink!",
    },
    {
      id: "faq-2",
      order: 2,
      question: "Are kids welcome?",
      answer: "We love your little ones, but we've decided to keep our reception an adults-only celebration, with the exception of immediate family.",
    },
    {
      id: "faq-3",
      order: 3,
      question: "Is the ceremony indoors or outdoors?",
      answer: "The ceremony will be held outdoors in the orchard, weather permitting. In case of rain, we'll move into the barn's main hall.",
    },
    {
      id: "faq-4",
      order: 4,
      question: "Can I bring a plus-one?",
      answer: "Please check your invitation — plus-ones are noted by name where extended. If you're unsure, feel free to reach out to us directly.",
    },
    {
      id: "faq-5",
      order: 5,
      question: "Will there be a shuttle from the hotels?",
      answer: "Yes — a shuttle will run between The Hudson Valley Inn and the venue starting at 3:00 PM and returning throughout the evening.",
    },
    {
      id: "faq-6",
      order: 6,
      question: "What's the best way to RSVP?",
      answer: "Please use the RSVP form on this site by May 1st, 2027. If you have any dietary restrictions, let us know in the message field.",
    },
    {
      id: "faq-7",
      order: 7,
      question: "Is there parking at the venue?",
      answer: "Yes, complimentary on-site parking is available for all guests.",
    },
  ],
  keyPeople: [
    { id: "party-1", name: "Maya Chen", role: "Maid of Honor" },
    { id: "party-2", name: "Priya Sharma", role: "Bridesmaid" },
    { id: "party-3", name: "Liam Whitfield", role: "Best Man", note: "James's younger brother." },
    { id: "party-4", name: "Marcus Rivera", role: "Groomsman" },
    { id: "party-5", name: "Sofia Alvarez", role: "Bridesmaid" },
    { id: "party-6", name: "David Okafor", role: "Groomsman" },
  ],
  rsvpTableName: "the_smiths_rsvps",
};
