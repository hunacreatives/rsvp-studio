import { useState } from "react";
import Navbar from "../home/components/Navbar";
import FooterSection from "../home/components/FooterSection";
import InstagramSection from "../home/components/InstagramSection";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_WARM = "#A3968D";
const COLOR_SAND = "#DFDACF";
const COLOR_CREAM = "#FAF8F5";

const faqCategories = [
  {
    category: "Booking & Process",
    items: [
      {
        q: "How do we get started?",
        a: "Simply fill out our enquiry form and share a few details about your celebration. From there, we'll guide you through the next steps, timelines, and package options.",
      },
      {
        q: "Do you offer payment plans?",
        a: "Yes. For our semi‑custom wedding website, we require a 60% deposit to secure your booking and begin work, with the remaining 40% due upon website launch.\n\nFor bespoke projects, the payment schedule is structured according to the project scope and timeline. This will be clearly outlined and agreed upon before work begins.",
      },
      {
        q: "What payment methods do you accept?",
        a: "You can settle the invoice through bank transfer or Paypal (but with a service fee). Regrettably, we do not accept Crypto, or any other methods.",
      },
      {
        q: "Where are you based?",
        a: "We are based in the Philippines and operate remotely, serving clients from around the world.",
      },
      {
        q: "I'm looking for extra pages beyond your packages. Can I add them?",
        a: "Yes. Additional pages or ongoing updates can be added either as a one‑off service.",
      },
    ],
  },
  {
    category: "Website Experience",
    items: [
      {
        q: "I need an urgent website. Can you rush my order?",
        a: "If your timeline is tight, please mention this in your enquiry. If we are able to prioritise your project, a 30% rush fee will apply. Rush availability is confirmed on a case‑by‑case basis and invoiced once feasibility has been agreed.",
      },
      {
        q: "How long will my website, domain, and email be live?",
        a: "Your website, domain, and email will be active for 364 days after publishing.",
      },
      {
        q: "Can I keep my website, domain, and email longer than 364 days?",
        a: "Certainly! We can extend the subscription for another year with an extra fee.",
      },
      {
        q: "What happens after my website is launched?",
        a: "All website packages include one month of after‑launch support, during which we address any technical issues and make light adjustments if needed.",
      },
      {
        q: "How many revisions do you offer?",
        a: "Each package offers a different number of revision rounds to ensure your website and design align perfectly with your vision.\n\nSemi‑custom websites include 2 revision rounds\nBespoke websites include 3 revision rounds\n\nAdditional revisions beyond what is included can be accommodated for an additional fee.",
      },
      {
        q: "Can we have a custom domain?",
        a: "Yes. Your semi custom and bespoke package includes a personalised domain name for a polished and elevated guest experience.",
      },
      {
        q: "Can our website be password protected?",
        a: "Absolutely. Password protection can be added for privacy and controlled guest access.",
      },
    ],
  },
  {
    category: "RSVP & Guest Management",
    items: [
      {
        q: "What does RSVP management include?",
        a: "Our RSVP Management service includes response tracking, guest list organisation, reminder emails, and ongoing updates to help keep everything clear and stress-free.",
      },
      {
        q: "What happens if guests don't RSVP?",
        a: "Gentle reminder emails can be sent to guests who haven't responded before the RSVP deadline.",
      },
      {
        q: "Can we collect meal preferences or song requests?",
        a: "Yes. RSVP forms can be customised to include meal selections, dietary restrictions, shuttle schedules, song requests, and other guest information.",
      },
    ],
  },
  {
    category: "Digital Invitations & Save the Dates",
    items: [
      {
        q: "Can invitations be personalised for each guest?",
        a: "Guest names can be personalised within email communication, though the invitation design itself remains consistent.",
      },
    ],
  },
  {
    category: "Print Stationery",
    items: [
      {
        q: "Do you handle printing as well?",
        a: "Yes, we can fully handle the printing process for you, from production coordination to final delivery. We carefully work with trusted print partners to ensure every piece feels refined, cohesive, and beautifully finished.",
      },
      {
        q: "Can I receive some samples?",
        a: "Our sample sets will be available very soon, so stay tuned for updates. We'll let you know as soon as they're ready to order, so you can see and feel the quality for yourself.",
      },
      {
        q: "Can we order both digital and printed stationery?",
        a: "Absolutely. Many clients choose a combination of digital invitations, event websites, and printed stationery for a seamless guest experience across every touchpoint.",
      },
      {
        q: "Can changes still be made after approval?",
        a: "Minor updates may still be possible before production begins, but once files are approved and sent to print, additional changes may require reprinting costs.",
      },
    ],
  },
];

function FaqItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: `1px solid ${COLOR_SAND}` }}>
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between py-5 text-left cursor-pointer gap-6"
      >
        <span style={{ fontFamily: FONT_PRIMARY, fontSize: "15px", fontWeight: 400, color: isOpen ? COLOR_DARK : COLOR_MID, lineHeight: 1.5, flex: 1 }}>
          {q}
        </span>
        <span
          className="flex-shrink-0 mt-0.5 transition-transform duration-300"
          style={{ fontSize: "20px", color: COLOR_WARM, lineHeight: 1, transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", display: "block" }}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-400 ease-out"
        style={{ maxHeight: isOpen ? "600px" : "0px", opacity: isOpen ? 1 : 0 }}
      >
        <div className="pb-5">
          {a.split("\n\n").map((para, i) => (
            <p key={i} style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", color: COLOR_WARM, lineHeight: 1.8, fontWeight: 300, marginBottom: i < a.split("\n\n").length - 1 ? "12px" : 0 }}>
              {para.split("\n").map((line, j, arr) => (
                <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FaqsPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const toggle = (key: string) => setOpenKey((prev) => (prev === key ? null : key));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const msg = (form.elements.namedItem("message") as HTMLTextAreaElement)?.value || "";
    if (msg.length > 500) return;
    setSubmitting(true);
    const params = new URLSearchParams();
    new FormData(form).forEach((v, k) => params.append(k, v.toString()));
    try {
      await fetch("https://readdy.ai/api/form/d845i5ac1es11hk80nk0", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
    } finally {
      setSubmitted(true);
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "#FFFFFF",
    border: `1px solid ${COLOR_SAND}`,
    borderRadius: "3px",
    padding: "12px 16px",
    fontFamily: FONT_SECONDARY,
    color: COLOR_DARK,
    fontSize: "13px",
    fontWeight: 300,
    width: "100%",
    outline: "none",
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&family=Dancing+Script:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <Navbar forceDark />

      {/* Hero */}
      <section className="pt-32 pb-14" style={{ background: COLOR_CREAM }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", letterSpacing: "0.2em", color: COLOR_WARM, fontWeight: 500, textTransform: "uppercase", marginBottom: "16px" }}>
            Support
          </p>
          <h1 style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 400, color: COLOR_DARK, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
            Frequently Asked Questions
          </h1>
          <p className="mt-4 mx-auto" style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", color: COLOR_WARM, lineHeight: 1.8, fontWeight: 300, maxWidth: "460px" }}>
            Can't find what you're looking for? Reach out and we'll be happy to help.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section style={{ background: COLOR_CREAM, paddingBottom: "100px" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

            {/* Left sticky nav */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-28 space-y-2 pt-2">
                {faqCategories.map((cat) => (
                  <a
                    key={cat.category}
                    href={`#cat-${cat.category.replace(/\s+/g, "-")}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`cat-${cat.category.replace(/\s+/g, "-")}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="block cursor-pointer transition-colors duration-200 hover:opacity-100"
                    style={{ fontFamily: FONT_SECONDARY, fontSize: "12px", fontWeight: 400, color: COLOR_WARM, letterSpacing: "0.04em", textDecoration: "none", padding: "6px 0", lineHeight: 1.5 }}
                  >
                    {cat.category}
                  </a>
                ))}
              </div>
            </div>

            {/* Right: FAQ accordion */}
            <div className="lg:col-span-9 space-y-14">
              {faqCategories.map((cat) => (
                <div key={cat.category} id={`cat-${cat.category.replace(/\s+/g, "-")}`}>
                  <h2
                    className="mb-2"
                    style={{ fontFamily: FONT_PRIMARY, fontSize: "22px", fontWeight: 400, color: COLOR_DARK, letterSpacing: "-0.01em" }}
                  >
                    {cat.category}
                  </h2>
                  <div style={{ borderTop: `1px solid ${COLOR_SAND}` }}>
                    {cat.items.map((item, idx) => (
                      <FaqItem
                        key={idx}
                        q={item.q}
                        a={item.a}
                        isOpen={openKey === `${cat.category}-${idx}`}
                        onToggle={() => toggle(`${cat.category}-${idx}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section style={{ background: "#F0EDE7", padding: "80px 24px" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left */}
            <div>
              <h2 style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 400, color: COLOR_DARK, letterSpacing: "-0.01em", marginBottom: "16px", lineHeight: 1.2 }}>
                Still have questions?
              </h2>
              <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", color: COLOR_WARM, lineHeight: 1.8, fontWeight: 300, maxWidth: "340px" }}>
                We'd love to hear about your event and help bring your vision to life. Send us a message and we'll be in touch within 24 hours.
              </p>
            </div>

            {/* Right: Mini contact form */}
            <div>
              {submitted ? (
                <div className="text-center py-10">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full mx-auto mb-4" style={{ background: COLOR_SAND }}>
                    <i className="ri-check-line text-base" style={{ color: COLOR_MID }} />
                  </div>
                  <p style={{ fontFamily: FONT_PRIMARY, fontSize: "20px", color: COLOR_DARK, fontWeight: 400 }}>Message received!</p>
                  <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", color: COLOR_WARM, fontWeight: 300, marginTop: "6px" }}>We'll be in touch within 24 hours.</p>
                </div>
              ) : (
                <form data-readdy-form id="faq-contact-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={{ display: "block", fontFamily: FONT_SECONDARY, fontSize: "10px", letterSpacing: "0.1em", color: COLOR_MID, textTransform: "uppercase" as const, fontWeight: 500, marginBottom: "8px" }}>Name</label>
                      <input type="text" name="full_name" required placeholder="Your name" style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontFamily: FONT_SECONDARY, fontSize: "10px", letterSpacing: "0.1em", color: COLOR_MID, textTransform: "uppercase" as const, fontWeight: 500, marginBottom: "8px" }}>Email</label>
                      <input type="email" name="email" required placeholder="your@email.com" style={inputStyle}
                        onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                        onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: FONT_SECONDARY, fontSize: "10px", letterSpacing: "0.1em", color: COLOR_MID, textTransform: "uppercase" as const, fontWeight: 500, marginBottom: "8px" }}>Message</label>
                    <textarea name="message" rows={4} maxLength={500} placeholder="What would you like to know?" className="resize-none" style={inputStyle}
                      onChange={(e) => setCharCount(e.target.value.length)}
                      onFocus={(e) => { e.target.style.border = `1px solid ${COLOR_MID}`; }}
                      onBlur={(e) => { e.target.style.border = `1px solid ${COLOR_SAND}`; }} />
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: charCount > 480 ? COLOR_MID : COLOR_SAND, textAlign: "right", marginTop: "4px" }}>{charCount}/500</p>
                  </div>
                  <button type="submit" disabled={submitting || charCount > 500}
                    className="w-full whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                    style={{ height: "48px", background: COLOR_DARK, borderRadius: "3px", color: "#FFFFFF", fontSize: "11px", fontWeight: 600, fontFamily: FONT_SECONDARY, letterSpacing: "0.14em", border: "none" }}>
                    {submitting ? "SENDING..." : "SEND MESSAGE"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <InstagramSection />
      <FooterSection />
    </>
  );
}