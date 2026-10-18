import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import ImageBand from "@/pages/home/components/ImageBand";
import EnvelopeArt from "@/pages/home/components/EnvelopeArt";
import { Reveal } from "@/lib/Reveal";
import { goTo } from "@/lib/goTo";


// /services — laid out from the "Services" frame in Figma (RSVP STUDIO For Dev, 2154:798):
// the homepage's photo band as the hero, Milestone beside its device mockup, Monogram and Save the Date
// as two cards, Stationery behind a "Coming soon" veil, RSVP beside the dashboard on an
// iPad, and the homepage's planner band. Type and buttons are the site's own.

const WRAP = "mx-auto w-full max-w-[1012px]";
const CARD_BG = "#f6f5f8";

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return reduce;
}

/** A short silent loop (the design's GIFs, as video). Still on its first frame with reduced motion. */
function LoopVideo({ src, poster, label, className = "" }: { src: string; poster: string; label: string; className?: string }) {
  const reduce = useReducedMotion();
  return reduce ? (
    <img src={poster} alt={label} className={className} />
  ) : (
    <video src={src} poster={poster} autoPlay muted loop playsInline aria-label={label} className={className} />
  );
}

// The phone in the Milestone mockup: real captures of carloandtrixia.com (the same three
// the homepage hero uses), fading one into the next.
const PHONE_SCREENS = [1, 2, 3].map((n) => `/home/hero-phone/carlo-trixia-${n}.webp`);

/** Carlo & Trixia's real site on an iPad (a screen recording of the full site, scrolled
 *  top to bottom) and a phone (its screens fading), framed in code so the bezels stay crisp. */
function MilestoneDevices() {
  const reduce = useReducedMotion();
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setScreen((i) => (i + 1) % PHONE_SCREENS.length), 3400);
    return () => window.clearInterval(id);
  }, [reduce]);
  return (
    <div className="relative aspect-[409/457] w-full max-w-[340px] md:max-w-[409px]" role="img" aria-label="Carlo & Trixia's wedding website on a tablet and a phone">
      <div className="absolute left-0 top-[6%] w-[80%] rounded-[18px] bg-[#1b1b1e] p-[2.6%] shadow-[0_30px_60px_-30px_rgba(0,7,39,0.45)] md:rounded-[24px]">
        <div className="overflow-hidden rounded-[10px] bg-[#e6ded2] md:rounded-[14px]">
          <LoopVideo src="/services/page/milestone-tablet.mp4" poster="/services/page/milestone-tablet-poster.webp" label="" className="block aspect-[540/550] w-full object-cover" />
        </div>
      </div>
      <div className="absolute bottom-[2%] right-[1%] w-[29%] rounded-[18px] bg-[#111] p-[1.6%] shadow-[0_24px_40px_-18px_rgba(0,7,39,0.55)] md:rounded-[22px]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[13px] bg-[#3f4a32] md:rounded-[17px]">
          {PHONE_SCREENS.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-1000 ease-out"
              style={{ opacity: i === screen ? 1 : 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A tile's words, Mesa-style: serif title, a soft line, and a quiet arrow link. */
function TileWords({ title, line, link }: { title: string; line: string; link: { label: string; to: string } }) {
  const navigate = useNavigate();
  return (
    <div>
      <h2 className="font-display text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] md:text-[2rem]">{title}</h2>
      <p className="mt-2.5 max-w-[30ch] text-[15.5px] leading-relaxed text-[rgba(0,7,39,0.68)]">{line}</p>
      <button onClick={() => goTo(navigate, link.to)} className="group mt-4 inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-[var(--ink)]">
        <span className="underline-offset-[5px] group-hover:underline">{link.label}</span>
        <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>
    </div>
  );
}

function Cta({ label, to }: { label: string; to: string }) {
  const navigate = useNavigate();
  return (
    <button className="btn btn-primary" onClick={() => goTo(navigate, to)}>
      {label}
    </button>
  );
}

/** Title, line and button, centred — the same block in every service. */
function ServiceText({ title, line, cta, as: H = "h2", size = "lg" }: { title: string; line: string; cta?: { label: string; to: string }; as?: "h2" | "h3"; size?: "lg" | "md" }) {
  return (
    <div className="flex flex-col items-center text-center">
      <H className={`font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] text-balance ${size === "lg" ? "text-[2rem] md:text-[2.5rem]" : "text-[1.7rem] md:text-[1.9rem]"}`}>{title}</H>
      <p className={`mt-2 text-[var(--slate)] text-balance ${size === "lg" ? "max-w-[26ch] text-[17px] md:text-[21px]" : "max-w-[36ch] text-[16px] md:text-[19px]"}`}>{line}</p>
      {cta ? (
        <div className="mt-6">
          <Cta {...cta} />
        </div>
      ) : null}
    </div>
  );
}

export default function Services() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main style={{ background: "var(--warm-white)" }}>
        {/* Hero: the same band as the homepage's "Thoughtfully Designed" */}
        <ImageBand
          as="h1"
          title={
            <>
              Designed for Celebrations{" "}
              <br className="hidden sm:inline" />
              Worth Remembering
            </>
          }
          subtitle="We create digital experiences that feel intentional, from the very first impression to the very last detail."
          image="/home/band-balloons.webp"
          blur={8}
        />

        {/* Milestone Events Website */}
        <section id="milestone" className="container-x mt-12 md:mt-11">
          <div className={`${WRAP} grid items-center gap-8 md:grid-cols-2 md:gap-0`}>
            <Reveal>
              <ServiceText title="Milestone Events Website" line="More than an invitation." cta={{ label: "Explore our packages", to: "/services/milestone" }} />
            </Reveal>
            <Reveal delay={0.08} className="flex justify-center md:justify-end">
              <MilestoneDevices />
            </Reveal>
          </div>
        </section>

        {/* Monogram + Save the Date: two tiles in the style of Mesa's "How it works" —
            a soft gradient, the words up top on the left, the picture rising from the bottom edge. */}
        <section className="container-x mt-12 md:mt-14">
          <div className={`${WRAP} grid gap-4 md:grid-cols-2 md:gap-5`}>
            <Reveal id="monogram" className="flex min-h-[470px] flex-col overflow-hidden rounded-[26px] px-7 pt-8 md:min-h-[540px] md:rounded-[30px] md:px-[30px] md:pt-[30px]" style={{ background: "linear-gradient(160deg, #f3e9ff 0%, #ffe3ee 100%)" }}>
              <TileWords title="Monogram Design" line="A signature that belongs only to you." link={{ label: "Create your monogram", to: "/services/monogram" }} />
              {/* The seals drift a little, and a band of light sweeps across them now and then
                  (the shine is masked to the seals' own shapes, so the tile behind stays clean). */}
              <div className="mt-auto flex translate-y-[26px] justify-center pt-6">
                <div className="svc-mono aspect-[383/454] w-[230px] md:w-[262px]">
                  <img src="/services/page/monogram.webp" alt="Monograms and crests designed by the studio" loading="lazy" className="block h-full w-full" />
                  <span className="svc-mono-shine" aria-hidden />
                </div>
              </div>
            </Reveal>
            <Reveal id="save-the-date" delay={0.06} className="flex min-h-[470px] flex-col overflow-hidden rounded-[26px] px-7 pt-8 md:min-h-[540px] md:rounded-[30px] md:px-[30px] md:pt-[30px]" style={{ background: "linear-gradient(160deg, #fff6d6 0%, #ffe39a 100%)" }}>
              <TileWords title="Digital Save the Date" line="The first glimpse of what’s to come." link={{ label: "Start your save the date", to: "/services/save-the-date" }} />
              {/* The homepage's "Interactive" envelope: the seal lifts and the invite rises out. */}
              <div className="mt-auto flex translate-y-[26px] justify-center pt-6">
                <EnvelopeArt className="block aspect-[8/7] w-[290px] rounded-t-[20px] shadow-[0_30px_60px_-30px_rgba(140,100,0,0.45)] md:w-[330px]" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stationery: coming soon — the row is there, softly veiled. */}
        <section id="stationery" className="relative mt-12 overflow-hidden md:mt-[18px]">
          <h2 className="sr-only">Stationery Design: coming soon</h2>
          <div className="container-x" aria-hidden inert>
            {/* Phones: picture beside the words, so the veiled row stays short. */}
            <div className={`${WRAP} grid grid-cols-[110px_1fr] items-center gap-4 py-8 md:grid-cols-2 md:gap-0 md:py-0`}>
              <div className="flex justify-center">
                <img src="/services/page/stationery.webp" alt="" loading="lazy" className="block aspect-[471/768] w-[110px] object-cover md:w-[324px]" />
              </div>
              <ServiceText title="Stationery Design" line="Print-ready pieces that match your suite." cta={{ label: "Explore the suites", to: "/services/stationery" }} />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-[22px] top-[17px] bg-white/50 backdrop-blur-[15px]" />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-[1.7rem] font-semibold leading-tight text-[var(--ink)] md:text-[1.9rem]">Coming Soon</p>
              <p className="mt-1 text-[17px] text-[var(--ink)] md:text-[19px]">Stay tuned.</p>
            </div>
          </div>
        </section>

        {/* RSVP Management */}
        <section id="rsvp" className="mt-3 overflow-hidden py-10 md:py-7" style={{ background: CARD_BG }}>
          <div className="container-x">
            <div className={`${WRAP} grid items-center gap-8 md:grid-cols-[492px_1fr] md:gap-0`}>
              <Reveal>
                <ServiceText title="RSVP Management" line="Seamlessly integrated into your event website." cta={{ label: "Learn more", to: "/services/rsvp" }} />
              </Reveal>
              <Reveal delay={0.08}>
                {/* The iPad runs past the page edge on wide screens, as in the design. The screen is a
                    2x capture of the real Guests tab (account portal, ?demo), framed in code like Milestone's. */}
                <div className="mx-auto w-full max-w-[520px] rounded-[18px] bg-[#1b1b1e] p-[2.4%] shadow-[0_30px_60px_-30px_rgba(0,7,39,0.45)] md:mx-0 md:w-[653px] md:max-w-none md:rounded-[26px]">
                  <img src="/services/page/rsvp-dashboard.webp" alt="The RSVP dashboard: every reply with who's coming, party size, dietary needs and messages" loading="lazy" className="block aspect-[4/3] w-full rounded-[9px] bg-white md:rounded-[14px]" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Planner band: identical to the homepage's */}
        <ImageBand
          title={
            <>
              Are you an event planner{" "}
              <br className="hidden sm:inline" />
              or influencer?
            </>
          }
          subtitle={"Better experiences begin with better\u00a0collaborations."}
          ctaLabel="I'm a planner"
          ctaTo="/partners"
          secondCta={{ label: "I'm a creator", to: "/partners?type=creator" }}
          image="/home/band-flatlay.webp"
        />
      </main>
      <FooterSection />
    </>
  );
}
