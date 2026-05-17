import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/pages/home/components/Navbar";
import AnnouncementBanner from "@/pages/home/components/AnnouncementBanner";
import FooterSection from "@/pages/home/components/FooterSection";
import InstagramSection from "@/pages/home/components/InstagramSection";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_WARM = "#A3968D";

type FilterKey = "ALL" | "MILESTONE EVENTS WEBSITE" | "MONOGRAM" | "DIGITAL SAVE THE DATE" | "ILLUSTRATIONS" | "SKETCHING";

const FILTERS: FilterKey[] = [
  "ALL",
  "MILESTONE EVENTS WEBSITE",
  "MONOGRAM",
  "DIGITAL SAVE THE DATE",
  "ILLUSTRATIONS",
  "SKETCHING",
];

interface WorkItem {
  id: string;
  img: string;
  label: string;
  category: FilterKey[];
}

const workItems: WorkItem[] = [
  {
    id: "w01",
    img: "https://readdy.ai/api/search-image?query=wedding%20stationery%20suite%20flat%20lay%2C%20custom%20illustrated%20portrait%20collage%20on%20cream%20linen%20paper%2C%20elegant%20handwritten%20script%20names%2C%20pressed%20botanical%20elements%2C%20rustic%20romantic%20editorial%20photography%2C%20warm%20neutral%20tones%2C%20portrait%20format&width=550&height=660&seq=fw-01&orientation=portrait",
    label: "Wedding // Stationery",
    category: ["MILESTONE EVENTS WEBSITE"],
  },
  {
    id: "w02",
    img: "https://readdy.ai/api/search-image?query=Chinese%20double%20happiness%20bespoke%20wedding%20invitation%20cards%2C%20deep%20crimson%20red%20velvet%20envelope%2C%20ornate%20floral%20calligraphy%20illustration%2C%20gold%20foil%20letterpress%20printing%2C%20luxurious%20premium%20paper%20stationery%20flat%20lay%2C%20portrait%20format&width=550&height=660&seq=fw-02&orientation=portrait",
    label: "Tinghun // Bespoke Web Design + Stationery + Monogram",
    category: ["MILESTONE EVENTS WEBSITE", "MONOGRAM"],
  },
  {
    id: "w03",
    img: "https://readdy.ai/api/search-image?query=elegant%20wedding%20monogram%20design%2C%20intertwined%20cursive%20initials%20in%20thin%20gold%20line%20art%2C%20oval%20decorative%20frame%2C%20neutral%20taupe%20grey%20background%2C%20minimalist%20luxury%20branding%2C%20close-up%20flat%20lay%2C%20portrait%20format&width=550&height=660&seq=fw-03&orientation=portrait",
    label: "Wedding // Monogram",
    category: ["MONOGRAM"],
  },
  {
    id: "w04",
    img: "https://readdy.ai/api/search-image?query=birthday%20semi-custom%20event%20website%20mockup%20on%20device%20screen%2C%20soft%20pink%20ribbon%20bow%20aesthetic%2C%20pastel%20mint%20and%20blush%20palette%2C%20playful%20celebration%20layout%2C%20confetti%20details%2C%20premium%20digital%20design%20screenshot%2C%20portrait%20format&width=550&height=660&seq=fw-04&orientation=portrait",
    label: "Birthday // Semi Custom Website + Monogram",
    category: ["MILESTONE EVENTS WEBSITE", "MONOGRAM"],
  },
  {
    id: "w05",
    img: "https://readdy.ai/api/search-image?query=illustrated%20wedding%20save%20the%20date%20digital%20invitation%2C%20hand-drawn%20motorbike%20couple%20illustration%20with%20tropical%20Philippine%20church%20landmark%20backdrop%2C%20whimsical%20watercolor%20style%2C%20warm%20golden%20tones%2C%20portrait%20card%20format&width=550&height=660&seq=fw-05&orientation=portrait",
    label: "Wedding // Stationery",
    category: ["MILESTONE EVENTS WEBSITE", "DIGITAL SAVE THE DATE", "ILLUSTRATIONS"],
  },
  {
    id: "w06",
    img: "https://readdy.ai/api/search-image?query=luxury%20personal%20monogram%20embossed%20letterpress%20card%2C%20large%20serif%20SV%20initials%20debossed%20into%20thick%20warm%20cream%20cotton%20paper%2C%20minimal%20elegant%20typography%2C%20close-up%20macro%20photography%2C%20portrait%20format&width=550&height=660&seq=fw-06&orientation=portrait",
    label: "Personal // Monogram",
    category: ["MONOGRAM"],
  },
  {
    id: "w07",
    img: "https://readdy.ai/api/search-image?query=romantic%20wedding%20stationery%20flat%20lay%20with%20monogram%2C%20soft%20blush%20pink%20envelope%20and%20ivory%20card%2C%20illustrated%20dinner%20table%20floral%20wreath%2C%20elegant%20serif%20typography%20couple%20names%20Ralph%20and%20Mia%2C%20warm%20candlelight%20photography%2C%20portrait%20format&width=550&height=660&seq=fw-07&orientation=portrait",
    label: "Wedding // Stationery + Monogram",
    category: ["MILESTONE EVENTS WEBSITE", "MONOGRAM"],
  },
  {
    id: "w08",
    img: "https://readdy.ai/api/search-image?query=ornate%20wedding%20stationery%20crest%20illustration%2C%20hand-painted%20watercolor%20floral%20crest%20with%20roses%20hydrangeas%20and%20ribbons%20in%20soft%20pinks%20and%20sage%20greens%2C%20formal%20venue%20sketch%20in%20center%2C%20luxury%20monogram%20seal%2C%20portrait%20format&width=550&height=660&seq=fw-08&orientation=portrait",
    label: "Wedding // Stationery Crest",
    category: ["ILLUSTRATIONS", "SKETCHING"],
  },
  {
    id: "w09",
    img: "https://readdy.ai/api/search-image?query=digital%20save%20the%20date%20animation%20mockup%2C%20elegant%20minimalist%20motion%20design%2C%20serif%20typography%20on%20warm%20cream%20background%2C%20delicate%20botanical%20line%20art%2C%20modern%20wedding%20digital%20invite%20screenshot%2C%20portrait%20format&width=550&height=660&seq=fw-09&orientation=portrait",
    label: "Wedding // Digital Save the Date",
    category: ["DIGITAL SAVE THE DATE"],
  },
  {
    id: "w10",
    img: "https://readdy.ai/api/search-image?query=custom%20illustrated%20wedding%20venue%20sketch%2C%20detailed%20pencil%20and%20watercolor%20drawing%20of%20a%20grand%20stone%20chapel%20surrounded%20by%20gardens%2C%20warm%20sepia%20tones%2C%20architectural%20illustration%20style%2C%20portrait%20format&width=550&height=660&seq=fw-10&orientation=portrait",
    label: "Wedding // Venue Illustration",
    category: ["ILLUSTRATIONS", "SKETCHING"],
  },
  {
    id: "w11",
    img: "https://readdy.ai/api/search-image?query=baby%20shower%20milestone%20event%20website%20mockup%2C%20soft%20sage%20botanical%20theme%2C%20gender%20neutral%20warm%20linen%20palette%2C%20elegant%20hand-lettered%20invite%20style%2C%20premium%20digital%20event%20design%20screenshot%2C%20portrait%20format&width=550&height=660&seq=fw-11&orientation=portrait",
    label: "Baby Shower // Milestone Events Website",
    category: ["MILESTONE EVENTS WEBSITE"],
  },
  {
    id: "w12",
    img: "https://readdy.ai/api/search-image?query=bridal%20shower%20stationery%20flat%20lay%2C%20pastel%20lilac%20and%20gold%20foil%20details%2C%20botanical%20pressed%20flower%20decoration%2C%20elegant%20calligraphy%20script%20names%2C%20premium%20paper%20suite%2C%20airy%20editorial%20photography%2C%20portrait%20format&width=550&height=660&seq=fw-12&orientation=portrait",
    label: "Bridal Shower // Stationery",
    category: ["MILESTONE EVENTS WEBSITE", "DIGITAL SAVE THE DATE"],
  },
];

export default function PortfolioPage() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = activeFilter === "ALL"
    ? workItems
    : workItems.filter((item) => item.category.includes(activeFilter));

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      {bannerVisible && <AnnouncementBanner onClose={() => setBannerVisible(false)} />}
      <Navbar forceDark bannerVisible={bannerVisible} />

      <main
        style={{
          background: "#FFFFFF",
          minHeight: "100vh",
          paddingTop: bannerVisible ? "140px" : "100px",
        }}
      >
        {/* ── Page header ── */}
        <div className="text-center" style={{ paddingTop: "56px", paddingBottom: "40px" }}>
          <h1
            style={{
              fontFamily: FONT_PRIMARY,
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 400,
              color: COLOR_DARK,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              marginBottom: "20px",
            }}
          >
            Featured Work
          </h1>
          <p
            style={{
              fontFamily: FONT_SECONDARY,
              fontSize: "14px",
              fontWeight: 300,
              color: COLOR_MID,
              lineHeight: 1.75,
            }}
          >
            Bespoke wedding websites, stationery, and event designs,
            <br />
            thoughtfully crafted with intention, refinement, and exceptional attention to detail.
          </p>
        </div>

        {/* ── Filter tabs ── */}
        <div
          className="flex items-center justify-center flex-wrap"
          style={{
            gap: "0",
            borderBottom: "1px solid #E8E4DE",
            marginBottom: "48px",
            paddingBottom: "0",
            paddingLeft: "24px",
            paddingRight: "24px",
          }}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="whitespace-nowrap cursor-pointer"
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "11px",
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: "0.08em",
                  color: isActive ? COLOR_DARK : COLOR_WARM,
                  background: "none",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${COLOR_DARK}` : "2px solid transparent",
                  padding: "12px 24px 14px",
                  cursor: "pointer",
                  transition: "color 0.2s, border-color 0.2s",
                  marginBottom: "-1px",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* ── 4-column grid ── */}
        <div
          style={{
            maxWidth: "1120px",
            margin: "0 auto",
            padding: "0 clamp(20px, 4vw, 48px) 100px",
          }}
        >
          {filtered.length === 0 && (
            <div className="text-center py-24">
              <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", color: COLOR_WARM, fontWeight: 300 }}>
                No work in this category yet.
              </p>
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "clamp(12px, 2vw, 24px)",
            }}
          >
            {filtered.map((item) => (
              <div key={item.id} className="cursor-pointer">
                {/* Image */}
                <div
                  className="overflow-hidden w-full"
                  style={{ aspectRatio: "5/6", borderRadius: "2px", background: "#F0EDE7" }}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    className="w-full h-full object-cover object-top"
                    style={{
                      transform: hovered === item.id ? "scale(1.04)" : "scale(1)",
                      transition: "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      display: "block",
                    }}
                  />
                </div>
                {/* Label */}
                <p
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "12px",
                    fontWeight: 300,
                    color: COLOR_MID,
                    marginTop: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <InstagramSection />
      <FooterSection />
    </>
  );
}