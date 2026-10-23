import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Calado: invented sample data, never a client's. A christening and
 * first birthday on one day in Makati, with the godparents and the first twelve months.
 */
const SIZES: [number, number][] = [
  [900, 1349], [900, 600], [900, 600], [900, 1349], [900, 600], [900, 600],
  [900, 1349], [900, 1349], [900, 600], [900, 600], [900, 1349], [900, 1349],
];
const month = (n: number) => ({
  id: `cl-g${n}`,
  order: n,
  caption: n === 1 ? "1 month" : `${n} months`,
  image: { id: `cl-img${n}`, masterUrl: `/event-templates/calado/demo/month-${n}.webp`, width: SIZES[n - 1][0], height: SIZES[n - 1][1], alt: `Amara at ${n === 1 ? "one month" : `${n} months`}`, focalPoint: { x: 0.5, y: 0.35 }, createdAt: "2030-01-01T00:00:00Z" },
});

export const caladoDemo: EventContent = {
  id: "demo-calado",
  slug: "calado-demo",
  hosts: [{ id: "cl-h1", name: "Amara Sofia" }],
  eventDate: "2027-03-13T10:00:00",
  story:
    "Twelve months ago our little girl arrived and turned our whole world soft. This year she’s being christened, and turning one, all in one happy morning.\n\nWe’d love you there with us, for the blessing and for the cake after.",
  primaryLocation: { id: "cl-loc", name: "Sto. Niño de Paz Chapel", addressLine: "Greenbelt Park, Makati City" },
  schedule: [
    { id: "cl-s1", startTime: "2027-03-13T10:00:00", label: "The christening", description: "Sto. Niño de Paz Chapel" },
    { id: "cl-s2", startTime: "2027-03-13T12:00:00", label: "Lunch", description: "Café Ilang-Ilang" },
    { id: "cl-s3", startTime: "2027-03-13T13:30:00", label: "Games and a magic show", description: "Prizes for the little ones" },
    { id: "cl-s4", startTime: "2027-03-13T14:30:00", label: "Cake and the birthday song" },
  ],
  accommodations: [],
  travelInformation: [],
  // Stock photos from Pexels (Pexels licence): pexels.com/photo/36746432, 36746429, 36746430,
  // 36746433, 36746434, 36746435, 36746437, 36746438, 36746439, 36746441, 36746442, 36746428.
  galleries: [{ id: "cl-gal", title: "The first twelve months", items: Array.from({ length: 12 }, (_, i) => month(i + 1)) }],
  registryLinks: [],
  cashGifts: [{ id: "cl-cg1", label: "GCash", accountName: "Bea Villanueva", accountNumber: "0917 555 0177" }],
  cashGiftNote: "Your presence is the best gift. Should you wish to give, a little something for Amara’s future is welcome.",
  faqs: [
    { id: "cl-f1", order: 1, question: "Are kids welcome?", answer: "Of course. There are games and a magic show just for them; tell us how many are coming when you reply." },
    { id: "cl-f2", order: 2, question: "Where do we park?", answer: "Greenbelt 5’s basement parking is closest to the chapel. Allow time; Saturdays get busy." },
    { id: "cl-f3", order: 3, question: "Is there a nursing room?", answer: "Yes, at the restaurant, beside the function room." },
  ],
  keyPeople: [],
  rsvpTableName: "calado_demo_rsvps",
  rsvpDeadline: "2027-02-27",
  occasion: "baby",
  entourage: [
    { id: "cl-e1", title: "Ninongs", people: ["Carlo Reyes", "Jose Lim", "Marco Mendoza", "Paolo dela Cruz", "Gabriel Ramos", "Enzo Bautista", "Miguel Castillo", "Luis Garcia"] },
    { id: "cl-e2", title: "Ninangs", people: ["Mia Santos", "Ana Cruz", "Trisha Torres", "Nicole Gonzales", "Bianca Ocampo", "Kat Salazar", "Ria Navarro", "Pia Robles"] },
  ],
  motifColors: ["#c9d6c3", "#efe3cf", "#e8c9c3", "#b9c9d6"],
  custom: {
    babyEvent: "both",
    parents: "Daughter of Bea & Paolo Villanueva",
    receptionName: "Café Ilang-Ilang, Manila Hotel",
    receptionAddress: "One Rizal Park, Ermita, Manila",
    receptionTime: "Twelve noon",
    dressCode: "Soft pastels for everyone, little ones included. Comfortable shoes for the chapel steps.",
    livestreamUrl: "https://www.youtube.com/",
  },
};
