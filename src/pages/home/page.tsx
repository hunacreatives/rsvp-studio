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
              Your celebration is{" "}
              <br className="hidden sm:inline" />
              our celebration, too.
            </>
          }
          subtitle={
            <>
              We design your event website with you, <br />
              or you build your own in&nbsp;minutes.
            </>
          }
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
              Work with couples?{" "}
              <br className="hidden sm:inline" />
              Work with us.
            </>
          }
          subtitle={
            <>
              {/* Each sentence on its own line(s), each balanced. */}
              <span className="block text-balance">Coordinators run their clients’ events here&nbsp;free.</span>
              <span className="block text-balance">Creators earn up to 20% from the couples they&nbsp;send.</span>
            </>
          }
          ctaLabel="Coordinators"
          ctaTo="/partners"
          secondCta={{ label: "Creators", to: "/partners?type=creator" }}
          image="/home/band-flatlay.webp"
        />
        <QuestionsAnswered />
        <InstagramStrip />
      </main>
      <FooterSection />
    </>
  );
}
