import { useState } from "react";
import type { EventContent } from "../../content/types";
import { AddItem, Field, siteEdit } from "./siteEdit";

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

export function CashGifts({ content, look, editor, note = true }: { content: EventContent; look: CashGiftsLook; /** The builder: edited on the page, "+ Add" item. */ editor?: boolean; /** false: the design shows cashGiftNote itself. */ note?: boolean }) {
  const ed = siteEdit(editor);
  const gifts = (content.cashGifts ?? []).filter((g) => editor || g.label || g.accountNumber || g.qrUrl);
  const [copied, setCopied] = useState<string | null>(null);
  if (!gifts.length && !editor) return null;
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
      {note && (content.cashGiftNote || (editor && gifts.length)) ? (
        <Field as="p" path="cashGiftNote" value={content.cashGiftNote} placeholder="A note above them (optional)" editor={editor} multiline style={{ fontFamily: look.bodyFont, fontSize: 16, lineHeight: 1.6, color: look.muted, margin: "0 auto 18px", maxWidth: 520 }} />
      ) : null}
      <div {...ed.list("cashGifts")} style={{ display: "flex", flexWrap: "wrap", justifyContent: center ? "center" : "flex-start", gap: 14 }}>
        {gifts.map((g) => (
          <div
            key={g.id}
            {...ed.item(g.id)}
            style={{ width: "min(240px, 100%)", background: look.surface, border: `1px solid ${look.line}`, borderRadius: r, padding: 16, textAlign: "center", boxSizing: "border-box" }}
          >
            {g.qrUrl ? (
              // Tap to open the QR full size (easier to screenshot or scan from another phone).
              <a href={g.qrUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                <img src={g.qrUrl} alt={`${g.label || "Payment"} QR code`} loading="lazy" decoding="async" style={{ width: "100%", maxWidth: 180, aspectRatio: "1 / 1", objectFit: "contain", background: "#fff", borderRadius: Math.min(r, 10), display: "block", margin: "0 auto" }} />
              </a>
            ) : null}
            {g.label || editor ? (
              <Field as="p" path="label" value={g.label} placeholder="GCash, Maya or bank" editor={editor} style={{ fontFamily: look.displayFont ?? look.bodyFont, fontSize: 18, fontWeight: 600, color: look.ink, margin: g.qrUrl ? "12px 0 0" : 0 }} />
            ) : null}
            {g.accountName || editor ? <Field as="p" path="accountName" value={g.accountName} placeholder="Account name" editor={editor} style={{ fontFamily: look.bodyFont, fontSize: 15, color: look.muted, margin: "4px 0 0" }} /> : null}
            {editor ? (
              <Field as="p" path="accountNumber" value={g.accountNumber} placeholder="Account number" editor style={{ display: "inline-flex", alignItems: "center", marginTop: 8, minHeight: 44, padding: "0 14px", borderRadius: 999, border: `1px solid ${look.line}`, color: look.ink, fontFamily: look.bodyFont, fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }} />
            ) : g.accountNumber ? (
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
      <AddItem list="cashGifts" label="Add GCash, Maya or bank" editor={editor} style={{ marginTop: 14 }} />
    </div>
  );
}
