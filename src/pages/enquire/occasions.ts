export type FieldSpec =
  | { kind: "text"; name: string; label: string; placeholder?: string }
  | { kind: "pills"; name: string; label: string; options: string[]; multi?: boolean }
  | { kind: "textarea"; name: string; label: string; placeholder?: string };

export type Occasion = {
  key: string;
  label: string;
  /** occasion-specific fields shown on step 2, after date/location/guests */
  fields: FieldSpec[];
};

export const OCCASIONS: Occasion[] = [
  {
    key: "wedding",
    label: "Wedding",
    fields: [
      { kind: "text", name: "partner_name", label: "Partner's name", placeholder: "Partner's name" },
      { kind: "pills", name: "has_planner", label: "Are you working with a planner or coordinator?", options: ["Yes", "Not yet"] },
    ],
  },
  {
    key: "engagement",
    label: "Engagement",
    fields: [
      { kind: "text", name: "partner_name", label: "Partner's name", placeholder: "Partner's name" },
      { kind: "pills", name: "has_planner", label: "Are you working with a planner or coordinator?", options: ["Yes", "Not yet"] },
    ],
  },
  {
    key: "bridal-shower",
    label: "Bridal Shower",
    fields: [
      { kind: "text", name: "partner_name", label: "Guest of honour", placeholder: "Bride-to-be's name" },
      { kind: "pills", name: "has_planner", label: "Are you working with a planner or coordinator?", options: ["Yes", "Not yet"] },
    ],
  },
  {
    key: "birthday",
    label: "Birthday",
    fields: [
      { kind: "text", name: "celebrant_name", label: "Celebrant's name", placeholder: "Whose birthday is it?" },
      { kind: "text", name: "milestone_age", label: "Milestone (optional)", placeholder: "e.g. 1st, 18th, 50th" },
      { kind: "pills", name: "celebrating_for", label: "Who are you celebrating for?", options: ["Myself", "My child", "A family member", "A friend"] },
    ],
  },
  {
    key: "baby-shower",
    label: "Baby Shower",
    fields: [
      { kind: "text", name: "parents_names", label: "Parent(s)-to-be", placeholder: "Name(s)" },
      { kind: "text", name: "theme", label: "Theme / gender reveal (optional)", placeholder: "e.g. woodland, gender reveal" },
    ],
  },
  {
    key: "anniversary",
    label: "Anniversary",
    fields: [
      { kind: "text", name: "couple_names", label: "Couple's names", placeholder: "Both names" },
      { kind: "text", name: "which_anniversary", label: "Which anniversary (optional)", placeholder: "e.g. 25th" },
    ],
  },
  {
    key: "corporate",
    label: "Corporate / Brand Event",
    fields: [
      { kind: "text", name: "company_name", label: "Company / brand", placeholder: "Company or brand name" },
      { kind: "pills", name: "corporate_type", label: "Event type", options: ["Launch", "Activation", "Conference", "Gala", "Holiday Party", "Other"] },
      { kind: "text", name: "contact_role", label: "Your role (optional)", placeholder: "e.g. Marketing Lead" },
    ],
  },
  {
    key: "other",
    label: "Other",
    fields: [
      { kind: "textarea", name: "occasion_details", label: "Tell us about the occasion", placeholder: "What are we celebrating?" },
    ],
  },
];

export const HEAR_ABOUT = [
  "Instagram", "Facebook", "Google", "Referral from a friend", "Pinterest", "TikTok", "Others",
];
export const SERVICES = [
  "Milestone Events Website", "Monogram", "Digital Save the Date", "Stationery Design", "RSVP Management",
];
export const BESPOKE_COLLECTIONS = [
  "The Essential Collection", "The Signature Collection", "The Bespoke Collection",
];
export const SEMI_COLLECTIONS = [
  "Alpine", "Classic", "Coastal", "Garden", "Minimalist Polaroid", "Floral",
];
export const ADDONS = ["Digital Save the Date", "RSVP Management", "Just the website for now"];
export const TIMELINES = ["3 – 4 weeks", "1 – 2 months", "2 – 3 months", "3+ months", "Not sure yet"];
export const BUDGETS = ["Under ₱15k", "₱15 – 40k", "₱40 – 80k", "₱80k+", "Not sure yet"];
