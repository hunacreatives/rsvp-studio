import { useEffect, useState } from "react";
import * as api from "@/pages/account/portal/api";

// "Have a code?" in the pay dialogs: a planner's or creator's referral code, or a
// promo code from Studio (supabase/guest-features.sql → apply_discount_code). The
// biggest discount applies (never added up); the dialog then shows the new price.
export function ReferralCode({ eventId, onApplied }: { eventId: string | undefined; onApplied: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "busy" } | { kind: "done"; text: string } | { kind: "error"; text: string }>({ kind: "idle" });

  if (state.kind === "done") return <p style={{ margin: "12px 0 0", fontSize: 14, color: "#3d7a12" }}>{state.text}</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} style={{ marginTop: 12, minHeight: 44, padding: 0, background: "none", border: "none", fontSize: 14, color: "#2f61d5", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
        Have a code?
      </button>
    );

  const apply = async () => {
    if (!eventId || code.length < 3) return;
    setState({ kind: "busy" });
    try {
      const r = await api.applyDiscountCode(eventId, code);
      await onApplied();
      setState({ kind: "done", text: r.kind === "promo" ? `Code applied: ${r.pct}% off.` : `Code applied. Referred by ${r.name}.` });
    } catch (e) {
      setState({ kind: "error", text: e instanceof Error ? e.message : "Couldn’t add the code." });
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={code}
          onChange={(e) => (setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20)), setState({ kind: "idle" }))}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Referral or promo code"
          aria-label="Referral or promo code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          style={{ flex: 1, minWidth: 0, fontSize: 16, padding: "10px 14px", borderRadius: 999, border: "1px solid #d9d9e3", outline: "none", letterSpacing: "0.04em" }}
        />
        <button
          onClick={apply}
          disabled={state.kind === "busy" || code.length < 3}
          style={{ minHeight: 44, padding: "0 18px", borderRadius: 999, border: "1px solid #d9d9e3", background: "#fff", color: "#000727", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {state.kind === "busy" ? "Checking…" : "Apply"}
        </button>
      </div>
      {state.kind === "error" ? <p style={{ margin: "8px 0 0", fontSize: 13, color: "#c2412d" }}>{state.text}</p> : null}
    </div>
  );
}

/** Under a price: which discount is already in it (supabase/discounts.sql). */
export function DiscountNote({ eventId, refreshKey }: { eventId: string | undefined; refreshKey?: unknown }) {
  const [d, setD] = useState<{ pct: number; reason: api.DiscountReason | null; code: string | null } | null>(null);
  useEffect(() => {
    if (eventId) api.myEventDiscount(eventId).then(setD);
  }, [eventId, refreshKey]);
  if (!d || d.pct <= 0 || !d.reason) return null;
  return (
    <p style={{ margin: "8px 0 0", fontSize: 14, color: "#3d7a12" }}>
      Includes {d.pct}% off {d.reason === "first" ? "your first payment" : d.reason === "promo" ? `with code ${d.code ?? ""}` : "from your referral code"}.
    </p>
  );
}
