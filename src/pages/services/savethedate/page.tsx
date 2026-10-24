import { Link, useNavigate } from "react-router-dom";
import ServiceCta from "@/components/ServiceCta";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import { FAQ_CATEGORIES } from "@/pages/faqs/faq-data";
import { inquiryLink } from "@/pages/enquire/prefill";
import SaveTheDateHero from "./components/SaveTheDateHero";
import Designs from "./components/Designs";
import HowItWorks from "./components/HowItWorks";
import "./std.css";

// Prices and timings match the FAQ (src/pages/faqs/faq-data.ts, "Booking & Process").
const SPECS: [string, string, string, string][] = [
  ["Still, from ₱1,500", "A JPEG, a PDF and your link.", "ri-image-line", "sky"],
  ["Animated, from ₱2,500", "A short video, playing on your link.", "ri-movie-2-line", "pink"],
  ["Your own link", "Add to calendar, a countdown, and guests ask for the invitation.", "ri-link", "lilac"],
  ["Ready in 3–5 business days", "Need it sooner? Rush takes about half the time, for a 30% fee.", "ri-time-line", "sun"],
];

function WhatYouGet() {
  return (
    <section className="py-16 md:py-28" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal className="text-center">
          <h2 className="font-display font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
            What you get
          </h2>
        </Reveal>
        <dl className="std-specs mx-auto mt-8 max-w-[1000px] sm:mt-10">
          {SPECS.map(([h, p, icon, tint], i) => (
            <Reveal key={h} delay={i * 0.05} className={`std-spec ${tint}`}>
              <span className={`std-icon ${tint}`} aria-hidden>
                <i className={icon} />
              </span>
              <dt>{h}</dt>
              <dd>{p}</dd>
            </Reveal>
          ))}
        </dl>
        <p className="mx-auto mt-8 max-w-2xl text-center text-[15px] leading-relaxed text-[var(--slate)] sm:text-[16px]" style={{ textWrap: "pretty" }}>
          Want the invitation and website in the same look?{" "}
          <Link to="/services/milestone" className="font-medium text-[var(--ink)] underline underline-offset-4">
            See event websites
          </Link>
        </p>
      </div>
    </section>
  );
}

function Questions() {
  const booking = FAQ_CATEGORIES.find((c) => c.slug === "booking")?.items ?? [];
  const pick = ["How much do Save the Dates and RSVP management cost?", "How long does it take?", "How do we get started?", "What payment methods do you accept?"];
  const faqs = pick.map((q) => booking.find((f) => f.q === q)).filter((f): f is NonNullable<typeof f> => Boolean(f));
  if (!faqs.length) return null;
  return (
    <section className="container-x py-12 sm:py-16 md:py-24">
      <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">Questions</h2>
      <div className="mx-auto mt-8 max-w-2xl divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {faqs.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-medium text-[var(--ink)]">
              {f.q}
              <i className="ri-add-line text-[20px] text-[var(--slate)] transition-transform group-open:rotate-45" aria-hidden />
            </summary>
            <p className="whitespace-pre-line pb-5 text-[15px] leading-relaxed text-[var(--slate)]">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-center text-[14px] text-[var(--slate)]">
        More in the{" "}
        <Link to="/faqs" className="font-medium text-[var(--ink)] underline underline-offset-4">
          FAQ
        </Link>
      </p>
    </section>
  );
}

function Cta() {
  const navigate = useNavigate();
  return (
    <section className="container-x pb-14 sm:pb-20 md:pb-28">
      <ServiceCta
        heading="Ready to announce your date?"
        line="Tell us about your celebration and we’ll send you a quote."
        quote={() => navigate(inquiryLink({ service: "save-the-date" }))}
      />
    </section>
  );
}

export default function DigitalSaveTheDate() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main style={{ background: "var(--warm-white)" }}>
        <SaveTheDateHero />
        <Designs />
        <HowItWorks />
        <WhatYouGet />
        <Questions />
        <Cta />
      </main>
      <FooterSection />
    </>
  );
}
