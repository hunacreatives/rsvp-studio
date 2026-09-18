import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS, type NavItem } from "../nav-data";
import { lenisRef } from "@/lib/lenis";
import AuthModal from "./AuthModal";

const LOGO = "/brand/logotype-dark.png";

export default function Navbar({
  bannerVisible,
  forceDark,
}: {
  bannerVisible?: boolean;
  forceDark?: boolean;
}) {
  // bannerVisible / forceDark kept for backwards-compat with older pages.
  void bannerVisible;
  void forceDark;

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isCurrent = (to: string) => {
    const path = to.split("#")[0];
    if (!path || path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const [panelTop, setPanelTop] = useState(64);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      scrollYRef.current = window.scrollY;
      // Lenis keeps its own animated scroll target and fights a raw
      // window.scrollTo() by re-asserting its old position on the next
      // frame — use its own API to jump to top (scrollTo no-ops once
      // stopped, so this must happen before stop()) so the sticky header
      // (and this button) doesn't get dragged back off-screen.
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
        lenisRef.current.stop();
      } else {
        window.scrollTo(0, 0);
      }
      document.body.style.overflow = "hidden";
      // The panel sits below the header, but the header's own height varies
      // (announcement bar, banners, etc.) — measure it instead of guessing.
      const bottom = headerRef.current?.getBoundingClientRect().bottom;
      if (bottom) setPanelTop(bottom);
    } else {
      document.body.style.overflow = "";
      if (lenisRef.current) {
        lenisRef.current.start();
        lenisRef.current.scrollTo(scrollYRef.current, { immediate: true, force: true });
      } else {
        window.scrollTo(0, scrollYRef.current);
      }
    }
    return () => {
      document.body.style.overflow = "";
      lenisRef.current?.start();
    };
  }, [mobileOpen]);

  const go = (to: string) => {
    setOpenMega(null);
    setMobileOpen(false);
    setSearchOpen(false);
    const [path, hash] = to.split("#");
    navigate(path || "/");
    if (hash) {
      setTimeout(
        () => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }),
        350,
      );
    } else {
      window.scrollTo({ top: 0 });
    }
  };

  const activeItem: NavItem | undefined = NAV_ITEMS.find(
    (i) => i.label === openMega,
  );

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50"
      onMouseLeave={() => setOpenMega(null)}
    >
      <div
        className="transition-all duration-300"
        style={{
          background: "rgba(255,255,249,0.9)",
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`,
        }}
      >
        <div className="container-x flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              go("/");
            }}
            className="flex-shrink-0"
            aria-label="The RSVP Studio — home"
          >
            <img
              src={LOGO}
              alt="The RSVP Studio"
              className="h-9 md:h-10 w-auto"
              style={{ objectFit: "contain" }}
            />
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-9">
            {NAV_ITEMS.map((item) => {
              const current = isCurrent(item.to);
              return (
                <button
                  key={item.label}
                  onMouseEnter={() => setOpenMega(item.mega ? item.label : null)}
                  onFocus={() => setOpenMega(item.mega ? item.label : null)}
                  onClick={() => go(item.to)}
                  aria-current={current ? "page" : undefined}
                  className="relative py-2 text-[13px] tracking-wide transition-colors"
                  style={{
                    color:
                      openMega === item.label || current
                        ? "var(--acc-blue)"
                        : "var(--indigo)",
                    fontWeight: current ? 600 : 500,
                  }}
                >
                  {item.label}
                  <span
                    className="absolute left-0 -bottom-[1px] h-[2px] bg-[var(--acc-blue)] transition-all duration-300"
                    style={{
                      width:
                        openMega === item.label || current ? "100%" : "0%",
                    }}
                  />
                </button>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3 md:gap-4">
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="hidden md:grid place-items-center w-9 h-9 rounded-full transition-colors hover:bg-black/5"
              style={{ color: "var(--indigo)" }}
            >
              <i className="ri-search-line text-lg" />
            </button>
            <button
              onClick={() => setAuthOpen(true)}
              className="hidden md:inline-flex btn btn-dark !px-6 !py-3 !text-[12px]"
            >
              Login / Sign Up
            </button>
            <button
              aria-label="Menu"
              className="lg:hidden grid place-items-center w-10 h-10 -mr-2"
              onClick={() => setMobileOpen((v) => !v)}
              style={{ color: "var(--ink)" }}
            >
              <i className={`${mobileOpen ? "ri-close-line" : "ri-menu-line"} text-2xl`} />
            </button>
          </div>
        </div>

        {/* Search drawer */}
        {searchOpen && (
          <div className="hidden md:block border-t border-[var(--line)] bg-[var(--warm-white)]">
            <div className="container-x py-8">
              <div className="flex items-center gap-3 border-b border-[var(--ink)] pb-3 max-w-2xl">
                <i className="ri-search-line text-xl text-[var(--slate)]" />
                <input
                  autoFocus
                  placeholder="Search The RSVP Studio"
                  className="w-full bg-transparent outline-none text-lg font-display placeholder:text-[var(--slate)]"
                />
              </div>
              <p className="eyebrow mt-6 mb-3">Quick Links</p>
              <div className="flex gap-6">
                {["/services", "/collections"].map((to, i) => (
                  <button
                    key={to}
                    onClick={() => go(to)}
                    className="text-[var(--indigo)] hover:text-[var(--acc-blue)] transition-colors"
                  >
                    {["Services", "Collections"][i]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop mega panel */}
      {activeItem?.mega && (
        <div
          className="hidden lg:block absolute inset-x-0 top-full"
          onMouseEnter={() => setOpenMega(activeItem.label)}
        >
          <div
            className="border-y border-[var(--line)] shadow-[0_24px_48px_-24px_rgba(0,7,39,0.18)]"
            style={{ background: "var(--paper)" }}
          >
            <div className="container-x grid grid-cols-12 gap-10 py-12">
              <div className="col-span-4">
                <p className="eyebrow">{activeItem.mega.exploreEyebrow}</p>
                <button
                  onClick={() => go(activeItem.mega!.exploreCta.to)}
                  className="mt-3 font-display text-2xl font-semibold text-[var(--ink)] hover:text-[var(--acc-blue)] transition-colors text-left"
                >
                  {activeItem.mega.exploreCta.label}
                </button>
              </div>
              <div className="col-span-8 grid sm:grid-cols-2 gap-x-10 gap-y-8">
                {activeItem.mega.groups.map((group) => (
                  <div key={group.title}>
                    <p className="eyebrow mb-4">{group.title}</p>
                    <ul className="space-y-3">
                      {group.links.map((l) => (
                        <li key={l.label}>
                          <button
                            onClick={() => go(l.to)}
                            className="text-[15px] text-[var(--indigo)] hover:text-[var(--acc-blue)] transition-colors text-left"
                          >
                            {l.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile panel */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 bg-[var(--warm-white)] overflow-y-auto"
          style={{ top: panelTop }}
        >
          <div className="container-x py-6">
            {NAV_ITEMS.map((item) => {
              const expanded = mobileSection === item.label;
              return (
                <div key={item.label} className="border-b border-[var(--line)]">
                  <button
                    className="w-full flex items-center justify-between py-4 text-lg font-display"
                    onClick={() =>
                      item.mega
                        ? setMobileSection(expanded ? null : item.label)
                        : go(item.to)
                    }
                  >
                    <span
                      style={
                        isCurrent(item.to)
                          ? { color: "var(--acc-blue)", fontWeight: 600 }
                          : undefined
                      }
                    >
                      {item.label}
                    </span>
                    {item.mega && (
                      <i
                        className={`ri-arrow-down-s-line text-xl transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>
                  {item.mega && expanded && (
                    <div className="pb-5 pl-1 space-y-5">
                      <button
                        onClick={() => go(item.mega!.exploreCta.to)}
                        className="block text-[15px] font-medium text-[var(--acc-blue)]"
                      >
                        {item.mega.exploreCta.label}
                      </button>
                      {item.mega.groups.map((group) => (
                        <div key={group.title}>
                          <p className="eyebrow mb-2">{group.title}</p>
                          <ul className="space-y-2.5">
                            {group.links.map((l) => (
                              <li key={l.label}>
                                <button
                                  onClick={() => go(l.to)}
                                  className="text-[15px] text-[var(--indigo)] text-left"
                                >
                                  {l.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              onClick={() => {
                setMobileOpen(false);
                setAuthOpen(true);
              }}
              className="btn btn-dark w-full mt-8"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
