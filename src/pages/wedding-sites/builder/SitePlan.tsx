import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as api from "@/pages/account/portal/api";
import "./builder.css";
import { DiscountNote, ReferralCode } from "./ReferralCode";

// Free vs Premium in the builder (site_plan in supabase/free-premium.sql).
//   Free: one RSVP summary email a day.
//   Premium: an email per RSVP, guest emails sent in the hosts' names, a reminder to
//   guests 2 days before, guest photo sharing, Premium templates.
//   (Every site shows "Made with love by The RSVP Studio" either way.)
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

  return { step, eventId, reload, open: () => setStep({ kind: "offer" }), pay, close: () => setStep({ kind: "closed" }) };
}

/**
 * What Premium adds, in one list (the upgrade dialog, its "You're on Premium" step, and the
 * builder's Settings tab). `on: true` works by itself once paid; the rest are switches the
 * host turns on in Settings (or, for questions, adds on the RSVP page).
 */
export const PREMIUM_FEATURES: { title: string; detail: string; on?: boolean }[] = [
  { title: "Know the moment someone says yes", detail: "An email for every reply, not one summary a day.", on: true },
  { title: "Confirmations in your names", detail: "Guests hear from you, not from us.", on: true },
  { title: "Every Premium design", detail: "Switch to any of them, no extra cost.", on: true },
  { title: "A reminder two days before", detail: "Guests who said yes get the time, venue and map." },
  { title: "Everyone’s photos in one place", detail: "Guests add what they took. You keep what you like." },
  { title: "Invited guests only", detail: "Only the people you sent a link to can reply." },
  { title: "Find your table", detail: "Guests type their name and find their seat." },
  { title: "Up to five RSVP questions", detail: "Meal choice, song requests, whatever you need to know." },
];
export const PREMIUM_PERKS = PREMIUM_FEATURES.map((f) => f.title);

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

export function UpgradeDialog({ flow, plan, onSettings }: { flow: ReturnType<typeof useUpgradeFlow>; plan: SitePlan | null; /** After paying: open the builder's Settings, where the new switches are. */ onSettings?: () => void }) {
  const { step } = flow;
  if (step.kind === "closed") return null;
  const price = plan?.upgradeCentavos ?? 0;
  return (
    <div role="dialog" aria-modal="true" onClick={step.kind === "working" ? undefined : flow.close} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,7,39,0.45)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", placeItems: "center", padding: 16, overflowY: "auto", overscrollBehavior: "contain" }}>
      <div className="rb-dialog-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)", background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 24px 60px -24px rgba(0,7,39,0.45)", fontFamily: "Inter, system-ui, sans-serif", color: "#000727" }}>
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
            <DiscountNote eventId={flow.eventId} refreshKey={price} />
            <ReferralCode eventId={flow.eventId} onApplied={flow.reload} />
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
            <p style={{ margin: "14px 0 4px", fontSize: 13, fontWeight: 600, color: "#55556a" }}>Already on</p>
            <ul style={perkList}>
              {PREMIUM_FEATURES.filter((f) => f.on).map((f) => (
                <li key={f.title}>{f.title}</li>
              ))}
            </ul>
            <p style={{ margin: "14px 0 4px", fontSize: 13, fontWeight: 600, color: "#55556a" }}>Turn on when you want them, in Settings</p>
            <ul style={perkList}>
              {PREMIUM_FEATURES.filter((f) => !f.on).map((f) => (
                <li key={f.title}>{f.title}</li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
              {onSettings ? (
                <button
                  onClick={() => {
                    flow.close();
                    onSettings();
                  }}
                  style={btn(true)}
                >
                  Open Settings
                </button>
              ) : null}
              <button onClick={flow.close} style={btn(!onSettings)}>
                Done
              </button>
            </div>
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

const perkList: React.CSSProperties = { margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.7, color: "#55556a" };

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
