import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { inquiryLink } from "@/pages/enquire/prefill";
import { CATEGORY_HASH, inquiryFor } from "./inquiry";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import DeviceFrame from "./components/DeviceFrame";
import { WORKS } from "./works";

export default function PortfolioDetail() {
  const { slug } = useParams();
  const work = WORKS.find((w) => w.slug === slug);
  const navigate = useNavigate();

  // Only delivered sites have a case study page; anything else asks about it instead.
  if (!work) return <Navigate to="/portfolio" replace />;
  if (!work.liveUrl) return <Navigate to={inquiryLink(inquiryFor(work))} replace />;

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
              to={`/portfolio#${CATEGORY_HASH[work.category]}`}
              className="-ml-1 flex min-h-[44px] w-fit items-center px-1 text-left text-xs font-medium uppercase tracking-[0.12em] text-[var(--slate)] hover:text-[var(--ink)]"
            >
              ← Back to Featured Work
            </Link>
            <h1
              className="mx-auto mt-3 max-w-3xl text-balance sm:mt-6 font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontSize: "clamp(2rem, 4.6vw, 3.6rem)" }}
            >
              {work.title}
            </h1>
            <p className="eyebrow mt-4 text-balance">{work.meta}</p>
            <a
              href={work.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-dark mt-6 w-full max-w-sm sm:w-auto"
            >
              Visit the live site ↗
            </a>
          </div>
        </section>

        <section className="pb-16" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-5xl">
            <div className="flex flex-col items-center gap-y-12 sm:gap-y-16">
              <div
                className="flex flex-col items-center"
                style={{ "--frame-h": "min(520px, max(340px, 42vw), calc(52vw - 4px))" } as React.CSSProperties}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">
                  Desktop
                </p>
                <DeviceFrame type="laptop" src={work.liveUrl!} title={`${work.title} — desktop`} />
              </div>
              {/* Phones see the phone mockup first, near full width (the site at ~82%
                  scale, readable); the laptop follows as a picture of the desktop look. */}
              <div className="order-first flex flex-col items-center [--frame-h:calc(min(320px,82vw)*2.1641+10px)] sm:order-none sm:[--frame-h:clamp(460px,56vw,600px)]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">
                  Mobile
                </p>
                <DeviceFrame type="phone" src={work.liveUrl!} title={`${work.title} — mobile`} />
              </div>
            </div>
            <p className="mx-auto mt-10 max-w-xl text-center text-lg text-[var(--slate)] md:text-xl">
              {work.description}
            </p>
            <div className="mx-auto mt-10 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
              <button className="btn btn-primary" onClick={() => navigate(inquiryLink(inquiryFor(work)))}>
                Ask about something like this
              </button>
              <button className="btn btn-ghost" onClick={() => navigate(`/portfolio#${CATEGORY_HASH[work.category]}`)}>
                See more like this
              </button>
            </div>
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
