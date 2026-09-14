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
              Thoughtfully Designed
              <br className="hidden sm:inline" />
              Event Experiences
            </>
          }
          subtitle="Elevated digital experiences for life's most meaningful milestones."
          ctaLabel="Explore More of Our Services"
          ctaTo="/services"
          bg="radial-gradient(120% 120% at 20% 10%, #f7d9c9 0%, #e9c4cf 45%, #cdb4d8 100%)"
        />
        <HowItWorks />
        <Testimonials />
        <ImageBand
          title="Are you an event planner?"
          subtitle="Better experiences begin with better collaborations."
          ctaLabel="Let's Collaborate Together"
          ctaTo="/enquire/partner"
          bg="radial-gradient(120% 120% at 80% 10%, #d9e4f5 0%, #cfd8e6 40%, #b9c0cf 100%)"
        />
        <QuestionsAnswered />
        <InstagramStrip />
      </main>
      <FooterSection />
    </>
  );
}
