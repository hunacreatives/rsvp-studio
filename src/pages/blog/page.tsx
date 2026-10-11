import { Link } from "react-router-dom";
import Navbar from "../home/components/Navbar";
import FooterSection from "../home/components/FooterSection";

export default function Blog() {
  return (
    <>
      <Navbar />
      <main className="grid min-h-[55vh] place-items-center pb-20 pt-24 md:min-h-[70vh] md:pb-24 md:pt-32">
        <div className="container-x text-center">
          <p className="eyebrow">The Journal</p>
          <h1 className="h-section mt-3 text-[var(--ink)]">Coming soon</h1>
          <p className="mt-4 text-[var(--slate)] max-w-lg mx-auto">
            Notes on invitation design, RSVP etiquette, and planning celebrations
            worth remembering.
          </p>
          <Link to="/portfolio" className="btn btn-primary mt-8">
            See our work
          </Link>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
