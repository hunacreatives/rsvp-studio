import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import * as api from "@/pages/account/portal/api";
import { FormField, inputStyle } from "./components/FormField";
import { Switch } from "./GuestSettings";

// Builder → Settings → Texts (supabase/sms.sql, api/_lib/sms.ts). A paid add-on per event:
// off until the host switches it on, which needs texts (a pack; Premium includes 50).
//   On: guests who reply with a mobile number get their confirmation by text, and (Premium,
//   with reminders on) the reminder two days before. "Message your guests" can text too.
// Premium hosts also choose how they hear about each reply: email, text, or both.
// Hidden until texting is live for everyone (Semaphore connected), or with ?sms=1.

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

/** A Philippine mobile as the server keeps it (+639XXXXXXXXX), or null. */
function phMobile(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (/^09\d{9}$/.test(d)) return `+63${d.slice(1)}`;
  if (/^9\d{9}$/.test(d)) return `+63${d}`;
  if (/^639\d{9}$/.test(d)) return `+${d}`;
  return null;
}

export default function SmsSettings({ eventId, premium, onUpgrade }: { eventId: string | undefined; premium: boolean; onUpgrade?: () => void }) {
  const [available, setAvailable] = useState(false);
  const [acct, setAcct] = useState<api.SmsAccount | null | undefined>(undefined);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "saving" | "saved" | "error" | "paying"; text?: string }>({ kind: "idle" });
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    void api.smsEnabled().then(setAvailable);
  }, []);
  const reload = async () => {
    if (!eventId) return;
    const a = await api.smsAccount(eventId);
    setAcct(a);
    if (a?.host_phone) setPhone(a.host_phone.replace(/^\+63/, "0"));
  };
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Back from PayMongo with a text pack.
  useEffect(() => {
    const paid = params.get("texts");
    const cancelled = params.get("texts_cancelled") === "1";
    if (!paid && !cancelled) return;
    const next = new URLSearchParams(params);
    next.delete("texts");
    next.delete("texts_cancelled");
    setParams(next, { replace: true });
    if (cancelled) return setState({ kind: "error", text: "Payment cancelled. Nothing was charged." });
    let live = true;
    (async () => {
      setState({ kind: "saving", text: "Confirming your payment…" });
      for (let i = 0; i < 20 && live; i++) {
        const p = await api.paymentStatus(paid!);
        if (p?.status === "paid") {
          await reload();
          if (live) setState({ kind: "saved", text: "Texts added. Texting is on." });
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (live) setState({ kind: "error", text: "Your payment is still being confirmed. Refresh in a few minutes. You won’t be charged twice." });
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!eventId || !available || acct === undefined) return null;
  const left = acct ? acct.credits - acct.used : 0;
  const included = premium && !acct?.premium_grant_at;
  const on = !!acct?.enabled;

  const run = async (fn: () => Promise<api.SmsAccount>, done = "Saved.") => {
    setState({ kind: "saving" });
    try {
      setAcct(await fn());
      setState({ kind: "saved", text: done });
    } catch (e) {
      setState({ kind: "error", text: e instanceof Error ? e.message : "Couldn’t save. Please try again." });
    }
  };
  const buy = async (texts: 100 | 300 | 600) => {
    setState({ kind: "paying", text: "Opening the payment page…" });
    try {
      const r = await api.startCheckout({ eventId, smsPack: texts });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else setState({ kind: "error", text: "Couldn’t start the payment. Please try again." });
    } catch (e) {
      setState({ kind: "error", text: e instanceof Error ? e.message : "Couldn’t start the payment. Please try again." });
    }
  };
  const alerts = acct?.host_alerts ?? "email";
  const saveAlerts = (a: api.SmsAccount["host_alerts"]) => {
    const p = phMobile(phone);
    if (a !== "email" && !p) return setState({ kind: "error", text: "Enter your mobile number first, e.g. 0917 123 4567." });
    void run(() => api.setHostAlerts(eventId, a, a === "email" ? null : p));
  };
  const busy = state.kind === "saving" || state.kind === "paying";
  const sub = { margin: "-4px 0 6px", fontSize: 13, lineHeight: 1.5, color: "var(--slate)" } as const;

  return (
    <div style={{ display: "grid", gap: 4, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
        <span style={{ flex: 1, fontSize: 14, color: "var(--ink)" }}>Text guests who reply by mobile</span>
        <Switch on={on} onChange={(v) => (v && left <= 0 && !included ? setState({ kind: "error", text: "Pick a pack below to switch it on." }) : void run(() => api.setSmsEnabled(eventId, v), v ? "Texting is on." : "Texting is off."))} label="Text guests who reply by mobile" />
      </div>
      <p style={sub}>
        Their confirmation by text{premium ? ", and the reminder two days before" : ""}. Guests with an email still get emails, free.
      </p>
      <p style={{ ...sub, color: "var(--ink)" }}>
        {acct ? `${left} ${left === 1 ? "text" : "texts"} left` : included ? "Premium includes 50 texts." : "No texts yet."}
        {included && acct ? " Premium adds 50 when you switch it on." : ""}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, margin: "6px 0 4px" }}>
        {api.SMS_PACKS.map((p) => (
          <button
            key={p.texts}
            type="button"
            disabled={busy}
            onClick={() => void buy(p.texts)}
            style={{ minHeight: 56, padding: "8px 6px", border: "1px solid var(--line-strong)", borderRadius: 10, background: "#fff", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
          >
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.texts} texts</span>
            <span style={{ display: "block", marginTop: 2, fontSize: 12.5, color: "var(--slate)" }}>{peso(p.php)}</span>
          </button>
        ))}
      </div>
      <p style={{ ...sub, margin: "2px 0 8px" }}>One time, for this event. One text is up to 160 characters.</p>

      {premium ? (
        <FormField label="How you hear about each reply" htmlFor="host-alerts">
          <select id="host-alerts" value={alerts} disabled={busy} onChange={(e) => saveAlerts(e.target.value as api.SmsAccount["host_alerts"])} style={inputStyle}>
            <option value="email">Email</option>
            <option value="sms">Text</option>
            <option value="both">Email and text</option>
          </select>
          <input
            style={{ ...inputStyle, marginTop: 8 }}
            inputMode="tel"
            autoComplete="tel"
            placeholder="Your mobile, e.g. 0917 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => alerts !== "email" && phMobile(phone) && phMobile(phone) !== acct?.host_phone && saveAlerts(alerts)}
          />
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--slate)" }}>Texts to you use this event’s texts.</p>
        </FormField>
      ) : onUpgrade ? (
        <button type="button" onClick={onUpgrade} className="dp-row" style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% + 20px)", minHeight: 52, margin: "0 -10px", padding: "6px 10px", border: 0, borderRadius: 8, background: "transparent", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>A text for every reply</span>
            <span style={{ display: "block", marginTop: 2, fontSize: 12.5, lineHeight: 1.45, color: "var(--slate)" }}>Premium: hear about each RSVP by text, email or both.</span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none" }}>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </button>
      ) : null}

      <p aria-live="polite" style={{ margin: "4px 0 0", minHeight: 18, fontSize: 13, color: state.kind === "error" ? "#c2412d" : state.kind === "saved" ? "#3d7a12" : "var(--slate)" }}>
        {state.text ?? (state.kind === "saving" ? "Saving…" : "")}
      </p>
    </div>
  );
}
