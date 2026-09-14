import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import SaveTheDateHero from "./components/SaveTheDateHero";
import ModernWay from "./components/ModernWay";
import DesignedShared from "./components/DesignedShared";
import ReflectYou from "./components/ReflectYou";
import SimpleSteps from "./components/SimpleSteps";

function CtaBanner() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-28" style={{ background: "var(--paper)" }}>
      <div className="container-x text-center">
        <Reveal as="h2" className="h-section text-[var(--ink)]">
          Ready to announce your date?
        </Reveal>
        <Reveal delay={0.06}>
          <button
            className="btn btn-primary mt-8"
            onClick={() => navigate("/enquire#start")}
          >
            Start Your Save the Date
          </button>
        </Reveal>
      </div>
    </section>
  );
}

export default function DigitalSaveTheDate() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <SaveTheDateHero />
        <ModernWay />
        <DesignedShared />
        <ReflectYou />
        <SimpleSteps />
        <CtaBanner />
      </main>
      <FooterSection />
    </>
  );
}
