import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";
import Carousel from "./Carousel";

const GALLERY = [
  { img: "/services/monogram/mono-am.png", name: "A & M", kind: "Duo" },
  { img: "/services/monogram/crest-cj.png", name: "C J", kind: "Crest" },
  { img: "/services/monogram/crest-jl.png", name: "J L", kind: "Crest" },
  { img: "/services/monogram/mono-ra.png", name: "R A", kind: "Duo" },
  { img: "/services/monogram/crest-th.png", name: "T H", kind: "Signature" },
  { img: "/services/monogram/crest-b.png", name: "B", kind: "Crest" },
];

export default function BroughtToLife() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Monograms, brought to life.
        </Reveal>

        <div className="mt-12 md:mt-16">
          <Carousel ariaLabel="Monogram gallery">
            {GALLERY.map((g) => (
              <figure
                key={g.name}
                className="snap-start shrink-0 w-[70%] sm:w-[44%] lg:w-[30%]"
              >
                <div className="grid aspect-[3/4] place-items-center rounded-2xl bg-white p-10 shadow-[0_24px_50px_-30px_rgba(0,7,39,0.22)]">
                  <img src={g.img} alt={`${g.name} monogram`} className="max-h-full max-w-[78%] object-contain" />
                </div>
                <figcaption className="mt-4 text-center">
                  <p className="font-semibold text-[var(--ink)]">{g.name}</p>
                  <p className="text-sm text-[var(--slate)]">{g.kind}</p>
                </figcaption>
              </figure>
            ))}
          </Carousel>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/portfolio")}
              className="text-[var(--acc-blue)] font-medium hover:underline underline-offset-4"
            >
              See More ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
