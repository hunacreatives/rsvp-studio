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
  mega?: {
    exploreEyebrow: string;
    exploreCta: NavLink;
    groups: MegaGroup[];
  };
};

// Partner program links, shared by Services, FAQ and Inquire.
const PARTNERS: MegaGroup = {
  title: "Partner program",
  links: [
    { label: "For planners & coordinators", to: "/partners" },
    { label: "For creators & influencers", to: "/partners?type=creator" },
  ],
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/" },
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
  {
    label: "Services",
    to: "/services",
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
        PARTNERS,
      ],
    },
  },
  {
    label: "Collections",
    to: "/collections",
    mega: {
      exploreEyebrow: "Explore Collections",
      exploreCta: { label: "Explore All Collections", to: "/collections" },
      groups: [
        {
          title: "Collections",
          links: [
            { label: "Wedding", to: "/collections#wedding" },
            { label: "Baby Shower", to: "/collections#baby-shower" },
            { label: "Birthday", to: "/collections#birthday" },
            { label: "Engagement", to: "/collections#engagement" },
          ],
        },
      ],
    },
  },
  {
    label: "Portfolio",
    to: "/portfolio",
    mega: {
      exploreEyebrow: "Explore Our Portfolio",
      exploreCta: { label: "View all our work", to: "/portfolio" },
      groups: [
        {
          title: "Portfolio",
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
    label: "FAQ",
    to: "/faqs",
    mega: {
      exploreEyebrow: "Explore Our FAQs",
      exploreCta: { label: "Explore All FAQs", to: "/faqs" },
      groups: [
        {
          title: "FAQs",
          links: [
            { label: "Booking & Process", to: "/faqs#booking" },
            { label: "Website Experience", to: "/faqs#website" },
            { label: "Build Your Own Website", to: "/faqs#build" },
            { label: "RSVP & Guest Management", to: "/faqs#rsvp" },
            { label: "Digital Invitations & Save the Dates", to: "/faqs#invitations" },
            { label: "Print Stationery", to: "/faqs#stationery" },
          ],
        },
        PARTNERS,
      ],
    },
  },
  {
    label: "Blog",
    to: "/blog",
    mega: {
      exploreEyebrow: "The Journal",
      exploreCta: { label: "Read the latest articles", to: "/blog" },
      groups: [
        {
          title: "Topics",
          links: [
            { label: "Wedding", to: "/blog?topic=Wedding" },
            { label: "Invitations", to: "/blog?topic=Invitations" },
            { label: "Planning", to: "/blog?topic=Planning" },
            { label: "Stationery", to: "/blog?topic=Stationery" },
          ],
        },
        {
          title: "More topics",
          links: [
            { label: "Events", to: "/blog?topic=Events" },
            { label: "Tips & Guides", to: "/blog?topic=Tips+%26+Guides" },
            { label: "Behind the Scenes", to: "/blog?topic=Behind+the+Scenes" },
          ],
        },
      ],
    },
  },
  {
    label: "Inquire",
    to: "/enquire#start",
    mega: {
      exploreEyebrow: "Work with us",
      exploreCta: { label: "Start an inquiry", to: "/enquire#start" },
      groups: [
        {
          title: "For clients",
          links: [
            { label: "Start a project", to: "/enquire#start" },
            { label: "Ask a question", to: "/faqs" },
            { label: "Your dashboard", to: "/account" },
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
