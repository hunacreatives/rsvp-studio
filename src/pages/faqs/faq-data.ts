// Public FAQ content — shared by /faqs and the client dashboard Help page.

export type FaqCategory = { slug: string; category: string; items: { q: string; a: string }[] };

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    slug: "booking",
    category: "Booking & Process",
    items: [
      { q: "How do we get started?", a: "Simply fill out our inquiry form and share a few details about your celebration. From there, we'll guide you through the next steps, timelines, and package options." },
      { q: "Do you offer payment plans?", a: "Yes. For our semi-custom event website, we require a 60% deposit to secure your booking and begin work, with the remaining 40% due upon website launch.\n\nFor bespoke projects, the payment schedule is structured according to the project scope and timeline. This will be clearly outlined and agreed upon before work begins." },
      { q: "What payment methods do you accept?", a: "You can settle the invoice through bank transfer or PayPal (with a service fee). We do not accept crypto or other methods." },
      { q: "Where are you based?", a: "We are based in the Philippines and operate remotely, serving clients from around the world." },
      { q: "I'm looking for extra pages beyond your packages. Can I add them?", a: "Yes. Additional pages or ongoing updates can be added as a one-off service." },
    ],
  },
  {
    slug: "website",
    category: "Website Experience",
    items: [
      { q: "I need an urgent website. Can you rush my order?", a: "If your timeline is tight, please mention this in your inquiry. If we are able to prioritise your project, a 30% rush fee will apply. Rush availability is confirmed on a case-by-case basis and invoiced once feasibility has been agreed." },
      { q: "How long will my website, domain, and email be live?", a: "Your website, domain, and email will be active for 364 days after publishing." },
      { q: "Can I keep my website, domain, and email longer than 364 days?", a: "Certainly. We can extend the subscription for another year for an additional fee." },
      { q: "What happens after my website is launched?", a: "All website packages include one month of after-launch support, during which we address any technical issues and make light adjustments if needed." },
      { q: "How many revisions do you offer?", a: "Each package offers a different number of revision rounds to ensure your website and design align perfectly with your vision.\n\nSemi-custom websites include 2 revision rounds.\nBespoke websites include 3 revision rounds.\n\nAdditional revisions beyond what is included can be accommodated for an additional fee." },
      { q: "Can we have a custom domain?", a: "Yes. Your semi-custom and bespoke packages include a personalised domain name for a polished, elevated guest experience." },
      { q: "Can our website be password protected?", a: "Absolutely. Password protection can be added for privacy and controlled guest access." },
    ],
  },
  {
    slug: "rsvp",
    category: "RSVP & Guest Management",
    items: [
      { q: "What does RSVP management include?", a: "Our RSVP Management service includes response tracking, guest list organisation, reminder emails, and ongoing updates to help keep everything clear and stress-free." },
      { q: "What happens if guests don't RSVP?", a: "Gentle reminder emails can be sent to guests who haven't responded before the RSVP deadline." },
      { q: "Can we collect meal preferences or song requests?", a: "Yes. RSVP forms can be customised to include meal selections, dietary restrictions, shuttle schedules, song requests, and other guest information." },
    ],
  },
  {
    slug: "invitations",
    category: "Digital Invitations & Save the Dates",
    items: [
      { q: "Can invitations be personalised for each guest?", a: "Guest names can be personalised within email communication, though the invitation design itself remains consistent." },
    ],
  },
  {
    slug: "stationery",
    category: "Print Stationery",
    items: [
      { q: "Do you handle printing as well?", a: "Yes, we can fully handle the printing process for you, from production coordination to final delivery. We work with trusted print partners to ensure every piece feels refined, cohesive, and beautifully finished." },
      { q: "Can I receive some samples?", a: "Our sample sets will be available very soon — stay tuned for updates. We'll let you know as soon as they're ready to order." },
      { q: "Can we order both digital and printed stationery?", a: "Absolutely. Many clients choose a combination of digital invitations, event websites, and printed stationery for a seamless guest experience across every touchpoint." },
      { q: "Can changes still be made after approval?", a: "Minor updates may still be possible before production begins, but once files are approved and sent to print, additional changes may require reprinting costs." },
    ],
  },
];
