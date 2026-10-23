import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Under Glass: invented sample data, never a client's. A lola's
 * 80th: a Thanksgiving Mass, dinner after, and her life in photos by decade.
 */
const photo = (n: number, file: number, w: number, h: number, caption: string, alt: string, y = 0.35, back?: string) => ({
  id: `ug-g${n}`,
  order: n,
  caption,
  back,
  image: { id: `ug-img${n}`, masterUrl: `/event-templates/under-glass/demo/pic-${file}.webp`, width: w, height: h, alt, focalPoint: { x: 0.5, y }, createdAt: "2030-01-01T00:00:00Z" },
});

export const underGlassDemo: EventContent = {
  id: "demo-under-glass",
  slug: "under-glass-demo",
  hosts: [{ id: "ug-h1", name: "Isabel Reyes" }],
  eventDate: "2027-01-16T16:00:00",
  story:
    "Eighty years of Sunday lunches, rosaries at six, and a kitchen that never ran out of rice. Mama has fed, prayed for and waited up for every one of us.\n\nThis year, we’d like to do the same for her. Join us as we give thanks and celebrate Lola Ising.",
  primaryLocation: { id: "ug-loc", name: "Sto. Domingo Church", addressLine: "Quezon Avenue, Quezon City" },
  schedule: [
    { id: "ug-s1", startTime: "2027-01-16T16:00:00", label: "Thanksgiving Mass", description: "Sto. Domingo Church" },
    { id: "ug-s2", startTime: "2027-01-16T18:00:00", label: "Dinner", description: "The Fernwood Gardens" },
    { id: "ug-s3", startTime: "2027-01-16T19:30:00", label: "Eighty years in photos", description: "A short film by the apo" },
    { id: "ug-s4", startTime: "2027-01-16T20:00:00", label: "Messages from the family" },
    { id: "ug-s5", startTime: "2027-01-16T20:45:00", label: "A dance with Lola, and cake" },
  ],
  accommodations: [],
  travelInformation: [],
  // Stock photos from Pexels (Pexels licence): pexels.com/photo/19527158, 11320033, 6329081,
  // 16519701, 32326425, 36255628.
  galleries: [
    {
      id: "ug-gal",
      title: "Through the years",
      items: [
        photo(1, 2, 1100, 1955, "1968 — Our wedding day", "The wedding rings, 1968", 0.45, "Sto. Domingo, 8 June 1968.\nThe rings Papa saved for, for two years."),
        photo(2, 4, 1100, 1650, "1974 — Dancing at home in Lipa", "Dancing at home, 1974", 0.4, "Lipa, Christmas 1974.\nSi Ising at si Ben, sumasayaw sa sala."),
        photo(3, 5, 1100, 618, "1987 — By the sea in Batangas", "By the sea, 1987", 0.5, "Laiya, Holy Week 1987.\nOur 19th anniversary, kasama ang mga bata."),
        photo(4, 6, 1100, 619, "2004 — With her sisters", "Lola with her sisters, 2004", 0.4, "Ate Nena, Ising and Tessie.\nThe first reunion in Lipa in twenty years."),
        photo(5, 7, 1100, 1402, "2023 — With the apo", "Lola with her grandchildren, 2023", 0.35),
        photo(6, 1, 1100, 1653, "2026 — Lola Ising at 79", "Lola Ising today", 0.3),
      ],
    },
  ],
  registryLinks: [],
  faqs: [
    { id: "ug-f1", order: 1, question: "Is there parking?", answer: "Yes, at the church and at The Fernwood Gardens. Staff will guide you." },
    { id: "ug-f2", order: 2, question: "Can I bring the kids?", answer: "Of course. Lola wants every apo there. Just count them in your seats when you reply." },
    { id: "ug-f3", order: 3, question: "We’re abroad. Can we still take part?", answer: "Yes. Watch the Mass live (the link is above), and write Lola a message when you reply. She’ll read every one." },
  ],
  keyPeople: [],
  rsvpTableName: "under_glass_demo_rsvps",
  rsvpDeadline: "2027-01-02",
  occasion: "birthday",
  motifColors: ["#c9a659", "#efe6d4", "#7d2b33"],
  custom: {
    honoree: "Lola Ising",
    milestone: "80",
    noteFrom: "Carmela, Ben & Joy",
    receptionName: "The Fernwood Gardens",
    receptionAddress: "Scout Tuason, Quezon City",
    receptionTime: "Six o’clock in the evening",
    dressCode: "Filipiniana or formal, in gold, cream or wine. Lola will be in gold.",
    livestreamUrl: "https://www.facebook.com/",
    giftNote: "Your presence is Lola’s greatest gift. If you’d like to give, she asks for a donation to the parish’s feeding program.",
  },
};
