import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SuiteUnboxing from "./stationery/components/SuiteUnboxing";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import ImageBand from "@/pages/home/components/ImageBand";
import EnvelopeArt from "@/pages/home/components/EnvelopeArt";
import { Reveal } from "@/lib/Reveal";
import { goTo } from "@/lib/goTo";


// /services — laid out from the "Services" frame in Figma (RSVP STUDIO For Dev, 2154:798):
// the homepage's photo band as the hero, Milestone beside its device mockup, Monogram and Save the Date
// as two cards, Stationery with the Essential suite unboxing, RSVP beside the dashboard on an
// iPad, and the homepage's planner band. Type and buttons are the site's own.

const WRAP = "mx-auto w-full max-w-[1012px]";

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
  return <ServiceText title={title} line={line} cta={link} size="md" />;
}

function Cta({ label, to }: { label: string; to: string }) {
  const navigate = useNavigate();
  return (
    <button className="btn btn-primary whitespace-nowrap max-sm:px-5" onClick={() => goTo(navigate, to)}>
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
        {/* Hero: the same band as the homepage's "Your celebration is our celebration, too." */}
        <ImageBand
          as="h1"
          title={
            <>
              Designed for Celebrations{" "}
              <br className="hidden sm:inline" />
              Worth Remembering
            </>
          }
          subtitle={
            <>
              Event websites, save the dates, stationery and RSVPs,{" "}
              <br className="hidden sm:inline" />
              made with you from the first look to the last&nbsp;detail.
            </>
          }
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

        {/* Monogram + Save the Date: two tiles with a soft gradient, the same centred words and
            blue button as the other services, the picture rising from the bottom edge. */}
        <section className="container-x mt-12 md:mt-14">
          <div className={`${WRAP} grid gap-4 md:grid-cols-2 md:gap-5`}>
            <Reveal id="monogram" className="flex min-h-[400px] flex-col overflow-hidden rounded-[26px] px-7 pt-9 md:min-h-[440px] md:rounded-[30px] md:px-[30px] md:pt-10" style={{ background: "linear-gradient(160deg, #f3e9ff 0%, #ffe3ee 100%)" }}>
              <TileWords title="Monogram Design" line="A signature that belongs only to you." link={{ label: "Create your monogram", to: "/services/monogram" }} />
              {/* The seals drift a little, and a band of light sweeps across them now and then
                  (the shine is masked to the seals' own shapes, so the tile behind stays clean). */}
              <div className="mt-auto flex translate-y-[26px] justify-center pt-6">
                <div className="svc-mono aspect-[383/454] w-[150px] md:w-[170px]" style={{ "--shine-mask": "url(/services/page/monogram.webp)" } as React.CSSProperties}>
                  <img src="/services/page/monogram.webp" alt="Monograms and crests designed by the studio" loading="lazy" className="block h-full w-full" />
                  <span className="svc-mono-shine" aria-hidden />
                </div>
              </div>
            </Reveal>
            <Reveal id="save-the-date" delay={0.06} className="flex min-h-[400px] flex-col overflow-hidden rounded-[26px] px-7 pt-9 md:min-h-[440px] md:rounded-[30px] md:px-[30px] md:pt-10" style={{ background: "linear-gradient(160deg, #fff6d6 0%, #ffe39a 100%)" }}>
              <TileWords title="Digital Save the Date" line="The first glimpse of what’s to come." link={{ label: "Start your save the date", to: "/services/save-the-date" }} />
              {/* The homepage's "Interactive" envelope: the seal lifts and the invite rises out. */}
              <div className="mt-auto flex translate-y-[26px] justify-center pt-6">
                <EnvelopeArt className="block aspect-[8/7] w-[200px] rounded-t-[18px] shadow-[0_30px_60px_-30px_rgba(140,100,0,0.45)] md:w-[220px]" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stationery Design: the Essential suite unboxing from its envelope (the same as on
            /services/stationery). Phones: the picture above the words, big enough to read. */}
        <section id="stationery" className="container-x mt-12 md:mt-[18px]">
          <div className={`${WRAP} grid items-center gap-6 py-8 md:grid-cols-2 md:gap-0 md:py-0`}>
            <Reveal className="mx-auto w-full max-w-[340px] md:max-w-[440px]">
              <SuiteUnboxing suite="essential" />
            </Reveal>
            <Reveal delay={0.08}>
              <ServiceText title="Stationery Design" line="Print-ready pieces that match your suite." cta={{ label: "Explore the suites", to: "/services/stationery" }} />
            </Reveal>
          </div>
        </section>

        {/* RSVP Management */}
        <section id="rsvp" className="mt-3 overflow-hidden py-10 md:py-7">
          <div className="container-x">
            <div className={`${WRAP} grid items-center gap-8 md:grid-cols-2 md:gap-0`}>
              <Reveal>
                <ServiceText title="RSVP Management" line="Seamlessly integrated into your event website." cta={{ label: "Learn more", to: "/services/rsvp" }} />
              </Reveal>
              <Reveal delay={0.08}>
                {/* The screen is a 2x capture of the real Guests tab (account portal, ?demo), framed in
                    code like Milestone's. Sized like the other rows' pictures, inside the page. */}
                <div className="mx-auto w-full max-w-[400px] rounded-[16px] bg-[#1b1b1e] p-[2.4%] shadow-[0_30px_60px_-30px_rgba(0,7,39,0.45)] md:max-w-[460px] md:rounded-[22px]">
                  <img src="/services/page/rsvp-dashboard.webp" alt="The RSVP dashboard: every reply with who's coming, party size, dietary needs and messages" loading="lazy" className="block aspect-[4/3] w-full rounded-[9px] bg-white md:rounded-[12px]" />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Planner band: identical to the homepage's */}
        <ImageBand
          title={
            <>
              Work with couples?{" "}
              <br className="hidden sm:inline" />
              Work with us.
            </>
          }
          subtitle={
            <>
              {/* Each sentence on its own line(s), each balanced. */}
              <span className="block text-balance">Coordinators run their clients’ events here&nbsp;free.</span>
              <span className="block text-balance">Creators earn up to 20% from the couples they&nbsp;send.</span>
            </>
          }
          ctaLabel="Coordinators"
          ctaTo="/partners"
          secondCta={{ label: "Creators", to: "/partners?type=creator" }}
          image="/home/band-flatlay.webp"
        />
      </main>
      <FooterSection />
    </>
  );
}
