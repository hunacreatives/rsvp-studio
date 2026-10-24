import { Link, useNavigate } from "react-router-dom";
import ServiceCta from "@/components/ServiceCta";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import SeatingArt from "@/pages/home/components/SeatingArt";
import { Reveal } from "@/lib/Reveal";
import { FAQ_CATEGORIES } from "@/pages/faqs/faq-data";
import { inquiryLink } from "@/pages/enquire/prefill";
import RsvpHero from "./components/RsvpHero";
import Walkthrough from "./components/Walkthrough";
import Included from "./components/Included";
import "./rsvp.css";

/** Mesa, the next thing hosts need once the replies are in (same band as Build Your Website). */
function MesaBand() {
  return (
    <section className="py-12 sm:py-16 md:py-24" style={{ background: "#fff6dc" }}>
      <div className="container-x grid items-center gap-y-7 [grid-template-areas:'text'_'visual'_'actions'] md:grid-cols-[0.9fr_1.1fr] md:gap-x-14 md:gap-y-6 md:[grid-template-areas:'text_visual'_'actions_visual']">
        <div className="text-center [grid-area:text] md:self-end md:text-left">
          <p className="eyebrow">Mesa · free seating charts</p>
          <h2 className="mt-3 font-display text-[1.8rem] font-semibold leading-tight text-[var(--ink)] md:text-[2.2rem] text-balance">Then seat everyone with Mesa</h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--slate)] sm:text-[16px] md:mx-0" style={{ textWrap: "pretty" }}>
            Paste your guest list and Mesa seats every family, sponsor and barkada at the right table. Print the plan, or let guests find their table on your website.
          </p>
        </div>
        <Link to="/tools/seating-chart-maker" className="block [grid-area:visual]" aria-label="Open Mesa">
          <SeatingArt className="mx-auto block aspect-[8/7] w-full max-w-[340px] rounded-[20px] md:hidden" />
          <span className="hidden overflow-hidden rounded-[20px] border-[8px] border-[#111] bg-[#111] shadow-[0_40px_80px_-40px_rgba(0,7,39,0.45)] md:block">
            <img src="/tools/mesa/editor-1440.webp" alt="Mesa’s editor with every guest seated" loading="lazy" className="block aspect-[16/10] w-full rounded-[10px] object-cover object-left-top" />
          </span>
        </Link>
        <div className="flex justify-center gap-3 [grid-area:actions] md:self-start md:justify-start">
          <Link to="/tools/seating-chart-maker" className="btn btn-primary">
            Open Mesa
          </Link>
          <Link to="/tools/seating-chart-maker#how" className="btn btn-ghost">
            <span className="sm:hidden">How it works</span>
            <span className="hidden sm:inline">See how it works</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Questions() {
  const faqs = (FAQ_CATEGORIES.find((c) => c.slug === "rsvp")?.items ?? []).slice(0, 5);
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
        <Link to="/faqs#rsvp" className="font-medium text-[var(--ink)] underline underline-offset-4">
          FAQ
        </Link>
      </p>
    </section>
  );
}

/** Rather we handle it? A Custom website includes us following up with your guests. */
function CustomCta() {
  const navigate = useNavigate();
  return (
    <section className="container-x pb-14 sm:pb-20 md:pb-28">
      <ServiceCta
        heading="Rather we chase the replies?"
        line="With a Custom website, we follow up with your guests and send you the headcount. Custom websites from ₱8,000."
        quote={() => navigate(inquiryLink({ service: "website", design: "custom" }))}
      />
    </section>
  );
}

export default function RsvpManagement() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main style={{ background: "var(--warm-white)" }}>
        <RsvpHero />
        <Walkthrough />
        <Included />
        <MesaBand />
        <Questions />
        <CustomCta />
      </main>
      <FooterSection />
    </>
  );
}
