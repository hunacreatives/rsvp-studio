import { useState, useCallback } from "react";
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
const COLOR_SAND = "#DFDACF";
const COLOR_CREAM = "#FAF8F5";

// ── Carousel data ──────────────────────────────────────────
const carouselCouples = [
  {
    coupleName: "Clara & Étienne",
    collection: "Garden (Homepage)",
    img: "https://readdy.ai/api/search-image?query=garden%20wedding%20website%20homepage%20mockup%2C%20lush%20botanical%20illustrations%2C%20soft%20sage%20green%20and%20warm%20cream%20color%20palette%2C%20romantic%20floral%20watercolor%20elements%2C%20elegant%20script%20typography%2C%20premium%20digital%20event%20website%2C%20fresh%20botanical%20border%2C%20editorial%20flat%20lay%2C%20light%20airy%20background&width=600&height=780&seq=car-garden-01&orientation=portrait",
  },
  {
    coupleName: "Sofia & Luca",
    collection: "Alpine (Homepage)",
    img: "https://readdy.ai/api/search-image?query=alpine%20winter%20wedding%20website%20homepage%20mockup%2C%20crisp%20white%20and%20ice%20blue%20palette%2C%20mountain%20inspired%20clean%20typography%2C%20frosted%20botanical%20elements%2C%20premium%20digital%20event%20website%2C%20soft%20neutral%20editorial%20layout%2C%20snowy%20atmosphere&width=600&height=780&seq=car-alpine-01&orientation=portrait",
  },
  {
    coupleName: "Mia & Noah",
    collection: "Coastal (Homepage)",
    img: "https://readdy.ai/api/search-image?query=coastal%20beach%20wedding%20website%20homepage%20mockup%2C%20sandy%20beige%20and%20soft%20ocean%20blue%20palette%2C%20breezy%20nautical%20watercolor%20seashells%2C%20light%20airy%20typography%2C%20sun-bleached%20linen%20texture%2C%20premium%20digital%20event%20website%2C%20minimal%20editorial%20layout&width=600&height=780&seq=car-coastal-01&orientation=portrait",
  },
  {
    coupleName: "Isabella & James",
    collection: "Classic Elegance (Homepage)",
    img: "https://readdy.ai/api/search-image?query=classic%20elegant%20wedding%20website%20homepage%20mockup%2C%20ivory%20and%20champagne%20gold%20palette%2C%20luxury%20serif%20typography%2C%20ornate%20decorative%20borders%2C%20timeless%20romance%20aesthetic%2C%20warm%20candlelight%20tones%2C%20refined%20traditional%20layout%2C%20cream%20background&width=600&height=780&seq=car-classic-01&orientation=portrait",
  },
  {
    coupleName: "Camille & Rafael",
    collection: "Tropical (Homepage)",
    img: "https://readdy.ai/api/search-image?query=tropical%20wedding%20website%20homepage%20mockup%2C%20lush%20palm%20leaves%20foliage%20illustration%2C%20warm%20terracotta%20and%20deep%20green%20palette%2C%20vibrant%20botanical%20design%2C%20festive%20event%20website%2C%20rich%20earthy%20editorial%20photography%2C%20tropical%20floral%20elements%2C%20warm%20golden%20light&width=600&height=780&seq=car-tropical-01&orientation=portrait",
  },
  {
    coupleName: "Aria & Daniel",
    collection: "Modern Minimal (Homepage)",
    img: "https://readdy.ai/api/search-image?query=modern%20minimal%20wedding%20website%20homepage%20mockup%2C%20stark%20white%20background%20with%20charcoal%20typography%2C%20editorial%20magazine%20layout%2C%20bold%20clean%20lines%2C%20sophisticated%20contemporary%20design%2C%20negative%20space%20composition%2C%20monochrome%20accent%20details%2C%20premium%20digital%20invitation&width=600&height=780&seq=car-modern-01&orientation=portrait",
  },
];

function CollectionsCarousel() {
  const [active, setActive] = useState(0);
  const total = carouselCouples.length;

  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  const getIdx = (offset: number) => (active + offset + total) % total;
  const prevItem = carouselCouples[getIdx(-1)];
  const activeItem = carouselCouples[active];
  const nextItem = carouselCouples[getIdx(1)];

  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: "520px", userSelect: "none" }}>
      {/* Left arrow */}
      <button
        onClick={prev}
        className="absolute cursor-pointer transition-opacity duration-200 hover:opacity-50 z-10 w-10 h-10 flex items-center justify-center"
        style={{ left: "clamp(12px, 4vw, 56px)", top: "40%", transform: "translateY(-50%)", background: "none", border: "none", color: COLOR_MID }}
        aria-label="Previous"
      >
        <i className="ri-arrow-left-s-line" style={{ fontSize: "24px" }} />
      </button>

      {/* Cards row */}
      <div className="flex items-end justify-center gap-4" style={{ width: "100%", maxWidth: "1080px", padding: "0 80px" }}>
        {/* Left — smaller, faded */}
        <div
          className="cursor-pointer flex-shrink-0 transition-all duration-500"
          style={{ width: "clamp(160px, 20vw, 260px)", opacity: 0.55 }}
          onClick={prev}
        >
          <div className="overflow-hidden w-full" style={{ borderRadius: "3px", aspectRatio: "3/4", background: COLOR_SAND }}>
            <img src={prevItem.img} alt={prevItem.coupleName} className="w-full h-full object-cover object-top" />
          </div>
        </div>

        {/* Center — taller, full opacity */}
        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: "clamp(200px, 26vw, 320px)" }}>
          <div className="overflow-hidden w-full" style={{ borderRadius: "3px", aspectRatio: "3/4", background: COLOR_SAND }}>
            <img src={activeItem.img} alt={activeItem.coupleName} className="w-full h-full object-cover object-top" />
          </div>
          <div className="text-center mt-5">
            <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", fontWeight: 600, color: COLOR_DARK, marginBottom: "4px" }}>
              {activeItem.coupleName}
            </p>
            <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, fontStyle: "italic", color: COLOR_WARM }}>
              Based on {activeItem.collection}
            </p>
          </div>
        </div>

        {/* Right — smaller, faded */}
        <div
          className="cursor-pointer flex-shrink-0 transition-all duration-500"
          style={{ width: "clamp(160px, 20vw, 260px)", opacity: 0.55 }}
          onClick={next}
        >
          <div className="overflow-hidden w-full" style={{ borderRadius: "3px", aspectRatio: "3/4", background: COLOR_SAND }}>
            <img src={nextItem.img} alt={nextItem.coupleName} className="w-full h-full object-cover object-top" />
          </div>
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={next}
        className="absolute cursor-pointer transition-opacity duration-200 hover:opacity-50 z-10 w-10 h-10 flex items-center justify-center"
        style={{ right: "clamp(12px, 4vw, 56px)", top: "40%", transform: "translateY(-50%)", background: "none", border: "none", color: COLOR_MID }}
        aria-label="Next"
      >
        <i className="ri-arrow-right-s-line" style={{ fontSize: "24px" }} />
      </button>
    </div>
  );
}

// ── Semi-custom collections ────────────────────────────────
const eventFilters = ["ALL", "WEDDING", "BABY SHOWER", "BIRTHDAY", "BRIDAL SHOWER"];
type EventFilter = "ALL" | "WEDDING" | "BIRTHDAY" | "BABY SHOWER" | "BRIDAL SHOWER";

const semiCollections = [
  {
    name: "Alpine",
    slug: "alpine",
    events: ["WEDDING", "BRIDAL SHOWER"],
    desc: "Crisp mountain air and winter whites — clean lines, frosted tones, and a quiet, serene elegance that feels both modern and timeless.",
    img: "https://readdy.ai/api/search-image?query=alpine%20winter%20wedding%20website%20mockup%2C%20crisp%20white%20and%20ice%20blue%20color%20palette%2C%20mountain%20inspired%20design%2C%20clean%20minimal%20typography%2C%20frosted%20glass%20aesthetic%2C%20premium%20digital%20event%20website%2C%20elegant%20sans-serif%20fonts%2C%20snowy%20botanical%20elements%2C%20soft%20neutral%20background&width=800&height=1000&seq=semi-alpine-01&orientation=portrait",
  },
  {
    name: "Classic Elegance",
    slug: "classic-elegance",
    events: ["WEDDING", "BIRTHDAY", "BRIDAL SHOWER"],
    desc: "Timeless refinement rooted in ivory, gold, and serif typography. A collection that never goes out of style.",
    img: "https://readdy.ai/api/search-image?query=classic%20elegant%20wedding%20website%20mockup%2C%20ivory%20and%20champagne%20gold%20color%20palette%2C%20luxury%20serif%20typography%2C%20ornate%20decorative%20borders%2C%20timeless%20romance%20aesthetic%2C%20premium%20digital%20invitation%20design%2C%20warm%20candlelight%20tones%2C%20refined%20traditional%20layout%2C%20cream%20background&width=800&height=1000&seq=semi-classic-01&orientation=portrait",
  },
  {
    name: "Coastal",
    slug: "coastal",
    events: ["WEDDING", "BABY SHOWER", "BIRTHDAY"],
    desc: "Sun-bleached linens, sandy tones, and the gentle rhythm of the sea. Light, breezy, and beautifully relaxed.",
    img: "https://readdy.ai/api/search-image?query=coastal%20beach%20wedding%20website%20mockup%2C%20sandy%20beige%20and%20ocean%20blue%20color%20palette%2C%20breezy%20nautical%20aesthetic%2C%20watercolor%20seashell%20illustrations%2C%20soft%20linen%20texture%2C%20premium%20digital%20event%20website%2C%20light%20airy%20typography%2C%20sun-bleached%20warm%20tones%2C%20minimal%20editorial%20layout&width=800&height=1000&seq=semi-coastal-01&orientation=portrait",
  },
  {
    name: "Garden",
    slug: "garden",
    events: ["WEDDING", "BABY SHOWER", "BRIDAL SHOWER", "BIRTHDAY"],
    desc: "Lush botanicals, soft sage, and the warmth of an afternoon in bloom. Romantic, fresh, and full of life.",
    img: "https://readdy.ai/api/search-image?query=garden%20wedding%20website%20homepage%20mockup%2C%20lush%20botanical%20illustrations%2C%20soft%20sage%20green%20and%20warm%20cream%20color%20palette%2C%20romantic%20floral%20watercolor%20elements%2C%20elegant%20script%20typography%20with%20couple%20names%20Clara%20and%20Etienne%2C%20premium%20digital%20event%20website%2C%20fresh%20botanical%20border%2C%20editorial%20flat%20lay%2C%20light%20airy%20background&width=800&height=1000&seq=semi-garden-01&orientation=portrait",
  },
  {
    name: "Modern Minimal",
    slug: "modern-minimal",
    events: ["WEDDING", "BIRTHDAY", "BRIDAL SHOWER"],
    desc: "Confident simplicity. Bold spacing, clean type, and an editorial restraint that lets your story take centre stage.",
    img: "https://readdy.ai/api/search-image?query=modern%20minimal%20wedding%20website%20mockup%2C%20stark%20white%20background%20with%20black%20typography%2C%20editorial%20magazine%20layout%2C%20bold%20clean%20lines%2C%20sophisticated%20contemporary%20design%2C%20premium%20digital%20invitation%2C%20negative%20space%20composition%2C%20minimalist%20geometric%20elements%2C%20monochrome%20accent%20details&width=800&height=1000&seq=semi-modern-01&orientation=portrait",
  },
  {
    name: "Tropical",
    slug: "tropical",
    events: ["WEDDING", "BIRTHDAY", "BABY SHOWER"],
    desc: "Bold palms, warm terracotta, and a lush vibrancy that brings the tropics to every screen. Festive and full of colour.",
    img: "https://readdy.ai/api/search-image?query=tropical%20wedding%20website%20mockup%2C%20lush%20palm%20leaves%20and%20tropical%20foliage%20illustration%2C%20warm%20terracotta%20and%20deep%20green%20color%20palette%2C%20vibrant%20botanical%20design%2C%20festive%20event%20website%2C%20premium%20digital%20stationery%2C%20rich%20earthy%20tones%2C%20editorial%20product%20photography%2C%20tropical%20floral%20elements%2C%20warm%20golden%20light&width=800&height=1000&seq=semi-tropical-01&orientation=portrait",
  },
];

// ── Page ──────────────────────────────────────────────────
export default function CollectionsPage() {
  const navigate = useNavigate();
  const [activeEventFilter, setActiveEventFilter] = useState<EventFilter>("ALL");
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(true);

  const filteredCollections = activeEventFilter === "ALL"
    ? semiCollections
    : semiCollections.filter((c) => c.events.includes(activeEventFilter));

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />
      {bannerVisible && <AnnouncementBanner onClose={() => setBannerVisible(false)} />}
      <Navbar forceDark bannerVisible={bannerVisible} />

      <main style={{ background: COLOR_CREAM, minHeight: "100vh", paddingTop: bannerVisible ? "140px" : "100px" }}>

        {/* ── SECTION 1: Semi-Custom Collections ── */}
        <section style={{ background: COLOR_CREAM }}>
          <div className="max-w-3xl mx-auto px-6 text-center pt-16 pb-10">
            <h1 style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 400, color: COLOR_DARK, letterSpacing: "-0.01em", lineHeight: 1.15, marginBottom: "24px" }}>
              Semi-Custom Milestone Event Website Collections
            </h1>
            <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", fontWeight: 300, color: COLOR_WARM, lineHeight: 1.9 }}>
              Our collections are made to feel personal, not just customised. Each begins with a defined aesthetic and design
              direction, then is tailored to your names, palette, and story. The result is a cohesive wedding website, digital stationery
              suite, and save-the-date designed to feel distinctly yours.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="max-w-4xl mx-auto px-6 pb-12">
            <div className="flex justify-between flex-wrap gap-y-3">
              {eventFilters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveEventFilter(f as EventFilter)}
                  className="whitespace-nowrap cursor-pointer transition-all duration-200"
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "11px",
                    fontWeight: activeEventFilter === f ? 500 : 400,
                    letterSpacing: "0.1em",
                    color: activeEventFilter === f ? COLOR_DARK : COLOR_WARM,
                    background: "none",
                    border: "none",
                    borderBottom: activeEventFilter === f ? `1px solid ${COLOR_DARK}` : "1px solid transparent",
                    paddingBottom: "4px",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* 3-column grid */}
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 pb-28">
            {filteredCollections.length === 0 && (
              <div className="text-center py-16">
                <p style={{ fontFamily: FONT_SECONDARY, fontSize: "14px", color: COLOR_WARM, fontWeight: 300 }}>No collections for this event type yet.</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredCollections.map((col) => (
                <div
                  key={col.slug}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredCollection(col.slug)}
                  onMouseLeave={() => setHoveredCollection(null)}
                >
                  <div className="overflow-hidden w-full" style={{ borderRadius: "3px", aspectRatio: "3/4", background: COLOR_SAND }}>
                    <img
                      src={col.img}
                      alt={col.name}
                      className="w-full h-full object-cover object-top"
                      style={{ transform: hoveredCollection === col.slug ? "scale(1.04)" : "scale(1)", transition: "transform 0.6s ease" }}
                    />
                  </div>
                  <div className="mt-4">
                    <p style={{ fontFamily: FONT_PRIMARY, fontSize: "19px", fontWeight: 400, color: COLOR_DARK, marginBottom: "6px" }}>{col.name}</p>
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: COLOR_WARM, lineHeight: 1.75 }}>{col.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Collections Carousel ── */}
        <section style={{ background: COLOR_CREAM, borderTop: `1px solid ${COLOR_SAND}`, paddingTop: "80px", paddingBottom: "90px" }}>
          <h2 style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 400, color: COLOR_DARK, textAlign: "center", letterSpacing: "-0.01em", marginBottom: "52px" }}>
            Collections, brought to life
          </h2>
          <CollectionsCarousel />
        </section>

        {/* ── SECTION 3: Bespoke CTA Banner ── */}
        <section
          style={{
            background: "#F0EDE7",
            borderTop: `1px solid ${COLOR_SAND}`,
            padding: "90px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative elements */}
          <span style={{ position: "absolute", top: "28px", left: "clamp(30px, 8vw, 120px)", fontSize: "28px", opacity: 0.85, pointerEvents: "none" }}>✦</span>
          <span style={{ position: "absolute", top: "20px", left: "clamp(50px, 10vw, 150px)", fontSize: "16px", opacity: 0.6, pointerEvents: "none" }}>✦</span>
          <span style={{ position: "absolute", top: "36px", right: "clamp(40px, 9vw, 130px)", fontSize: "20px", opacity: 0.7, pointerEvents: "none" }}>🍃</span>
          <span style={{ position: "absolute", bottom: "36px", left: "clamp(30px, 7vw, 100px)", fontSize: "22px", opacity: 0.7, pointerEvents: "none" }}>🌿</span>
          <span style={{ position: "absolute", bottom: "28px", right: "clamp(30px, 8vw, 110px)", fontSize: "24px", opacity: 0.75, pointerEvents: "none" }}>🥂</span>

          {/* Text */}
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <p style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 400, color: COLOR_DARK, lineHeight: 1.5, marginBottom: "36px" }}>
              Looking for something more personal?<br />
              Our bespoke service creates your website entirely from scratch,<br />
              no templates, no repeats, just a design uniquely yours.
            </p>
            <button
              onClick={() => navigate("/enquire")}
              className="whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-70"
              style={{
                fontFamily: FONT_SECONDARY,
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.14em",
                color: COLOR_DARK,
                background: "transparent",
                border: `1px solid ${COLOR_MID}`,
                borderRadius: "999px",
                padding: "14px 36px",
                textTransform: "uppercase",
              }}
            >
              EXPLORE BESPOKE DESIGN
            </button>
          </div>
        </section>

      </main>

      <InstagramSection />
      <FooterSection />
    </>
  );
}