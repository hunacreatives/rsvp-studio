import { useNavigate } from "react-router-dom";
import ServiceCta from "@/components/ServiceCta";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import MonogramHero from "./components/MonogramHero";
import ThreeWays from "./components/ThreeWays";
import BelongEverywhere from "./components/BelongEverywhere";
import BroughtToLife from "./components/BroughtToLife";
import { inquiryLink } from "@/pages/enquire/prefill";

function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="pb-14 pt-4 sm:pb-20 md:pb-28" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <ServiceCta
          heading={
            <>
              Make it unmistakably <span className="italic text-[#e3c98a]">yours.</span>
            </>
          }
          line="A custom monogram designed to become part of every detail of your celebration."
          quote={() => navigate(inquiryLink({ service: "monogram" }))}
          quoteLabel="Begin your monogram"
        />
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
