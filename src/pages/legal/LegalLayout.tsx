import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { lenisRef } from "@/lib/lenis";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";

export default function LegalLayout({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  // "On this page" list built from the section headings, so long legal text
  // is easy to jump around on a phone.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [toc, setToc] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    const hs = Array.from(bodyRef.current?.querySelectorAll("h2") ?? []);
    setToc(
      hs.map((h, i) => {
        if (!h.id) h.id = `section-${i + 1}`;
        return { id: h.id, label: h.textContent ?? "" };
      }),
    );
  }, [children]);
  const jump = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    // Lenis fights raw scrolls, so go through it when it's running.
    if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -88 });
    else el.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <section className="pt-16 md:pt-28 pb-4" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-3xl">
            <h1
              className="text-balance font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {title}
            </h1>
            <p className="mt-3 text-sm text-[var(--slate)]">Last updated: {lastUpdated}</p>
            <div className="mt-6 text-base leading-[1.7] text-[#4a4a5c]">{intro}</div>
            {toc.length > 1 && (
              <details className="group mt-8 rounded-xl border border-[var(--line)] bg-white">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 text-sm font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                  On this page
                  <i className="ri-arrow-down-s-line text-xl transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ol className="border-t border-[var(--line)] px-2 py-2">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        onClick={(e) => jump(e, t.id)}
                        className="flex min-h-[44px] items-center rounded-lg px-2 text-[15px] text-[var(--ink)] hover:bg-[var(--paper)]"
                      >
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </section>

        <section className="pb-24 pt-8" style={{ background: "var(--warm-white)" }}>
          <div
            ref={bodyRef}
            className="container-x mx-auto max-w-3xl space-y-10 text-base leading-[1.7] text-[#4a4a5c]
              [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--ink)] [&_h2]:mb-3
              [&_h3]:font-semibold [&_h3]:text-[var(--ink)] [&_h3]:mt-4 [&_h3]:mb-1
              [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5
              [&_a]:text-[var(--ink)] [&_a]:underline [&_a]:underline-offset-4"
          >
            {children}
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
