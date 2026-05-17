import { useNavigate } from "react-router-dom";

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_BG = "#4D403A";
const COLOR_TEXT = "rgba(255,255,255,0.85)";
const COLOR_MUTED = "rgba(255,255,255,0.5)";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Collections", href: "/collections" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "FAQ", href: "/faqs" },
  { label: "Enquire", href: "/enquire" },
];

export default function FooterSection() {
  const navigate = useNavigate();

  const handleNav = (href: string) => {
    if (href.startsWith("/") && !href.startsWith("/#")) {
      navigate(href);
    } else {
      const id = href.replace("#", "");
      if (window.location.pathname !== "/") {
        navigate("/");
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 300);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer style={{ background: COLOR_BG, padding: "28px 40px 20px" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-3 items-start gap-8">

          {/* Left: Logo */}
          <div className="flex items-start">
            <img
              src="https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/d93d6eb65f2609b96c00a4e84b115b64.png"
              alt="Huna Events"
              style={{ height: "90px", width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9 }}
            />
          </div>

          {/* Center: Tagline + Nav */}
          <div className="flex flex-col items-center gap-5">
            <p
              style={{
                fontFamily: FONT_PRIMARY,
                fontSize: "22px",
                fontWeight: 400,
                color: COLOR_TEXT,
                letterSpacing: "0.01em",
                textAlign: "center",
              }}
            >
              Check in, stay in awhile
            </p>
            <nav className="flex items-center gap-6 flex-wrap justify-center">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => { e.preventDefault(); handleNav(link.href); }}
                  className="cursor-pointer whitespace-nowrap transition-opacity duration-200 hover:opacity-100"
                  style={{
                    fontFamily: FONT_SECONDARY,
                    fontSize: "14px",
                    fontWeight: 300,
                    color: COLOR_MUTED,
                    textDecoration: "none",
                    letterSpacing: "0.02em",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Right: Contact + Social */}
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "16px",
                  fontWeight: 500,
                  color: COLOR_TEXT,
                  letterSpacing: "0.04em",
                  marginBottom: "4px",
                }}
              >
                Contact
              </p>
              <a
                href="mailto:contact.hunaevents@gmail.com"
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontSize: "14px",
                  fontWeight: 300,
                  color: COLOR_MUTED,
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}
              >
                contact.hunaevents@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {[
                { icon: "ri-facebook-fill", href: "https://facebook.com" },
                { icon: "ri-instagram-line", href: "https://instagram.com" },
                { icon: "ri-linkedin-fill", href: "https://linkedin.com" },
              ].map((s) => (
                <a
                  key={s.icon}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="w-8 h-8 flex items-center justify-center cursor-pointer transition-opacity duration-200 hover:opacity-100"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  <i className={`${s.icon} text-base`} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <p style={{ fontFamily: FONT_SECONDARY, fontSize: "11px", color: COLOR_MUTED, fontWeight: 300 }}>
            &copy; 2026 Huna Events. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}