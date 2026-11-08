import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";
import { OFFER_ENDS } from "@/lib/premiumOffer";

// Homepage: our pickleball invites on a matcha-green panel, in the homepage's own language (h-section
// title, Reveal fade-ups, 8/7 art cards like "Everything you need"). What makes it special: each
// card is a deep-matcha tile with a phone swiping through the design's real screens
// (public/home/pickleball/<id>-0..3.webp, captured from /build/preview). Cards open the preview;
// the button opens /pickleball. Listed by hand, in the gallery's order, so the homepage doesn't load
// every design's code. A new pickleball design shows on /pickleball by itself (its keywords); add
// it here too. The two newest come first, marked New.

const DESIGNS = [
  { id: "paddlecase", label: "The Paddle Case", tier: "Premium", isNew: true, copy: "Your initials in gold on a carbon paddle." },
  { id: "flatlay", label: "Flat Lay", tier: "Premium", isNew: true, copy: "Your name painted right on the court." },
  { id: "rally", label: "Rally", tier: "Premium", copy: "A floodlit 3D court. Each detail is a shot." },
  { id: "pickleball", label: "Pickleball", tier: "Free", copy: "Pink stripes and a court-side arch." },
  { id: "open-play", label: "Open Play", tier: "Free", copy: "A bold court poster with your crew's photos." },
] as const;

// One colour family (Francis's pick, Nov 8): a pale matcha panel, deep matcha tiles, ink type. The
// only bright colour is the designs themselves, on the phones.
const PAL = { panel: "#d8e1bd", tile: "#6e8748" };
const MATCHA = PAL.panel;
const SCREENS = 4;
const STEP = 2.6; // seconds per screen
const CARD = "relative block w-full aspect-[10/11] overflow-hidden rounded-[14px] shadow-[0_30px_60px_-30px_rgba(30,45,10,0.45)]";

const CSS = `
/* a big, wide phone rising out of the tile: its top two-thirds show, the bottom runs off the card on purpose */
.pb-phone { position: absolute; left: 50%; top: 13%; width: 76%; aspect-ratio: 390 / 844; transform: translateX(-50%); border-radius: 34px; padding: 7px; background: #0b0d14; box-shadow: 0 24px 40px -18px rgba(0,7,39,.55), inset 0 0 0 1px rgba(255,255,255,.08); transition: transform .5s cubic-bezier(.2,.7,.2,1); }
.pb-card:hover .pb-phone { transform: translateX(-50%) translateY(-6px); }
.pb-screen { position: relative; display: block; width: 100%; height: 100%; overflow: hidden; border-radius: 27px; background: #fff; }
.pb-screen img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; transform: translateY(100%); }
.pb-screen img:first-child { transform: none; }
/* each screen (one quarter of the loop): slides up into view, holds, slides away as the next comes */
.pb-run .pb-screen img { animation: pb-swipe ${SCREENS * STEP}s cubic-bezier(.65,0,.35,1) infinite both; animation-delay: var(--d); }
@keyframes pb-swipe { 0% { transform: translateY(100%); } 6%, 25% { transform: none; } 31%, 100% { transform: translateY(-100%); } }
@media (prefers-reduced-motion: reduce) { .pb-run .pb-screen img { animation: none !important; } }
`;

export default function PickleballBand() {
  const root = useRef<HTMLElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  // The launch offer line shows until the end of Nov 27 (Manila), the same moment the database job
  // puts the Premium price back (lib/premiumOffer). By date only, so the homepage needn't load prices.
  const offer = Date.now() < OFFER_ENDS;
  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.68, behavior: "smooth" });
  };
  // the phones only swipe while the section is on screen
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("pb-run", e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={root} className="py-12 md:py-20" style={{ background: "var(--warm-white)" }}>
      <style>{CSS}</style>
      <div className="container-x">
        <div className="rounded-[24px] px-6 py-8 sm:px-10 md:rounded-[32px] md:px-14 md:py-12" style={{ background: MATCHA }}>
        <div className="md:flex md:items-end md:justify-between md:gap-10">
          <div>
            <Reveal as="p" className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3.5 text-[13px] font-semibold text-[var(--ink)] md:text-[14px]">
              <span className="rounded-full bg-[var(--ink)] px-2.5 py-0.5 text-[12px] text-white">New</span>
              2 more pickleball templates
            </Reveal>
            <Reveal as="h2" className="h-section max-w-3xl text-[var(--ink)]">
              Pickleball invite templates
            </Reveal>
            <Reveal as="p" delay={0.06} className="mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--ink)]/75 text-balance md:text-[18px]">
              We added The Paddle Case and Flat Lay to our three pickleball designs. Pick one, add your details and send your guests one&nbsp;link.
            </Reveal>
            {offer ? (
              // a highlighted line, not a pill, so it doesn't read as a second button
              <Reveal as="p" delay={0.08} className="mt-4 text-[17px] font-semibold text-[var(--ink)] md:text-[18px]">
                <span className="box-decoration-clone rounded-[4px] bg-[var(--acc-yellow)] px-1.5 py-0.5">All five are free to use until&nbsp;Nov&nbsp;27.</span>
              </Reveal>
            ) : null}
          </div>
          {/* the button, and on a computer the arrows beside it (no row of their own: keeps the band short) */}
          <Reveal delay={0.1} className="mt-6 flex shrink-0 items-center gap-3 md:mt-0">
            <Link to="/pickleball" className="btn btn-dark w-full max-w-[280px] sm:w-auto">
              See all five
            </Link>
            <button aria-label="Previous" onClick={() => scrollBy(-1)} className="ml-2 hidden h-11 w-11 place-items-center rounded-full border border-[var(--ink)]/20 bg-white/70 transition-colors hover:bg-white md:grid">
              <i className="ri-arrow-left-line text-lg" />
            </button>
            <button aria-label="Next" onClick={() => scrollBy(1)} className="hidden h-11 w-11 place-items-center rounded-full bg-[var(--ink)] text-white transition-opacity hover:opacity-90 md:grid">
              <i className="ri-arrow-right-line text-lg" />
            </button>
          </Reveal>
        </div>

        {/* Five cards in one sideways row (three in view on a computer). */}
        <div ref={track} className="-mx-6 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-6 px-6 pb-2 sm:-mx-10 sm:scroll-pl-10 sm:px-10 md:-mx-14 md:mt-10 md:gap-7 md:scroll-pl-14 md:px-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DESIGNS.map((d, i) => (
            <Reveal key={d.id} delay={Math.min(i, 3) * 0.08} className="w-[76%] shrink-0 snap-start sm:w-[44%] md:w-[calc((100%-3.5rem)/3)]">
              <Link to={`/build/preview/${d.id}?from=pickleball`} className="pb-card group block" aria-label={`Preview ${d.label}`}>
                <span className={CARD} style={{ background: PAL.tile }}>
                  <span className="pb-phone">
                    <span className="pb-screen">
                      {Array.from({ length: SCREENS }, (_, j) => (
                        <img
                          key={j}
                          src={`/home/pickleball/${d.id}-${j}.webp`}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width={540}
                          height={1169}
                          // screen j's turn starts j·STEP after screen 0's; screen 0 starts mid-hold
                          // (so nothing jumps when the loop begins), and the cards run 0.7 s apart
                          style={{ ["--d" as string]: `${j * STEP - 1 - i * 0.7 - SCREENS * STEP}s` }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[12px] font-semibold text-[var(--ink)] ${d.tier === "Premium" ? "bg-[var(--acc-yellow)]" : "bg-white"}`}>
                    {d.tier}
                  </span>
                  {"isNew" in d && d.isNew ? (
                    <span className="absolute right-3 top-3 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[12px] font-semibold text-white">New</span>
                  ) : null}
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-[var(--ink)] group-hover:underline">{d.label}</h3>
                <p className="mt-1 text-[var(--ink)]/75 text-balance">{d.copy}</p>
              </Link>
            </Reveal>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
