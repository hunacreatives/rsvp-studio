import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import MilestoneHero from "./components/MilestoneHero";
import SharedSection from "./components/SharedSection";
import ExperienceSection from "./components/ExperienceSection";
import { inquiryLink } from "@/pages/enquire/prefill";

// The closing card every service page ends on: one heading, one line, one main action.
function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="pb-14 pt-4 sm:pb-20 md:pb-28" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal className="rounded-[24px] bg-[var(--acc-blue)] px-6 py-11 text-center sm:rounded-[28px] sm:py-14 md:py-20">
          <h2 className="mx-auto max-w-xl font-display font-semibold leading-tight text-white text-balance" style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)" }}>
            Your event deserves its own place
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[16px] text-white/85 text-balance">An event website designed for your celebration, with RSVPs built in.</p>
          <button onClick={() => navigate(inquiryLink({ service: "website" }))} className="btn btn-white mt-7">
            Get a quote
          </button>
          <p className="mt-4 text-[14px] text-white/80">
            Or{" "}
            <button onClick={() => navigate("/build")} className="font-medium text-white underline underline-offset-4">
              make it yourself, free
            </button>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default function MilestoneEventsWebsite() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <MilestoneHero />
        <SharedSection />
        <ExperienceSection />
        <CtaStrip />
      </main>
      <FooterSection />
    </>
  );
}
