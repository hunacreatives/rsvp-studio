import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";

export default function HomeHeroSection() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: "680px" }}
    >
      {/* Full-bleed background */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=aerial%20top-down%20view%20of%20a%20beautifully%20styled%20luxury%20wedding%20flat%20lay%20on%20a%20warm%20ivory%20linen%20surface%2C%20elegant%20stationery%20suite%20with%20envelope%20wax%20seal%20ring%20of%20dried%20pressed%20botanicals%20cream%20roses%20and%20ribbon%2C%20minimal%20editorial%20product%20photography%2C%20warm%20sand%20beige%20and%20ivory%20tones%2C%20sophisticated%20bridal%20aesthetic%2C%20soft%20diffused%20light%20from%20above&width=1600&height=900&seq=home-hero-001&orientation=landscape"
          alt="Huna Events — Thoughtfully Designed Event Experiences"
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(15,12,10,0.52) 0%, rgba(15,12,10,0.28) 45%, rgba(15,12,10,0.60) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
        style={{
          paddingTop: "80px",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(28px)",
          transition: "opacity 1.1s ease 0.2s, transform 1.1s ease 0.2s",
        }}
      >
        {/* Eyebrow */}
        <p
          className="mb-6"
          style={{
            fontFamily: FONT_SECONDARY,
            fontSize: "10px",
            letterSpacing: "0.26em",
            color: "rgba(255,255,255,0.65)",
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          Digital Event Design Studio
        </p>

        {/* Main heading */}
        <h1
          className="leading-tight"
          style={{
            fontFamily: FONT_PRIMARY,
            fontSize: "clamp(36px, 5.5vw, 74px)",
            fontWeight: 400,
            color: "#FFFFFF",
            letterSpacing: "-0.015em",
            maxWidth: "860px",
          }}
        >
          Where Every Celebration<br />
          <em style={{ fontStyle: "italic", fontWeight: 300 }}>Begins</em>
        </h1>

        {/* Sub */}
        <p
          className="mt-7"
          style={{
            fontFamily: FONT_SECONDARY,
            fontSize: "clamp(13px, 1.4vw, 16px)",
            color: "rgba(255,255,255,0.70)",
            lineHeight: 1.75,
            fontWeight: 300,
            letterSpacing: "0.03em",
            maxWidth: "520px",
          }}
        >
          Bespoke digital experiences for weddings, milestones, and life's most meaningful events.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-12">
          <button
            onClick={() => navigate("/services")}
            className="whitespace-nowrap cursor-pointer transition-all duration-300"
            style={{
              padding: "14px 36px",
              background: "#FFFFFF",
              border: "1px solid #FFFFFF",
              borderRadius: "999px",
              color: "#1C1A18",
              fontSize: "11px",
              fontWeight: 600,
              fontFamily: FONT_SECONDARY,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#FFFFFF";
              (e.currentTarget as HTMLButtonElement).style.color = "#1C1A18";
            }}
          >
            Explore Services
          </button>
          <button
            onClick={() => navigate("/portfolio")}
            className="whitespace-nowrap cursor-pointer transition-all duration-300"
            style={{
              padding: "14px 36px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.45)",
              borderRadius: "999px",
              color: "rgba(255,255,255,0.85)",
              fontSize: "11px",
              fontWeight: 400,
              fontFamily: FONT_SECONDARY,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.9)";
              (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.45)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.85)";
            }}
          >
            View Portfolio
          </button>
        </div>

        {/* Scroll cue */}
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{
            opacity: visible ? 0.5 : 0,
            transition: "opacity 1s ease 1.2s",
          }}
        >
          <span
            style={{
              fontFamily: FONT_SECONDARY,
              fontSize: "9px",
              letterSpacing: "0.22em",
              color: "#FFFFFF",
              textTransform: "uppercase",
            }}
          >
            Scroll
          </span>
          <div
            className="w-px bg-white"
            style={{
              height: "40px",
              animation: "fadeUpDown 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeUpDown {
          0%, 100% { opacity: 0.3; transform: scaleY(0.6); transform-origin: top; }
          50% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </section>
  );
}