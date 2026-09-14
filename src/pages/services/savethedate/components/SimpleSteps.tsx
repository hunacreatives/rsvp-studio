import { useState } from "react";
import { Reveal } from "@/lib/Reveal";

const STEPS = [
  {
    num: "01",
    title: "We Design",
    copy: "We create a custom “Save the Date” that captures your vision — your names, palette, and the feeling of the day.",
  },
  {
    num: "02",
    title: "You Review",
    copy: "You’ll review your design and request any refinements before it’s finalised.",
  },
  {
    num: "03",
    title: "You Share",
    copy: "You receive your JPEG and PDF files, ready to send to your guests however you like.",
  },
];

export default function SimpleSteps() {
  const [open, setOpen] = useState(0);

  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-[var(--ink)]">
          Simple from start to share.
        </Reveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="rounded-3xl bg-[var(--paper)] p-6 md:p-10">
            {STEPS.map((s, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={s.num}
                  className={i > 0 ? "border-t border-[var(--line)]" : ""}
                >
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center gap-4 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-lg text-[var(--slate)]">
                      {s.num}
                    </span>
                    <span className="flex-1 text-lg font-semibold text-[var(--ink)]">
                      {s.title}
                    </span>
                    <i
                      className={`ri-arrow-down-s-line text-xl text-[var(--slate)] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-6 pl-10 pr-4 text-[var(--slate)]">{s.copy}</p>
                  )}
                </div>
              );
            })}
          </div>

          <Reveal delay={0.08} className="relative mx-auto w-full max-w-[440px]">
            <div className="relative aspect-[16/10] rounded-[16px] border-[10px] border-[#111] bg-[#111] shadow-[0_44px_90px_-34px_rgba(0,7,39,0.4)]">
              <div className="absolute inset-0 m-[2px] overflow-hidden rounded-[6px]">
                <img
                  src="/services/save-the-date/card-studio.jpg"
                  alt="A save the date open on a laptop"
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
            <div className="mx-auto -mt-1 h-2 w-[46%] rounded-b-lg bg-[#1a1a1a]" />
            <div className="absolute -bottom-6 right-2 w-[26%] max-w-[110px]">
              <div className="relative aspect-[9/19] rounded-[18px] border-[6px] border-[#111] bg-[#111] shadow-[0_24px_50px_-22px_rgba(0,7,39,0.45)]">
                <div className="absolute inset-0 m-[1px] overflow-hidden rounded-[12px]">
                  <img
                    src="/services/save-the-date/card-hudson.jpg"
                    alt="The same save the date on a phone"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
