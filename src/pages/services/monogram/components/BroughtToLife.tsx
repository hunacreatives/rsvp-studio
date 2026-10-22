import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";
import CenterCarousel from "@/components/CenterCarousel";

const GALLERY = [
  { img: "/services/monogram/mono-am.webp", name: "A & M", kind: "Duo" },
  { img: "/services/monogram/crest-cj.png", name: "C J", kind: "Crest" },
  { img: "/services/monogram/crest-jl.webp", name: "J L", kind: "Crest" },
  { img: "/services/monogram/mono-ra.png", name: "R A", kind: "Duo" },
  { img: "/services/monogram/crest-th.png", name: "T H", kind: "Duo" },
  { img: "/services/monogram/crest-b.webp", name: "B", kind: "Crest" },
].map((g) => ({ img: g.img, title: g.name, subtitle: g.kind, alt: `${g.name} monogram` }));

export default function BroughtToLife() {
  const navigate = useNavigate();
  return (
    <section className="overflow-hidden py-16 md:py-28" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Monograms, brought to life.
        </Reveal>

        <div className="mt-10 md:mt-14">
          <CenterCarousel items={GALLERY} label="Monogram gallery" />
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/portfolio#monogram")}
            className="inline-flex min-h-11 items-center px-4 text-lg text-[var(--acc-blue)] font-medium hover:underline underline-offset-4"
          >
            See More ›
          </button>
        </div>
      </div>
    </section>
  );
}
