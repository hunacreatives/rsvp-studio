import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Open Play: never a client's data. A 30th birthday as an
 * open-play session at a Metro Manila club.
 */
const photo = (n: number, w: number, h: number, alt: string, y = 0.4) => ({
  id: `op-g${n}`,
  order: n,
  image: { id: `op-img${n}`, masterUrl: `/event-templates/open-play/demo/play-${n}.webp`, width: w, height: h, alt, focalPoint: { x: 0.5, y }, createdAt: "2030-01-01T00:00:00Z" },
});

export const openPlayDemo: EventContent = {
  id: "demo-open-play",
  slug: "open-play-demo",
  hosts: [{ id: "op-host-1", name: "Kai" }],
  eventDate: "2027-06-12T15:00:00",
  story: "Turning 30, so I booked the courts. Bring your barkada, your best dink and zero pressure: first-timers welcome, we’ll teach you.\n\nMerienda and cake after the last game.",
  primaryLocation: { id: "op-loc", name: "Rally Point Pickleball Club", addressLine: "32nd Street, Bonifacio Global City, Taguig" },
  schedule: [
    { id: "op-s1", startTime: "2027-06-12T15:00:00", label: "Warm-up rally", description: "Quick lesson for first-timers." },
    { id: "op-s2", startTime: "2027-06-12T15:30:00", label: "Open play", description: "Paddles in the rack, four on, four off." },
    { id: "op-s3", startTime: "2027-06-12T17:00:00", label: "Birthday doubles", description: "Partners drawn from a hat." },
    { id: "op-s4", startTime: "2027-06-12T18:00:00", label: "Merienda & cake", description: "Courtside." },
  ],
  accommodations: [],
  travelInformation: [],
  // Stock photos from Pexels (Pexels licence): pexels.com/photo/35018223, 35775728, 17333854, 35775730, 35688549, 17299531.
  galleries: [
    {
      id: "op-gal",
      title: "On court",
      items: [
        photo(1, 1050, 1400, "Paddles and feet in a circle on the court", 0.5),
        photo(2, 933, 1400, "Four players at the net", 0.4),
        photo(3, 1120, 1400, "Two friends with their paddles", 0.35),
        photo(4, 933, 1400, "Mid-rally, smiling", 0.35),
        photo(5, 933, 1400, "Night play on court", 0.45),
      ],
    },
  ],
  registryLinks: [],
  faqs: [
    { id: "op-f1", order: 1, question: "I’ve never played. Can I still come?", answer: "Yes. There’s a short lesson at three, and spare paddles at the front desk." },
    { id: "op-f2", order: 2, question: "Where do I park?", answer: "Basement parking at the club, entrance on 32nd Street. First three hours are free." },
    { id: "op-f3", order: 3, question: "Can I bring a friend?", answer: "Of course. Just add them when you RSVP so we can plan the rotations." },
  ],
  keyPeople: [],
  rsvpTableName: "open_play_demo_rsvps",
  occasion: "birthday",
  custom: {
    kicker: "Laro tayo",
    headline: "Kai’s 30th\nOpen Play",
    occasionLine: "Come play for my 30th birthday.",
    courtLabel: "Courts 3 & 4",
    format: "Doubles · open play",
    skillNote: "All levels",
    kitchenRules: "Paddles in the rack to queue\nFour on, four off\nWinners stay, losers buy the next round of drinks",
    foodLine: "Merienda after, sagot ko",
    dressCode: "Court shoes, and anything blue or white.",
    bring: "Court shoes\nA water bottle\nYour paddle (may extra kami)",
    paddleNote: "Spare paddles at the front desk",
  },
};
