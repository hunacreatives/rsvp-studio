import { useNavigate } from "react-router-dom";
import { inquiryLink } from "@/pages/enquire/prefill";
import GroupChat from "./GroupChat";

export default function SaveTheDateHero() {
  const navigate = useNavigate();
  return (
    <section
      className="relative overflow-hidden pb-16 pt-10 sm:pb-20 sm:pt-14 md:pb-24 md:pt-16"
      style={{ background: "linear-gradient(180deg, #fde3ec 0%, #fff0f4 52%, var(--warm-white) 100%)" }}
    >
      {/* Words and phone as one centred pair (no dead space between them on wide screens). */}
      <div className="container-x mx-auto grid max-w-[1080px] items-center gap-12 lg:grid-cols-[minmax(0,500px)_auto] lg:justify-center lg:gap-24">
        <div className="text-center lg:text-left">
          <h1
            className="font-display font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)] text-balance"
            style={{ fontSize: "clamp(2.5rem, 5.6vw, 4.4rem)" }}
          >
            Digital Save the Date
          </h1>
          <p className="mx-auto mt-5 max-w-[34ch] text-[17px] leading-relaxed text-[var(--slate)] text-balance md:text-[21px] lg:mx-0">
            The first look at your celebration, sent straight to everyone’s phone.
          </p>
          <div className="mt-8 flex flex-col items-center gap-x-6 gap-y-2 sm:flex-row sm:justify-center lg:justify-start">
            <button
              onClick={() => navigate(inquiryLink({ service: "save-the-date" }))}
              className="btn btn-primary w-full max-w-[280px] sm:w-auto"
            >
              Get a quote
            </button>
            <a href="#designs" className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]">
              <span className="underline-offset-[5px] group-hover:underline">See the designs</span>
              <i className="ri-arrow-down-line" aria-hidden />
            </a>
          </div>
          <p className="mt-4 text-[14px] text-[var(--slate)]">
            Still from ₱1,500 · Animated from ₱2,500 · Ready in 3–5 business days
          </p>
        </div>
        <div className="flex justify-center">
          <GroupChat />
        </div>
      </div>
    </section>
  );
}
