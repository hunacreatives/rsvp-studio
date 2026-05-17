import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";

const services = [
  {
    number: "01",
    title: "Milestone Events Website",
    subtitle: "Semi-Custom & Bespoke",
    desc: "Scroll-based event websites for weddings, birthdays, baby showers, and every celebration in between. From template collections to fully bespoke builds.",
    image:
      "https://readdy.ai/api/search-image?query=elegant%20luxury%20wedding%20event%20website%20mockup%20displayed%20on%20a%20slim%20laptop%2C%20screen%20showing%20a%20beautiful%20editorial%20wedding%20page%20with%20script%20typography%2C%20warm%20ivory%20background%2C%20dried%20floral%20arrangement%20beside%20the%20laptop%20on%20a%20cream%20linen%20table%2C%20soft%20natural%20light%2C%20minimal%20editorial%20product%20photography%2C%20warm%20neutral%20tones&width=640&height=480&seq=home-svc-01&orientation=landscape",
    href: "/services",
  },
  {
    number: "02",
    title: "Custom Monogram Design",
    subtitle: "Initials & Names",
    desc: "Timeless monogram designs tailored to your initials, names, or couple identity — delivered as high-resolution digital files ready for print and web.",
    image:
      "https://readdy.ai/api/search-image?query=luxury%20custom%20monogram%20letter%20design%20close-up%20on%20cream%20thick%20paper%20card%2C%20elegant%20embossed%20style%20calligraphic%20initials%2C%20wax%20seal%20stamp%20nearby%2C%20editorial%20flat%20lay%20photography%2C%20warm%20ivory%20cream%20and%20gold%20tones%2C%20soft%20diffused%20light%2C%20minimal%20and%20refined%20aesthetic%2C%20high-end%20stationery%20product%20photography&width=640&height=480&seq=home-svc-02&orientation=landscape",
    href: "/monogram",
  },
  {
    number: "03",
    title: "Collections",
    subtitle: "Curated Templates",
    desc: "Beautifully curated design collections for couples seeking a polished, cohesive look at a more accessible investment — fully personalised to your details.",
    image:
      "https://readdy.ai/api/search-image?query=curated%20wedding%20stationery%20collection%20flat%20lay%20displayed%20on%20warm%20beige%20linen%20surface%2C%20multiple%20coordinated%20invitation%20cards%20envelopes%20menu%20cards%20and%20place%20cards%20arranged%20elegantly%2C%20matching%20design%20system%2C%20soft%20warm%20light%2C%20minimal%20editorial%20photography%2C%20sand%20ivory%20and%20soft%20earthy%20tones%2C%20refined%20sophisticated%20styling&width=640&height=480&seq=home-svc-03&orientation=landscape",
    href: "/collections",
  },
];

export default function HomeServicesPreview() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
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
      style={{ background: "#FAF8F5", padding: "100px 0 110px" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">

        {/* Header */}
        <div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16"
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
                color: "#4D403A",
                textTransform: "uppercase",
                fontWeight: 500,
                marginBottom: "14px",
              }}
            >
              What We Do
            </p>
            <h2
              style={{
                fontFamily: FONT_PRIMARY,
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 400,
                color: "#262626",
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
              }}
            >
              Services crafted<br />
              <em style={{ fontStyle: "italic", fontWeight: 300 }}>for your moment</em>
            </h2>
          </div>
          <button
            onClick={() => navigate("/services")}
            className="whitespace-nowrap cursor-pointer transition-all duration-200 self-start md:self-auto"
            style={{
              padding: "11px 26px",
              background: "transparent",
              border: "1px solid #262626",
              borderRadius: "999px",
              color: "#262626",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: FONT_SECONDARY,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#262626";
              (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "#262626";
            }}
          >
            All Services
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((svc, i) => (
            <div
              key={svc.number}
              className="group cursor-pointer flex flex-col"
              style={{
                background: "#FFFFFF",
                borderRadius: "4px",
                overflow: "hidden",
                border: "1px solid #DFDACF",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(36px)",
                transition: `opacity 0.8s ease ${0.15 + i * 0.12}s, transform 0.8s ease ${0.15 + i * 0.12}s`,
              }}
              onClick={() => navigate(svc.href)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Image */}
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: "4/3" }}
              >
                <img
                  src={svc.image}
                  alt={svc.title}
                  className="w-full h-full object-cover object-top"
                  style={{
                    transform: hovered === i ? "scale(1.05)" : "scale(1)",
                    transition: "transform 0.6s ease",
                  }}
                />
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-8">
                <p
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "9px",
                    letterSpacing: "0.22em",
                    color: "#A3968D",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    marginBottom: "6px",
                  }}
                >
                  {svc.number} — {svc.subtitle}
                </p>
                <h3
                  className="mb-4"
                  style={{
                    fontFamily: FONT_PRIMARY,
                    fontSize: "22px",
                    fontWeight: 400,
                    color: "#262626",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.25,
                  }}
                >
                  {svc.title}
                </h3>
                <p
                  className="flex-1"
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "13px",
                    fontWeight: 300,
                    color: "#7A726C",
                    lineHeight: 1.8,
                  }}
                >
                  {svc.desc}
                </p>

                <div
                  className="flex items-center gap-2 mt-7"
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    color: "#4D403A",
                    textTransform: "uppercase",
                    transition: "gap 0.2s ease",
                  }}
                >
                  <span>Learn More</span>
                  <i
                    className="ri-arrow-right-line"
                    style={{
                      transform: hovered === i ? "translateX(4px)" : "translateX(0)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}