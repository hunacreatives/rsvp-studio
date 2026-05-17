import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/pages/home/components/Navbar";
import AnnouncementBanner from "@/pages/home/components/AnnouncementBanner";
import FooterSection from "@/pages/home/components/FooterSection";
import InstagramSection from "@/pages/home/components/InstagramSection";
import { monogramProducts } from "./data";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_WARM = "#A3968D";
const COLOR_CREAM = "#F5F2ED";
const COLOR_SAND = "#DFDACF";

const HOW_IT_WORKS_STEPS = [
  {
    num: "01/",
    title: "Choose Your Design",
    desc: "Browse our curated collection of monograms and select a style that reflects your vision.",
  },
  {
    num: "02/",
    title: "Pick Your Variant",
    desc: "Choose from Initials Only, Names & Initials, or the Full Monogram Set to personalise your design.",
  },
  {
    num: "03/",
    title: "Share Your Details",
    desc: "Submit your initials, and if applicable, include your names and wedding date based on your selected option.",
  },
  {
    num: "04/",
    title: "Design & Delivery",
    desc: "We'll create your monogram and deliver it within 2 business days (excluding weekends and holidays).",
  },
  {
    num: "05/",
    title: "Access Your Files",
    desc: "Your final files will be uploaded to Google Drive, with a download link sent directly to you. The link will remain active for 15 days.",
  },
];

function HowItWorksSection() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    how: true,
    included: true,
    notIncluded: true,
  });

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const sectionHeaderStyle: React.CSSProperties = {
    fontFamily: FONT_SECONDARY,
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.14em",
    color: "#FFFFFF",
    textTransform: "uppercase",
  };

  const dividerStyle: React.CSSProperties = {
    width: "100%",
    height: "1px",
    background: "rgba(255,255,255,0.15)",
    margin: "0",
  };

  return (
    <section style={{ background: "#1C1A18", padding: "0" }}>
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "600px",
        }}
      >
        {/* Left: image */}
        <div className="relative" style={{ overflow: "hidden", minHeight: "600px" }}>
          <img
            src="https://readdy.ai/api/search-image?query=luxury%20monogram%20stationery%20flat%20lay%2C%20kraft%20paper%20envelopes%20with%20embossed%20TL%20initials%20monogram%2C%20ribbed%20texture%20envelope%20with%20debossed%20lettering%2C%20warm%20beige%20and%20taupe%20tones%2C%20Taralynn%20Lawton%20name%20embossed%20on%20card%2C%20premium%20editorial%20photography%2C%20dark%20moody%20studio%20background%2C%20artisan%20handcrafted%20paper%20goods&width=640&height=800&seq=how-it-works-img-01&orientation=portrait"
            alt="Monogram stationery process"
            className="w-full h-full object-cover object-top"
            style={{ display: "block" }}
          />
          {/* 1/9 badge */}
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "rgba(30,28,26,0.75)",
              borderRadius: "999px",
              padding: "5px 12px",
              backdropFilter: "blur(6px)",
            }}
          >
            <span style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", fontWeight: 400, color: "#FFFFFF", letterSpacing: "0.06em" }}>
              1/9
            </span>
          </div>
          {/* Avatar badge */}
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              left: "20px",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(30,28,26,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
            }}
          >
            <i className="ri-user-line" style={{ fontSize: "16px", color: "#FFFFFF" }} />
          </div>
        </div>

        {/* Right: accordion content */}
        <div style={{ padding: "clamp(40px, 5vw, 72px) clamp(32px, 5vw, 64px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          {/* HOW IT WORKS */}
          <div style={{ marginBottom: "0" }}>
            <button
              onClick={() => toggle("how")}
              className="w-full flex items-center justify-between cursor-pointer"
              style={{ background: "none", border: "none", padding: "0 0 20px 0" }}
            >
              <span style={sectionHeaderStyle}>How It Works</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>
                {openSections.how ? "−" : "+"}
              </span>
            </button>
            {openSections.how && (
              <div style={{ marginBottom: "8px" }}>
                {HOW_IT_WORKS_STEPS.map((step) => (
                  <div
                    key={step.num}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px 1fr",
                      gap: "16px",
                      marginBottom: "28px",
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: FONT_SECONDARY, fontSize: "12px", fontWeight: 400, color: "rgba(255,255,255,0.5)", marginBottom: "2px" }}>
                        {step.num}
                      </p>
                      <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.4 }}>
                        {step.title}
                      </p>
                    </div>
                    <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.7)", lineHeight: 1.75 }}>
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={dividerStyle} />

          {/* WHAT'S INCLUDED */}
          <div style={{ marginTop: "0" }}>
            <button
              onClick={() => toggle("included")}
              className="w-full flex items-center justify-between cursor-pointer"
              style={{ background: "none", border: "none", padding: "20px 0" }}
            >
              <span style={sectionHeaderStyle}>What&apos;s Included</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>
                {openSections.included ? "−" : "+"}
              </span>
            </button>
            {openSections.included && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, marginBottom: "12px" }}>
                  You&apos;ll receive your monogram in the following high-quality formats:
                </p>
                {["jpeg (black)", "png (black & white version)", "pdf (black)", "svg (black)"].map((item) => (
                  <p key={item} style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.7)", lineHeight: 1.75, paddingLeft: "8px" }}>
                    • &nbsp;{item}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div style={dividerStyle} />

          {/* WHAT'S NOT INCLUDED */}
          <div>
            <button
              onClick={() => toggle("notIncluded")}
              className="w-full flex items-center justify-between cursor-pointer"
              style={{ background: "none", border: "none", padding: "20px 0" }}
            >
              <span style={sectionHeaderStyle}>What&apos;s Not Included</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "20px", lineHeight: 1, fontWeight: 300 }}>
                {openSections.notIncluded ? "−" : "+"}
              </span>
            </button>
            {openSections.notIncluded && (
              <div>
                {[
                  { bold: "Revisions", rest: " – Available for an additional Php 500? per revision round." },
                  { bold: "Design Adjustments, Font or Color Changes", rest: " – For custom designs, please contact us." },
                  { bold: "Design Mockups", rest: "" },
                ].map((item, i) => (
                  <p key={i} style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.7)", lineHeight: 1.85, paddingLeft: "8px", marginBottom: "6px" }}>
                    •&nbsp;&nbsp;<strong style={{ color: "#FFFFFF", fontWeight: 600 }}>{item.bold}</strong>{item.rest}
                  </p>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

export default function MonogramPage() {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const navigate = useNavigate();

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
          background: COLOR_CREAM,
          minHeight: "100vh",
          paddingTop: bannerVisible ? "140px" : "100px",
        }}
      >
        {/* Page header */}
        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "56px 24px 48px", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: FONT_PRIMARY,
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 400,
              color: COLOR_DARK,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
              marginBottom: "20px",
            }}
          >
            Find your Perfect Wedding Monogram
          </h1>
          <p
            style={{
              fontFamily: FONT_SECONDARY,
              fontSize: "13px",
              fontWeight: 300,
              color: COLOR_MID,
              lineHeight: 1.85,
            }}
          >
            Discover a curated collection of bespoke wedding monograms, thoughtfully designed to elevate your stationery and
            celebration details. From refined minimalism to timeless classics, each piece is crafted to reflect your unique style. Ideal
            for invitations, signage, and keepsakes, your monogram becomes a signature woven throughout your day.
            <br />
            Create a mark that&apos;s uniquely yours.
          </p>
        </div>

        {/* Grid */}
        <div
          style={{
            maxWidth: "1080px",
            margin: "0 auto",
            padding: "0 clamp(20px, 4vw, 48px) 100px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "clamp(12px, 2vw, 24px)",
            }}
          >
            {monogramProducts.map((product) => (
              <div
                key={product.id}
                className="cursor-pointer"
                onClick={() => navigate(`/monogram/${product.id}`)}
                onMouseEnter={() => setHovered(product.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className="w-full overflow-hidden"
                  style={{ aspectRatio: "3/4", borderRadius: "3px", background: COLOR_SAND }}
                >
                  <img
                    src={product.mainImg}
                    alt={`Monogram ${product.number}`}
                    className="w-full h-full object-cover object-top"
                    style={{
                      display: "block",
                      transform: hovered === product.id ? "scale(1.04)" : "scale(1)",
                      transition: "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    }}
                  />
                </div>
                <p
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "12px",
                    fontWeight: 300,
                    color: COLOR_MID,
                    marginTop: "10px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {product.number}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <HowItWorksSection />
      <InstagramSection />
      <FooterSection />
    </>
  );
}