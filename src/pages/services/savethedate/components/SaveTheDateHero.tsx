import { useCallback, useState } from "react";

const CARDS = [
  { img: "/services/save-the-date/card-bear.jpg", category: "Birthday" },
  { img: "/services/save-the-date/card-hudson.jpg", category: "Birthday" },
  { img: "/services/save-the-date/card-wildone.jpg", category: "Baby Shower" },
  { img: "/services/save-the-date/card-studio.jpg", category: "Grand Opening" },
  { img: "/services/save-the-date/card-destiny.jpg", category: "Wedding" },
];

/** offset (‑2…2) → transform for the fanned deck */
const POS: Record<number, { x: string; y: string; rot: number; scale: number; z: number; op: number }> = {
  [-2]: { x: "-138%", y: "8%", rot: -18, scale: 0.72, z: 1, op: 0.45 },
  [-1]: { x: "-96%", y: "0%", rot: -9, scale: 0.85, z: 2, op: 0.8 },
  [0]: { x: "-50%", y: "-6%", rot: 0, scale: 1, z: 3, op: 1 },
  [1]: { x: "-4%", y: "0%", rot: 9, scale: 0.85, z: 2, op: 0.8 },
  [2]: { x: "38%", y: "8%", rot: 18, scale: 0.72, z: 1, op: 0.45 },
};

export default function SaveTheDateHero() {
  const [active, setActive] = useState(0);
  const total = CARDS.length;

  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  return (
    <section
      className="relative flex min-h-[calc(100svh-6.5rem)] flex-col justify-center overflow-hidden py-10"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x text-center">
        <h1
          className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}
        >
          Animated Digital Save the Date
        </h1>
        <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">
          The first glimpse of your celebration.
        </p>
      </div>

      <div className="relative mx-auto mt-6 flex w-full max-w-[1140px] items-center justify-center px-4 md:mt-10">
        <button
          onClick={prev}
          aria-label="Previous"
          className="absolute left-2 z-20 grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-white/80 text-[var(--ink)] backdrop-blur transition hover:bg-white sm:left-4"
        >
          <i className="ri-arrow-left-s-line text-2xl" />
        </button>

        <div className="relative h-[clamp(280px,46vh,500px)] w-full max-w-[820px]">
          {CARDS.map((card, i) => {
            let offset = i - active;
            if (offset > total / 2) offset -= total;
            if (offset < -total / 2) offset += total;
            const p = POS[offset as -2 | -1 | 0 | 1 | 2];
            const visible = !!p;
            return (
              <figure
                key={card.img}
                onClick={() => setActive(i)}
                className="absolute left-1/2 top-1/2 h-[92%] w-auto cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  transform: visible
                    ? `translate(${p.x}, calc(-50% + ${p.y})) rotate(${p.rot}deg) scale(${p.scale})`
                    : "translate(-50%, -50%) scale(0.6)",
                  zIndex: visible ? p.z : 0,
                  opacity: visible ? p.op : 0,
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                <img
                  src={card.img}
                  alt={`${card.category} save the date`}
                  className="h-full w-auto rounded-[14px] shadow-[0_40px_80px_-32px_rgba(0,7,39,0.35)]"
                />
              </figure>
            );
          })}
        </div>

        <button
          onClick={next}
          aria-label="Next"
          className="absolute right-2 z-20 grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-white/80 text-[var(--ink)] backdrop-blur transition hover:bg-white sm:right-4"
        >
          <i className="ri-arrow-right-s-line text-2xl" />
        </button>
      </div>

      <p className="mt-6 text-center text-sm font-medium uppercase tracking-[0.18em] text-[var(--slate)]">
        {CARDS[active].category}
      </p>
    </section>
  );
}
