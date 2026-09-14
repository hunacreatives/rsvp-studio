import { useState } from "react";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";

type FaqCategory = { slug: string; category: string; items: { q: string; a: string }[] };

const FAQ_CATEGORIES: FaqCategory[] = [
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

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--line)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-6 py-5 text-left"
        aria-expanded={open}
      >
        <span
          className={`font-display text-[17px] leading-snug ${
            open ? "text-[var(--ink)]" : "text-[var(--ink)]/80"
          }`}
        >
          {q}
        </span>
        <span
          className={`mt-1 shrink-0 text-xl leading-none text-[var(--slate)] transition-transform ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="pb-6">
          {a.split("\n\n").map((para, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-[var(--slate)] first:mt-0">
              {para.split("\n").map((line, j, arr) => (
                <span key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (charCount > 500) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
    }, 400);
  };

  const input =
    "w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--slate)] focus:border-[var(--acc-blue)]";
  const label =
    "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]";

  if (submitted) {
    return (
      <div className="py-10 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--acc-blue)]">
          <i className="ri-check-line" />
        </span>
        <p className="mt-4 font-display text-xl font-semibold text-[var(--ink)]">
          Message received
        </p>
        <p className="mt-1 text-sm text-[var(--slate)]">
          We&apos;ll be in touch within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Name</label>
          <input type="text" name="full_name" required placeholder="Your name" className={input} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input type="email" name="email" required placeholder="your@email.com" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Message</label>
        <textarea
          name="message"
          rows={4}
          maxLength={500}
          placeholder="What would you like to know?"
          className={`${input} resize-none`}
          onChange={(e) => setCharCount(e.target.value.length)}
        />
        <p className={`mt-1 text-right text-[11px] ${charCount > 480 ? "text-[var(--acc-coral)]" : "text-[var(--slate)]"}`}>
          {charCount}/500
        </p>
      </div>
      <button
        type="submit"
        disabled={submitting || charCount > 500}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

export default function FaqsPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="pt-16 md:pt-28 pb-4 text-center" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-4xl">
            <h1
              className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)] sm:whitespace-nowrap"
              style={{ fontSize: "clamp(1.9rem, 4.4vw, 3rem)" }}
            >
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--slate)]">
              Everything you need to know about our services, collections,
              <br className="hidden sm:inline" />
              timelines, and process — all in one place.
            </p>
          </div>
        </section>

        {/* FAQ content */}
        <section className="py-16 md:py-24" style={{ background: "var(--warm-white)" }}>
          <div className="container-x">
            <div className="grid gap-14 lg:grid-cols-[0.28fr_0.72fr] lg:gap-20">
              <aside className="hidden lg:block">
                <nav className="sticky top-28 space-y-2">
                  {FAQ_CATEGORIES.map((cat) => (
                    <a
                      key={cat.slug}
                      href={`#${cat.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(cat.slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="block py-1.5 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
                    >
                      {cat.category}
                    </a>
                  ))}
                </nav>
              </aside>

              <div className="space-y-16">
                {FAQ_CATEGORIES.map((cat) => (
                  <div key={cat.slug} id={cat.slug} className="scroll-mt-28">
                    <h2 className="mb-3 font-display text-2xl font-semibold text-[var(--ink)]">
                      {cat.category}
                    </h2>
                    <div className="border-t border-[var(--line)]">
                      {cat.items.map((item) => (
                        <FaqItem key={item.q} q={item.q} a={item.a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Still have questions */}
        <section className="py-20 md:py-24" style={{ background: "var(--paper)" }}>
          <div className="container-x">
            <div className="grid items-start gap-14 lg:grid-cols-2">
              <Reveal>
                <h2 className="h-section text-[var(--ink)]">Still have questions?</h2>
                <p className="mt-4 max-w-sm text-[var(--slate)]">
                  We&apos;d love to hear about your event and help bring your vision
                  to life. Send us a message and we&apos;ll be in touch within 24
                  hours.
                </p>
              </Reveal>
              <Reveal delay={0.08}>
                <ContactForm />
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </>
  );
}
