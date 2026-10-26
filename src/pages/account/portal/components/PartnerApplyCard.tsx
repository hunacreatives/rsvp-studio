import { useState } from "react";
import { Link } from "react-router-dom";
import { forgetPartnerIntent, usePartnerStatus } from "../partnerStatus";

// Home, for someone who came for the partner program (signed up from /partners?type=creator) but
// hasn't applied: one card until they do. Gone once they apply, are approved, or say not now.
export default function PartnerApplyCard() {
  const { partner, applied, intent } = usePartnerStatus();
  const [hidden, setHidden] = useState(false);
  if (hidden || !intent || partner || applied) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[22px] border border-[rgba(0,7,39,0.14)] bg-white px-5 py-4">
      <p className="min-w-0 grow basis-[240px] text-[15px] text-[var(--ink)]">
        <b className="font-semibold">Finish your partner application.</b>{" "}
        <span className="text-[var(--slate)]">It takes a minute. Your code and earnings show on your Partner page once you’re&nbsp;approved.</span>
      </p>
      <Link to={`/account/partner?type=${encodeURIComponent(intent)}`} className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-[var(--acc-blue)] hover:underline md:min-h-0">
        Apply →
      </Link>
      <button
        onClick={() => {
          setHidden(true);
          void forgetPartnerIntent();
        }}
        aria-label="Not now"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--slate)] hover:bg-black/5 md:h-9 md:w-9"
      >
        <i className="ri-close-line text-lg" aria-hidden />
      </button>
    </div>
  );
}
