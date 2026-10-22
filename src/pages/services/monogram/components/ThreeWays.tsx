import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";
import { inquiryLink } from "@/pages/enquire/prefill";

// Same structure on every card so they compare at a glance; what's included
// grows with the price. Crest stands out through its art (a cut-out on a warm
// panel) and the extra process, not a badge.
const TIERS = [
  {
    name: "Signature",
    ready: "2–3 business days",
    forWho: "For one.",
    tagline: "Perfect for modern stationery.",
    body: "A refined monogram built from a single initial.",
    price: "₱2,500",
    img: "/services/monogram/mono-m-black.png",
    mask: "/services/monogram/masks/mono-m-black.png",
    includes: ["2 rounds of changes", "Colour and print-ready files"],
  },
  {
    name: "Duo",
    ready: "3–5 business days",
    forWho: "For two.",
    tagline: "Made for couples.",
    body: "Your initials thoughtfully combined into one balanced mark.",
    price: "₱3,500",
    img: "/services/monogram/mono-ra.png",
    mask: "/services/monogram/masks/mono-ra.png",
    includes: ["2 rounds of changes", "Colour and print-ready files"],
  },
  {
    name: "Crest",
    ready: "7–10 business days",
    forWho: "For the whole story.",
    tagline: "Designed as a lasting emblem.",
    body: "An illustrated crest built from your flowers, places and date.",
    price: "₱8,500",
    img: "/services/monogram/crest-m-floral-cut.webp",
    mask: "/services/monogram/crest-m-floral-cut.webp",
    premium: true,
    includes: [
      "A sketch to approve first",
      "3 rounds of changes",
      "Colour, one-colour and vector files, for foil, wax seals and embroidery",
    ],
  },
];

export default function ThreeWays() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-28" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal
          as="h2"
          className="text-center font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)" }}
        >
          Three ways to make it yours.
        </Reveal>

        <div className="mx-auto mt-12 md:mt-14 grid max-w-[1000px] items-stretch gap-5 lg:gap-6 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal
              key={t.name}
              delay={i * 0.08}
              className={`group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ${
                t.premium
                  ? "ring-[#e8dbc4] shadow-[0_30px_60px_-32px_rgba(120,90,40,0.35)]"
                  : "ring-[var(--line)] shadow-[0_24px_50px_-34px_rgba(0,7,39,0.28)]"
              }`}
            >
              <div
                className="aspect-[3/2] shrink-0 overflow-hidden"
                style={{ background: t.premium ? "linear-gradient(160deg, #fbf6ec 0%, #f0e2ca 100%)" : "#eeede7" }}
              >
                {/* Light passes over the mark itself — once as the card arrives
                    (left to right across the row), again on hover. */}
                <div
                  className={`relative h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03] ${t.premium ? "p-2.5 lg:p-3" : ""}`}
                  style={{ "--shine-mask": `url(${t.mask})`, "--shine-delay": `${0.6 + i * 0.25}s` } as CSSProperties}
                >
                  <div className="relative h-full w-full">
                    <img
                      src={t.img}
                      alt={`${t.name} monogram example`}
                      className={`h-full w-full ${t.premium ? "object-contain drop-shadow-[0_14px_24px_rgba(120,90,40,0.18)]" : "object-cover"}`}
                    />
                    <span className={`shine-pass shine-pass--reveal ${t.premium ? "shine-pass--contain" : ""}`} aria-hidden />
                    <span className={`shine-pass shine-pass--hover ${t.premium ? "shine-pass--contain" : ""}`} aria-hidden />
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6 lg:p-7">
                <h3 className="text-3xl font-bold tracking-[-0.01em] text-[var(--ink)]">{t.name}</h3>
                <p className="mt-1 text-[15px] text-[var(--ink)]">Starts at {t.price}</p>
                <p className="text-[13px] text-[var(--slate)]">Ready in {t.ready}</p>
                <p className="mt-2 text-lg font-bold text-[var(--slate)]">{t.forWho}</p>
                <p className="text-[var(--slate)]">{t.tagline}</p>
                <p className="mt-5 text-pretty text-[var(--ink)]">{t.body}</p>
                <ul className="mt-4 space-y-1.5 text-[14px] text-[var(--slate)]">
                  {t.includes.map((x) => (
                    <li key={x} className="flex gap-2">
                      <i className="ri-check-line mt-px text-[15px] text-[var(--ink)]" aria-hidden />
                      <span className="text-pretty">{x}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(inquiryLink({ service: "monogram", pkg: t.name }))}
                  className="mt-auto self-start pt-6 text-[var(--acc-blue)] font-medium hover:underline underline-offset-4"
                >
                  Inquire About {t.name} ›
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
