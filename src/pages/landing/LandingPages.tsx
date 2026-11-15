import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import ServiceCta from "@/components/ServiceCta";
import { inquiryLink } from "@/pages/enquire/prefill";
import { CHRISTENING, DEBUT, PRICING, type Faq, type Landing } from "../../../api/_lib/landing-copy";

// /debut-invitation-website, /christening-invitation-website and /pricing (SEO batch 2, Nov 2026).
// The words live in api/_lib/landing-copy.ts, which the server also puts in the HTML.

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main style={{ background: "var(--warm-white)" }}>{children}</main>
      <FooterSection />
    </>
  );
}

function Hero({ eyebrow, h1, answer, detail, children }: { eyebrow: string; h1: string; answer: string; detail?: string; children?: React.ReactNode }) {
  return (
    <section className="container-x pb-10 pt-12 text-center sm:pb-14 sm:pt-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mx-auto mt-3 max-w-3xl font-display text-[clamp(1.8rem,6vw,2.9rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-[var(--ink)] text-balance">{h1}</h1>
      <p className="mx-auto mt-4 max-w-[38rem] text-[16px] leading-relaxed text-[var(--slate)] text-pretty md:text-[17px]">{answer}</p>
      {detail ? <p className="mt-4 text-[14px] font-medium text-[var(--ink)]">{detail}</p> : null}
      {children}
    </section>
  );
}

function FaqList({ items }: { items: Faq[] }) {
  return (
    <section className="container-x py-12 sm:py-16">
      <h2 className="text-center font-display text-[1.7rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">Questions</h2>
      <div className="mx-auto mt-6 max-w-2xl border-t border-[var(--line)]">
        {items.map(([q, a]) => (
          <FaqItem key={q} q={q} a={a} />
        ))}
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-[var(--line)]">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={id} className="flex w-full items-start justify-between gap-6 py-5 text-left">
        <span className="font-display text-[17px] leading-snug text-[var(--ink)] text-pretty">{q}</span>
        <i className={`ri-add-line mt-1 shrink-0 text-xl leading-none text-[var(--slate)] transition-transform ${open ? "rotate-45" : ""}`} aria-hidden />
      </button>
      {open ? (
        <p id={id} className="pb-6 text-[15px] leading-relaxed text-[var(--slate)]">
          {a}
        </p>
      ) : null}
    </div>
  );
}

function Cta({ heading, line, occasion }: { heading: string; line: string; occasion?: string }) {
  const navigate = useNavigate();
  return (
    <section className="pb-14 pt-4 sm:pb-20 md:pb-28" style={{ background: "var(--paper)" }}>
      <div className="container-x pt-10">
        <ServiceCta heading={heading} line={line} quote={() => navigate(inquiryLink({ service: "website", occasion }))} build={() => navigate("/build")} />
      </div>
    </section>
  );
}

function OccasionPage({ page }: { page: Landing }) {
  const navigate = useNavigate();
  return (
    <Shell>
      <Hero eyebrow={page.eyebrow} h1={page.h1} answer={page.answer} detail={page.priceLine}>
        <div className="mt-7 flex flex-col items-center justify-center gap-x-7 gap-y-3 sm:flex-row">
          <button className="btn btn-primary w-full max-w-[280px] sm:w-auto" onClick={() => navigate(inquiryLink({ service: "website", occasion: page.occasion }))}>
            Get a quote
          </button>
          <Link to="/build" className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]">
            <span className="underline-offset-[5px] group-hover:underline">Make it yourself, free</span>
            <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </Hero>

      {/* The designs, each opening its live preview. */}
      <section className="container-x pb-12 sm:pb-16">
        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          {page.designs.map((d) => (
            <Link key={d.id} to={`/build/preview/${d.id}`} className="group block">
              <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-white">
                <img src={`/event-templates/cards/${d.id}.webp`} alt={`${d.label} design`} loading="lazy" className="aspect-[4/3] w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" />
              </div>
              <p className="mt-3 font-display text-[18px] font-semibold text-[var(--ink)]">{d.label}</p>
              <p className="text-[14px] text-[var(--slate)]">{d.note}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[14px] font-medium text-[var(--ink)]">
                <span className="underline-offset-4 group-hover:underline">Preview the design</span>
                <i className="ri-arrow-right-line" aria-hidden />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-12 sm:py-16" style={{ background: "var(--paper)" }}>
        <div className="container-x">
          <h2 className="text-center font-display text-[1.7rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">What goes on the site</h2>
          <dl className="mx-auto mt-8 grid max-w-4xl gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {page.features.map(([t, d]) => (
              <div key={t}>
                <dt className="text-[16px] font-semibold text-[var(--ink)]">{t}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-[var(--slate)]">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <FaqList items={page.faq} />
      <p className="container-x -mt-6 pb-12 text-center text-[14px] text-[var(--slate)]">
        All prices are on our <Link to="/pricing" className="font-medium text-[var(--ink)] underline underline-offset-4">pricing page</Link>.
      </p>
      <Cta heading={page.cta.heading} line={page.cta.line} occasion={page.occasion} />
    </Shell>
  );
}

export function DebutPage() {
  return <OccasionPage page={DEBUT} />;
}
export function ChristeningPage() {
  return <OccasionPage page={CHRISTENING} />;
}

export function PricingPage() {
  return (
    <Shell>
      <Hero eyebrow={PRICING.eyebrow} h1={PRICING.h1} answer={PRICING.answer} />
      <section className="container-x pb-6">
        <div className="mx-auto max-w-3xl space-y-10">
          {PRICING.groups.map((g) => (
            <div key={g.heading}>
              <h2 className="font-display text-[1.35rem] font-semibold text-[var(--ink)]">{g.heading}</h2>
              <ul className="mt-3 divide-y divide-[var(--line)] rounded-[18px] border border-[var(--line)] bg-white px-5">
                {g.rows.map((r) => (
                  <li key={r.name}>
                    <Link to={r.href} className="group flex items-start gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-semibold text-[var(--ink)] underline-offset-4 group-hover:underline">{r.name}</p>
                        <p className="mt-0.5 text-[14px] leading-relaxed text-[var(--slate)]">{r.detail}</p>
                      </div>
                      <p className="shrink-0 text-right text-[16px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{r.price}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <FaqList items={PRICING.faq} />
      <Cta heading="Tell us about your celebration" line="We reply within 1 business day with a timeline and an exact price." />
    </Shell>
  );
}
