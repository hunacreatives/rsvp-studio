import Navbar from "../home/components/Navbar";
import FooterSection from "../home/components/FooterSection";

export default function Blog() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] grid place-items-center pt-32 pb-24">
        <div className="container-x text-center">
          <p className="eyebrow">The Journal</p>
          <h1 className="h-section mt-3 text-[var(--ink)]">Coming soon</h1>
          <p className="mt-4 text-[var(--slate)] max-w-lg mx-auto">
            Notes on invitation design, RSVP etiquette, and planning celebrations
            worth remembering.
          </p>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
