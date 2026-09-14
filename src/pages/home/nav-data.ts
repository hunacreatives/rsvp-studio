export type NavLink = { label: string; to: string };

export type MegaGroup = { title: string; links: NavLink[] };

export type NavItem = {
  label: string;
  to: string;
  mega?: {
    exploreEyebrow: string;
    exploreCta: NavLink;
    groups: MegaGroup[];
  };
};

export const NAV_ITEMS: NavItem[] = [
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
        {
          title: "For Event Planners",
          links: [
            { label: "Collaborate With RSVP Studio", to: "/enquire/partner" },
          ],
        },
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
      exploreCta: { label: "Explore All Portfolio", to: "/portfolio" },
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
            { label: "Stationery Design", to: "/faqs#stationery" },
            {
              label: "Digital Invitations & Save the Dates",
              to: "/faqs#invitations",
            },
            { label: "RSVP & Guest Management", to: "/faqs#rsvp" },
          ],
        },
        {
          title: "For Event Planners",
          links: [{ label: "Collaboration Process", to: "/faqs#collaboration" }],
        },
      ],
    },
  },
  { label: "Blog", to: "/blog" },
  {
    label: "Inquire",
    to: "/enquire",
    mega: {
      exploreEyebrow: "Explore Our Inquiry",
      exploreCta: { label: "Explore All Inquiry", to: "/enquire" },
      groups: [
        {
          title: "For Clients",
          links: [{ label: "Start a Project", to: "/enquire#start" }],
        },
        {
          title: "For Event Planners",
          links: [{ label: "Become a Partner", to: "/enquire/partner" }],
        },
      ],
    },
  },
];
