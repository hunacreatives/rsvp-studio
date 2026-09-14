import { Reveal } from "@/lib/Reveal";
import RsvpDashboard from "./RsvpDashboard";

const POINTS = [
  "Real-time updates",
  "Easy to use",
  "Secure & private",
  "Accessible anywhere",
];

export default function SeamlessExperience() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
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
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[var(--ink)]">
                <i className="ri-checkbox-circle-line text-[var(--acc-blue)]" />
                {p}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <RsvpDashboard sidebar />
        </Reveal>
      </div>
    </section>
  );
}
