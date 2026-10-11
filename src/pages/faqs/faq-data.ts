// Public FAQ content — shared by /faqs and the client dashboard Help page.

export type FaqCategory = { slug: string; category: string; items: { q: string; a: string }[] };

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    slug: "booking",
    category: "Booking & Process",
    items: [
      { q: "How do we get started?", a: "Simply fill out our inquiry form and share a few details about your celebration. From there, we'll guide you through the next steps, timelines, and package options." },
      { q: "Do you offer payment plans?", a: "Yes. For our Semi-Custom event website, we require a 60% deposit to secure your booking and begin work, with the remaining 40% due upon website launch.\n\nFor Custom projects, the payment schedule is structured according to the project scope and timeline. This will be clearly outlined and agreed upon before work begins." },
      { q: "What payment methods do you accept?", a: "Pay online from any invoice in your dashboard with GCash, Maya, card or QR Ph (scan with any banking app). Your receipt appears as soon as the payment goes through. We can also take a bank transfer — message us for the details." },
      { q: "Where are you based?", a: "We are based in the Philippines and operate remotely, serving clients from around the world." },
      { q: "I'm looking for extra pages beyond your packages. Can I add them?", a: "Yes. Additional pages or ongoing updates can be added as a one-off service." },
    ],
  },
  {
    slug: "website",
    category: "Website Experience",
    items: [
      { q: "I need an urgent website. Can you rush my order?", a: "If your timeline is tight, please mention this in your inquiry. If we are able to prioritise your project, a 30% rush fee will apply. Rush availability is confirmed on a case-by-case basis and invoiced once feasibility has been agreed." },
      { q: "How long will my website, domain, and email be live?", a: "Your website, domain, and email stay online for one year after your site goes live." },
      { q: "Can I keep my website, domain, and email for longer than a year?", a: "Certainly. We can extend the subscription for another year for an additional fee." },
      { q: "What happens after my website is launched?", a: "All website packages include one month of after-launch support, during which we address any technical issues and make light adjustments if needed." },
      { q: "How many revisions do you offer?", a: "Each package offers a different number of revision rounds to ensure your website and design align perfectly with your vision.\n\nSemi-Custom websites include 2 revision rounds.\nCustom websites include 3 revision rounds.\n\nAdditional revisions beyond what is included can be accommodated for an additional fee." },
      { q: "Can we have a custom domain?", a: "Yes. Both our Semi-Custom and Custom packages include a personalised domain name for a polished, elevated guest experience." },
      { q: "Can our website be password protected?", a: "Absolutely. Password protection can be added for privacy and controlled guest access." },
    ],
  },
  {
    slug: "build",
    category: "Build Your Own Website",
    items: [
      { q: "Is Build Your Website free?", a: "Yes. You can design, preview and publish your event website with any Standard template for free. Free sites show a small \u201cMade with The RSVP Studio\u201d line at the bottom, and you get one email a day with your new RSVPs. Every reply is always in your dashboard as soon as it comes in." },
      { q: "What does Premium include?", a: "Premium is a one-time fee per site, shown before you pay (currently \u20b1499). Your site has no \u201cMade with The RSVP Studio\u201d line, you get an email the moment each guest RSVPs, guest confirmation emails are sent in your names, and you can use any Premium template at no extra cost. You can upgrade a free site anytime from the website builder." },
      { q: "Do my guests get a confirmation email?", a: "Yes. Guests who reply with an email address get a confirmation on both free and Premium sites. Guests who reply with a mobile number see their confirmation on screen." },
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
