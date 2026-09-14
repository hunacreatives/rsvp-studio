import type { ReactNode } from "react";
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
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <section className="pt-16 md:pt-28 pb-4" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-3xl">
            <h1
              className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {title}
            </h1>
            <p className="mt-3 text-sm text-[var(--slate)]">Last updated: {lastUpdated}</p>
            <div className="mt-6 text-[var(--slate)] leading-relaxed">{intro}</div>
          </div>
        </section>

        <section className="pb-24 pt-8" style={{ background: "var(--warm-white)" }}>
          <div
            className="container-x mx-auto max-w-3xl space-y-10 text-[15px] leading-relaxed text-[var(--slate)]
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
