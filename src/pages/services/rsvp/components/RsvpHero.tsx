import InvitePlaceholder from "@/pages/home/components/InvitePlaceholder";

function scrollToHow() {
  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
}

export default function RsvpHero() {
  return (
    <section
      className="relative overflow-hidden pt-16 md:pt-28 pb-16 md:pb-24"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h1
            className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
            style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
          >
            RSVP Management
          </h1>
          <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">
            Seamlessly integrated into your event website.
          </p>
          <button
            onClick={scrollToHow}
            className="mt-8 inline-flex items-center gap-2 font-medium text-[var(--acc-blue)] hover:underline underline-offset-4"
          >
            See how it works
            <span className="grid h-6 w-6 place-items-center rounded-full border border-[var(--acc-blue)]">
              <i className="ri-play-fill text-sm" />
            </span>
          </button>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="rounded-[18px] border-[10px] border-[#111] bg-[#111] shadow-[0_50px_100px_-40px_rgba(0,7,39,0.45)]">
            <InvitePlaceholder seed={2} rounded={8} className="aspect-[16/10] w-full" />
          </div>
          <div className="mx-auto -mt-1 h-2 w-[46%] rounded-b-lg bg-[#1a1a1a]" />
          <div className="absolute -bottom-8 -left-2 w-[30%] max-w-[150px]">
            <div className="rounded-[22px] border-[7px] border-[#111] bg-[#111] shadow-[0_30px_60px_-24px_rgba(0,7,39,0.5)]">
              <InvitePlaceholder seed={6} rounded={14} className="aspect-[9/19] w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
