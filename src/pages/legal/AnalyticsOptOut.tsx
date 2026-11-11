import { useState } from "react";
import { trackingConfigured, optedOut, setOptOut } from "@/lib/analytics";

/** Privacy policy → "Turn them off in this browser" (src/lib/analytics.ts). */
export default function AnalyticsOptOut() {
  const [off, setOff] = useState(optedOut);
  if (!trackingConfigured()) return null;
  return (
    <p>
      Analytics and ad measurement are <strong>{off ? "off" : "on"}</strong> in this browser.{" "}
      <button
        type="button"
        onClick={() => {
          setOptOut(!off);
          setOff(!off);
        }}
        className="inline-flex min-h-[44px] items-center font-medium text-[var(--acc-blue)] underline underline-offset-4 md:min-h-0"
      >
        {off ? "Turn them back on" : "Turn them off in this browser"}
      </button>
    </p>
  );
}
