import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as api from "@/pages/account/portal/api";

// Free vs Premium in the builder (site_plan in supabase/free-premium.sql).
//   Free: "Made with The RSVP Studio" on the site, one RSVP summary email a day.
//   Premium: no credit, an email per RSVP, guest emails sent in the hosts' names.
// A free-template site can upgrade (PayMongo, back here with ?upgraded=…).

export type SitePlan = { premium: boolean; managed: boolean; upgradeCentavos: number };

export const peso = (centavos: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: centavos % 100 ? 2 : 0 }).format(centavos / 100);

export function useSitePlan(eventId: string | undefined) {
  const [plan, setPlan] = useState<SitePlan | null>(null);
  const reload = useCallback(async () => {
    if (!eventId) return;
    const { data, error } = await supabase.rpc("site_plan", { p_event: eventId });
    const r = (Array.isArray(data) ? data[0] : data) as { premium: boolean; managed: boolean; upgrade_centavos: number } | null;
    setPlan(error || !r ? null : { premium: r.premium, managed: r.managed, upgradeCentavos: r.upgrade_centavos });
  }, [eventId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { plan, reload };
}

type Step = { kind: "closed" } | { kind: "offer" } | { kind: "working"; text: string } | { kind: "done" } | { kind: "error"; text: string };

export function useUpgradeFlow(eventId: string | undefined, reload: () => Promise<void>) {
  const [step, setStep] = useState<Step>({ kind: "closed" });
  const [params, setParams] = useSearchParams();

  const pay = async () => {
    if (!eventId) return;
    setStep({ kind: "working", text: "Opening the payment page…" });
    try {
      const r = await api.startCheckout({ eventId, upgrade: true });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else setStep({ kind: "error", text: "Couldn’t start the payment — please try again." });
    } catch (e) {
      setStep({ kind: "error", text: e instanceof Error ? e.message : "Couldn’t start the payment — please try again." });
    }
  };

  // Back from PayMongo.
  useEffect(() => {
    const paid = params.get("upgraded");
    const cancelled = params.get("upgrade_cancelled") === "1";
    if (!paid && !cancelled) return;
    setParams({}, { replace: true });
    if (cancelled) return setStep({ kind: "error", text: "Payment cancelled — nothing was charged. Your site is still on the free plan." });
    let live = true;
    (async () => {
      setStep({ kind: "working", text: "Confirming your payment…" });
      for (let i = 0; i < 20 && live; i++) {
        const p = await api.paymentStatus(paid!);
        if (p?.status === "paid") {
          await reload();
          if (live) setStep({ kind: "done" });
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (live) setStep({ kind: "error", text: "Your payment is still being confirmed. Give it a few minutes and refresh this page — you won’t be charged twice." });
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { step, open: () => setStep({ kind: "offer" }), pay, close: () => setStep({ kind: "closed" }) };
}

export const PREMIUM_PERKS = [
  "No “Made with The RSVP Studio” line on your site",
  "An email the moment each guest RSVPs, instead of one summary a day",
  "Guest confirmation emails sent in your names",
  "Any Premium template, at no extra cost",
];

/** Header badge: "Premium", or "Free plan · Upgrade". Studio projects show nothing. */
export function PlanBadge({ plan, onUpgrade }: { plan: SitePlan | null; onUpgrade: () => void }) {
  if (!plan || plan.managed) return null;
  if (plan.premium) {
    return <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", background: "var(--acc-yellow)", borderRadius: 999, padding: "4px 10px" }}>Premium</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--slate)" }}>
      Free plan
      {plan.upgradeCentavos > 0 ? (
        <button onClick={onUpgrade} style={{ fontSize: 12, fontWeight: 600, color: "var(--acc-blue)", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
          Upgrade · {peso(plan.upgradeCentavos)}
        </button>
      ) : null}
    </span>
  );
}

export function UpgradeDialog({ flow, plan }: { flow: ReturnType<typeof useUpgradeFlow>; plan: SitePlan | null }) {
  const { step } = flow;
  if (step.kind === "closed") return null;
  const price = plan?.upgradeCentavos ?? 0;
  return (
    <div role="dialog" aria-modal="true" onClick={step.kind === "working" ? undefined : flow.close} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,7,39,0.45)", display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)", background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 24px 60px -24px rgba(0,7,39,0.45)", fontFamily: "Inter, system-ui, sans-serif", color: "#000727" }}>
        {step.kind === "working" ? (
          <p style={{ margin: 0, fontSize: 16 }}>{step.text}</p>
        ) : step.kind === "offer" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Upgrade to Premium</h2>
            <ul style={{ margin: "14px 0 0", paddingLeft: 20, fontSize: 15, lineHeight: 1.7, color: "#55556a" }}>
              {PREMIUM_PERKS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p style={{ margin: "14px 0 0", fontSize: 15, color: "#55556a" }}>
              A one-time <strong style={{ color: "#000727" }}>{peso(price)}</strong>, paid with GCash, Maya, card or QR Ph.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <button onClick={flow.pay} disabled={price <= 0} style={btn(true)}>
                Pay {peso(price)}
              </button>
              <button onClick={flow.close} style={btn(false)}>
                Not now
              </button>
            </div>
          </>
        ) : step.kind === "done" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>You’re on Premium</h2>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.6, color: "#55556a" }}>
              The “Made with The RSVP Studio” line is gone from your site, and you’ll get an email for every new RSVP.
            </p>
            <button onClick={flow.close} style={{ ...btn(true), marginTop: 18 }}>
              Done
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{step.text}</p>
            <button onClick={flow.close} style={{ ...btn(false), marginTop: 18 }}>
              OK
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "11px 18px",
    borderRadius: 999,
    border: primary ? "none" : "1px solid #d9d9e3",
    background: primary ? "#000727" : "#fff",
    color: primary ? "#fff" : "#000727",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
  };
}
