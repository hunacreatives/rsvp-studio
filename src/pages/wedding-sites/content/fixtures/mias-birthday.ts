import type { EventContent } from "../types";

/**
 * Second fixture: a single-host birthday party, deliberately different
 * from the-smiths (a 2-host wedding) to prove the canonical model is
 * actually event-type-agnostic — one host instead of two, no
 * accommodations/travel/registry, a much shorter FAQ list, no key people.
 * If a template renders this fine with zero changes to EventContent,
 * that's the real proof the generalization worked.
 */
export const miasBirthday: EventContent = {
  id: "event-mias-birthday",
  slug: "mias-birthday",
  eventDate: "2027-03-14",
  hosts: [{ id: "host-mia", name: "Mia Delgado" }],
  story:
    "Mia is turning 10, and she wants everyone who loves her to be there for it — balloons, cake, and all.",
  primaryLocation: {
    id: "location-main",
    name: "Sunnyvale Community Park Pavilion",
    addressLine: "220 Park Ave, Sunnyvale, CA",
    mapUrl: "https://maps.google.com/?q=Sunnyvale+Community+Park+Pavilion",
  },
  schedule: [
    {
      id: "schedule-party",
      startTime: "2027-03-14T13:00:00-07:00",
      endTime: "2027-03-14T16:00:00-07:00",
      label: "Party",
      description: "Games, cake, and pinata at 3pm sharp!",
    },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [
    {
      id: "gallery-mia",
      items: [
        {
          id: "gallery-item-1",
          order: 1,
          layoutHint: "standard",
          image: {
            id: "image-1",
            masterUrl: "/event-fixtures/mias-birthday/mia-1.jpg",
            width: 1600,
            height: 1600,
            alt: "Mia smiling at her last birthday party",
            focalPoint: { x: 0.5, y: 0.3 },
            createdAt: "2026-03-01T00:00:00Z",
          },
        },
      ],
    },
  ],
  registryLinks: [],
  faqs: [
    {
      id: "faq-1",
      order: 1,
      question: "Should kids bring a gift?",
      answer: "Mia would love your company more than anything — gifts are optional!",
    },
    {
      id: "faq-2",
      order: 2,
      question: "Is the park pavilion covered if it rains?",
      answer: "Yes, the pavilion has a full roof, so we're good rain or shine.",
    },
  ],
  keyPeople: [],
  rsvpTableName: "mias_birthday_rsvps",
};
