import { Reveal } from "@/lib/Reveal";

export default function ModernWay() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.3fr_0.7fr]">
        <Reveal>
          <h2
            className="font-display font-semibold tracking-[-0.02em] leading-[1.12] text-[var(--ink)]"
            style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)" }}
          >
            A modern way to announce your event
            <span className="text-[var(--slate)]"> before the invitation arrives.</span>
          </h2>
          <p className="mt-6 max-w-md text-[var(--slate)]">
            A digital Save the Date sets the tone months ahead — a first look at
            your palette, your names, and the feeling of the day, delivered the
            moment it&apos;s ready.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="flex justify-center lg:justify-end">
          <div className="relative w-[240px] aspect-[9/19] rounded-[40px] border-[10px] border-[#111] bg-[#111] shadow-[0_50px_90px_-30px_rgba(0,7,39,0.4)]">
            <div className="absolute left-1/2 top-2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-black/50" />
            <div className="absolute inset-0 m-[2px] rounded-[30px] overflow-hidden">
              <img
                src="/services/save-the-date/card-destiny.jpg"
                alt="A digital save the date on a phone"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
