import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as api from "@/pages/account/portal/api";
import { DOMAIN_PERKS, DomainPicker, peso as pesoWhole } from "./DomainPicker";
import { DiscountNote, ReferralCode } from "./ReferralCode";
import "./builder.css";
import { CharacterTrio } from "@/components/CharacterLoader";
import Fireworks from "@/pages/enquire/components/Fireworks";
import { canNativeShare, downloadInviteQr, nativeShare } from "@/components/InviteShare";

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
  // They saw the web-address offer and chose the free link: "Your site is live" says
  // where to get their own address later.
  const [skippedDomain, setSkippedDomain] = useState(false);

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
    setSkippedDomain(true);
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

  return { step, start, pay, requote, pending, skippedDomain, chooseFree, chooseDomain, buyPending, eventId, close: () => setStep({ kind: "closed" }) };
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
            <p style={{ margin: "6px 0 0", fontSize: 14.5, lineHeight: 1.55, color: "#55556a" }}>This is the link your guests open.</p>

            {/* The offer: their own address, set apart in the brand blue. */}
            <div style={{ marginTop: 18, padding: "18px 18px 16px", borderRadius: 18, background: "#eef3ff", border: "1.5px solid #2f61d5" }}>
              <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#2f61d5", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Your own web address</span>
              <p style={{ margin: "12px 0 0", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 26, lineHeight: 1.15, color: "#000727", overflowWrap: "anywhere" }}>
                {slug.replace(/-/g, "")}
                <span style={{ color: "#2f61d5" }}>.com</span>
              </p>
              <ul style={{ listStyle: "none", margin: "12px 0 16px", padding: 0, fontSize: 14, lineHeight: 1.5, color: "#3c3d57", display: "grid", gap: 6 }}>
                {DOMAIN_PERKS.map((p) => (
                  <li key={p} style={{ display: "flex", gap: 8 }}>
                    <span aria-hidden style={{ color: "#2dc76d", fontWeight: 700 }}>✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <DomainPicker eventId={flow.eventId!} suggestion={slug.replace(/-/g, "")} onPick={flow.chooseDomain} />
              <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#55556a" }}>Your site goes live on the free link right away; your own address follows a few minutes after you pay.</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0 14px", color: "#868697", fontSize: 13 }}>
              <span style={{ flex: 1, height: 1, background: "#e7e7ee" }} />
              or
              <span style={{ flex: 1, height: 1, background: "#e7e7ee" }} />
            </div>

            {/* The free link: clearly a button that publishes. */}
            <button
              onClick={flow.chooseFree}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 18px", borderRadius: 14, border: "1px solid #d9d9e3", background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "#000727" }}>Publish on the free link →</span>
                <span style={{ display: "block", marginTop: 2, fontSize: 13, color: "#55556a", overflowWrap: "anywhere" }}>thersvpstudio.com/invite/{slug}</span>
              </span>
              <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: "#3d7a12" }}>Free</span>
            </button>
            <button onClick={flow.close} style={{ display: "block", margin: "14px auto 0", minHeight: 44, padding: "0 12px", border: "none", background: "none", color: "#55556a", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Not now
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
                  Premium templates are a one-time <strong style={{ color: "#000727" }}>{peso(step.amount)}</strong>, and include Premium: an email for every RSVP, guest confirmations and reminders sent in your names, and guest photo sharing.
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
            {/* The celebration: our characters under a short burst of fireworks. */}
            <div style={{ position: "relative", padding: "22px 16px 16px", borderRadius: 16, background: "linear-gradient(180deg, #eef3ff 0%, #f8faff 70%, #ffffff 100%)", textAlign: "center", overflow: "hidden" }}>
              <Fireworks stopAfter={3500} />
              <CharacterTrio className="mx-auto" style={{ width: 150, position: "relative" }} />
              <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, padding: "4px 12px", borderRadius: 999, background: "#e3f7ea", color: "#1f7a43", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: 4, background: "#2dc76d" }} /> Live
              </span>
              <h2 style={{ position: "relative", margin: "10px 0 0", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, fontWeight: 400, lineHeight: 1.2 }}>Your website is live.</h2>
              <p style={{ position: "relative", margin: "6px 0 0", fontSize: 15, lineHeight: 1.55, color: "#55556a" }}>
                {/* Two even lines, each kept whole. */}
                <span style={{ whiteSpace: "nowrap" }}>Share it with your guests</span>
                <br />
                <span style={{ whiteSpace: "nowrap" }}>and watch the RSVPs roll in.</span>
              </p>
            </div>

            {/* Their link: the thing to share. */}
            <div style={{ marginTop: 18, padding: 14, borderRadius: 16, background: "#f5f7ff", border: "1px solid #dbe4fb" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2f61d5" }}>Your link</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15, fontWeight: 600, color: "#000727" }}>{url.replace(/^https?:\/\//, "")}</span>
                <button onClick={copy} className="rb-tap44" style={{ ...btn(true), background: "#2f61d5", padding: "9px 16px", fontSize: 13.5 }}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Phones: one Share button opens Messenger, Viber, SMS… (the grid stays as a fallback). */}
            {canNativeShare() ? (
              <button onClick={() => nativeShare(url, slug)} style={{ ...btn(true), width: "100%", justifyContent: "center", gap: 8, marginTop: 10, minHeight: 48, borderRadius: 14, background: "#000727" }}>
                <i className="ri-share-line" aria-hidden style={{ fontSize: 18 }} /> Share your website
              </button>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {[
                { href: `fb-messenger://share/?link=${encodeURIComponent(url)}`, icon: "ri-messenger-fill", color: "#0866ff", label: "Messenger" },
                { href: `viber://forward?text=${shareText}`, icon: "ri-chat-smile-3-fill", color: "#7360f2", label: "Viber" },
                { href: `sms:?&body=${shareText}`, icon: "ri-message-3-fill", color: "#2dc76d", label: "Text" },
                { href: url, icon: "ri-external-link-line", color: "#000727", label: "View site", blank: true },
              ].map((b) => (
                <a
                  key={b.label}
                  href={b.href}
                  {...(b.blank ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  style={{ ...btn(false), justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 14 }}
                >
                  <i className={b.icon} aria-hidden style={{ fontSize: 18, color: b.color }} />
                  {b.label}
                </a>
              ))}
            </div>

            <button onClick={() => downloadInviteQr(url, `${slug}-invitation-qr.png`)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", minHeight: 44, marginTop: 8, border: "none", background: "none", color: "#2f61d5", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <i className="ri-qr-code-line" aria-hidden style={{ fontSize: 18 }} /> Download a QR code for printed invites
            </button>

            {/* The domain they picked: the next step, featured like the address offer. */}
            {flow.pending ? (
              <div style={{ marginTop: 16, padding: "16px 18px", borderRadius: 18, background: "#eef3ff", border: "1.5px solid #2f61d5" }}>
                <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: "#2f61d5", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Next: your own address</span>
                <p style={{ margin: "10px 0 2px", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, lineHeight: 1.2, color: "#000727", overflowWrap: "anywhere" }}>
                  {flow.pending.domain.replace(/\.[^.]+$/, "")}
                  <span style={{ color: "#2f61d5" }}>{flow.pending.domain.match(/\.[^.]+$/)?.[0]}</span>
                </p>
                <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#55556a" }}>{pesoWhole(flow.pending.php)} for one year. Set up for you in minutes.</p>
                <button onClick={flow.buyPending} style={{ ...btn(true), background: "#2f61d5" }}>
                  Get {flow.pending.domain} · {pesoWhole(flow.pending.php)}
                </button>
              </div>
            ) : null}

            {/* What they can do next, as two tidy rows instead of paragraphs. */}
            {flow.skippedDomain || upsell ? (
              <div style={{ marginTop: 18 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#868697" }}>Next</p>
                <div style={{ border: "1px solid #e7e7ee", borderRadius: 16, overflow: "hidden" }}>
                  {[
                    ...(flow.skippedDomain
                      ? [{ icon: "ri-global-line", color: "#2f61d5", title: "Get your own address", sub: `Like ${slug.replace(/-/g, "")}.com`, href: `/account/projects/${flow.eventId}?tab=website` }]
                      : []),
                    ...(upsell
                      ? [{ icon: "ri-vip-crown-line", color: "#b8860b", title: `Upgrade to Premium · ${upsell.price}`, sub: "Every RSVP by email, guest reminders, photo sharing", onClick: () => (flow.close(), upsell.open()) }]
                      : []),
                  ].map((r, k) => {
                    const inner = (
                      <>
                        <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, flexShrink: 0, borderRadius: 18, background: "#f5f5f2" }}>
                          <i className={r.icon} aria-hidden style={{ fontSize: 18, color: r.color }} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, color: "#000727" }}>{r.title}</span>
                          <span style={{ display: "block", marginTop: 1, fontSize: 13, color: "#6b6b7c" }}>{r.sub}</span>
                        </span>
                        <i className="ri-arrow-right-s-line" aria-hidden style={{ fontSize: 20, color: "#a0a0ad" }} />
                      </>
                    );
                    const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 60, padding: "10px 14px", borderTop: k ? "1px solid #e7e7ee" : "none", background: "#fff", textDecoration: "none", cursor: "pointer", fontFamily: "inherit", border: "none" };
                    return "href" in r && r.href ? (
                      <a key={r.title} href={r.href} style={{ ...rowStyle, borderTop: k ? "1px solid #e7e7ee" : "none" }}>
                        {inner}
                      </a>
                    ) : (
                      <button key={r.title} onClick={"onClick" in r ? r.onClick : undefined} style={{ ...rowStyle, borderTop: k ? "1px solid #e7e7ee" : "none" }}>
                        {inner}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <p style={{ margin: "14px 0 0", fontSize: 12.5, textAlign: "center", color: "#868697" }}>Made changes later? Tap “Update live site”.</p>
            <button onClick={flow.close} style={{ display: "block", margin: "14px auto 0", minHeight: 44, padding: "0 16px", border: "none", background: "none", color: "#000727", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
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
