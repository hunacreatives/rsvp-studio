import { Reveal } from "@/lib/Reveal";

const POINTS = [
  "Real-time updates",
  "Easy to use",
  "Secure & private",
  "Accessible anywhere",
];

export default function SeamlessExperience() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="eyebrow">Your day, made easier</p>
          <h2 className="mt-3 font-display text-[clamp(1.8rem,3.6vw,2.6rem)] font-medium leading-[1.15] text-[var(--ink)]">
            A seamless planning experience for you{" "}
            <span className="italic">and your team.</span>
          </h2>
          <p className="mt-6 text-[var(--slate)]">
            Our RSVP management system is designed to save you time and reduce
            stress so you can focus on what truly matters.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[var(--ink)]">
                <i className="ri-checkbox-circle-line text-[var(--acc-blue)]" />
                {p}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
