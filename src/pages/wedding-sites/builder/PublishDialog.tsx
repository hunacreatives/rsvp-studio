import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as api from "@/pages/account/portal/api";
import { DOMAIN_PERKS, DomainPicker, peso as pesoWhole } from "./DomainPicker";
import { DiscountNote, ReferralCode } from "./ReferralCode";
import "./builder.css";

// Publishing a site from the builder:
//   1. try to publish — studio projects and free templates just go live;
//   2. a DIY site that needs paying for → show the price → PayMongo checkout;
//   3. PayMongo sends them back with ?paid=… → wait for the payment → publish;
//   4. "Your site is live": the link, Copy, and Messenger / Viber share.
// Before the FIRST publish (when custom domains are on): choose the free link or
// your own domain. The site goes live on the free link right away; a chosen domain
// is paid for straight after (it's remembered across the publish payment, if any).

type Publish = () => Promise<{ ok: boolean; paymentRequired?: boolean; freeLive?: string; message?: string }>;
type Step =
  | { kind: "closed" }
  | { kind: "address" }
  | { kind: "working"; text: string }
  | { kind: "pay"; amount: number; tier: string }
  | { kind: "freeLive"; other: string }
  | { kind: "live" }
  | { kind: "error"; text: string };

type PendingDomain = { domain: string; php: number };
const pendingKey = (eventId: string) => `rsvp_pending_domain_${eventId}`;
function readPending(eventId: string | undefined): PendingDomain | null {
  if (!eventId) return null;
  try {
    return JSON.parse(sessionStorage.getItem(pendingKey(eventId)) ?? "null");
  } catch {
    return null;
  }
}
function writePending(eventId: string, p: PendingDomain | null) {
  try {
    if (p) sessionStorage.setItem(pendingKey(eventId), JSON.stringify(p));
    else sessionStorage.removeItem(pendingKey(eventId));
  } catch {
    /* private mode: they can still buy it from the Website tab */
  }
}

const peso = (centavos: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(centavos / 100);

export function usePublishFlow(eventId: string | undefined, publish: Publish, beforePublish: () => Promise<void>, firstPublish = false) {
  const [step, setStep] = useState<Step>({ kind: "closed" });
  const [params, setParams] = useSearchParams();
  const [pending, setPending] = useState<PendingDomain | null>(() => readPending(eventId));

  // First publish, domains on, no domain yet → ask about the web address first.
  const start = async () => {
    if (firstPublish && eventId) {
      setStep({ kind: "working", text: "One moment…" });
      const [on, current, other] = await Promise.all([api.domainsEnabled(), api.domainStatus(eventId), api.freeLiveConflict(eventId)]);
      // Another free site is live: say so before asking about web addresses.
      if (other) return setStep({ kind: "freeLive", other });
      if (on && current.status === "none") return setStep({ kind: "address" });
    }
    return go();
  };
  const chooseFree = () => {
    if (eventId) writePending(eventId, null);
    setPending(null);
    go();
  };
  const chooseDomain = (domain: string, php: number) => {
    if (eventId) writePending(eventId, { domain, php });
    setPending({ domain, php });
    go();
  };
  const buyPending = async () => {
    if (!eventId || !pending) return;
    setStep({ kind: "working", text: "Opening the payment page…" });
    try {
      const r = await api.startCheckout({ eventId, domain: pending.domain });
      writePending(eventId, null);
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
    } catch (e) {
      writePending(eventId, null);
      setPending(null);
      setStep({ kind: "error", text: e instanceof Error ? e.message : "Couldn’t start the payment — please try again." });
    }
  };

  // The price again (after a referral code took its discount off).
  const requote = async () => {
    const { data } = await supabase.rpc("site_publish_quote", { p_event: eventId });
    const q = (Array.isArray(data) ? data[0] : data) as { tier: string; due_centavos: number } | null;
    if (!q) return;
    if (q.due_centavos <= 0) return void go();
    setStep({ kind: "pay", amount: q.due_centavos, tier: q.tier });
  };

  const go = async () => {
    setStep({ kind: "working", text: "Publishing your site…" });
    await beforePublish();
    const r = await publish();
    if (r.ok) return setStep({ kind: "live" });
    if (r.freeLive) return setStep({ kind: "freeLive", other: r.freeLive });
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
      else if (r.free) await go();
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

  return { step, start, pay, requote, pending, chooseFree, chooseDomain, buyPending, eventId, close: () => setStep({ kind: "closed" }) };
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
    // Scrolls when the card is taller than the screen (short phones, keyboard open).
    // The web-address step doesn't close on an outside tap — tapping away to dismiss
    // the keyboard would lose the search; it has its own Cancel button.
    <div role="dialog" aria-modal="true" onClick={step.kind === "working" || step.kind === "address" ? undefined : flow.close} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,7,39,0.45)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", placeItems: "center", padding: 16, overflowY: "auto", overscrollBehavior: "contain" }}>
      <div className="rb-dialog-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)", background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 24px 60px -24px rgba(0,7,39,0.45)", fontFamily: "Inter, system-ui, sans-serif", color: "#000727" }}>
        {step.kind === "working" ? (
          <p style={{ margin: 0, fontSize: 16 }}>{step.text}</p>
        ) : step.kind === "address" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Choose your web address</h2>
            <button onClick={flow.chooseFree} style={{ ...btn(false), width: "100%", justifyContent: "space-between", marginTop: 16, borderRadius: 14, padding: "12px 16px" }}>
              <span style={{ minWidth: 0, textAlign: "left", overflowWrap: "anywhere" }}>thersvpstudio.com/invite/{slug}</span>
              <span style={{ color: "#55556a", fontWeight: 500 }}>Free</span>
            </button>
            <p style={{ margin: "20px 0 8px", fontSize: 15, fontWeight: 600 }}>Or get your own, like {slug.replace(/-/g, "")}.com</p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7, color: "#55556a" }}>
              {DOMAIN_PERKS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <DomainPicker eventId={flow.eventId!} suggestion={slug.replace(/-/g, "")} onPick={flow.chooseDomain} />
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#868697" }}>Your site goes live on the free link right away; your own address follows a few minutes after you pay.</p>
            <button onClick={flow.close} style={{ ...btn(false), marginTop: 16 }}>
              Cancel
            </button>
          </>
        ) : step.kind === "freeLive" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>One free website live at a time</h2>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.6, color: "#55556a" }}>
              <strong style={{ color: "#000727" }}>{step.other}</strong> is already live on your free account.{" "}
              {upsell ? `To publish this one too, make it Premium (${upsell.price}, one time), or take ${step.other} offline first.` : `Take ${step.other} offline or delete it first, then publish this one.`}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
              {upsell ? (
                <button
                  onClick={() => {
                    flow.close();
                    upsell.open();
                  }}
                  style={btn(true)}
                >
                  Make this site Premium · {upsell.price}
                </button>
              ) : null}
              <button onClick={flow.close} style={btn(false)}>
                Not now
              </button>
            </div>
          </>
        ) : step.kind === "pay" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Publish your site</h2>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.6, color: "#55556a" }}>
              {step.tier === "premium" ? (
                <>
                  Premium templates are a one-time <strong style={{ color: "#000727" }}>{peso(step.amount)}</strong>, and include Premium: an email for every RSVP, and guest confirmations sent in your names.
                </>
              ) : (
                <>
                  Publishing a site with a Standard template is a one-time <strong style={{ color: "#000727" }}>{peso(step.amount)}</strong>.
                </>
              )}{" "}
              Pay with GCash, Maya, card or QR Ph — your site goes live as soon as it’s paid, and you can keep editing it afterwards.
            </p>
            <DiscountNote eventId={flow.eventId} refreshKey={step.amount} />
            <ReferralCode eventId={flow.eventId} onApplied={flow.requote} />
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
            {flow.pending ? (
              <div style={{ margin: "14px 0 4px", padding: "14px 16px", borderRadius: 14, background: "#f4f6fd" }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Now let’s get {flow.pending.domain}</p>
                <p style={{ margin: "4px 0 12px", fontSize: 13.5, color: "#55556a" }}>{pesoWhole(flow.pending.php)} for one year — set up for you in minutes.</p>
                <button onClick={flow.buyPending} style={btn(true)}>
                  Pay {pesoWhole(flow.pending.php)}
                </button>
              </div>
            ) : null}
            <p style={{ margin: "10px 0 14px", fontSize: 15, color: "#55556a" }}>Share this link with your guests:</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#f5f5f2", borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{url}</span>
              <button onClick={copy} className="rb-tap44" style={{ ...btn(true), padding: "8px 14px", fontSize: 13 }}>
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
                You’ll get one email a day with your new RSVPs.{" "}
                <button
                  onClick={() => {
                    flow.close();
                    upsell.open();
                  }}
                  style={{ font: "inherit", fontWeight: 600, color: "#2f61d5", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  Upgrade to Premium for {upsell.price}
                </button>{" "}
                to get an email for every RSVP and use any Premium template.
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
