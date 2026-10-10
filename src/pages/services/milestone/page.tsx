import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import MilestoneHero from "./components/MilestoneHero";
import SharedSection from "./components/SharedSection";
import TwoWays from "./components/TwoWays";
import ChooseExperience from "./components/ChooseExperience";
import BuiltAround from "./components/BuiltAround";
import { inquiryLink } from "@/pages/enquire/prefill";

function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="py-20" style={{ background: "var(--paper)" }}>
      <div className="container-x flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <Reveal>
          <h2 className="h-section text-[var(--ink)]">
            Your event deserves its own place.
          </h2>
          <p className="mt-2 text-lg text-[var(--slate)]">
            Designed for every celebration.
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <button
              className="btn btn-primary whitespace-nowrap"
              onClick={() => navigate(inquiryLink({ service: "website" }))}
            >
              Start Your Event Website
            </button>
            <button onClick={() => navigate("/build")} className="text-[14px] text-[var(--slate)] underline underline-offset-4 hover:text-[var(--ink)]">
              Or make it yourself →
            </button>
          </div>
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
        <TwoWays />
        <ChooseExperience />
        <CtaStrip />
        <BuiltAround />
      </main>
      <FooterSection />
    </>
  );
}
