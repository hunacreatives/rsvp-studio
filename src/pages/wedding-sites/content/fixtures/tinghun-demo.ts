import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for the Tinghun designs: invented families, venue and dates, never a
 * client's. A ting hun at the bride's family home in San Juan, then lunch in Binondo. Each
 * design can swap the photos (its own `galleries`) but keeps the families and the day.
 */
export const tinghunDemo: EventContent = {
  id: "demo-tinghun",
  slug: "tinghun-demo",
  hosts: [
    { id: "tg-h1", name: "Mei Ling Chua" },
    { id: "tg-h2", name: "Joshua Lim" },
  ],
  eventDate: "2027-03-13T10:00:00",
  story:
    "Our families have known each other for three generations, from Ongpin to San Juan. This spring they meet again, this time as one.\n\nWe would be honoured to have you with us as our families exchange their blessings.",
  primaryLocation: { id: "tg-loc", name: "The Chua residence", addressLine: "Greenhills, San Juan City" },
  schedule: [
    { id: "tg-s1", startTime: "2027-03-13T10:00:00", label: "The Lim family arrives", description: "男方到" },
    { id: "tg-s2", startTime: "2027-03-13T10:30:00", label: "Presentation of gifts", description: "送聘" },
    { id: "tg-s3", startTime: "2027-03-13T11:00:00", label: "Tea ceremony", description: "敬茶" },
    { id: "tg-s4", startTime: "2027-03-13T12:30:00", label: "Lauriat lunch", description: "訂婚宴" },
  ],
  accommodations: [],
  travelInformation: [],
  galleries: [{ id: "tg-gal", title: "Photos", items: [] }],
  registryLinks: [],
  cashGifts: [],
  cashGiftNote: "Your presence is our blessing. No gifts are expected from guests.",
  faqs: [
    { id: "tg-f1", order: 1, question: "Is the ceremony for everyone?", answer: "The tea ceremony is for the two families. Every guest is welcome at lunch." },
    { id: "tg-f2", order: 2, question: "Where do we park?", answer: "Street parking at the residence is limited. In Binondo, use the parking building on Quintin Paredes." },
  ],
  keyPeople: [],
  rsvpTableName: "tinghun_demo_rsvps",
  rsvpDeadline: "2027-02-27",
  occasion: "engagement",
  entourage: [
    { id: "tg-e1", title: "Parents of the Bride", people: ["Mr. & Mrs. Henry Chua"] },
    { id: "tg-e2", title: "Parents of the Groom", people: ["Mr. & Mrs. Robert Lim"] },
    { id: "tg-e3", title: "Grandparents of the Bride", people: ["Mrs. Lucia Chua"] },
    { id: "tg-e4", title: "Grandparents of the Groom", people: ["Mr. & Mrs. Vicente Lim"] },
  ],
  motifColors: ["#c8372d", "#e9b8b0", "#c9a66b", "#f3e3c8"],
  custom: {
    heroZh: "訂婚",
    heroLine: "The Ting Hun of",
    hostZh1: "蔡美玲",
    hostZh2: "林子豪",
    familiesZh: "蔡府 · 林府",
    receptionName: "Golden Lotus Restaurant",
    receptionAddress: "Ongpin Street, Binondo, Manila",
    receptionTime: "Half past twelve",
    dressCode: "Festive. Red, pink and gold are welcome; kindly avoid all-black and all-white.",
    closing: "多謝 · Thank you",
  },
};
