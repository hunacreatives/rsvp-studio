import { useState } from "react";
import Navbar from "@/pages/home/components/Navbar";
import AnnouncementBanner from "@/pages/home/components/AnnouncementBanner";
import HeroSection from "@/pages/home/components/HeroSection";
import MilestoneSection from "@/pages/home/components/MilestoneSection";
import MonogramSection from "@/pages/home/components/MonogramSection";
import SaveTheDateSection from "@/pages/home/components/SaveTheDateSection";
import StationerySection from "@/pages/home/components/StationerySection";
import EventDetailsSection from "@/pages/home/components/EventDetailsSection";
import FaqSection from "@/pages/home/components/FaqSection";
import FooterSection from "@/pages/home/components/FooterSection";

export default function Services() {
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&family=Dancing+Script:wght@400;500&display=swap"
        rel="stylesheet"
      />
      {bannerVisible && (
        <AnnouncementBanner onClose={() => setBannerVisible(false)} />
      )}
      <Navbar bannerVisible={bannerVisible} />
      <HeroSection />
      <MilestoneSection />
      <MonogramSection />
      <SaveTheDateSection />
      <StationerySection />
      <EventDetailsSection />
      <FaqSection />
      <FooterSection />
    </>
  );
}