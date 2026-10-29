import type { EventContent } from "../types";

/**
 * TEMPLATE DEMO CONTENT for Simbahan: invented sample data, never a client's. A church wedding
 * in an old stone church in an invented Ilocos town, the reception at an invented hacienda
 * nearby, and the full Filipino entourage (parents, principal and secondary sponsors, the
 * bridal party). Every name and place here is made up.
 */
export const simbahanDemo: EventContent = {
  id: "demo-simbahan",
  slug: "simbahan-demo",
  hosts: [
    { id: "sb-h1", name: "Isabel Arceo" },
    { id: "sb-h2", name: "Rafael Saldaña" },
  ],
  eventDate: "2028-02-12T15:00:00",
  story:
    "We met at a cousin’s wedding in this same church, seated three pews apart. Rafael asked who had chosen the flowers. Isabel had.\n\nEight years, one long-distance stretch and a very patient pamamanhikan later, we are coming back to walk down this aisle together.\n\nWe would love you to be there.",
  primaryLocation: { id: "sb-loc", name: "Santa Rosa de Calantas Church", addressLine: "Plaza Real, Calantas, Ilocos Norte" },
  schedule: [
    { id: "sb-s1", startTime: "2028-02-12T14:30:00", label: "Guests are seated", description: "The doors close as the entourage enters" },
    { id: "sb-s2", startTime: "2028-02-12T15:00:00", label: "The wedding Mass" },
    { id: "sb-s3", startTime: "2028-02-12T17:30:00", label: "Cocktails at the hacienda" },
    { id: "sb-s4", startTime: "2028-02-12T18:30:00", label: "Dinner and the programme", description: "Messages from our parents and sponsors" },
    { id: "sb-s5", startTime: "2028-02-12T21:00:00", label: "Dancing" },
  ],
  accommodations: [
    { id: "sb-a1", name: "Casa Calantas Inn", addressLine: "Calle Luna, Calantas", notes: "Five minutes from the church. Mention our names for the wedding rate." },
    { id: "sb-a2", name: "Hacienda Sinag guest rooms", addressLine: "At the reception", notes: "A few rooms for family and the entourage." },
  ],
  travelInformation: [],
  galleries: [],
  registryLinks: [],
  cashGifts: [{ id: "sb-cg1", label: "GCash", accountName: "Isabel Arceo", accountNumber: "0917 555 0186" }],
  cashGiftNote: "Your presence is the greatest gift. Should you wish to bless us further, a monetary gift is welcome.",
  faqs: [
    { id: "sb-f1", order: 1, question: "Can I bring a plus one?", answer: "We have saved seats in your name. Kindly reply for those seats only." },
    { id: "sb-f2", order: 2, question: "Is the Mass unplugged?", answer: "Yes. Please keep phones away during the Mass; our photographers have it covered." },
    { id: "sb-f3", order: 3, question: "Where do we park?", answer: "On the plaza beside the church, and at the hacienda for the reception." },
  ],
  keyPeople: [],
  rsvpTableName: "simbahan_demo_rsvps",
  rsvpDeadline: "2028-01-10",
  occasion: "wedding",
  entourage: [
    { id: "sb-e1", title: "Parents of the Bride", people: ["Mr. & Mrs. Ernesto Arceo"] },
    { id: "sb-e2", title: "Parents of the Groom", people: ["Mr. & Mrs. Benjamin Saldaña"] },
    {
      id: "sb-e3",
      title: "Principal Sponsors",
      people: [
        "Mr. & Mrs. Teodoro Valdez",
        "Mr. & Mrs. Arturo Pascua",
        "Dr. & Mrs. Gregorio Agbayani",
        "Mr. & Mrs. Rolando Ines",
        "Atty. & Mrs. Simeon Corpuz",
        "Mr. & Mrs. Danilo Ramos",
        "Engr. & Mrs. Rodel Tabije",
        "Mr. & Mrs. Wilfredo Bumanglag",
      ],
    },
    { id: "sb-e4", title: "Secondary Sponsors: Candle", people: ["Miguel Valdez", "Carla Pascua"] },
    { id: "sb-e5", title: "Secondary Sponsors: Veil", people: ["Paolo Agbayani", "Bea Ines"] },
    { id: "sb-e6", title: "Secondary Sponsors: Cord", people: ["Jonas Corpuz", "Lia Ramos"] },
    { id: "sb-e7", title: "Best Man", people: ["Andres Saldaña"] },
    { id: "sb-e8", title: "Maid of Honor", people: ["Celine Arceo"] },
    { id: "sb-e9", title: "Groomsmen", people: ["Nico Tabije", "Marco Ragasa", "Josh Albano"] },
    { id: "sb-e10", title: "Bridesmaids", people: ["Ana Ragasa", "Trina Galang", "Mae Albano"] },
    { id: "sb-e11", title: "Bearers", people: ["Luis Arceo, ring", "Paco Saldaña, coin", "Tomas Valdez, Bible"] },
    { id: "sb-e12", title: "Flower Girls", people: ["Sofia Pascua", "Ella Ines"] },
  ],
  motifColors: ["#e6d8bf", "#c8a29b", "#7f8a72"],
  custom: {
    receptionName: "Hacienda Sinag",
    receptionAddress: "Barangay Dilaw, Calantas, Ilocos Norte",
    receptionTime: "Half past five in the evening",
    dressCode: "Barong Tagalog or a dark suit for the gentlemen; Filipiniana or a long gown for the ladies, in the colours below. Kindly leave white to the bride.",
  },
};
