import AnnouncementBar from "./components/AnnouncementBar";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ValueProps from "./components/ValueProps";
import IncludedGrid from "./components/IncludedGrid";
import ImageBand from "./components/ImageBand";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import QuestionsAnswered from "./components/QuestionsAnswered";
import InstagramStrip from "./components/InstagramStrip";
import FooterSection from "./components/FooterSection";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <ValueProps />
        <IncludedGrid />
        <ImageBand
          title={
            <>
              Thoughtfully Designed{" "}
              <br className="hidden sm:inline" />
              Event Experiences
            </>
          }
          subtitle="Elevated digital experiences for life's most meaningful milestones."
          ctaLabel="Explore More of Our Services"
          ctaTo="/services"
          image="/home/band-balloons.webp"
          blur={8}
        />
        <HowItWorks />
        <Testimonials />
        <ImageBand
          title={
            <>
              Are you an event planner{" "}
              <br className="hidden sm:inline" />
              or influencer?
            </>
          }
          subtitle={"Better experiences begin with better\u00a0collaborations."}
          ctaLabel="I'm a planner"
          ctaTo="/partners"
          secondCta={{ label: "I'm a creator", to: "/partners?type=creator" }}
          image="/home/band-flatlay.webp"
        />
        <QuestionsAnswered />
        <InstagramStrip />
      </main>
      <FooterSection />
    </>
  );
}
