import { useState } from "react";

// Sharing an event website: the phone's own share sheet (Messenger, Viber, SMS, all in one
// place) where the phone has it, and a QR code to print on paper invitations.

export function canNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function nativeShare(url: string, title?: string) {
  try {
    await navigator.share({ title: title || "You’re invited", text: "You’re invited! RSVP here:", url });
  } catch {
    /* they closed the sheet */
  }
}

/** Downloads a print-quality QR code (PNG) for the invitation link. */
export async function downloadInviteQr(url: string, fileName: string) {
  const QR = await import("qrcode");
  const png = await QR.toDataURL(url, { width: 1200, margin: 2, color: { dark: "#000727", light: "#ffffff" } });
  const a = document.createElement("a");
  a.href = png;
  a.download = fileName;
  a.click();
}

/** "Share" (phones) and "QR code" buttons, for the project's Website tab. */
export default function InviteShareButtons({ url, slug, title, className = "" }: { url: string; slug: string; title?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const pill = "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] font-medium text-[var(--ink)] hover:border-[var(--ink)] md:min-h-[38px]";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {canNativeShare() ? (
        <button onClick={() => nativeShare(url, title)} className={pill}>
          <i className="ri-share-line" aria-hidden /> Share
        </button>
      ) : null}
      <button
        onClick={async () => {
          setBusy(true);
          await downloadInviteQr(url, `${slug}-invitation-qr.png`);
          setBusy(false);
        }}
        className={pill}
        title="A QR code for your printed invitations"
      >
        <i className="ri-qr-code-line" aria-hidden /> {busy ? "Making…" : "QR code for printed invites"}
      </button>
    </div>
  );
}
