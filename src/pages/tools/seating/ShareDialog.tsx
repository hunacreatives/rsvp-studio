import { useState } from "react";

// A view-only link for the coordinator, caterer or family: they see the plan and can
// search for anyone, with no account. Making one needs a (free) account, because the plan
// has to live somewhere other than this browser.

export default function ShareDialog({ url, busy, signedIn, onSignIn, onStop, onClose }: { url: string | null; busy: boolean; signedIn: boolean; onSignIn(): void; onStop(): void; onClose(): void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      (document.getElementById("sp-share-url") as HTMLInputElement | null)?.select();
    }
  };
  const native = async () => {
    if (!url) return;
    try {
      await navigator.share?.({ title: "Seating plan", url });
    } catch {
      /* cancelled */
    }
  };
  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-share-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-share-h">Share a view-only link</h2>
        {!signedIn ? (
          <>
            <p>Send your coordinator, caterer or family a link to the plan. They can look and search for anyone, but not change it. Links need a free account so the plan can live online, not just in this browser.</p>
            <div className="row">
              <button className="sp-btn soft" onClick={onClose}>
                Not now
              </button>
              <button className="sp-btn primary" onClick={onSignIn}>
                Create a free account
              </button>
            </div>
          </>
        ) : busy ? (
          <p>Making your link…</p>
        ) : url ? (
          <>
            <p>Anyone with this link can view the plan and search for a guest. It updates as you make changes. Only you can edit it.</p>
            <input id="sp-share-url" readOnly value={url} onFocus={(e) => e.target.select()} className="sp-search" style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "0 12px" }} aria-label="Share link" />
            <div className="row">
              <button className="sp-link" style={{ marginRight: "auto", color: "var(--warn)" }} onClick={onStop}>
                Turn off this link
              </button>
              {"share" in navigator ? (
                <button className="sp-btn soft" onClick={native}>
                  Send…
                </button>
              ) : null}
              <button className="sp-btn primary" onClick={copy}>
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>We couldn’t make a link just now. Your plan is safe; please try again in a moment.</p>
            <div className="row">
              <button className="sp-btn soft" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
