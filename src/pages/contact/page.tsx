import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import { CharacterTrio } from "@/components/CharacterLoader";
import { ContactRows } from "@/components/ChatLinks";
import { ContactForm } from "@/pages/faqs/page";
import { inquiryLink } from "@/pages/enquire/prefill";
import { SUPPORT } from "@/pages/account/portal/help-data";
import "./contact.css";

// /contact: every way to reach us, in the site's own look. Our three characters say hello,
// the three reasons people get in touch sit in Mesa's coloured tiles, then chat and the
// message form. Kept short: people come here to reach us, not to read.

const WAYS = [
  {
    tint: "sky",
    icon: "ri-sparkling-2-line",
    title: "Have us make it",
    body: "Tell us about your event and we’ll design it with you. Custom websites from ₱8,000.",
    to: "/enquire#start",
    cta: "Start an enquiry",
  },
  {
    tint: "sun",
    icon: "ri-quill-pen-line",
    title: "Stuck building your own?",
    body: "Send us what you have and we’ll finish it for you, or sort out what’s in the way.",
    to: inquiryLink({ service: "website", design: "custom", from: "Stuck building their own site (Contact page)" }),
    cta: "Have us finish it",
  },
  {
    tint: "coral",
    icon: "ri-customer-service-2-line",
    title: "Your account or a payment",
    body: "Signed in? Message us from Help & Support and it stays with your event.",
    to: "/account/help/contact",
    cta: "Open Help & Support",
  },
];

export default function ContactPage() {
  // "Your account or a payment": signed in, Help & Support (it stays with their event);
  // signed out, the message form further down this page.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  const ways = WAYS.map((w) =>
    w.to === "/account/help/contact" && !signedIn
      ? { ...w, to: "#say-hello", body: "Tell us what’s going on in the message form below, and include the email you signed up with.", cta: "Write to us" }
      : w,
  );
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <section className="relative overflow-hidden pb-8 pt-12 md:pb-10 md:pt-16" style={{ background: "var(--warm-white)" }}>
          <div className="container-x relative z-10 mx-auto max-w-2xl text-center">
            <h1 className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)" }}>
              Talk to us.
            </h1>
            <p className="mt-3 text-[var(--slate)]">A real person replies {SUPPORT.responseTime.toLowerCase()}, Monday to&nbsp;Friday.</p>
            <CharacterTrio className="ct-trio mx-auto mt-6" />
          </div>
        </section>

        <section className="pb-12 md:pb-16" style={{ background: "var(--warm-white)" }}>
          <div className="container-x">
            <div className="ct-ways mx-auto max-w-[1000px]">
              {ways.map((w, i) => (
                <Reveal key={w.title} delay={i * 0.06}>
                  {w.to.startsWith("#") ? (
                    <a
                      href={w.to}
                      className={`ct-way ${w.tint}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(w.to.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className={`ct-icon ${w.tint}`} aria-hidden>
                        <i className={w.icon} />
                      </span>
                      <span className="ct-way-title">{w.title}</span>
                      <span className="ct-way-body">{w.body}</span>
                      <span className="ct-way-cta">
                        {w.cta} <i className="ri-arrow-right-line" aria-hidden />
                      </span>
                    </a>
                  ) : (
                    <Link to={w.to} className={`ct-way ${w.tint}`}>
                      <span className={`ct-icon ${w.tint}`} aria-hidden>
                        <i className={w.icon} />
                      </span>
                      <span className="ct-way-title">{w.title}</span>
                      <span className="ct-way-body">{w.body}</span>
                      <span className="ct-way-cta">
                        {w.cta} <i className="ri-arrow-right-line" aria-hidden />
                      </span>
                    </Link>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="say-hello" className="scroll-mt-24 py-12 md:py-16" style={{ background: "var(--paper)" }}>
          <div className="container-x">
            <div className="mx-auto grid max-w-[1000px] items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
              <Reveal>
                <h2 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)] md:text-[2rem]">Or just say hello</h2>
                <p className="mt-2 max-w-sm text-[var(--slate)]">A question about a design, a date, or anything&nbsp;else.</p>
                <div className="mt-5 max-w-md">
                  <ContactRows email={SUPPORT.email} />
                </div>
                <p className="mt-4 text-[14px] text-[var(--slate)]">{SUPPORT.base}</p>
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
