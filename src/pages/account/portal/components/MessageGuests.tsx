import { useEffect, useState } from "react";
import * as api from "../api";

// Guests tab → "Message your guests" (api/notify.ts → broadcast): one message to a group of
// guests, by email (Premium) and/or text (texting on, uses the event's texts). The counts
// come from the server before anything is sent, so the host sees who it reaches and what
// it costs. "Email and text": email whoever has an email, text the rest.

const INPUT = "mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[16px] outline-none md:text-[15px]";
const AUDIENCES: { value: api.BroadcastAudience; label: string }[] = [
  { value: "coming", label: "Everyone coming" },
  { value: "replied", label: "Everyone who replied" },
  { value: "waiting", label: "Invite list, no reply yet" },
  { value: "declined", label: "Those who can’t make it" },
];

export default function MessageGuests({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [audience, setAudience] = useState<api.BroadcastAudience>("coming");
  const [channel, setChannel] = useState<api.BroadcastChannel | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<api.BroadcastPreview | null>(null);
  const [state, setState] = useState<{ kind: "idle" | "sending" | "sent" | "error"; text?: string }>({ kind: "idle" });

  // Counts (and what this host can use) for the group and channel, as the message is written.
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => {
      api
        .broadcast({ eventId, audience, channel: channel ?? "sms", message: message || "x", preview: true })
        .then((p) => {
          if (!live) return;
          setPreview(p);
          // First load: the best channel they have.
          setChannel((c) => c ?? (p.premium ? (p.textingOn ? "both" : "email") : "sms"));
        })
        .catch((e) => live && setState({ kind: "error", text: e.message }));
    }, 350);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [eventId, audience, channel, message]);

  const reach = preview ? preview.emails + preview.texts : 0;
  const short = preview ? preview.credits > preview.left : false;
  const blocked = !preview || !channel || !message.trim() || !reach || (preview.texts > 0 && (!preview.textingOn || short)) || state.kind === "sending";
  const send = async () => {
    if (!channel) return;
    setState({ kind: "sending" });
    try {
      const r = await api.broadcast({ eventId, audience, channel, message: message.trim() });
      const parts = [r.emails ? `${r.emails} ${r.emails === 1 ? "email" : "emails"}` : "", r.texts ? `${r.texts} ${r.texts === 1 ? "text" : "texts"}` : ""].filter(Boolean);
      setState({ kind: "sent", text: parts.length ? `Sent: ${parts.join(" and ")}.` : r.textStatus === "skipped" ? "Saved. Texts start sending once texting is connected." : "Nothing went out. Please try again." });
    } catch (e) {
      setState({ kind: "error", text: e instanceof Error ? e.message : "Couldn’t send it. Please try again." });
    }
  };

  const channels: { value: api.BroadcastChannel; label: string; off?: string }[] = [
    { value: "email", label: "Email", off: preview && !preview.premium ? "Premium" : undefined },
    { value: "sms", label: "Text", off: preview && !preview.textingOn ? "Switch on texting in Settings" : undefined },
    { value: "both", label: "Email, or text if no email", off: preview && (!preview.premium || !preview.textingOn) ? "Premium and texting" : undefined },
  ];

  return (
    <div role="dialog" aria-modal="true" onClick={state.kind === "sending" ? undefined : onClose} className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[rgba(0,7,39,0.45)] p-4">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[480px] rounded-[20px] bg-white p-6">
        <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">Message your guests</h2>
        {state.kind === "sent" ? (
          <>
            <p className="mt-2 text-[15px] text-[var(--ink)]">{state.text}</p>
            <button onClick={onClose} className="btn btn-primary mt-6">
              Done
            </button>
          </>
        ) : (
          <>
            <div className="mt-4 grid gap-4">
              <label className="text-[14px] font-medium text-[var(--ink)]">
                To
                <select value={audience} onChange={(e) => setAudience(e.target.value as api.BroadcastAudience)} className={INPUT}>
                  {AUDIENCES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <div role="radiogroup" aria-label="Send by" className="grid gap-2">
                <span className="text-[14px] font-medium text-[var(--ink)]">Send by</span>
                {channels.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={channel === c.value}
                    disabled={!!c.off}
                    onClick={() => setChannel(c.value)}
                    className={`flex min-h-[46px] items-center justify-between rounded-xl border px-4 text-left text-[15px] ${channel === c.value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] text-[var(--ink)]"} disabled:opacity-50`}
                  >
                    {c.label}
                    {c.off ? <span className="text-[12.5px] text-[var(--slate)]">{c.off}</span> : null}
                  </button>
                ))}
              </div>
              <label className="text-[14px] font-medium text-[var(--ink)]">
                Message
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} rows={5} className={INPUT} placeholder="e.g. Parking is at the church grounds. Doors open at 3:30." />
              </label>
            </div>
            {preview ? (
              <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--slate)]">
                {reach ? (
                  <>
                    Reaches {[preview.emails ? `${preview.emails} by email` : "", preview.texts ? `${preview.texts} by text` : ""].filter(Boolean).join(" and ")}.
                    {preview.texts ? ` Uses ${preview.credits} of your ${preview.left} texts${preview.segments > 1 ? ` (${preview.segments} per guest: it’s a long one)` : ""}.` : ""}
                    {preview.unreachable ? ` ${preview.unreachable} can’t be reached this way.` : ""}
                  </>
                ) : (
                  "Nobody in this group can be reached this way."
                )}
                {short ? <span className="block text-[#c2412d]">Not enough texts. Add more in your website’s Settings.</span> : null}
              </p>
            ) : null}
            {state.kind === "error" ? <p className="mt-3 text-[13px] text-[#c2412d]">{state.text}</p> : null}
            <div className="mt-6 flex gap-3">
              <button onClick={send} disabled={blocked} className="btn btn-primary disabled:opacity-50">
                {state.kind === "sending" ? "Sending…" : reach ? `Send to ${reach}` : "Send"}
              </button>
              <button onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
            </div>
            <p className="mt-3 text-[12.5px] text-[var(--slate)]">Up to 3 messages a day. Emails come in your names.</p>
          </>
        )}
      </div>
    </div>
  );
}
