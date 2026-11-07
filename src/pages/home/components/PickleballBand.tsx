import { Link } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

// Homepage: our pickleball invites, on a court-green panel. The three real design cards (the same
// stills as the /build gallery) each open their preview; the button opens /pickleball, the build
// page with only these designs. Listed by hand, in the gallery's order, so the homepage doesn't
// load every design's code. A new pickleball design shows on /pickleball by itself (its
// keywords); add it here too.

const DESIGNS = [
  { id: "rally", label: "Rally", tier: "premium", card: "/event-templates/cards/rally.webp?v=1" },
  { id: "pickleball", label: "Pickleball", tier: "free", card: "/event-templates/cards/pickleball.webp" },
  { id: "open-play", label: "Open Play", tier: "free", card: "/event-templates/cards/open-play.webp" },
] as const;

const COURT = "#2d6a4c";

export default function PickleballBand() {
  return (
    <section className="pt-4 md:pt-8" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <div className="overflow-hidden rounded-[24px] px-6 py-10 sm:px-10 md:rounded-[32px] md:px-14 md:py-16" style={{ background: COURT }}>
          <div className="md:flex md:items-end md:justify-between md:gap-10">
            <div>
              <Reveal as="h2" className="h-section text-white">
                Pickleball invites
              </Reveal>
              <p className="mt-3 max-w-[30rem] text-[16px] leading-relaxed text-white/80 text-balance md:mt-4 md:text-[18px]">
                For a birthday on the court, open play or game day with friends. Three designs, two of them&nbsp;free.
              </p>
            </div>
            <Link to="/pickleball" className="btn btn-white mt-6 w-full max-w-[280px] shrink-0 sm:w-auto md:mt-0">
              See the designs
            </Link>
          </div>

          {/* Phones: the cards scroll sideways; wider: three across. */}
          <ul className="-mx-6 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-pl-6 px-6 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 md:mt-12 [&::-webkit-scrollbar]:hidden">
            {DESIGNS.map((d) => (
              <li key={d.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <Link to={`/build/preview/${d.id}?from=pickleball`} className="group block" aria-label={`Preview ${d.label}`}>
                  <span className="relative block overflow-hidden rounded-[14px] bg-white/10 ring-1 ring-white/20 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.55)] sm:rounded-[18px]" style={{ aspectRatio: "4 / 3" }}>
                    <img src={d.card} alt="" loading="lazy" decoding="async" width={960} height={720} className="block h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
                    <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-[var(--ink)] sm:left-3 sm:top-3 ${d.tier === "premium" ? "bg-[var(--acc-yellow)]" : "bg-white"}`}>
                      {d.tier === "premium" ? "Premium" : "Free"}
                    </span>
                  </span>
                  <span className="mt-3 block font-display text-[1.15rem] font-semibold text-white group-hover:underline sm:text-[1.25rem]">{d.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
