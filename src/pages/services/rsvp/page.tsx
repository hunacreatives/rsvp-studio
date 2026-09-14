import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import RsvpHero from "./components/RsvpHero";
import BuiltToSimplify from "./components/BuiltToSimplify";
import LessTime from "./components/LessTime";
import SeamlessExperience from "./components/SeamlessExperience";

function CtaStrip() {
  const navigate = useNavigate();
  return (
    <section className="py-20" style={{ background: "var(--warm-white)" }}>
      <div className="container-x flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <Reveal>
          <h2 className="h-section text-[var(--ink)]">
            Every reply, <span className="text-[var(--slate)]">in one place.</span>
          </h2>
          <p className="mt-2 text-lg text-[var(--slate)]">
            RSVP Management comes built into every RSVP Studio event website.
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

export default function RsvpManagement() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <RsvpHero />
        <BuiltToSimplify />
        <LessTime />
        <SeamlessExperience />
        <CtaStrip />
      </main>
      <FooterSection />
    </>
  );
}
