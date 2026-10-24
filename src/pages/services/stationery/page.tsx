import { useNavigate } from "react-router-dom";
import ServiceCta from "@/components/ServiceCta";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import StationeryHero from "./components/StationeryHero";
import ExploreSuites from "./components/ExploreSuites";
import { inquiryLink } from "@/pages/enquire/prefill";

function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="pb-14 pt-4 sm:pb-20 md:pb-28" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <ServiceCta
          heading={
            <>
              A suite that feels <span className="italic text-[#e3c98a]">entirely yours.</span>
            </>
          }
          line="Every piece designed, illustrated, and personalised for your celebration."
          quote={() => navigate(inquiryLink({ service: "stationery" }))}
          quoteLabel="Start your suite"
        />
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
