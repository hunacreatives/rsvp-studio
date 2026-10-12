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
      { q: "How long will my website and domain stay online?", a: "Your website and domain stay online for one year after your site goes live." },
      { q: "Can I keep my website and domain for longer than a year?", a: "Certainly. We can extend it for another year for an additional fee." },
      { q: "What happens after my website is launched?", a: "All website packages include one month of after-launch support, during which we address any technical issues and make light adjustments if needed." },
      { q: "How many revisions do you offer?", a: "Each package offers a different number of revision rounds to ensure your website and design align perfectly with your vision.\n\nSemi-Custom websites include 2 revision rounds.\nCustom websites include 3 revision rounds.\n\nAdditional revisions beyond what is included can be accommodated for an additional fee." },
      { q: "Can we have a custom domain?", a: "Yes. Packages from \u20b18,000, like our Custom website, include a free .com or .net for the first year, subject to availability; other endings like .co or .wedding just pay the difference. For Semi-Custom websites and websites you build yourself, add your own domain from \u20b11,499 a year. Renewals after the first year are at the same rate." },
      { q: "Can our website be password protected?", a: "Yes, on every website, free or Premium. In the website builder, open Privacy & guests and turn on \u201cAsk guests for a password\u201d. Guests type it once to open your site, and only they can RSVP." },
    ],
  },
  {
    slug: "build",
    category: "Build Your Own Website",
    items: [
      { q: "Is Build Your Website free?", a: "Yes. You can design, preview and publish your event website with any Standard template for free. You get one email a day with your new RSVPs. Every reply is always in your dashboard as soon as it comes in." },
      { q: "What does Premium include?", a: "Premium is a one-time fee per site, shown before you pay (currently \u20b1499). You get an email the moment each guest RSVPs, guest confirmation emails are sent in your names, guests who said yes get a reminder email two days before, guests can share their photos on your site, and you can use any Premium template at no extra cost. You can upgrade a free site anytime from the website builder." },
      { q: "Can I make more than one website for free?", a: "You can have up to 3 free projects at a time (drafts included), with one of them live. To start or publish another, make one Premium or delete one from your dashboard (Project \u2192 Website)." },
      { q: "How long does my website stay online?", a: "A free website stays online until 30 days after your event. A Premium website stays online for a year after your event. After that, the link shows a thank-you page. Your guest list and the photos you uploaded are kept for 30 more days, then permanently deleted, so download your guest list and save any photos you want to keep before then. We\u2019ll email you two weeks before your website goes offline." },
      { q: "Can I delete my website?", a: "Yes. Open the project in your dashboard, go to Website, and choose Delete project. It goes offline right away and is removed for good after 30 days, along with its guest list and photos. Download your guest list and save any photos you want first. Premium payments aren\u2019t refunded when a website is deleted." },
      { q: "Can I have my own web address?", a: "Yes. When you publish, or anytime from your project\u2019s Website tab, search for a name like yourname.com and buy it in a few taps. We register it for a year and connect it for you in minutes, and your website stays online for as long as the address is active. We\u2019ll email you before it expires if you\u2019d like to renew." },
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
