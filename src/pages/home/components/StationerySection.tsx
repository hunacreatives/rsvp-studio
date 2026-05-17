import { useEffect, useRef, useState } from "react";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_BODY = "#5a5a5a";
const COLOR_SAND = "#DFDACF";

const serviceAccordion = [
  {
    id: "includes",
    label: "WHAT'S INCLUDED",
    content: (
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 pt-3 pb-1">
        <ul className="space-y-1">
          {["Venue illustration", "Menu cards", "Place cards"].map((item) => (
            <li key={item} style={{ fontSize: "13px", color: COLOR_BODY, fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• {item}</li>
          ))}
        </ul>
        <ul className="space-y-1">
          {["Order of service", "Table numbers", "Welcome signage"].map((item) => (
            <li key={item} style={{ fontSize: "13px", color: COLOR_BODY, fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• {item}</li>
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
          Stationery suite pricing upon request.<br />Individual pieces from Php 1,500.
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
          2 – 4 weeks depending on suite size
        </p>
      </div>
    ),
  },
];

const semiStationeryItems = [
  {
    id: "includes",
    label: "WHAT'S INCLUDED",
    content: (
      <div className="space-y-4 pt-3 pb-2">
        {[
          { title: "Stationery Items", bullets: ["Menu cards", "Place cards", "Table numbers", "Welcome card"] },
          { title: "Design", bullets: ["Based on existing template suite", "Personalised with your names, date & colours"] },
          { title: "Process & Support", bullets: ["Up to 1 round of revision", "Print-ready files provided"] },
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
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• starts at Php 3,500 per suite</p>
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

const bespokeStationeryItems = [
  {
    id: "includes",
    label: "WHAT'S INCLUDED",
    content: (
      <div className="space-y-4 pt-3 pb-2">
        {[
          { title: "Stationery Items", bullets: ["Venue illustration", "Menu cards", "Place cards", "Order of service", "Table numbers", "Welcome signage", "Favour tags"] },
          { title: "Design", bullets: ["Fully custom illustrated suite", "Unique to your event identity", "Coordinated with your event website"] },
          { title: "Process & Support", bullets: ["Up to 2 rounds of revision", "Print-ready files + printing coordination available"] },
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
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• starts at Php 12,000 for full suite</p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• individual pieces from Php 1,500</p>
      </div>
    ),
  },
  {
    id: "timeline",
    label: "TIMELINE",
    content: (
      <div className="pt-3 pb-2">
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: FONT_SECONDARY, fontWeight: 300, lineHeight: 1.7 }}>• 2 – 4 weeks depending on suite size</p>
      </div>
    ),
  },
];

function PackageCard({ title, description, accordionItems, ctaLabel, onCta }: {
  title: string;
  description: string;
  accordionItems: { id: string; label: string; content: React.ReactNode }[];
  ctaLabel: string;
  onCta: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="flex flex-col h-full" style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "40px 36px", background: "rgba(255,255,255,0.04)" }}>
      <h3 className="leading-tight mb-6" style={{ fontFamily: FONT_PRIMARY, fontSize: "clamp(24px, 2.5vw, 34px)", fontWeight: 400, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <p className="mb-8" style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
        {description}
      </p>
      <div className="flex-1" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        {accordionItems.map((item) => (
          <div key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            <button className="w-full flex items-center justify-between cursor-pointer py-4" onClick={() => toggle(item.id)}>
              <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT_SECONDARY, letterSpacing: "0.1em", color: "rgba(255,255,255,0.75)" }}>{item.label}</span>
              <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.5)", lineHeight: 1 }}>{openId === item.id ? "−" : "+"}</span>
            </button>
            {openId === item.id && <div className="pb-2">{item.content}</div>}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <button
          onClick={onCta}
          className="w-full whitespace-nowrap cursor-pointer transition-all duration-200"
          style={{ padding: "13px 24px", background: "transparent", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "999px", color: "#FFFFFF", fontSize: "11px", fontWeight: 500, fontFamily: FONT_SECONDARY, letterSpacing: "0.12em", textTransform: "uppercase" as const }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default function StationerySection() {
  const [visible, setVisible] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const handlePackages = (e: React.MouseEvent) => {
    e.preventDefault();
    setPackagesOpen((prev) => {
      if (!prev) setTimeout(() => packagesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return !prev;
    });
  };

  return (
    <section id="stationery" ref={ref} className="w-full" style={{ background: "#FFFFFF" }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[640px]">
        {/* Left: Text content */}
        <div
          className="flex flex-col justify-center px-10 md:px-16 lg:px-20 py-20 lg:py-24"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(32px)", transition: "opacity 0.85s ease 0.1s, transform 0.85s ease 0.1s" }}
        >
          <h2 className="leading-tight mb-7" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 400, color: COLOR_DARK, fontFamily: FONT_PRIMARY, letterSpacing: "-0.01em" }}>
            Bespoke<br />Stationery
          </h2>

          <div className="space-y-5 mb-8">
            <p style={{ fontSize: "14px", color: COLOR_BODY, lineHeight: 1.85, fontFamily: FONT_SECONDARY, fontWeight: 300 }}>
              Bespoke hand-drawn illustrations and printed stationery suites that bring
              a personal, artistic touch to your event. From venue illustrations to full
              stationery suites — menus, place cards, order of service, and more.
            </p>
            <p style={{ fontSize: "14px", color: COLOR_BODY, lineHeight: 1.85, fontFamily: FONT_SECONDARY, fontWeight: 300 }}>
              Each piece is designed to complement your event website, creating a seamless
              visual experience from the first digital impression to the last printed keepsake.
            </p>
          </div>

          {/* Accordion */}
          <div className="mb-10" style={{ borderTop: `1px solid ${COLOR_SAND}` }}>
            {serviceAccordion.map((item) => (
              <div key={item.id} style={{ borderBottom: `1px solid ${COLOR_SAND}` }}>
                <button className="w-full flex items-center justify-between cursor-pointer py-4" onClick={() => toggle(item.id)}>
                  <span style={{ fontSize: "11px", fontWeight: 600, fontFamily: FONT_SECONDARY, letterSpacing: "0.1em", color: COLOR_DARK }}>{item.label}</span>
                  <span style={{ fontSize: "18px", color: COLOR_MID, lineHeight: 1 }}>{openId === item.id ? "−" : "+"}</span>
                </button>
                {openId === item.id && <div className="pb-4">{item.content}</div>}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div>
            <a
              href="#stationery-packages"
              onClick={handlePackages}
              className="whitespace-nowrap cursor-pointer inline-block transition-all duration-200"
              style={{ padding: "12px 28px", background: packagesOpen ? COLOR_DARK : "transparent", border: `1px solid ${COLOR_DARK}`, color: packagesOpen ? "#FFFFFF" : COLOR_DARK, fontSize: "11px", fontWeight: 500, fontFamily: FONT_SECONDARY, letterSpacing: "0.12em", textDecoration: "none", textTransform: "uppercase" as const, borderRadius: "999px" }}
              onMouseEnter={(e) => { if (!packagesOpen) { (e.currentTarget as HTMLAnchorElement).style.background = COLOR_DARK; (e.currentTarget as HTMLAnchorElement).style.color = "#FFFFFF"; } }}
              onMouseLeave={(e) => { if (!packagesOpen) { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.color = COLOR_DARK; } }}
            >
              {packagesOpen ? "HIDE PACKAGES" : "EXPLORE OUR PACKAGES"}
            </a>
          </div>
        </div>

        {/* Right: Full-bleed image */}
        <div className="relative w-full hidden lg:block" style={{ minHeight: "640px", opacity: visible ? 1 : 0, transition: "opacity 0.9s ease 0.25s" }}>
          <img
            src="https://readdy.ai/api/search-image?query=luxury%20wedding%20stationery%20suite%20flat%20lay%20with%20hand%20drawn%20venue%20illustration%20menu%20cards%20and%20place%20cards%20on%20warm%20cream%20textured%20paper%20background%2C%20elegant%20botanical%20illustration%20style%2C%20soft%20natural%20lighting%2C%20editorial%20product%20photography%2C%20warm%20ivory%20beige%20and%20sage%20green%20tones%2C%20refined%20artisan%20craftsmanship%2C%20premium%20paper%20texture%20visible&width=720&height=900&seq=stationery-right-006&orientation=portrait"
            alt="Bespoke stationery suite"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>

      {/* Expandable packages panel */}
      <div
        ref={packagesRef}
        id="stationery-packages"
        style={{ maxHeight: packagesOpen ? "5000px" : "0px", overflow: "hidden", transition: "max-height 0.9s ease" }}
      >
        <div style={{ background: "#F5F2EC", padding: "80px 24px 100px" }}>
          <div className="max-w-2xl mx-auto">

            {/* Collection 1 — The Essential Collection */}
            <div className="text-center mb-16">
              {/* Script title with sparkles */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <span style={{ color: "#C9A84C", fontSize: "22px" }}>✦✦</span>
                <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: "clamp(30px, 4vw, 44px)", color: "#2a2a2a", fontWeight: 400 }}>The Essential Collection</span>
                <span style={{ color: "#C9A84C", fontSize: "22px" }}>✦✦</span>
              </div>
              <p style={{ fontFamily: FONT_PRIMARY, fontSize: "17px", fontStyle: "italic", color: "#2a2a2a", fontWeight: 400, marginBottom: "24px" }}>Start small, start personal.</p>
              <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.85, maxWidth: "580px", margin: "0 auto 40px" }}>
                A thoughtfully crafted three-piece invitation suite designed for couples who want something intimate,<br />
                meaningful, and beautifully personal without too many extras.<br />
                Perfect for understated celebrations with a refined artistic touch.
              </p>

              {/* Details rows */}
              <div className="space-y-8">
                {[
                  { label: "The Wedding Day", value: "Main Invitation, Entourage Card, Details Card" },
                  { label: "The Artwork", value: "Couple\u2019s Logo / Monogram\n3 Hand-drawn Illustrations, Artwork may be used across up to 4 stationery layouts" },
                  { label: "Investment", value: "Php 8,500" },
                ].map((row) => (
                  <div key={row.label} className="text-center">
                    <p style={{ fontFamily: FONT_PRIMARY, fontSize: "15px", fontWeight: 500, color: "#2a2a2a", marginBottom: "4px" }}>{row.label}</p>
                    {row.value.split("\n").map((line, i) => (
                      <p key={i} style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.7 }}>{line}</p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="mt-12 text-center">
                <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: "#9a9a9a", fontWeight: 300, lineHeight: 2 }}>
                  Notes:<br />
                  One (1) format is included per project: either print-ready or website format<br />
                  Posted rates apply to design and illustration services only<br />
                  Printing costs are not included<br />
                  Prices are subject to change without prior notice
                </p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #d8d4cc", margin: "0 0 80px" }} />

            {/* Collection 2 — The Signature Collection */}
            <div className="text-center">
              {/* Script title with leaves */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <span style={{ fontSize: "28px" }}>🌿</span>
                <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: "clamp(30px, 4vw, 44px)", color: "#2a2a2a", fontWeight: 400 }}>The Signature Collection</span>
                <span style={{ fontSize: "28px" }}>🌿</span>
              </div>
              <p style={{ fontFamily: FONT_PRIMARY, fontSize: "17px", fontStyle: "italic", color: "#2a2a2a", fontWeight: 400, marginBottom: "24px" }}>A more detailed story, beautifully illustrated.</p>
              <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.85, maxWidth: "580px", margin: "0 auto 40px" }}>
                Designed for couples who want a more elevated and expressive stationery experience, with custom<br />
                artwork woven throughout multiple pieces of the celebration.<br />
                Ideal for destination weddings, multi-day events, or couples who love thoughtful details.
              </p>

              {/* Details rows */}
              <div className="space-y-8">
                {[
                  { label: "The Wedding Day", value: "Main Invitation, Entourage, Details Card, Directions/Map, RSVP Card" },
                  { label: "The Artwork", value: "Couple\u2019s Logo\n4 Hand-drawn illustrations, which can be used across up to 6 stationery layouts" },
                  { label: "Investment", value: "Php 10,000" },
                ].map((row) => (
                  <div key={row.label} className="text-center">
                    <p style={{ fontFamily: FONT_PRIMARY, fontSize: "15px", fontWeight: 500, color: "#2a2a2a", marginBottom: "4px" }}>{row.label}</p>
                    {row.value.split("\n").map((line, i) => (
                      <p key={i} style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.7 }}>{line}</p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="mt-12 text-center">
                <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: "#9a9a9a", fontWeight: 300, lineHeight: 2 }}>
                  Notes:<br />
                  One (1) format is included per project: either print-ready or website format<br />
                  Posted rates apply to design and illustration services only<br />
                  Printing costs are not included<br />
                  Prices are subject to change without prior notice
                </p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #d8d4cc", margin: "80px 0" }} />

            {/* Collection 3 — The Bespoke Collection */}
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-3 mb-3">
                <span style={{ fontSize: "32px" }}>🥂</span>
                <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: "clamp(30px, 4vw, 44px)", color: "#2a2a2a", fontWeight: 400 }}>The Bespoke Collection</span>
                <span style={{ fontSize: "32px" }}>🕊️</span>
              </div>
              <p style={{ fontFamily: FONT_PRIMARY, fontSize: "17px", fontStyle: "italic", color: "#2a2a2a", fontWeight: 400, marginBottom: "24px" }}>An immersive illustrated world, created entirely around your celebration.</p>
              <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.85, maxWidth: "580px", margin: "0 auto 40px" }}>
                A fully custom stationery experience with layered artwork, meaningful details, and a cohesive visual story<br />
                carried across every touchpoint of your event.<br />
                Perfect for couples who want heirloom-worthy pieces with a highly personalised feel.
              </p>

              <div className="space-y-8">
                {[
                  {
                    label: "The Wedding Day",
                    value: "Invitation Suite: Main Invitation, Entourage, Details Card, Directions/Map, Timeline, RSVP Card\nDay-of Papers: Menu, Bar/Cocktails, Place Cards, Table Numbers, Favor Tags, Welcome Signage,\nSeating Chart, LED Wall Layout",
                  },
                  {
                    label: "The Post-Wedding:",
                    value: "Thank You Card",
                  },
                  {
                    label: "The Artwork",
                    value: "Couple\u2019s Logo\n10 Hand-drawn illustrations, which can be used across up to 16 stationery layouts",
                  },
                  {
                    label: "Investment",
                    value: "Php 30,000",
                  },
                ].map((row) => (
                  <div key={row.label} className="text-center">
                    <p style={{ fontFamily: FONT_PRIMARY, fontSize: "15px", fontWeight: 500, color: "#2a2a2a", marginBottom: "4px" }}>{row.label}</p>
                    {row.value.split("\n").map((line, i) => (
                      <p key={i} style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.7 }}>{line}</p>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: "#9a9a9a", fontWeight: 300, lineHeight: 2 }}>
                  Notes:<br />
                  One (1) format is included per project: either print-ready or website format<br />
                  Posted rates apply to design and illustration services only<br />
                  Printing costs are not included<br />
                  Prices are subject to change without prior notice
                </p>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #d8d4cc", margin: "0 0 80px" }} />

            {/* Other Services */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: "clamp(28px, 3.5vw, 40px)", color: "#2a2a2a", fontWeight: 400 }}>Other Services</span>
              </div>
              <p style={{ fontFamily: FONT_PRIMARY, fontSize: "17px", fontWeight: 500, color: "#2a2a2a", marginBottom: "16px" }}>Beyond Invitations</p>
              <p style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.85, maxWidth: "520px", margin: "0 auto 32px" }}>
                Additional paper pieces designed to carry your story beyond the invitation suite, thoughtfully created to
                match the overall look and feel of your celebration.
              </p>
              <div className="space-y-1 mb-12">
                {["Save the Date", "Seating Chart", "Playing Cards", "...and more"].map((item) => (
                  <p key={item} style={{ fontFamily: FONT_SECONDARY, fontSize: "13px", fontWeight: 300, color: "#5a5a5a", lineHeight: 1.8 }}>{item}</p>
                ))}
              </div>
              <button
                onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                className="whitespace-nowrap cursor-pointer inline-block transition-all duration-200"
                style={{ padding: "14px 40px", background: COLOR_MID, border: "none", borderRadius: "999px", color: "#FFFFFF", fontSize: "11px", fontWeight: 500, fontFamily: FONT_SECONDARY, letterSpacing: "0.14em", textTransform: "uppercase" as const }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = COLOR_DARK; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = COLOR_MID; }}
              >
                DISCOVER THE PROCESS
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}