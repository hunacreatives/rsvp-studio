import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const navLinks = [
  { label: "HOME", href: "/", page: "/" },
  { label: "SERVICES", href: "/services", page: "/services" },
  { label: "COLLECTIONS", href: "/collections", page: "/collections" },
  { label: "PORTFOLIO", href: "/portfolio", page: "/portfolio" },
  { label: "FAQ", href: "/faqs", page: "/faqs" },
];

const FONT_PRIMARY = "'Playfair Display', Georgia, serif";
const FONT_SECONDARY = "'Jost', sans-serif";
const COLOR_DARK = "#262626";
const COLOR_MID = "#4D403A";
const COLOR_WARM = "#A3968D";

const BANNER_HEIGHT = 40;

export default function Navbar({
  bannerVisible = false,
  forceDark = false,
}: {
  bannerVisible?: boolean;
  forceDark?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isDark = forceDark || scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNav = (link: { href: string; page: string } | string) => {
    setMenuOpen(false);
    const href = typeof link === "string" ? link : link.href;
    if (href.startsWith("#")) {
      const id = href.replace("#", "");
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 350);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(href);
    }
  };

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-50 transition-all duration-500"
        style={{
          top: bannerVisible ? `${BANNER_HEIGHT}px` : "0px",
          background: "rgba(255,255,255,0.97)",
          borderBottom: `1px solid #DFDACF`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-14 md:h-16 overflow-visible">
          {/* Logo — allowed to overflow nav height */}
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate("/"); }}
            className="flex-shrink-0 flex items-center"
            style={{ overflow: "visible" }}
          >
            <img
              src="https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/d93d6eb65f2609b96c00a4e84b115b64.png"
              alt="Huna Events"
              style={{
                height: "72px",
                width: "auto",
                objectFit: "contain",
                filter: "brightness(0.1)",
                display: "block",
              }}
            />
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNav(link); }}
                className="transition-colors duration-200 cursor-pointer whitespace-nowrap"
                style={{
                  fontFamily: FONT_SECONDARY,
                  fontWeight: 400,
                  letterSpacing: "0.1em",
                  color: COLOR_MID,
                  textDecoration: "none",
                  textTransform: "uppercase" as const,
                  fontSize: "11px",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.color = COLOR_DARK;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.color = COLOR_MID;
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center">
            <a
              href="/enquire"
              onClick={(e) => { e.preventDefault(); navigate("/enquire"); }}
              className="whitespace-nowrap cursor-pointer transition-all duration-200 hover:opacity-80"
              style={{
                padding: "8px 20px",
                background: "transparent",
                border: `1px solid ${COLOR_DARK}`,
                borderRadius: "999px",
                color: COLOR_DARK,
                fontSize: "11px",
                fontWeight: 500,
                fontFamily: FONT_SECONDARY,
                letterSpacing: "0.1em",
                textDecoration: "none",
              }}
            >
              ENQUIRE
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: COLOR_DARK }}
          >
            <i className={`${menuOpen ? "ri-close-line" : "ri-menu-line"} text-xl`} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden"
            style={{
              background: "#FAF8F5",
              borderTop: `1px solid #DFDACF`,
              padding: "16px 24px 24px",
            }}
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNav(link); }}
                className="block py-3 text-sm cursor-pointer"
                style={{
                  fontFamily: FONT_SECONDARY,
                  color: COLOR_MID,
                  textDecoration: "none",
                  borderBottom: `1px solid #DFDACF`,
                  letterSpacing: "0.04em",
                }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="/enquire"
              onClick={(e) => { e.preventDefault(); navigate("/enquire"); setMenuOpen(false); }}
              className="block mt-4 text-center py-3 text-sm cursor-pointer"
              style={{
                background: COLOR_DARK,
                borderRadius: "3px",
                color: "#FFFFFF",
                fontFamily: FONT_SECONDARY,
                textDecoration: "none",
                letterSpacing: "0.08em",
              }}
            >
              ENQUIRE
            </a>
          </div>
        )}
      </nav>
    </>
  );
}
