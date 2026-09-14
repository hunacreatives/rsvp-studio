import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import ImageBand from "@/pages/home/components/ImageBand";
import ServicesHero from "./components/ServicesHero";
import ServiceRow from "./components/ServiceRow";
import {
  DeviceMockup,
  MonogramMockup,
  DashboardMockup,
  SaveTheDateMockup,
  StationeryMockup,
} from "./components/mockups";

export default function Services() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <ServicesHero />

        <ServiceRow
          id="milestone"
          title="Milestone Events Website"
          subtitle="More than an invitation."
          body="A dedicated website for your celebration — story, schedule, travel, RSVP, and every detail your guests need, in one beautiful link."
          ctaLabel="Explore Our Packages"
          ctaTo="/services/milestone"
          visual={<DeviceMockup />}
        />

        <ServiceRow
          id="monogram"
          title="Monogram Design"
          subtitle="A signature that belongs only to you."
          body="A custom monogram or crest that threads through your invitation, stationery, and website for one cohesive identity."
          ctaLabel="Create Your Monogram"
          ctaTo="/services/monogram"
          reverse
          tone="paper"
          visual={<MonogramMockup />}
        />

        <ServiceRow
          id="save-the-date"
          title="Digital Save the Date"
          subtitle="A first glimpse of what's to come."
          body="An animated digital Save the Date that sets the tone months ahead — your names, palette, and the feeling of the day, ready to share the moment it's done."
          ctaLabel="Explore Save the Dates"
          ctaTo="/services/save-the-date"
          visual={<SaveTheDateMockup />}
        />

        <ServiceRow
          id="stationery"
          title="Stationery Design"
          subtitle="Print-ready pieces that match your suite."
          body="Curated invitation suites — Essential, Signature, and Heirloom — plus à la carte day-of pieces, each designed and illustrated around your story."
          ctaLabel="Explore the Suites"
          ctaTo="/services/stationery"
          reverse
          tone="paper"
          visual={<StationeryMockup />}
        />

        <ServiceRow
          id="rsvp"
          title="RSVP Management"
          subtitle="Seamlessly integrated into your event website."
          body="Track every response, headcount, and meal choice in one dashboard — and export the guest list whenever you need it."
          ctaLabel="Learn More"
          ctaTo="/services/rsvp"
          visual={<DashboardMockup />}
        />

        <ImageBand
          title="Are you an event planner?"
          subtitle="Better experiences begin with better collaborations."
          ctaLabel="Let's Collaborate Together"
          ctaTo="/enquire/partner"
          bg="radial-gradient(120% 120% at 80% 10%, #d9e4f5 0%, #cfd8e6 40%, #b9c0cf 100%)"
        />
      </main>
      <FooterSection />
    </>
  );
}
