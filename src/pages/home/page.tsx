import { useState } from "react";
import Navbar from "./components/Navbar";
import AnnouncementBanner from "./components/AnnouncementBanner";
import HomeHeroSection from "./components/HomeHeroSection";
import HomeServicesPreview from "./components/HomeServicesPreview";
import HomePortfolioTeaser from "./components/HomePortfolioTeaser";
import HomeCtaSection from "./components/HomeCtaSection";
import InstagramSection from "./components/InstagramSection";
import FooterSection from "./components/FooterSection";

export default function Home() {
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
      <HomeHeroSection />
      <HomeServicesPreview />
      <HomePortfolioTeaser />
      <HomeCtaSection />
      <InstagramSection />
      <FooterSection />
    </>
  );
}