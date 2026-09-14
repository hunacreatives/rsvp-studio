import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

export default function QuestionsAnswered() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x text-center">
        <Reveal as="h2" className="h-section text-[var(--ink)]">
          Questions, answered.
        </Reveal>
        <Reveal
          as="p"
          className="mt-4 text-[var(--slate)] text-lg max-w-2xl mx-auto"
        >
          Everything you need to know about our services, collections,
          <br className="hidden sm:inline" />
          timelines, and process, all in one place.
        </Reveal>
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
