import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import StationeryHero from "./components/StationeryHero";
import ExploreSuites from "./components/ExploreSuites";

function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="py-20" style={{ background: "var(--warm-white)" }}>
      <div className="container-x flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <Reveal>
          <h2 className="h-section text-[var(--ink)]">
            A suite that feels <span className="text-[var(--slate)]">entirely yours.</span>
          </h2>
          <p className="mt-2 text-lg text-[var(--slate)]">
            Every piece designed, illustrated, and personalised for your celebration.
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <button
            className="btn btn-primary whitespace-nowrap"
            onClick={() => navigate("/enquire#start")}
          >
            Start Your Suite
          </button>
        </Reveal>
      </div>
    </section>
  );
}

export default function StationeryDesign() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <StationeryHero />
        <ExploreSuites />
        <CtaStrip />
      </main>
      <FooterSection />
    </>
  );
}
