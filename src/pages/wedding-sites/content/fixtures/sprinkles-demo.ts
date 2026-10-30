import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Sprinkles: invented sample data, never a client's. A girl's 6th.
 * (The cake, the candle and every sprinkle are drawn in code; the photos are stock.)
 */
const photo = (n: number, w: number, h: number, alt: string, y = 0.4) => ({
  id: `sp-g${n}`,
  order: n,
  image: { id: `sp-img${n}`, masterUrl: `/event-templates/sprinkles/demo/pic-${n}.webp`, width: w, height: h, alt, focalPoint: { x: 0.5, y }, createdAt: "2030-01-01T00:00:00Z" },
});
export const sprinklesDemo: EventContent = {
  id: "demo-sprinkles",
  slug: "sprinkles-demo",
  hosts: [{ id: "sp-h1", name: "Mia Laurente" }],
  eventDate: "2027-03-20T14:00:00",
  primaryLocation: { id: "sp-loc", name: "The Sugar Room", addressLine: "12 Acacia Lane, San Juan" },
  schedule: [
    { id: "sp-s1", startTime: "2027-03-20T14:00:00", label: "Hello and games", description: "Face painting by the window" },
    { id: "sp-s2", startTime: "2027-03-20T15:00:00", label: "Decorate your own cupcake" },
    { id: "sp-s3", startTime: "2027-03-20T16:00:00", label: "Cake and the birthday song" },
    { id: "sp-s4", startTime: "2027-03-20T17:00:00", label: "Party bags, then home" },
  ],
  accommodations: [],
  travelInformation: [],
  // Stock photos from Pexels (Pexels licence): pexels.com/photo/9627780, 7100318, 6148507,
  // 7159865 (resized to 1100px webp).
  galleries: [
    {
      id: "sp-gal",
      title: "Photos",
      items: [
        photo(1, 1100, 734, "A girl smiling at her birthday cake", 0.5),
        photo(2, 1100, 734, "Friends blowing out the candles together", 0.45),
        photo(3, 1100, 1650, "Children round the table at a birthday party", 0.5),
        photo(4, 1100, 1649, "A boy laughing at his birthday cake", 0.4),
      ],
    },
  ],
  registryLinks: [],
  faqs: [
    { id: "sp-f1", order: 1, question: "Can parents stay?", answer: "Please do. There’s coffee and a seat for you." },
    { id: "sp-f2", order: 2, question: "Is there parking?", answer: "Yes, in the lot behind the building." },
    { id: "sp-f3", order: 3, question: "Any allergies on the menu?", answer: "The cake and the snacks are nut-free." },
  ],
  keyPeople: [],
  rsvpTableName: "sprinkles_demo_rsvps",
  rsvpDeadline: "2027-03-06",
  occasion: "birthday",
  custom: {
    milestone: "6",
    dressCode: "Party clothes you can play in. Something pink if you have it.",
    giftNote: "Your company is the best gift. If you’d like to bring something, Mia loves books and art supplies.",
    whereNote: "Parking is free in the lot behind the building.",
  },
};
