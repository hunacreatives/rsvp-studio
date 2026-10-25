export type NavLink = { label: string; to: string };

export type MegaGroup = { title: string; links: NavLink[] };

export type NavItem = {
  label: string;
  to: string;
  /** Extra path prefixes that should also count as "current" for this
   *  item, beyond `to` itself — for nav items whose `to` is a pure
   *  redirector (like /build) that never stays on-screen, so it can
   *  never sustain an active state on its own. */
  activePrefixes?: string[];
  /** A small tag beside the label, e.g. "Free". */
  badge?: string;
  mega?: {
    exploreEyebrow: string;
    exploreCta: NavLink;
    groups: MegaGroup[];
  };
};

// Partner program links (under Help).
const PARTNERS: MegaGroup = {
  title: "Partner program",
  links: [
    { label: "For planners & coordinators", to: "/partners" },
    { label: "For creators & influencers", to: "/partners?type=creator" },
  ],
};

// Five items (Oct 25 2026): the logo already goes home and "Get a quote" covers Inquire.
// Collections sit inside Services; Contact, FAQ, the Journal and the partner program share
// one Help menu.
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Build Your Website",
    to: "/build",
    mega: {
      exploreEyebrow: "Make it yourself",
      exploreCta: { label: "Start your free website", to: "/build" },
      groups: [
        {
          title: "Build your own",
          links: [
            { label: "Start building", to: "/build" },
            { label: "Free vs Premium", to: "/faqs#build" },
            { label: "Your own web address", to: "/faqs#build" },
            { label: "RSVPs & guest list", to: "/services/rsvp" },
            { label: "Mesa: free seating charts", to: "/tools/seating-chart-maker" },
          ],
        },
        {
          title: "Rather we make it?",
          links: [
            { label: "Have us design it", to: "/enquire?service=website&design=custom#start" },
            { label: "See websites we’ve made", to: "/portfolio#milestone" },
          ],
        },
      ],
    },
  },
  { label: "Mesa", to: "/tools/seating-chart-maker", badge: "Free" },
  {
    label: "Services",
    to: "/services",
    activePrefixes: ["/services", "/collections"],
    mega: {
      exploreEyebrow: "Explore Services",
      exploreCta: { label: "Explore All Services", to: "/services" },
      groups: [
        {
          title: "Services",
          links: [
            { label: "Milestone Events Website", to: "/services/milestone" },
            { label: "Monogram Design", to: "/services/monogram" },
            { label: "Digital Save the Date", to: "/services/save-the-date" },
            { label: "Stationery Design", to: "/services/stationery" },
            { label: "RSVP Management", to: "/services/rsvp" },
          ],
        },
        {
          title: "Collections",
          links: [
            { label: "Wedding", to: "/collections#wedding" },
            { label: "Baby Shower", to: "/collections#baby-shower" },
            { label: "Birthday", to: "/collections#birthday" },
            { label: "Engagement", to: "/collections#engagement" },
            { label: "All collections", to: "/collections" },
          ],
        },
      ],
    },
  },
  {
    label: "Our work",
    to: "/portfolio",
    mega: {
      exploreEyebrow: "Explore Our Work",
      exploreCta: { label: "View all our work", to: "/portfolio" },
      groups: [
        {
          title: "Our work",
          links: [
            { label: "Milestone Events Website", to: "/portfolio#milestone" },
            { label: "Monogram", to: "/portfolio#monogram" },
            { label: "Digital Save the Date", to: "/portfolio#save-the-date" },
            { label: "Stationery", to: "/portfolio#stationery" },
          ],
        },
      ],
    },
  },
  {
    label: "Help",
    to: "/contact",
    activePrefixes: ["/contact", "/faqs", "/blog", "/partners", "/enquire"],
    mega: {
      exploreEyebrow: "Help",
      exploreCta: { label: "Contact us", to: "/contact" },
      groups: [
        {
          title: "FAQs",
          links: [
            { label: "Booking & Process", to: "/faqs#booking" },
            { label: "Build Your Own Website", to: "/faqs#build" },
            { label: "RSVP & Guest Management", to: "/faqs#rsvp" },
            { label: "Print Stationery", to: "/faqs#stationery" },
          ],
        },
        {
          title: "The Journal",
          links: [
            { label: "Latest articles", to: "/blog" },
            { label: "Planning", to: "/blog?topic=Planning" },
            { label: "Tips & Guides", to: "/blog?topic=Tips+%26+Guides" },
          ],
        },
        {
          ...PARTNERS,
          links: [...PARTNERS.links, { label: "Partner dashboard", to: "/account/partner" }],
        },
      ],
    },
  },
];
