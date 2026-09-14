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
          <button
            className="btn btn-primary whitespace-nowrap"
            onClick={() => navigate("/enquire#start")}
          >
            Start Your Event Website
          </button>
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
