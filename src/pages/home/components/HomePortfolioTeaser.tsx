import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";

const portfolioItems = [
  {
    label: "Wedding",
    name: "Isabel & Marco",
    img: "https://readdy.ai/api/search-image?query=luxury%20wedding%20website%20design%20on%20laptop%20screen%20showing%20a%20romantic%20editorial%20homepage%20with%20delicate%20script%20font%20couple%20names%20and%20soft%20floral%20imagery%20warm%20cream%20background%2C%20elegant%20event%20website%20mockup%2C%20high-end%20bridal%20aesthetic%2C%20soft%20natural%20light%2C%20warm%20ivory%20gold%20tones%2C%20minimal%20refined%20photography&width=600&height=750&seq=port-home-01&orientation=portrait",
  },
  {
    label: "Birthday",
    name: "Sofia's 30th",
    img: "https://readdy.ai/api/search-image?query=elegant%20birthday%20celebration%20event%20website%20mockup%20shown%20on%20phone%20and%20tablet%2C%20luxurious%20party%20design%20with%20champagne%20gold%20script%20typography%20on%20dark%20charcoal%20background%2C%20milestone%20birthday%20digital%20invitation%2C%20editorial%20product%20photography%2C%20sophisticated%20warm%20dark%20tones%2C%20lifestyle%20mockup%2C%20high-end%20design&width=600&height=750&seq=port-home-02&orientation=portrait",
  },
  {
    label: "Corporate",
    name: "Summit 2025",
    img: "https://readdy.ai/api/search-image?query=premium%20corporate%20conference%20event%20website%20mockup%20on%20a%20modern%20laptop%20screen%2C%20clean%20minimal%20design%20with%20professional%20dark%20navy%20and%20warm%20gold%20accents%2C%20bold%20serif%20typography%2C%20sleek%20editorial%20layout%2C%20luxury%20brand%20event%20aesthetic%2C%20editorial%20product%20photography%2C%20sophisticated%20modern%20style&width=600&height=750&seq=port-home-03&orientation=portrait",
  },
  {
    label: "Engagement",
    name: "Chloe & James",
    img: "https://readdy.ai/api/search-image?query=romantic%20engagement%20announcement%20website%20mockup%20on%20phone%20screen%2C%20soft%20blush%20and%20ivory%20color%20palette%2C%20elegant%20calligraphy%20script%20couple%20names%2C%20pressed%20floral%20border%20illustration%2C%20digital%20save%20the%20date%20announcement%20design%2C%20editorial%20lifestyle%20photography%2C%20warm%20soft%20light%2C%20minimal%20elegant%20aesthetic&width=600&height=750&seq=port-home-04&orientation=portrait",
  },
];

export default function HomePortfolioTeaser() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="w-full"
      style={{ background: "#1C1A18", padding: "100px 0 110px" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">

        {/* Header */}
        <div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: FONT_SECONDARY,
                fontSize: "10px",
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.40)",
                textTransform: "uppercase",
                fontWeight: 500,
                marginBottom: "14px",
              }}
            >
              Recent Work
            </p>
            <h2
              style={{
                fontFamily: FONT_PRIMARY,
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 400,
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              A glimpse of<br />
              <em style={{ fontStyle: "italic", fontWeight: 300 }}>what we've made</em>
            </h2>
          </div>
          <button
            onClick={() => navigate("/portfolio")}
            className="whitespace-nowrap cursor-pointer transition-all duration-200 self-start md:self-auto"
            style={{
              padding: "11px 26px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "999px",
              color: "rgba(255,255,255,0.7)",
              fontSize: "11px",
              fontWeight: 400,
              fontFamily: FONT_SECONDARY,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.8)";
              (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
            }}
          >
            Full Portfolio
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {portfolioItems.map((item, i) => (
            <div
              key={item.name}
              className="relative overflow-hidden cursor-pointer group"
              style={{
                borderRadius: "4px",
                aspectRatio: "4/5",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.8s ease ${0.15 + i * 0.1}s, transform 0.8s ease ${0.15 + i * 0.1}s`,
              }}
              onClick={() => navigate("/portfolio")}
            >
              <img
                src={item.img}
                alt={item.name}
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
              {/* Gradient */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)",
                }}
              />
              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "9px",
                    letterSpacing: "0.2em",
                    color: "rgba(255,255,255,0.55)",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontFamily: FONT_PRIMARY,
                    fontSize: "16px",
                    fontWeight: 400,
                    color: "#FFFFFF",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}