import { useRef } from "react";
import { Reveal } from "@/lib/Reveal";

const FEATURES = [
  { icon: "ri-smartphone-line", title: "Mobile Optimized", copy: "Looks perfect on any device.", bg: "#f8ddc8" },
  { icon: "ri-send-plane-line", title: "Easy to Share", copy: "Send via email, text, or social media.", bg: "#fbe6a6" },
  { icon: "ri-link", title: "Seamless Integration", copy: "Link to your event website for all the details.", bg: "#d9cef5" },
  { icon: "ri-sparkling-2-line", title: "Beautifully Designed", copy: "A custom look that reflects your celebration.", bg: "#cfe0f7" },
  { icon: "ri-leaf-line", title: "Eco Friendly", copy: "A sustainable choice for a modern couple.", bg: "#cfeed8" },
  { icon: "ri-time-line", title: "Instant Delivery", copy: "Delivered as a PDF, ready to share right away.", bg: "#cfeaf3" },
];

export default function DesignedShared() {
  const track = useRef<HTMLDivElement | null>(null);
  const by = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-[var(--ink)]">
          Thoughtfully designed.{" "}
          <span className="text-[var(--slate)]">Effortlessly shared.</span>
        </Reveal>
        <Reveal as="p" delay={0.05} className="mt-3 text-lg text-[var(--slate)]">
          Beautiful on every screen.
        </Reveal>

        <div
          ref={track}
          className="mt-12 flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 scroll-pl-6 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex min-h-[240px] w-[280px] shrink-0 snap-start flex-col rounded-3xl p-7"
              style={{ background: f.bg }}
            >
              <i className={`${f.icon} text-3xl text-[var(--ink)]`} />
              <div className="mt-auto pt-8">
                <h3 className="text-lg font-semibold text-[var(--ink)]">{f.title}</h3>
                <p className="mt-1 text-sm text-[var(--ink)]/75">{f.copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            aria-label="Previous feature"
            onClick={() => by(-1)}
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] bg-white transition-colors hover:bg-black/5"
          >
            <i className="ri-arrow-left-line text-lg" />
          </button>
          <button
            aria-label="Next feature"
            onClick={() => by(1)}
            className="grid h-11 w-11 place-items-center rounded-full bg-[var(--ink)] text-white transition-opacity hover:opacity-90"
          >
            <i className="ri-arrow-right-line text-lg" />
          </button>
        </div>
      </div>
    </section>
  );
}
