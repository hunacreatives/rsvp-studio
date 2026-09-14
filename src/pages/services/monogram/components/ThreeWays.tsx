import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

const TIERS = [
  {
    name: "Signature",
    forWho: "For one.",
    tagline: "Perfect for modern stationery.",
    body: "A refined monogram built from a single initial.",
    price: "₱2,500",
    img: "/services/monogram/mono-m-black.png",
    to: "/enquire#start",
  },
  {
    name: "Duo",
    forWho: "For two.",
    tagline: "Made for couples.",
    body: "Your initials thoughtfully combined into one balanced mark.",
    price: "₱3,500",
    img: "/services/monogram/mono-ra.png",
    to: "/enquire#start",
  },
  {
    name: "Crest",
    forWho: "For the whole story.",
    tagline: "Designed as a lasting emblem.",
    body: "An illustrated crest inspired by your story, your places, and your celebration.",
    price: "₱8,500",
    img: "/services/monogram/crest-m-floral.png",
    to: "/enquire#start",
  },
];

export default function ThreeWays() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal
          as="h2"
          className="text-center font-bold tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)" }}
        >
          Three ways to make it yours.
        </Reveal>

        <div className="mt-14 md:mt-16 grid items-stretch gap-6 lg:gap-8 md:grid-cols-3">
          {TIERS.map((t) => (
            <Reveal
              key={t.name}
              className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_28px_60px_-34px_rgba(0,7,39,0.22)]"
            >
              <div
                className="aspect-[3/2] shrink-0 overflow-hidden"
                style={{ background: "#eeede7" }}
              >
                <img
                  src={t.img}
                  alt={`${t.name} monogram example`}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-8">
                <h3 className="text-3xl font-bold tracking-[-0.01em] text-[var(--ink)]">
                  {t.name}
                </h3>
                <p className="mt-2 text-lg font-bold text-[var(--slate)]">
                  {t.forWho}
                </p>
                <p className="text-[var(--slate)]">{t.tagline}</p>
                <p className="mt-5 text-[var(--ink)]">{t.body}</p>
                <button
                  onClick={() => navigate(t.to)}
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
