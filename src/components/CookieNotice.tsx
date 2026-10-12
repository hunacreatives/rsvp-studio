import { useState } from "react";
import { Link } from "react-router-dom";
import { analyticsConfigured, consent, setConsent, untrackedPath } from "@/lib/analytics";

/** Asks once before Google Analytics loads (src/lib/analytics.ts). Small, bottom corner, never on guests' sites.
 *  Not asked inside the account dashboard either (its phone tab bar sits there); it asks on the public pages. */
export default function CookieNotice({ pathname }: { pathname: string }) {
  const [choice, setChoice] = useState(consent);
  if (!analyticsConfigured() || choice || untrackedPath(pathname) || /^\/account(\/|$)/.test(pathname)) return null;
  const pick = (c: "yes" | "no") => {
    setConsent(c);
    setChoice(c);
  };
  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[420px] rounded-[20px] border border-[var(--line)] bg-white p-4 shadow-[0_18px_40px_-20px_rgba(0,7,39,0.35)] sm:left-auto sm:right-5 sm:bottom-5 sm:mx-0"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <p className="text-[14px] leading-relaxed text-[var(--ink)]">
        May we use cookies to see how people use our site? It helps us make it better.{" "}
        <Link to="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => pick("yes")} className="min-h-[44px] flex-1 rounded-full bg-[var(--ink)] px-4 text-[14px] font-medium text-white">
          Accept
        </button>
        <button onClick={() => pick("no")} className="min-h-[44px] flex-1 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] font-medium text-[var(--ink)]">
          No thanks
        </button>
      </div>
    </div>
  );
}
