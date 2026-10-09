import { Link, useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

/**
 * Real questions people ask, floating around the heading (tilts follow the
 * design; positions are % of a 1000 × 420 stage, kept clear of the heading).
 * Below the large breakpoint they wrap under the heading instead.
 */
const QUESTIONS = [
  { q: "What does RSVP management include?", x: 33, y: 1, r: 2.64 },
  { q: "I need an urgent website. Can you rush my order?", x: 1, y: 16, r: -6.11 },
  { q: "Can our website be password protected?", x: 62, y: 13, r: 2.9 },
  { q: "Can we have a custom domain?", x: 2, y: 74, r: 9 },
  { q: "How many revisions do you offer?", x: 35, y: 86, r: -2.21 },
  { q: "What happens if guests don\u2019t RSVP?", x: 66, y: 76, r: -9 },
];

const pillClass =
  "inline-flex items-center justify-center rounded-full px-4 text-[12px] font-medium uppercase tracking-[0.04em] transition-transform hover:scale-[1.04]";
const pillStyle = { background: "#F0F1FF", color: "#1862DD" } as const;

export default function QuestionsAnswered() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x text-center">
        <div className="relative mx-auto max-w-[1000px] lg:h-[420px]">
          {/* Desktop: the questions float around the heading */}
          {QUESTIONS.map((p) => (
            <Link
              key={p.q}
              to="/faqs"
              className={`${pillClass} absolute hidden h-[40px] whitespace-nowrap lg:inline-flex`}
              style={{ ...pillStyle, left: `${p.x}%`, top: `${p.y}%`, transform: `rotate(${p.r}deg)` }}
            >
              {p.q}
            </Link>
          ))}
          <div className="relative lg:absolute lg:inset-x-0 lg:top-1/2 lg:-translate-y-1/2">
            <Reveal as="h2" className="h-section text-[var(--ink)]">
              You asked. We answered.
            </Reveal>
            <Reveal as="p" className="mt-4 text-[var(--slate)] text-lg max-w-2xl mx-auto">
              Everything you need to know about our services, collections,{" "}
              <br className="hidden sm:inline" />
              timelines, and process, all in one place.
            </Reveal>
          </div>
        </div>

        {/* Phones: the same questions, wrapped under the heading */}
        <div className="mt-8 flex flex-wrap justify-center gap-2.5 lg:hidden">
          {QUESTIONS.map((p, i) => (
            <Link key={p.q} to="/faqs" className={`${pillClass} py-2.5 text-center`} style={{ ...pillStyle, transform: `rotate(${i % 2 ? -2 : 2}deg)` }}>
              {p.q}
            </Link>
          ))}
        </div>

        <Reveal className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button className="btn btn-primary" onClick={() => navigate("/faqs")}>
            Explore FAQs
          </button>
          <button
            className="btn btn-outline-blue"
            onClick={() => navigate("/enquire#start")}
          >
            Get in Touch
          </button>
        </Reveal>
      </div>
    </section>
  );
}
