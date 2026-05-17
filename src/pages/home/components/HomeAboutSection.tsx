import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_BODY = "#5a5a5a";
const COLOR_MID = "#4D403A";

export default function HomeAboutSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="w-full"
      style={{ background: "#FDFCFA", padding: "110px 0 100px" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center">

          {/* Left: Image collage */}
          <div
            className="relative"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : "translateX(-32px)",
              transition: "opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s",
            }}
          >
            {/* Main image */}
            <div
              className="relative overflow-hidden w-full"
              style={{ aspectRatio: "4/5", borderRadius: "4px" }}
            >
              <img
                src="https://readdy.ai/api/search-image?query=close-up%20of%20hands%20arranging%20luxury%20wedding%20stationery%20suite%20on%20a%20warm%20cream%20linen%20table%2C%20kraft%20envelope%20with%20wax%20seal%2C%20pressed%20dried%20botanicals%2C%20elegant%20calligraphy%20invitation%20card%2C%20soft%20natural%20window%20light%2C%20editorial%20styling%2C%20warm%20ivory%20and%20sand%20tones%2C%20minimal%20and%20refined%20aesthetic%2C%20no%20text%20visible&width=680&height=850&seq=home-about-001&orientation=portrait"
                alt="Huna Events design process"
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Floating accent card */}
            <div
              className="absolute -bottom-8 -right-6 hidden lg:block"
              style={{
                background: "#4D403A",
                borderRadius: "4px",
                padding: "28px 30px",
                width: "210px",
              }}
            >
              <p
                style={{
                  fontFamily: FONT_PRIMARY,
                  fontSize: "38px",
                  fontWeight: 400,
                  color: "#FFFFFF",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                200+
              </p>
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "11px",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: "0.08em",
                  marginTop: "6px",
                  textTransform: "uppercase",
                }}
              >
                Events Designed
              </p>
            </div>
          </div>

          {/* Right: Text */}
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(32px)",
              transition: "opacity 0.9s ease 0.25s, transform 0.9s ease 0.25s",
            }}
          >
            <p
              style={{
                fontFamily: FONT_SECONDARY,
                fontSize: "10px",
                letterSpacing: "0.22em",
                color: COLOR_MID,
                textTransform: "uppercase",
                fontWeight: 500,
                marginBottom: "24px",
              }}
            >
              The Studio
            </p>

            <h2
              className="leading-tight mb-8"
              style={{
                fontFamily: FONT_PRIMARY,
                fontSize: "clamp(30px, 4vw, 50px)",
                fontWeight: 400,
                color: COLOR_DARK,
                letterSpacing: "-0.01em",
              }}
            >
              Crafted with intention,<br />
              <em style={{ fontStyle: "italic", fontWeight: 300 }}>designed to last</em>
            </h2>

            <div className="space-y-5">
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "14px",
                  fontWeight: 300,
                  color: COLOR_BODY,
                  lineHeight: 1.9,
                }}
              >
                Huna Events is a boutique digital event design studio creating bespoke online experiences for life's most meaningful celebrations — from intimate weddings to grand corporate launches.
              </p>
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "14px",
                  fontWeight: 300,
                  color: COLOR_BODY,
                  lineHeight: 1.9,
                }}
              >
                We believe your digital presence should feel as considered and personal as the event itself. Every website we create is editorial in feel, seamless in function, and deeply reflective of the people behind the celebration.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-10 mt-12 mb-12">
              {[
                { num: "98%", label: "Client Satisfaction" },
                { num: "2–3", label: "Weeks to Launch" },
                { num: "5★", label: "Avg. Rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    style={{
                      fontFamily: FONT_PRIMARY,
                      fontSize: "32px",
                      fontWeight: 400,
                      color: COLOR_DARK,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.num}
                  </p>
                  <p
                    style={{
                      fontFamily: FONT_SECONDARY,
                      fontSize: "11px",
                      fontWeight: 300,
                      color: "#9A8D84",
                      letterSpacing: "0.04em",
                      marginTop: "4px",
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/services")}
              className="whitespace-nowrap cursor-pointer transition-all duration-200"
              style={{
                padding: "13px 30px",
                background: "transparent",
                border: `1px solid ${COLOR_DARK}`,
                borderRadius: "999px",
                color: COLOR_DARK,
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: FONT_SECONDARY,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = COLOR_DARK;
                (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = COLOR_DARK;
              }}
            >
              Our Services
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}