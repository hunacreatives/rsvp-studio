import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import ServiceCta from "@/components/ServiceCta";
import MilestoneHero from "./components/MilestoneHero";
import SharedSection from "./components/SharedSection";
import ExperienceSection from "./components/ExperienceSection";
import { inquiryLink } from "@/pages/enquire/prefill";

// The closing card every service page ends on (components/ServiceCta).
function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="pb-14 pt-4 sm:pb-20 md:pb-28" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <ServiceCta
          heading="Your event deserves its own place"
          line="An event website designed for your celebration, with RSVPs built in."
          quote={() => navigate(inquiryLink({ service: "website" }))}
          build={() => navigate("/build")}
        />
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
