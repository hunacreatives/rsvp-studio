import { Reveal } from "@/lib/Reveal";
import Carousel from "./Carousel";

const PLACES = [
  { label: "Website", img: "/services/monogram/phone-seal.png", tone: "#eef1ee" },
  { label: "Invitations", img: "/services/monogram/invitation-crest.png", tone: "#f6f2ea" },
  { label: "Envelope", img: "/services/monogram/envelope-green.png", tone: "#e9ece4" },
  { label: "Wax Seal", img: "/services/monogram/seal-sf-blue.png", tone: "#eceef2" },
  { label: "Menu", img: "/services/monogram/mono-am.png", tone: "#f3f1ec" },
  { label: "Napkin", img: "/services/monogram/seal-r-pair.png", tone: "#f2ecec" },
];

export default function BelongEverywhere() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-[var(--ink)]">
          Designed to belong <span className="text-[var(--slate)]">everywhere.</span>
        </Reveal>

        <div className="mt-12">
          <Carousel ariaLabel="Where your monogram appears">
            {PLACES.map((p) => (
              <figure
                key={p.label}
                className="snap-start shrink-0 w-[72%] sm:w-[46%] lg:w-[30%]"
              >
                <div
                  className="grid h-[320px] place-items-center overflow-hidden rounded-2xl p-8"
                  style={{ background: p.tone }}
                >
                  <img
                    src={p.img}
                    alt={`Monogram on ${p.label.toLowerCase()}`}
                    className="max-h-[256px] max-w-full object-contain"
                  />
                </div>
                <figcaption className="mt-4 font-semibold text-[var(--ink)]">
                  {p.label}
                </figcaption>
              </figure>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
