import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_BODY = "#5a5a5a";
const COLOR_SAND = "#DFDACF";

const semiItems = [
  {
    id: "includes",
    label: "WHAT'S INCLUDED",
    content: (
      <div className="space-y-4 pt-3 pb-2">
        {[
          {
            title: "Website Experience",
            bullets: ["A single-page, scroll-based milestone website from our template collection", "Mobile optimization"],
          },
          {
            title: "Design Direction",
            bullets: ["Monogram (included in the Signature Collection)", "RSVP Management"],
          },
          {
            title: "Setup & Technical",
            bullets: ["Website hosting for 12 months", "Custom domain connection", "Full website setup and launch"],
          },
          {
            title: "Process & Support",
            bullets: ["Up to 1 round of revision"],
          },
        ].map((group) => (
          <div key={group.title}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: FONT_SECONDARY, marginBottom: "4px" }}>{group.title}</p>
            <ul className="space-y-1">
              {group.bullets.map((b) => (
                <li key={b} style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.6 }}>• {b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "investment",
    label: "INVESTMENT",
    content: (
      <div className="pt-3 pb-2">
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• starts at Php 8,000</p>
      </div>
    ),
  },
  {
    id: "timeline",
    label: "TIMELINE",
    content: (
      <div className="pt-3 pb-2">
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• 1 – 2 weeks</p>
      </div>
    ),
  },
];

const bespokeItems = [
  {
    id: "includes",
    label: "WHAT'S INCLUDED",
    content: (
      <div className="space-y-4 pt-3 pb-2">
        {[
          {
            title: "Website Experience",
            bullets: ["A thoughtfully crafted, fully bespoke scroll-based wedding website (e.g. Welcome, Our Story, Travel & Stay, FAQs, Event, Registry, RSVP)", "Mobile optimization"],
          },
          {
            title: "Design Direction",
            bullets: ["Monograms", "Digital Save the Date", "Custom Illustrations (Full)*", "RSVP Management"],
          },
          {
            title: "Setup & Technical",
            bullets: ["Website hosting for 12 months", "Custom domain connection", "Full website setup and launch"],
          },
          {
            title: "Process & Support",
            bullets: ["Up to 2 rounds of revisions", "One month of post-launch support"],
          },
        ].map((group) => (
          <div key={group.title}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: FONT_SECONDARY, marginBottom: "4px" }}>{group.title}</p>
            <ul className="space-y-1">
              {group.bullets.map((b) => (
                <li key={b} style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.6 }}>• {b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "investment",
    label: "INVESTMENT",
    content: (
      <div className="pt-3 pb-2 space-y-1">
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• starts at Php 50,000</p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• flexible monthly payment plans available</p>
      </div>
    ),
  },
  {
    id: "timeline",
    label: "TIMELINE",
    content: (
      <div className="pt-3 pb-2">
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• 1 – 3 months</p>
      </div>
    ),
  },
];

function PackageCard({
  title,
  description,
  accordionItems,
  ctaLabel,
  onCta,
}: {
  title: string;
  description: string;
  accordionItems: typeof semiItems;
  ctaLabel: string;
  onCta: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div
      className="flex flex-col h-full"
      style={{
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "16px",
        padding: "40px 36px",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <h3
        className="leading-tight mb-6"
        style={{
          fontFamily: FONT_PRIMARY,
          fontSize: "clamp(24px, 2.5vw, 34px)",
          fontWeight: 400,
          color: "#FFFFFF",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      <p
        className="mb-8"
        style={{
          fontFamily: FONT_SECONDARY,
          fontSize: "13px",
          fontWeight: 300,
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1.8,
        }}
      >
        {description}
      </p>

      {/* Accordion */}
      <div className="flex-1" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        {accordionItems.map((item) => (
          <div key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            <button
              className="w-full flex items-center justify-between cursor-pointer py-4"
              onClick={() => toggle(item.id)}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT_SECONDARY, letterSpacing: "0.1em", color: "rgba(255,255,255,0.75)" }}>
                {item.label}
              </span>
              <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>
                {openId === item.id ? "−" : "+"}
              </span>
            </button>
            {openId === item.id && (
              <div className="pb-2">{item.content}</div>
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8">
        <button
          onClick={onCta}
          className="w-full whitespace-nowrap cursor-pointer transition-all duration-200"
          style={{
            padding: "13px 24px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "999px",
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 500,
            fontFamily: FONT_SECONDARY,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default function MilestoneSection() {
  const [visible, setVisible] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleExplore = (e: React.MouseEvent) => {
    e.preventDefault();
    setPackagesOpen((prev) => {
      if (!prev) {
        setTimeout(() => {
          packagesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      return !prev;
    });
  };

  return (
    <section id="milestone" ref={ref} className="w-full" style={{ background: "#FFFFFF" }}>
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[640px]">
        {/* Left: Text content */}
        <div
          className="flex flex-col justify-center px-10 md:px-16 lg:px-20 py-20 lg:py-24"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(32px)",
            transition: "opacity 0.85s ease 0.1s, transform 0.85s ease 0.1s",
          }}
        >
          <h2
            className="leading-tight mb-8"
            style={{
              fontSize: "clamp(32px, 4.5vw, 56px)",
              fontWeight: 400,
              color: COLOR_DARK,
              fontFamily: FONT_PRIMARY,
              letterSpacing: "-0.01em",
            }}
          >
            Milestone Events<br />Website
          </h2>

          <div className="space-y-5 mb-7">
            <p style={{ fontSize: "14px", color: COLOR_BODY, lineHeight: 1.85, fontFamily: FONT_SECONDARY, fontWeight: 300 }}>
              Your event website sets the tone for everything to come.
              A quiet introduction to your celebration, from weddings to baby showers, and beyond.
            </p>
            <p style={{ fontSize: "14px", color: COLOR_BODY, lineHeight: 1.85, fontFamily: FONT_SECONDARY, fontWeight: 300 }}>
              We create bespoke digital experiences that are editorial in feel, immersive in
              presence, and intuitive in function. Every detail is considered, ensuring a
              seamless journey for your guests while expressing a visual identity that reflects
              each milestone beautifully.
            </p>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: COLOR_MID,
              lineHeight: 1.7,
              fontFamily: FONT_SECONDARY,
              fontWeight: 300,
              fontStyle: "italic",
              marginBottom: "40px",
            }}
          >
            Baby Shower, Bachelorette, Birthday, Bridal Shower, Engagement, Wedding,
            Brand Activations &amp; Launch Events, Corporate and more.
          </p>

          {/* CTA — rounded, toggles packages */}
          <div>
            <a
              href="#packages"
              onClick={handleExplore}
              className="whitespace-nowrap cursor-pointer inline-block transition-all duration-200"
              style={{
                padding: "12px 28px",
                background: packagesOpen ? COLOR_DARK : "transparent",
                border: `1px solid ${COLOR_DARK}`,
                color: packagesOpen ? "#FFFFFF" : COLOR_DARK,
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: FONT_SECONDARY,
                letterSpacing: "0.12em",
                textDecoration: "none",
                textTransform: "uppercase" as const,
                borderRadius: "999px",
              }}
              onMouseEnter={(e) => {
                if (!packagesOpen) {
                  (e.currentTarget as HTMLAnchorElement).style.background = COLOR_DARK;
                  (e.currentTarget as HTMLAnchorElement).style.color = "#FFFFFF";
                }
              }}
              onMouseLeave={(e) => {
                if (!packagesOpen) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = COLOR_DARK;
                }
              }}
            >
              {packagesOpen ? "HIDE PACKAGES" : "EXPLORE OUR PACKAGES"}
            </a>
          </div>
        </div>

        {/* Right: Full-bleed image */}
        <div
          className="relative w-full hidden lg:block"
          style={{
            minHeight: "640px",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.9s ease 0.25s",
          }}
        >
          <img
            src="https://readdy.ai/api/search-image?query=elegant%20smartphone%20mockup%20displaying%20a%20luxury%20wedding%20save%20the%20date%20event%20website%2C%20phone%20held%20against%20a%20warm%20beige%20stone%20textured%20background%20with%20soft%20natural%20light%2C%20minimal%20editorial%20product%20photography%2C%20neutral%20tones%20of%20sand%20cream%20taupe%20and%20warm%20grey%2C%20simple%20sophisticated%20design%2C%20high-end%20lifestyle%20photography%20style%2C%20no%20text%20overlay%2C%20clean%20composition&width=720&height=900&seq=milestone-phone-003&orientation=portrait"
            alt="Milestone event website preview"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>

      {/* Expandable packages panel */}
      <div
        ref={packagesRef}
        style={{
          maxHeight: packagesOpen ? "1400px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.7s ease",
        }}
      >
        <div
          id="packages"
          style={{ background: "#1E1E1E", padding: "80px 40px 90px" }}
        >
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-14">
              <h2
                style={{
                  fontFamily: FONT_PRIMARY,
                  fontSize: "clamp(32px, 5vw, 56px)",
                  fontWeight: 400,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                  marginBottom: "16px",
                }}
              >
                Event Website Packages
              </h2>
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "14px",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.7,
                  maxWidth: "500px",
                  margin: "0 auto",
                }}
              >
                Choose between two distinct design paths, each thoughtfully crafted for baby shower,
                bachelorette, birthday, bridal shower, engagement, weddings, and more.
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PackageCard
                title="Semi-Custom Milestone Events Website"
                description="Semi-custom wedding websites from our signature collections. Refined, cohesive, and thoughtfully streamlined for a quicker turnaround. Enjoy elevated design without the complexity of a fully bespoke project."
                accordionItems={semiItems}
                ctaLabel="EXPLORE THE COLLECTIONS"
                onCta={() => navigate("/collections")}
              />
              <PackageCard
                title="Bespoke Premium Milestone Events Website"
                description="For weddings requiring a more intricate structure, expanded functionality, and a higher level of personalisation. Crafted from the ground up, each website is bespoke, thoughtfully composed, and reflective of the depth and individuality of your celebration."
                accordionItems={bespokeItems}
                ctaLabel="BOOK A BESPOKE PROJECT"
                onCta={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}