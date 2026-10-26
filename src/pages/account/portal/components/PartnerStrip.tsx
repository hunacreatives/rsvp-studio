import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api";
import { usePortal } from "../PortalContext";
import { formatMoney } from "../format";
import { PARTNER_TIERS } from "@/pages/partners/tiers";

// Dashboard home, for partners only: their tier at a glance and a way into the
// partner dashboard. Everyone else sees nothing.
export default function PartnerStrip() {
  const { demo } = usePortal();
  const [p, setP] = useState<api.MyPartner | null>(null);
  useEffect(() => {
    if (!demo) api.myPartner().then(setP);
  }, [demo]);
  if (!p) return null;
  const tier = PARTNER_TIERS.find((t) => t.id === p.tier);
  const look = tier ?? { bg: "#eef3ff", ink: "#25265e", accent: "#2f61d5", name: "Custom" };
  return (
    <Link
      to="/account/partner"
      className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[22px] px-5 py-4 transition-[filter] hover:brightness-[0.98]"
      style={{ background: look.bg, color: look.ink }}
    >
      <span className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: look.accent }} aria-hidden />
        Partner · {look.name} · {p.rate}%
      </span>
      <span className="text-[14px] opacity-80">
        {formatMoney(p.commission)} earned{p.commission > 0 ? ` · ${formatMoney(p.paid_out)} paid to you` : ""} · {p.paying} paying {p.paying === 1 ? "client" : "clients"}
        {p.next_at != null ? ` · ${Math.max(0, p.next_at - p.paying)} to the next tier` : ""}
      </span>
      <span className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold">
        Partner dashboard <i className="ri-arrow-right-line" aria-hidden />
      </span>
    </Link>
  );
}
