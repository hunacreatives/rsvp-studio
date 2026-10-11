import { creditHref } from "../engine/siteCredit";
import type { EventContent } from "../content/types";

// What a site's link shows once it's gone offline (supabase/project-lifecycle.sql):
//   ended   — the event has passed: a thank-you, like gel-at-30 did after the party
//   deleted — the host took it down
// Both still point people to The RSVP Studio.

const names = (c: EventContent | null) => {
  const n = (c?.hosts ?? []).map((h) => h.name.trim()).filter(Boolean);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} & ${n[n.length - 1]}` : n[0] ?? "";
};

export default function SiteEndedPage({ state, content, slug }: { state: "ended" | "deleted"; content: EventContent | null; slug: string }) {
  const who = names(content);
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 20px", background: "#fffff9", fontFamily: "Inter, system-ui, sans-serif", color: "#000727" }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#d9c4c4" aria-hidden>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <h1 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 600, fontSize: "2rem", lineHeight: 1.2, margin: "14px 0 10px" }}>
          {state === "ended" ? "What a celebration!" : "This invitation is no longer available"}
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: "#55556a", margin: 0 }}>
          {state === "ended"
            ? who
              ? `${who}’s celebration has come and gone. Thank you to everyone who celebrated.`
              : "This celebration has come and gone. Thank you to everyone who celebrated."
            : "The host has taken this page down."}
        </p>
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e7e7e0" }}>
          <p style={{ fontSize: 14, color: "#55556a", margin: "0 0 14px" }}>Planning your own event?</p>
          <a
            href={creditHref(slug)}
            style={{ display: "inline-block", background: "#000727", color: "#fff", textDecoration: "none", borderRadius: 999, padding: "12px 24px", fontSize: 14, fontWeight: 600 }}
          >
            Make your own with The RSVP Studio
          </a>
        </div>
      </div>
    </main>
  );
}
