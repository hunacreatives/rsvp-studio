import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";

export default function HomeCtaSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ minHeight: "480px" }}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=close-up%20of%20elegant%20luxury%20wedding%20invitation%20suite%20held%20in%20hands%20with%20soft%20bokeh%20garden%20background%2C%20cream%20ivory%20linen%20paper%20with%20delicate%20dried%20botanical%20sprig%20and%20wax%20seal%2C%20warm%20golden%20afternoon%20light%2C%20editorial%20lifestyle%20photography%2C%20film-like%20warm%20tones%2C%20sophisticated%20romantic%20aesthetic%2C%20refined%20minimalism&width=1600&height=640&seq=home-cta-001&orientation=landscape"
          alt="Start your journey with Huna Events"
          className="w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(15,12,10,0.62)",
          }}
        />
      </div>

      {/* Content */}
      <div
        className="relative flex flex-col items-center justify-center text-center px-6 py-28"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(28px)",
          transition: "opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s",
        }}
      >
        <p
          style={{
            fontFamily: FONT_SECONDARY,
            fontSize: "10px",
            letterSpacing: "0.24em",
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          Ready to Begin?
        </p>

        <h2
          className="leading-tight"
          style={{
            fontFamily: FONT_PRIMARY,
            fontSize: "clamp(30px, 4.5vw, 58px)",
            fontWeight: 400,
            color: "#FFFFFF",
            letterSpacing: "-0.015em",
            maxWidth: "740px",
          }}
        >
          Let's design your perfect<br />
          <em style={{ fontStyle: "italic", fontWeight: 300 }}>celebration experience</em>
        </h2>

        <p
          className="mt-6"
          style={{
            fontFamily: FONT_SECONDARY,
            fontSize: "14px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.8,
            maxWidth: "480px",
            letterSpacing: "0.02em",
          }}
        >
          Get in touch and tell us about your event. We'll get back to you within 24 hours.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-12">
          <button
            onClick={() => navigate("/enquire")}
            className="whitespace-nowrap cursor-pointer transition-all duration-200"
            style={{
              padding: "14px 40px",
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
            Start an Enquiry
          </button>
          <button
            onClick={() => navigate("/services")}
            className="whitespace-nowrap cursor-pointer transition-all duration-200"
            style={{
              padding: "14px 40px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "999px",
              color: "rgba(255,255,255,0.8)",
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
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
            }}
          >
            Explore Packages
          </button>
        </div>
      </div>
    </section>
  );
}