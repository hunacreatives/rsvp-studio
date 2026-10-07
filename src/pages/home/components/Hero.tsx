import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import InvitePlaceholder from "./InvitePlaceholder";

gsap.registerPlugin(ScrollTrigger);

const UPPER = ["Elena & Jibin", "Amalfi", "Maria & Quim", "Lucia & Felipe", "The Garden Party"];
const LOWER = ["Martina", "Diana & Richard", "One-ce Upon a Time", "Baby Rosewood", "Frances Jash"];

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
  const upperRow = useRef<HTMLDivElement | null>(null);
  const lowerRow = useRef<HTMLDivElement | null>(null);
  const [greetIdx, setGreetIdx] = useState(0);
  const [screenIdx, setScreenIdx] = useState(0);

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
      gsap.to(upperRow.current, {
        xPercent: -12,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(lowerRow.current, {
        xPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-16 md:pt-24 pb-24"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x relative z-10 text-center">
        <h1
          className="font-display font-semibold tracking-[-0.02em] leading-[1.12] mx-auto max-w-3xl text-[var(--ink)] text-balance"
          style={{ fontSize: "clamp(2rem, 5vw, 2.9rem)" }}
        >
          Digital invitations designed to make every celebration unforgettable
        </h1>

        <div className="mt-5 md:mt-7 flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-2 md:gap-2.5 rounded-full border border-[var(--line)] bg-white px-4 py-1.5 md:px-6 md:py-2.5 text-[13px] md:text-[16px] leading-none text-[var(--indigo)] overflow-hidden">
            <i className="ri-global-line shrink-0 text-sm md:text-[17px] leading-none" />
            <span className="relative flex h-[1.4em] items-center overflow-hidden">
              <span
                key={greetIdx}
                className="greet-swap block leading-none whitespace-nowrap"
              >
                {GREETINGS[greetIdx]}
              </span>
            </span>
          </span>
          <p className="text-[var(--slate)] text-sm md:text-lg">In Any Language in the World</p>
        </div>
      </div>

      {/* Parallax card field + phone */}
      <div className="relative mt-14 md:mt-16">
        <div
          ref={upperRow}
          className="flex gap-5 md:gap-7 px-6 will-change-transform"
          style={{ marginLeft: "-4%", width: "108%" }}
        >
          {UPPER.map((label, i) => (
            <InvitePlaceholder
              key={label}
              seed={i + 1}
              label={label}
              className="flex-1 min-w-[150px] aspect-[3/4]"
            />
          ))}
        </div>
        <div
          ref={lowerRow}
          className="mt-5 md:mt-7 flex gap-5 md:gap-7 px-6 will-change-transform"
          style={{ marginLeft: "-4%", width: "108%" }}
        >
          {LOWER.map((label, i) => (
            <InvitePlaceholder
              key={label}
              seed={i + 6}
              label={label}
              className="flex-1 min-w-[150px] aspect-[3/4]"
            />
          ))}
        </div>

        {/* Sticky-feeling phone mockup, centered over the field */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            ref={phone}
            className="pointer-events-auto relative w-[160px] sm:w-[190px] md:w-[270px] aspect-[9/19] rounded-[38px] border-[10px] border-[#111] bg-[#111] shadow-[0_50px_90px_-30px_rgba(0,7,39,0.5)]"
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
              className="absolute left-1/2 -bottom-5 z-20 -translate-x-1/2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--line)] bg-white px-3 py-1.5 md:px-4 md:py-2 text-[11px] md:text-[13px] leading-none text-[var(--ink)] shadow-[0_12px_30px_-12px_rgba(0,7,39,0.35)] transition-transform hover:-translate-y-0.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--acc-coral)]" />
              <span className="font-semibold uppercase tracking-[0.12em] text-[var(--slate)]">Featured</span>
              <span className="font-medium">Carlo &amp; Trixia</span>
              <i className="ri-arrow-right-up-line text-[var(--slate)]" />
            </Link>
          </div>
        </div>
      </div>

      <div className="container-x relative z-10 mt-16 flex flex-col items-center gap-6">
        <button
          className="btn btn-primary"
          onClick={() => navigate("/enquire#start")}
        >
          Start My Invitation
        </button>
      </div>

      <div className="container-x mt-8 flex justify-end">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-1.5 text-[13px] text-[var(--indigo)]">
          <i className="ri-global-line" />
          English
        </span>
      </div>
    </section>
  );
}
