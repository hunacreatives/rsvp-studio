import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Invitation cards drifting either side of the phone.
const INVITES = Array.from({ length: 10 }, (_, i) => `/home/invites/invite-${String(i + 1).padStart(2, "0")}.webp`);
// Rows dissolve into the page at both sides instead of being cut off.
const EDGE_FADE = {
  maskImage: "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)",
  WebkitMaskImage: "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)",
};
const UPPER = INVITES.slice(0, 5);
const LOWER = INVITES.slice(5);

// "Happy Birthday" around the world — cycles in the hero pill.
const GREETINGS = [
  "Happy Birthday",
  "Maligayang Kaarawan",
  "Feliz Cumpleaños",
  "Joyeux Anniversaire",
  "Buon Compleanno",
  "Alles Gute zum Geburtstag",
  "お誕生日おめでとう",
  "生日快乐",
  "Feliz Aniversário",
  "С Днём Рождения",
  "생일 축하합니다",
  "जन्मदिन मुबारक हो",
  "Selamat Ulang Tahun",
  "สุขสันต์วันเกิด",
  "عيد ميلاد سعيد",
];

// Real mobile captures of carloandtrixia.com (opener → Welcome → Our Story),
// cross-faded in the hero phone.
const PHONE_SCREENS = [1, 2, 3].map((n) => `/home/hero-phone/carlo-trixia-${n}.webp`);

export default function Hero() {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement | null>(null);
  const phone = useRef<HTMLDivElement | null>(null);
  const [greetIdx, setGreetIdx] = useState(0);
  const [screenIdx, setScreenIdx] = useState(0);

  // Phones: the hero is exactly one screen below the top bar. Measure where it starts.
  useLayoutEffect(() => {
    const set = () => {
      const el = root.current;
      if (el) el.style.setProperty("--hero-top", `${el.getBoundingClientRect().top + window.scrollY}px`);
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  useEffect(() => {
    const id = window.setInterval(
      () => setGreetIdx((i) => (i + 1) % GREETINGS.length),
      2200,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setScreenIdx((i) => (i + 1) % PHONE_SCREENS.length),
      3400,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        phone.current,
        { scale: 0.85 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 80%",
            end: "top 20%",
            scrub: true,
          },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-8 sm:pt-16 md:pt-24 pb-6 sm:pb-14 md:pb-24 max-sm:flex max-sm:h-[max(calc(100svh-var(--hero-top,96px)),640px)] max-sm:flex-col"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x relative z-10 shrink-0 text-center">
        {/* The greeting sits above the headline as a quiet label, changing language. */}
        <p className="mb-4 flex justify-center text-[15px] text-[var(--slate)] md:text-[17px]" aria-label="Greetings in any language">
          <span className="relative inline-flex h-[1.5em] items-center overflow-hidden font-display italic">
            <span key={greetIdx} className="greet-swap block leading-none whitespace-nowrap">
              {GREETINGS[greetIdx]}
            </span>
          </span>
        </p>
        <h1
          className="font-display font-semibold tracking-[-0.02em] leading-[1.12] mx-auto max-w-3xl text-[var(--ink)] text-balance"
          style={{ fontSize: "clamp(2rem, 5vw, 2.9rem)" }}
        >
          Event websites, invitations and stationery for every celebration
        </h1>
        <p className="mx-auto mt-4 max-w-[34rem] text-[15px] leading-relaxed text-[var(--slate)] text-balance md:text-[17px]">
          Weddings, birthdays, christenings and more, with RSVPs built in. Websites from ₱3,000.
        </p>
        {/* One button; doing it yourself is the quieter option beside it. */}
        {/* Phones skip these: the top bar has "Get a quote" and the menu has the builder,
            so the phone and cards come up sooner. */}
        <div className="mt-7 hidden items-center justify-center gap-x-7 gap-y-3 sm:flex sm:flex-row">
          <button className="btn btn-primary w-full max-w-[280px] sm:w-auto sm:max-w-none" onClick={() => navigate("/enquire#start")}>
            Get a quote
          </button>
          <button className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]" onClick={() => navigate("/build")}>
            <span className="underline-offset-[5px] group-hover:underline">Make it yourself, free</span>
            <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Parallax card field + phone */}
      {/* On phones this fills the rest of the screen, and the rows and phone size to it. */}
      <div className="relative mt-7 sm:mt-14 md:mt-16 max-sm:mb-6 max-sm:min-h-0 max-sm:flex-1 max-sm:[container-type:size]">
        {/* Two rows drifting opposite ways, softened so the phone carries the eye. */}
        {[UPPER, LOWER].map((row, r) => (
          <div key={r} className={`overflow-hidden ${r ? "mt-4 sm:mt-5 md:mt-7" : ""}`} style={EDGE_FADE} aria-hidden>
            <div
              className={`marquee-track flex w-max ${r ? "marquee-track--reverse" : ""}`}
              style={{ animationDuration: "70s" }}
            >
              {[...row, ...row, ...row, ...row].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="mr-4 sm:mr-5 md:mr-7 w-[150px] md:w-[230px] max-sm:h-[calc((100cqh-16px)/2)] max-sm:w-auto aspect-[4/5] rounded-[14px] object-cover opacity-80 shadow-[0_18px_40px_-24px_rgba(0,7,39,0.35)]"
                />
              ))}
            </div>
          </div>
        ))}

        {/* Sticky-feeling phone mockup, centered over the field */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            ref={phone}
            className="pointer-events-auto relative w-[190px] md:w-[270px] max-sm:h-[min(100cqh,560px)] max-sm:w-auto aspect-[9/19] rounded-[38px] border-[10px] border-[#111] bg-[#111] shadow-[0_50px_90px_-30px_rgba(0,7,39,0.5)]"
          >
            <div className="absolute left-1/2 top-2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-black/70 z-10" />
            <div className="absolute inset-0 rounded-[28px] overflow-hidden bg-[#3f4a32]">
              {PHONE_SCREENS.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={i === 0 ? "Carlo & Trixia wedding website on a phone" : ""}
                  aria-hidden={i !== 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-1000 ease-out"
                  style={{ opacity: i === screenIdx ? 1 : 0 }}
                />
              ))}
            </div>

            {/* Featured tag — links to the case study */}
            <Link
              to="/portfolio/carlo-and-trixia"
              className="absolute left-1/2 -bottom-5 z-20 -translate-x-1/2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--line)] bg-white px-4 py-2.5 md:py-2 text-[12px] md:text-[13px] leading-none before:absolute before:-inset-2 before:content-[''] text-[var(--ink)] shadow-[0_12px_30px_-12px_rgba(0,7,39,0.35)] transition-transform hover:-translate-y-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--acc-coral)]" />
              <span className="font-semibold uppercase tracking-[0.12em] text-[var(--slate)]">Featured</span>
              <span className="font-medium">Carlo &amp; Trixia</span>
              <i className="ri-arrow-right-up-line text-[var(--slate)]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop only: on phones "Get a quote" is already just above (and in the top bar). */}
      <div className="container-x relative z-10 mt-16 hidden flex-col items-center gap-6 md:flex">
        <button
          className="btn btn-primary"
          onClick={() => navigate("/enquire#start")}
        >
          Start My Invitation
        </button>
      </div>

    </section>
  );
}
