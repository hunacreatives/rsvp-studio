import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Guest } from "./GuestTable";

// Guests tab → add a reply by hand ("Tito called"), or fix one (supabase/host-rsvps.sql).
// Replies a host adds are marked added_by_host, so they may have no email or mobile.

const INPUT = "mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[16px] outline-none md:text-[15px]";

export default function GuestEditor({ eventId, guest, onClose, onSaved }: { eventId: string; guest: Guest | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(guest?.name ?? "");
  const [attending, setAttending] = useState<boolean | null>(guest ? (guest.attending ?? true) : true);
  const [count, setCount] = useState(String(guest?.guest_count && guest.guest_count > 0 ? guest.guest_count : 1));
  const [contact, setContact] = useState(guest?.email || guest?.phone || "");
  const [dietary, setDietary] = useState(guest?.dietary ?? "");
  const [message, setMessage] = useState(guest?.message ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) return setError("Add their name.");
    const c = contact.trim();
    const isEmail = c.includes("@");
    const n = Math.min(20, Math.max(1, Math.round(Number(count) || 1)));
    const row = {
      name: name.trim().slice(0, 120),
      attending,
      guest_count: attending === false ? 0 : n,
      dietary: attending === false ? null : dietary.trim().slice(0, 300) || null,
      message: message.trim().slice(0, 1000) || null,
      // Keep whatever contact they had unless the host typed a new one.
      ...(c ? (isEmail ? { email: c.toLowerCase().slice(0, 254) } : { phone: c.slice(0, 30) }) : {}),
      updated_at: new Date().toISOString(),
    };
    setBusy(true);
    setError(null);
    const { error: e } = guest
      ? await supabase.from("rsvps").update(row).eq("id", guest.id)
      : await supabase.from("rsvps").insert({ ...row, event_id: eventId, added_by_host: true });
    setBusy(false);
    if (e) return setError(/added_by_host|policy|permission/i.test(e.message) ? "Couldn’t save — this needs a quick update on our side. Please message us." : "Couldn’t save. Please try again.");
    onSaved();
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[rgba(0,7,39,0.45)] p-4">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-[20px] bg-white p-6">
        <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">{guest ? "Edit reply" : "Add a reply"}</h2>
        {!guest ? <p className="mt-1 text-[14px] text-[var(--slate)]">For guests who replied by phone, text or in person.</p> : null}
        <div className="mt-4 grid gap-4">
          <label className="text-[14px] font-medium text-[var(--ink)]">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={INPUT} autoFocus />
          </label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Coming?">
            {[
              { v: true, label: "Coming" },
              { v: false, label: "Can’t make it" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={attending === o.v}
                onClick={() => setAttending(o.v)}
                className={`min-h-[46px] rounded-xl border text-[15px] font-medium ${attending === o.v ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] text-[var(--ink)]"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {attending !== false ? (
            <div className="grid grid-cols-[110px_1fr] gap-3">
              <label className="text-[14px] font-medium text-[var(--ink)]">
                Party size
                <input type="number" min={1} max={20} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} className={INPUT} />
              </label>
              <label className="text-[14px] font-medium text-[var(--ink)]">
                Dietary (optional)
                <input value={dietary} onChange={(e) => setDietary(e.target.value)} className={INPUT} />
              </label>
            </div>
          ) : null}
          <label className="text-[14px] font-medium text-[var(--ink)]">
            Email or mobile (optional)
            <input value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="off" autoCapitalize="none" className={INPUT} />
          </label>
          <label className="text-[14px] font-medium text-[var(--ink)]">
            Note (optional)
            <input value={message} onChange={(e) => setMessage(e.target.value)} className={INPUT} />
          </label>
        </div>
        {error ? <p className="mt-3 text-[13px] text-[#c2412d]">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button onClick={save} disabled={busy} className="btn btn-primary">
            {busy ? "Saving…" : guest ? "Save" : "Add reply"}
          </button>
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
