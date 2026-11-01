import { FAQ_CATEGORIES } from "@/pages/faqs/faq-data";

// Help & Support content for the client dashboard. Contact details here are
// the real ones (the dashboard mockup used placeholders).

export const SUPPORT = {
  email: "hello@thersvpstudio.com",
  instagram: "@rsvpstudioo",
  instagramUrl: "https://www.instagram.com/rsvpstudioo/",
  hours: "Mon – Fri, 9:00 AM – 6:00 PM (PHT)",
  responseTime: "Within 1 business day",
  base: "Philippines — working remotely with clients worldwide",
};

export type QA = { q: string; a: string };

const faq = (slug: string) => FAQ_CATEGORIES.find((c) => c.slug === slug)?.items ?? [];

const BILLING: QA[] = [
  { q: "Where can I see my invoices?", a: "Every invoice for every event is under Billing. Open one to see the details, download it, or pay it." },
  ...faq("booking").filter((i) => /payment/i.test(i.q)),
  { q: "How do I get a receipt?", a: "Once a payment is confirmed the invoice is marked Paid. Open it under Billing and use Download receipt to save a PDF." },
  { q: "Can I change the name or address on my invoices?", a: "Yes. Go to Billing → Manage billing to update the billing name, email, and address shown on your invoices." },
];

const PLANNERS: QA[] = [
  { q: "Do you work with event planners and venues?", a: "Yes. We offer referral partnerships, white-label builds, and one-off collaborations for specific events. See the partner program and tell us how you work, and we’ll set up a call." },
  { q: "Can we manage several client events from one account?", a: "Yes. Each event has its own place in your dashboard, with its own website, guest list, messages, and invoices." },
];

export type Topic = { slug: string; title: string; blurb: string; icon: string; tint: string; items: QA[]; link?: { to: string; label: string } };

export const TOPICS: Topic[] = [
  { slug: "booking", title: "Booking & Process", blurb: "Inquiries, timelines, and what to expect.", icon: "ri-chat-1-line", tint: "#fbd5ef", items: faq("booking") },
  { slug: "website", title: "Website Experience", blurb: "Managing your event website.", icon: "ri-computer-line", tint: "#bfe5f7", items: [...faq("website"), ...faq("build")] },
  { slug: "invitations", title: "Digital Invitations", blurb: "Designs, sending, and guest RSVPs.", icon: "ri-mail-line", tint: "#ecdcfb", items: [...faq("invitations"), ...faq("rsvp")] },
  { slug: "billing", title: "Billing & Payments", blurb: "Invoices, payments, and receipts.", icon: "ri-bank-card-line", tint: "#fbd5ef", items: BILLING },
  { slug: "stationery", title: "Stationery Design", blurb: "Customization, proofs, and printing.", icon: "ri-quill-pen-line", tint: "#ecfbcc", items: faq("stationery") },
  { slug: "planners", title: "For Event Planners", blurb: "Partnerships and collaboration.", icon: "ri-team-line", tint: "#ffe7a3", items: PLANNERS, link: { to: "/partners", label: "Become a partner" } },
];

/** Shown before a topic is picked: building your own site first, then working with the studio. */
export const TOP_QUESTIONS: QA[] = [
  { q: "How do I make my website?", a: "Choose New event, say what you’re celebrating, and pick a design. The builder opens with a live preview. Fill in your details, then publish when you’re happy. Nothing is public until you do." },
  ...faq("build").filter((i) => /premium include|more than one/i.test(i.q)),
  { q: "How do guests RSVP on my event website?", a: "Guests fill in the RSVP form on your website with their email. Responses appear instantly under your event’s Guests tab, where you can search them and export a CSV." },
  { q: "Working with our studio on a custom site?", a: "Tell us about your event through the inquiry form. We confirm your timeline at kickoff, and your event’s next step and its due date are always shown under Events." },
];

export type Guide = { slug: string; title: string; summary: string; icon: string; sections: { heading: string; body: string }[] };

export const GUIDES: Guide[] = [
  {
    slug: "getting-started",
    title: "Getting Started Guide",
    summary: "How your RSVP Studio dashboard works, from your first event to launch day.",
    icon: "ri-compass-3-line",
    sections: [
      { heading: "Start an event", body: "Choose New event, say what you’re celebrating and who it’s for, then pick a design. You can switch designs later without losing your details." },
      { heading: "Build and publish", body: "The builder shows a live preview as you type. Everything saves as a draft, and guests see nothing until you publish. Then copy your link from the Website tab and send it." },
      { heading: "Your guests", body: "Replies land in the Guests tab the moment they come in. Search them, see who left a message, and export a CSV for your caterer or planner." },
      { heading: "Working with our studio", body: "If we’re designing for you, each event shows what we’re working on and the next step, usually something we need from you, with a due date. Requests for input appear under Upcoming Tasks, and Messages keeps one thread per event for feedback and files (images or PDFs up to 10 MB each). Invoices appear under Billing as soon as we issue them." },
      { heading: "Invite codes", body: "If we set up an event for you, we’ll send an invite code. Use New event → I have an invite code to link it to your account. Each code works once — if a partner or co-host should follow along too, message us and we’ll send them their own." },
    ],
  },
  {
    slug: "managing-your-website",
    title: "Managing Your Event Website",
    summary: "Editing, publishing, and sharing your site — and seeing who’s coming.",
    icon: "ri-global-line",
    sections: [
      { heading: "Find your website", body: "Open your event and choose the Website tab. Sites we design for you show their live link there; sites you build yourself show the template you picked and whether they’re published." },
      { heading: "Edit and preview", body: "Edit website opens the builder with a live preview. Your changes save as a draft — guests don’t see anything until you publish." },
      { heading: "Publish and share", body: "When you’re happy, publish from the builder. Copy your link from the Website tab and share it by message, email, or on your invitations." },
      { heading: "Track RSVPs", body: "Responses land in the Guests tab the moment guests submit them. Search by name or email, filter by guests who left a message, and export a CSV for your caterer or planner." },
      { heading: "Need a change on a studio-built site?", body: "Message us from the event. Small updates are included during your after-launch support period." },
    ],
  },
  {
    slug: "invitation-wording",
    title: "Invitation Wording Tips",
    summary: "Clear, warm wording for invitations, RSVPs, and reminders.",
    icon: "ri-quill-pen-line",
    sections: [
      { heading: "Lead with the essentials", body: "Who is celebrating, what the occasion is, the date and time, and where. Guests skim — put these first and keep each on its own line." },
      { heading: "Formal", body: "“Together with their families, Nikki Santos and Alan Cruz request the pleasure of your company at their marriage.”" },
      { heading: "Relaxed", body: "“We’re getting married! Join us for a day of love, laughter, and a lot of dancing.”" },
      { heading: "Birthdays and milestones", body: "“Join us as we celebrate Gel’s 30th — dinner, drinks, and good company.” Add a dress code or theme line if there is one." },
      { heading: "RSVP lines", body: "Give a clear deadline: “Kindly respond by March 1 so we can finalize our numbers.” If seats are limited, say so gently: “We have reserved one seat in your honor.”" },
      { heading: "Gifts", body: "Keep it short and kind: “Your presence is the greatest gift. If you wish to honor us further, a contribution toward our new home would be warmly appreciated.”" },
    ],
  },
];
