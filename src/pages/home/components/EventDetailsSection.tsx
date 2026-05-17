import { useEffect, useRef, useState } from "react";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_BODY = "#5a5a5a";
const COLOR_SAND = "#DFDACF";

const accordionItems = [
  {
    id: "includes",
    label: "WHAT'S INCLUDED",
    content: (
      <div className="pt-3 pb-1">
        <ul className="space-y-2">
          {[
            "RSVP collection through your milestone event website, with all responses tracked in real time",
            "A consolidated guest list, organised in a shared Google Sheet for easy access and updates",
            "Gentle reminder emails sent to guests who haven\u2019t yet responded",
          ].map((item) => (
            <li key={item} style={{ fontSize: "13px", color: COLOR_BODY, fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>
              • {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "investment",
    label: "INVESTMENT",
    content: (
      <div className="pt-3 pb-1">
        <p style={{ fontSize: "13px", color: COLOR_BODY, fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.8 }}>
          from Php 2,800 (150 guests)
        </p>
      </div>
    ),
  },
  {
    id: "timeline",
    label: "TIMELINE",
    content: (
      <div className="pt-3 pb-1">
        <p style={{ fontSize: "13px", color: COLOR_BODY, fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.8 }}>
          1 week
        </p>
      </div>
    ),
  },
];

export default function EventDetailsSection() {
  const [visible, setVisible] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <section id="rsvp-management" ref={ref} className="w-full" style={{ background: "#FAFAF8" }}>
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
            className="leading-tight mb-7"
            style={{
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 400,
              color: COLOR_DARK,
              fontFamily: FONT_PRIMARY,
              letterSpacing: "-0.01em",
            }}
          >
            RSVP Management
          </h2>

          <div className="space-y-5 mb-8">
            <p style={{ fontSize: "14px", color: COLOR_BODY, lineHeight: 1.85, fontFamily: FONT_SECONDARY, fontWeight: 300 }}>
              Our RSVP Management service is designed to bring ease and clarity to one of
              the most detailed parts of event planning. We thoughtfully manage guest
              responses through your website, ensuring every RSVP is tracked, organized, and
              gently followed up when needed.
            </p>
            <p style={{ fontSize: "14px", color: COLOR_BODY, lineHeight: 1.85, fontFamily: FONT_SECONDARY, fontWeight: 300 }}>
              With careful oversight and a seamless system in place, you can stay informed and
              focused on the celebration itself, without the stress of chasing replies or
              managing spreadsheets on your own.
            </p>
          </div>

          {/* Accordion */}
          <div className="mb-10" style={{ borderTop: `1px solid ${COLOR_SAND}` }}>
            {accordionItems.map((item) => (
              <div key={item.id} style={{ borderBottom: `1px solid ${COLOR_SAND}` }}>
                <button
                  className="w-full flex items-center justify-between cursor-pointer py-4"
                  onClick={() => toggle(item.id)}
                >
                  <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT_SECONDARY, letterSpacing: "0.1em", color: COLOR_DARK }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "18px", color: COLOR_MID, lineHeight: 1 }}>
                    {openId === item.id ? "−" : "+"}
                  </span>
                </button>
                {openId === item.id && (
                  <div className="pb-4">{item.content}</div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div>
            <a
              href="#contact"
              onClick={(e) => { e.preventDefault(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}
              className="whitespace-nowrap cursor-pointer inline-block transition-all duration-200"
              style={{
                padding: "12px 28px",
                background: "transparent",
                border: `1px solid ${COLOR_DARK}`,
                color: COLOR_DARK,
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: FONT_SECONDARY,
                letterSpacing: "0.12em",
                textDecoration: "none",
                textTransform: "uppercase" as const,
                borderRadius: "999px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = COLOR_DARK;
                (e.currentTarget as HTMLAnchorElement).style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = COLOR_DARK;
              }}
            >
              ENQUIRE
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
            src="https://readdy.ai/api/search-image?query=person%20sitting%20on%20a%20cream%20white%20boucle%20sofa%20holding%20open%20laptop%20macbook%20showing%20a%20website%2C%20dark%20clothing%2C%20warm%20neutral%20interior%20background%2C%20soft%20natural%20light%2C%20editorial%20lifestyle%20photography%2C%20muted%20beige%20ivory%20and%20warm%20white%20tones%2C%20minimal%20sophisticated%20composition%2C%20high%20end%20product%20photography%2C%20top%20down%20angle%20view&width=720&height=900&seq=rsvp-right-008&orientation=portrait"
            alt="RSVP Management"
            className="w-full h-full object-cover object-top"
          />
        </div>

      </div>
    </section>
  );
}