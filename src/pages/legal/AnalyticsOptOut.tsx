import { useState } from "react";
import { analyticsConfigured, optedOut, setOptOut } from "@/lib/analytics";

/** Privacy policy → "Turn off analytics in this browser" (src/lib/analytics.ts). */
export default function AnalyticsOptOut() {
  const [off, setOff] = useState(optedOut);
  if (!analyticsConfigured()) return null;
  return (
    <p>
      Analytics is <strong>{off ? "off" : "on"}</strong> in this browser.{" "}
      <button
        type="button"
        onClick={() => {
          setOptOut(!off);
          setOff(!off);
        }}
        className="inline-flex min-h-[44px] items-center font-medium text-[var(--acc-blue)] underline underline-offset-4 md:min-h-0"
      >
        {off ? "Turn it back on" : "Turn off analytics in this browser"}
      </button>
    </p>
  );
}
