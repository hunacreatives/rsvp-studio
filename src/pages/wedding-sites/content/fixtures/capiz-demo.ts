import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Capiz: invented sample data, never a client's. A church
 * wedding in Intramuros with the reception in a courtyard next door, and the full
 * Filipino entourage (parents, principal and secondary sponsors, the bridal party).
 */
const photo = (n: number, w: number, h: number, alt: string, y = 0.4) => ({
  id: `cz-g${n}`,
  order: n,
  image: { id: `cz-img${n}`, masterUrl: `/event-templates/capiz/demo/pic-${n}.webp`, width: w, height: h, alt, focalPoint: { x: 0.5, y }, createdAt: "2030-01-01T00:00:00Z" },
});

export const capizDemo: EventContent = {
  id: "demo-capiz",
  slug: "capiz-demo",
  hosts: [
    { id: "cz-h1", name: "Andrea Villanueva" },
    { id: "cz-h2", name: "Miguel Santos" },
  ],
  eventDate: "2027-12-04T15:00:00",
  story:
    "We met at a friend’s despedida in Malate, both of us leaving early and both of us staying until the end. Ten years, two cities and one very long pamamanhikan dinner later, we’re coming home to say yes.\n\nWe’d love you there, in the church where our parents were married.",
  primaryLocation: { id: "cz-loc", name: "San Agustin Church", addressLine: "General Luna Street, Intramuros, Manila" },
  schedule: [
    { id: "cz-s1", startTime: "2027-12-04T15:00:00", label: "The ceremony", description: "San Agustin Church" },
    { id: "cz-s2", startTime: "2027-12-04T16:30:00", label: "Cocktails in the courtyard" },
    { id: "cz-s3", startTime: "2027-12-04T18:00:00", label: "Dinner and the programme", description: "Messages from our parents and sponsors" },
    { id: "cz-s4", startTime: "2027-12-04T21:00:00", label: "Dancing" },
  ],
  accommodations: [],
  travelInformation: [{ id: "cz-t1", title: "Getting there", body: "Intramuros is about 40 minutes from Makati by car. Parking is at Plaza San Luis, a short walk from both the church and the courtyard." }],
  // Stock photos from Pexels (Pexels licence): pexels.com/photo/22601478, 22601426, 22601427,
  // 22601471, 22601414, 22601418, 22601446, 22601428, 22601424, 22601422.
  galleries: [
    {
      id: "cz-gal",
      title: "Prenup",
      items: [
        photo(1, 1400, 2101, "Andrea and Miguel in a courtyard archway", 0.2),
        photo(2, 1400, 2101, "By an old narra door", 0.5),
        photo(3, 1400, 2101, "On the stone stairs", 0.4),
        photo(4, 1400, 2101, "By the courtyard fountain", 0.5),
        photo(5, 1400, 933, "Walking down the stairs", 0.4),
        photo(6, 1400, 933, "Under the arches", 0.6),
        photo(7, 1400, 2101, "Andrea, smiling", 0.35),
        photo(8, 1400, 2101, "Dinner in the courtyard", 0.6),
        photo(9, 1400, 933, "Against the stone wall", 0.45),
        photo(10, 1400, 933, "Among the palms", 0.4),
      ],
    },
  ],
  registryLinks: [],
  cashGifts: [{ id: "cz-cg1", label: "GCash", accountName: "Andrea Villanueva", accountNumber: "0917 555 0142" }],
  cashGiftNote: "Your presence is the greatest gift. Should you wish to bless us further, a monetary gift is welcome.",
  faqs: [
    { id: "cz-f1", order: 1, question: "Can I bring a plus one?", answer: "We’ve reserved seats in your name. Kindly reply for those seats only." },
    { id: "cz-f2", order: 2, question: "Is the ceremony unplugged?", answer: "Yes. Please keep phones away during the ceremony; our photographers have it covered." },
    { id: "cz-f3", order: 3, question: "What time should I arrive?", answer: "Please be seated by 2:30 PM. The doors close when the entourage enters." },
  ],
  keyPeople: [],
  rsvpTableName: "capiz_demo_rsvps",
  rsvpDeadline: "2027-11-01",
  occasion: "wedding",
  entourage: [
    { id: "cz-e1", title: "Parents of the Bride", people: ["Mr. & Mrs. Ramon Villanueva"] },
    { id: "cz-e2", title: "Parents of the Groom", people: ["Mr. & Mrs. Eduardo Santos"] },
    {
      id: "cz-e3",
      title: "Principal Sponsors",
      people: [
        "Mr. & Mrs. Antonio Reyes",
        "Mr. & Mrs. Jose Lim",
        "Dr. & Mrs. Carlos Mendoza",
        "Mr. & Mrs. Ricardo dela Cruz",
        "Atty. & Mrs. Victor Ramos",
        "Mr. & Mrs. Fernando Bautista",
        "Engr. & Mrs. Mario Castillo",
        "Mr. & Mrs. Luis Garcia",
      ],
    },
    { id: "cz-e4", title: "Secondary Sponsors: Candle", people: ["Paolo Reyes", "Bianca Lim"] },
    { id: "cz-e5", title: "Secondary Sponsors: Veil", people: ["Marco Mendoza", "Trisha dela Cruz"] },
    { id: "cz-e6", title: "Secondary Sponsors: Cord", people: ["Gabriel Ramos", "Nicole Bautista"] },
    { id: "cz-e7", title: "Secondary Sponsors: Coin", people: ["Daniel Castillo", "Sofia Garcia"] },
    { id: "cz-e8", title: "Best Man", people: ["Rafael Santos"] },
    { id: "cz-e9", title: "Maid of Honor", people: ["Camille Villanueva"] },
    { id: "cz-e10", title: "Groomsmen", people: ["Joaquin Tan", "Enzo Cruz", "Luis Navarro", "Miko Robles"] },
    { id: "cz-e11", title: "Bridesmaids", people: ["Ria Torres", "Pia Gonzales", "Jill Ocampo", "Kat Salazar"] },
    { id: "cz-e12", title: "Bearers", people: ["Lucas Santos, ring", "Mateo Reyes, coin", "Gabby Lim, Bible"] },
    { id: "cz-e13", title: "Flower Girls", people: ["Ella Villanueva", "Maxine Tan"] },
  ],
  motifColors: ["#b7a6c9", "#e9e1d0", "#8f9b7e"],
  custom: {
    receptionName: "Casa Manila Courtyard",
    receptionAddress: "Plaza San Luis Complex, Intramuros, Manila",
    receptionTime: "Half past four in the afternoon",
    dressCode: "Barong Tagalog or a suit for the gentlemen; Filipiniana or a long gown for the ladies, in the colours below. Kindly leave white to the bride.",
  },
};
