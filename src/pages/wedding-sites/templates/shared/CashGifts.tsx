import { useState } from "react";
import type { EventContent } from "../../content/types";

// Cash gifts (GCash, Maya, bank) with their QR codes, shown inside a template's
// gifts/registry section. Each template passes its own colours and fonts, so it
// sits in the design rather than on top of it. Renders nothing when empty.

export interface CashGiftsLook {
  ink: string;
  muted: string;
  /** Card background. */
  surface: string;
  line: string;
  bodyFont: string;
  displayFont?: string;
  /** Square corners for templates that never round anything. */
  radius?: number;
  align?: "center" | "left";
}

export const hasCashGifts = (c: EventContent) => (c.cashGifts ?? []).some((g) => g.label || g.accountNumber || g.qrUrl);

export function CashGifts({ content, look }: { content: EventContent; look: CashGiftsLook }) {
  const gifts = (content.cashGifts ?? []).filter((g) => g.label || g.accountNumber || g.qrUrl);
  const [copied, setCopied] = useState<string | null>(null);
  if (!gifts.length) return null;
  const r = look.radius ?? 16;
  const center = look.align !== "left";

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* the number is on screen to select */
    }
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
  };

  return (
    <div style={{ marginTop: 28, textAlign: center ? "center" : "left" }}>
      {content.cashGiftNote ? (
        <p style={{ fontFamily: look.bodyFont, fontSize: 16, lineHeight: 1.6, color: look.muted, margin: "0 auto 18px", maxWidth: 520 }}>{content.cashGiftNote}</p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: center ? "center" : "flex-start", gap: 14 }}>
        {gifts.map((g) => (
          <div
            key={g.id}
            style={{ width: "min(240px, 100%)", background: look.surface, border: `1px solid ${look.line}`, borderRadius: r, padding: 16, textAlign: "center", boxSizing: "border-box" }}
          >
            {g.qrUrl ? (
              // Tap to open the QR full size (easier to screenshot or scan from another phone).
              <a href={g.qrUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                <img src={g.qrUrl} alt={`${g.label || "Payment"} QR code`} loading="lazy" decoding="async" style={{ width: "100%", maxWidth: 180, aspectRatio: "1 / 1", objectFit: "contain", background: "#fff", borderRadius: Math.min(r, 10), display: "block", margin: "0 auto" }} />
              </a>
            ) : null}
            {g.label ? (
              <p style={{ fontFamily: look.displayFont ?? look.bodyFont, fontSize: 18, fontWeight: 600, color: look.ink, margin: g.qrUrl ? "12px 0 0" : 0 }}>{g.label}</p>
            ) : null}
            {g.accountName ? <p style={{ fontFamily: look.bodyFont, fontSize: 15, color: look.muted, margin: "4px 0 0" }}>{g.accountName}</p> : null}
            {g.accountNumber ? (
              <button
                onClick={() => copy(g.id, g.accountNumber.replace(/\s/g, ""))}
                style={{ marginTop: 8, minHeight: 44, padding: "0 14px", borderRadius: 999, border: `1px solid ${look.line}`, background: "transparent", color: look.ink, fontFamily: look.bodyFont, fontSize: 15, fontWeight: 600, cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                aria-label={`Copy ${g.label || "account"} number`}
              >
                {copied === g.id ? "Copied" : g.accountNumber}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
