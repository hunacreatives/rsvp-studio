import { Link } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";
import RsvpDashboard from "./RsvpDashboard";

export default function LessTime() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 py-16 md:py-32"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x grid grid-cols-1 gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center [&>*]:min-w-0">
        <Reveal>
          <h2
            className="font-display font-semibold tracking-[-0.02em] leading-[1.12] text-[var(--ink)]"
            style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.6rem)" }}
          >
            Less time managing.
            <br />
            More time celebrating.
          </h2>
          <p className="mt-6 text-[var(--slate)]">
            Everything you need to stay on top of your guest list, without the
            stress.
          </p>
          <p className="mt-4 text-[var(--slate)]">
            RSVP Management keeps the details organized and your team in sync, so
            you can focus on the moments that matter.
          </p>
          <p className="mt-4 text-[var(--slate)]">
            Once the replies are in, plan who sits where with our{" "}
            <Link to="/tools/seating-chart-maker" className="font-medium text-[var(--ink)] underline underline-offset-4">
              free seating chart maker
            </Link>
            .
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <RsvpDashboard sidebar />
        </Reveal>
      </div>
    </section>
  );
}
