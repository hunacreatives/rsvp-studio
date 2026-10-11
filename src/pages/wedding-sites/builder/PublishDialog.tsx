import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as api from "@/pages/account/portal/api";

// Publishing a site from the builder:
//   1. try to publish — studio projects and free templates just go live;
//   2. a DIY site that needs paying for → show the price → PayMongo checkout;
//   3. PayMongo sends them back with ?paid=… → wait for the payment → publish;
//   4. "Your site is live": the link, Copy, and Messenger / Viber share.

type Publish = () => Promise<{ ok: boolean; paymentRequired?: boolean; message?: string }>;
type Step = { kind: "closed" } | { kind: "working"; text: string } | { kind: "pay"; amount: number; tier: string } | { kind: "live" } | { kind: "error"; text: string };

const peso = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);

export function usePublishFlow(eventId: string | undefined, publish: Publish, beforePublish: () => Promise<void>) {
  const [step, setStep] = useState<Step>({ kind: "closed" });
  const [params, setParams] = useSearchParams();

  const start = async () => {
    setStep({ kind: "working", text: "Publishing your site…" });
    await beforePublish();
    const r = await publish();
    if (r.ok) return setStep({ kind: "live" });
    if (!r.paymentRequired) return setStep({ kind: "error", text: r.message ?? "Couldn’t publish — please try again." });
    const { data, error } = await supabase.rpc("site_publish_quote", { p_event: eventId });
    const q = (Array.isArray(data) ? data[0] : data) as { tier: string; due_centavos: number } | null;
    if (error || !q) return setStep({ kind: "error", text: "Couldn’t get the price — please try again." });
    setStep({ kind: "pay", amount: q.due_centavos, tier: q.tier });
  };

  const pay = async () => {
    if (!eventId) return;
    setStep({ kind: "working", text: "Opening the payment page…" });
    try {
      const r = await api.startCheckout({ eventId });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else if (r.free) await start();
    } catch (e) {
      setStep({ kind: "error", text: e instanceof Error ? e.message : "Couldn’t start the payment — please try again." });
    }
  };

  // Back from PayMongo.
  useEffect(() => {
    const paid = params.get("paid");
    const cancelled = params.get("cancelled") === "1";
    if (!paid && !cancelled) return;
    setParams({}, { replace: true });
    if (cancelled) return setStep({ kind: "error", text: "Payment cancelled — nothing was charged. Your site isn’t live yet; publish again whenever you’re ready." });
    let live = true;
    (async () => {
      setStep({ kind: "working", text: "Confirming your payment…" });
      for (let i = 0; i < 20 && live; i++) {
        const p = await api.paymentStatus(paid!);
        if (p?.status === "paid") {
          const r = await publish();
          if (live) setStep(r.ok ? { kind: "live" } : { kind: "error", text: "Payment received, but publishing failed — tap Publish site to try again (you won’t be charged twice)." });
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (live) setStep({ kind: "error", text: "Your payment is still being confirmed. Give it a few minutes, then tap Publish site — you won’t be charged twice." });
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { step, start, pay, close: () => setStep({ kind: "closed" }) };
}

/** `upsell`: a free site — after it goes live, offer Premium (no credit, an email per RSVP). */
export function PublishDialog({ flow, slug, upsell }: { flow: ReturnType<typeof usePublishFlow>; slug: string; upsell?: { price: string; open: () => void } | null }) {
  const { step } = flow;
  const [copied, setCopied] = useState(false);
  if (step.kind === "closed") return null;
  const url = `${window.location.origin}/invite/${slug}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const shareText = encodeURIComponent(`You’re invited! RSVP here: ${url}`);

  return (
    <div role="dialog" aria-modal="true" onClick={step.kind === "working" ? undefined : flow.close} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,7,39,0.45)", display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)", background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 24px 60px -24px rgba(0,7,39,0.45)", fontFamily: "Inter, system-ui, sans-serif", color: "#000727" }}>
        {step.kind === "working" ? (
          <p style={{ margin: 0, fontSize: 16 }}>{step.text}</p>
        ) : step.kind === "pay" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Publish your site</h2>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.6, color: "#55556a" }}>
              {step.tier === "premium" ? (
                <>
                  Premium templates are a one-time <strong style={{ color: "#000727" }}>{peso(step.amount)}</strong>, and include Premium: no “Made with The RSVP Studio” line, and an email for every RSVP.
                </>
              ) : (
                <>
                  Publishing a site with a Standard template is a one-time <strong style={{ color: "#000727" }}>{peso(step.amount)}</strong>.
                </>
              )}{" "}
              Pay with GCash, Maya, card or QR Ph — your site goes live as soon as it’s paid, and you can keep editing it afterwards.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              <button onClick={flow.pay} style={btn(true)}>
                Pay {peso(step.amount)} and publish
              </button>
              <button onClick={flow.close} style={btn(false)}>
                Not now
              </button>
            </div>
          </>
        ) : step.kind === "live" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Your site is live</h2>
            <p style={{ margin: "10px 0 14px", fontSize: 15, color: "#55556a" }}>Share this link with your guests:</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f5f5f2", borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{url}</span>
              <button onClick={copy} style={{ ...btn(true), padding: "8px 14px", fontSize: 13 }}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <a href={`fb-messenger://share/?link=${encodeURIComponent(url)}`} style={btn(false)}>
                Messenger
              </a>
              <a href={`viber://forward?text=${shareText}`} style={btn(false)}>
                Viber
              </a>
              <a href={`sms:?&body=${shareText}`} style={btn(false)}>
                Text message
              </a>
              <a href={url} target="_blank" rel="noopener noreferrer" style={btn(false)}>
                View site
              </a>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 13, color: "#55556a" }}>Changed something later? Tap “Update live site” to put your edits online.</p>
            {upsell ? (
              <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: "#55556a" }}>
                Your site shows a small “Made with The RSVP Studio” line at the bottom, and you’ll get one RSVP summary email a day.{" "}
                <button
                  onClick={() => {
                    flow.close();
                    upsell.open();
                  }}
                  style={{ font: "inherit", fontWeight: 600, color: "#2f61d5", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Upgrade to Premium for {upsell.price}
                </button>{" "}
                to remove the line and get an email for every RSVP.
              </p>
            ) : null}
            <button onClick={flow.close} style={{ ...btn(false), marginTop: 16 }}>
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
