import { Link } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

// What every website gets for RSVPs, in Mesa's coloured tiles. Facts match the Free/Premium
// table on /build and the FAQ (src/pages/faqs/faq-data.ts); keep them in step.
const SPECS: [string, string, string, string][] = [
  ["An RSVP form on your site", "Yes or no, how many,\nfood allergies and a note.", "ri-mail-check-line", "sky"],
  ["Your guest list", "Search it, filter it,\ndownload it as a spreadsheet.", "ri-group-line", "sun"],
  ["An invite list", "A personal link for every guest,\nand who hasn’t replied.", "ri-user-follow-line", "green"],
  ["Your own questions", "Song requests, shuttle seats, anything.\n1 free, up to 5 on Premium.", "ri-question-answer-line", "lilac"],
  ["An RSVP deadline", "The form closes\non the day you pick.", "ri-calendar-check-line", "coral"],
  ["Password protection", "Only your guests\ncan open it and RSVP.", "ri-lock-line", "sky"],
  ["Confirmation emails", "For every guest who replies.\nIn your names on Premium.", "ri-mail-send-line", "sun"],
  ["Replies by email", "A summary each morning.\nEvery reply, instantly, on Premium.", "ri-notification-3-line", "green"],
];

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((p, i, all) => (
        <span key={i} className="rsvp-line">
          {p}
          {i < all.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

export default function Included() {
  return (
    <section className="py-16 md:py-28" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal className="text-center">
          <h2 className="font-display font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
            Free with every website
          </h2>
        </Reveal>
        <dl className="rsvp-specs mx-auto mt-8 max-w-[1000px] sm:mt-10">
          {SPECS.map(([h, p, icon, tint], i) => (
            <Reveal key={h} delay={(i % 4) * 0.05} className={`rsvp-spec ${tint}`}>
              <span className={`rsvp-icon ${tint}`} aria-hidden>
                <i className={icon} />
              </span>
              <dt>{h}</dt>
              <dd>
                <Lines text={p} />
              </dd>
            </Reveal>
          ))}
        </dl>
        <p className="mx-auto mt-8 max-w-2xl text-center text-[15px] leading-relaxed text-[var(--slate)] sm:text-[16px]" style={{ textWrap: "pretty" }}>
          Premium also sends the reminder two days before, lets guests find their table on your site and share their photos. One payment per event.{" "}
          <Link to="/build" className="font-medium text-[var(--ink)] underline underline-offset-4">
            Compare Free and Premium
          </Link>
        </p>
      </div>
    </section>
  );
}
