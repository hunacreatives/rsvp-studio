import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";

/** 404 for unknown pages, plus a gentler message for invitation links. */
export default function NotFound() {
  const { pathname } = useLocation();
  const isInvite = pathname.startsWith("/invite/");
  // not a page: kept out of search results, and no canonical pointing at it
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    canonical?.remove();
    return () => robots.remove();
  }, [pathname]);

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <main className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow">{isInvite ? "Invitation" : "404"}</p>
        <h1 className="mt-3 font-display text-[2.2rem] font-semibold leading-tight text-[var(--ink)] md:text-[3rem]">
          {isInvite ? "This invitation isn’t available" : "We couldn’t find that page"}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[16px] text-[var(--slate)]">
          {isInvite
            ? "The link may be mistyped, or the host hasn’t published their site yet. Double-check the link you were sent, or ask the host for a new one."
            : "The link may be broken or the page may have moved."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">Go to homepage</Link>
          {isInvite ? null : <Link to="/faqs" className="btn btn-ghost">Visit FAQs</Link>}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
