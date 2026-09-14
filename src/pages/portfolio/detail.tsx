import { Link, Navigate, useParams } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import DeviceFrame from "./components/DeviceFrame";
import { WORKS } from "./works";

export default function PortfolioDetail() {
  const { slug } = useParams();
  const work = WORKS.find((w) => w.slug === slug);

  if (!work) return <Navigate to="/portfolio" replace />;

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <section
          className="pt-20 md:pt-28 pb-12 text-center"
          style={{ background: "var(--warm-white)" }}
        >
          <div className="container-x">
            <Link
              to="/portfolio"
              className="block text-left text-xs font-medium uppercase tracking-[0.12em] text-[var(--slate)] hover:text-[var(--ink)]"
            >
              ← Back to Featured Work
            </Link>
            <h1
              className="mx-auto mt-6 max-w-3xl text-balance font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontSize: "clamp(2rem, 4.6vw, 3.6rem)" }}
            >
              {work.title}
            </h1>
            <p className="eyebrow mt-4">{work.meta}</p>
          </div>
        </section>

        <section className="pb-16" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-5xl">
            <div className="flex flex-col items-center gap-y-16">
              <div
                className="flex flex-col items-center"
                style={{ "--frame-h": "clamp(340px, 42vw, 520px)" } as React.CSSProperties}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">
                  Desktop
                </p>
                <DeviceFrame type="laptop" src={work.liveUrl!} title={`${work.title} — desktop`} />
              </div>
              <div
                className="flex flex-col items-center"
                style={{ "--frame-h": "clamp(460px, 56vw, 600px)" } as React.CSSProperties}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">
                  Mobile
                </p>
                <DeviceFrame type="phone" src={work.liveUrl!} title={`${work.title} — mobile`} />
              </div>
            </div>
            <p className="mx-auto mt-10 max-w-xl text-center text-lg text-[var(--slate)] md:text-xl">
              {work.description}
            </p>
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
