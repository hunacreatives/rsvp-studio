import { useEffect, useRef, useState } from "react";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";

const packages = [
  {
    name: "Semi-Custom Milestone\nEvents Website",
    price: "₱4,500",
    description: "A beautifully designed event website built on our curated templates, personalised with your details, photos, and colour palette.",
    features: [
      "Up to 6 custom pages",
      "RSVP & guest management",
      "Mobile-optimised design",
      "Event schedule & timeline",
      "Location & directions",
      "Photo gallery",
      "2 rounds of revisions",
      "Live within 5–7 business days",
    ],
    cta: "GET STARTED",
    highlight: false,
  },
  {
    name: "Bespoke Premium\nMilestone Events Website",
    price: "₱9,500",
    description: "A fully custom, one-of-a-kind event website designed from scratch to reflect your unique vision, story, and aesthetic.",
    features: [
      "Unlimited custom pages",
      "Bespoke design & branding",
      "Advanced RSVP system",
      "Guest portal & seating",
      "Custom animations",
      "Dress code visual guide",
      "Up to 5 rounds of revisions",
      "Priority support & launch",
    ],
    cta: "ENQUIRE NOW",
    highlight: true,
  },
];

export default function PackagesSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="packages"
      ref={ref}
      className="w-full"
      style={{ background: "#262626", padding: "100px 0 110px" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(28px, 4.5vw, 48px)",
              fontWeight: 400,
              color: "#FFFFFF",
              fontFamily: FONT_PRIMARY,
              letterSpacing: "-0.01em",
            }}
          >
            Event Website Packages
          </h2>
          <p
            className="mt-4 mx-auto"
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.45)",
              fontFamily: FONT_SECONDARY,
              maxWidth: "480px",
              lineHeight: 1.8,
              fontWeight: 300,
              letterSpacing: "0.02em",
            }}
          >
            Two ways to bring your event to life online — both crafted with the same care and attention to detail.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {packages.map((pkg, i) => (
            <div
              key={pkg.name}
              className="flex flex-col"
              style={{
                background: pkg.highlight ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                border: pkg.highlight ? "1px solid rgba(223,218,207,0.3)" : "1px solid rgba(223,218,207,0.1)",
                borderRadius: "4px",
                padding: "40px 36px",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.8s ease ${0.2 + i * 0.15}s, transform 0.8s ease ${0.2 + i * 0.15}s`,
              }}
            >
              {pkg.highlight && (
                <div
                  className="inline-block mb-5 self-start"
                  style={{
                    padding: "3px 10px",
                    background: "rgba(223,218,207,0.12)",
                    borderRadius: "2px",
                    fontSize: "9px",
                    color: "#DFDACF",
                    fontFamily: FONT_SECONDARY,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  Most Popular
                </div>
              )}

              <h3
                className="leading-tight mb-3"
                style={{
                  fontSize: "clamp(20px, 2.5vw, 26px)",
                  fontWeight: 400,
                  color: "#FFFFFF",
                  fontFamily: FONT_PRIMARY,
                  whiteSpace: "pre-line",
                }}
              >
                {pkg.name}
              </h3>

              <p
                className="mb-5"
                style={{
                  fontSize: "26px",
                  fontWeight: 300,
                  color: "#DFDACF",
                  fontFamily: FONT_PRIMARY,
                }}
              >
                {pkg.price}
              </p>

              <p
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: FONT_SECONDARY,
                  lineHeight: 1.8,
                  marginBottom: "28px",
                  fontWeight: 300,
                }}
              >
                {pkg.description}
              </p>

              <ul className="space-y-3 flex-1 mb-10">
                {pkg.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-3"
                    style={{
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.6)",
                      fontFamily: FONT_SECONDARY,
                      fontWeight: 300,
                    }}
                  >
                    <span className="flex-shrink-0 mt-0.5" style={{ color: "#A3968D", fontSize: "12px" }}>&#8212;</span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={scrollToContact}
                className="w-full whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-80"
                style={{
                  padding: "14px 24px",
                  background: pkg.highlight ? "#FAF8F5" : "transparent",
                  border: pkg.highlight ? "none" : "1px solid rgba(223,218,207,0.35)",
                  borderRadius: "3px",
                  color: pkg.highlight ? "#262626" : "#DFDACF",
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: FONT_SECONDARY,
                  letterSpacing: "0.12em",
                }}
              >
                {pkg.cta}
              </button>
            </div>
          ))}
        </div>

        <p
          className="text-center mt-10"
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.25)",
            fontFamily: FONT_SECONDARY,
            fontWeight: 300,
            letterSpacing: "0.02em",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.6s",
          }}
        >
          All packages include hosting setup, domain connection assistance, and post-launch support. Prices are in Philippine Peso (PHP).
        </p>
      </div>
    </section>
  );
}
