import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import MonogramHero from "./components/MonogramHero";
import ThreeWays from "./components/ThreeWays";
import BelongEverywhere from "./components/BelongEverywhere";
import BroughtToLife from "./components/BroughtToLife";

function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="py-20" style={{ background: "var(--paper)" }}>
      <div className="container-x flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <Reveal>
          <h2 className="h-section text-[var(--ink)]">
            Make it unmistakably{" "}
            <span className="text-[var(--slate)]">yours.</span>
          </h2>
          <p className="mt-2 text-lg text-[var(--slate)] max-w-md">
            A custom monogram designed to become part of every detail of your
            celebration.
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <button
            className="btn btn-primary whitespace-nowrap"
            onClick={() => navigate("/enquire#start")}
          >
            Begin Your Monogram
          </button>
        </Reveal>
      </div>
    </section>
  );
}

export default function MonogramDesign() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <MonogramHero />
        <ThreeWays />
        <BelongEverywhere />
        <BroughtToLife />
        <CtaStrip />
      </main>
      <FooterSection />
    </>
  );
}
