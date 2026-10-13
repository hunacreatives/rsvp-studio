import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Guest } from "../../components/GuestTable";
import { PillButton } from "../ui";
import { downloadCsv } from "@/lib/csv";

// Guests → Invite list (supabase/guest-features.sql → invitees): the hosts' own list,
// matched against the RSVPs that came in, so they can see who hasn't replied yet and
// copy a friendly nudge to send by Messenger or Viber.
// A reply matches an invitee by email, by mobile number, or by the same name.

export type Invitee = { id: string; name: string; contact: string | null; party_size: number | null; created_at: string; token?: string; table_label?: string | null };

const nameKey = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const phoneKey = (s: string | null | undefined) => {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
};
const emailKey = (s: string | null | undefined) => (s && s.includes("@") ? s.trim().toLowerCase() : "");

/** "Maria Santos, maria@email.com, 2, Table 5" — name, then (optional, any order) an email
 *  or mobile, a party size, and a table. */
export function parseInviteLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,|;/).map((p) => p.trim()).filter(Boolean))
    .filter((parts) => parts.length && parts[0].length <= 120)
    .map((parts) => {
      const [name, ...rest] = parts;
      const contact = rest.find((p) => p.includes("@") || phoneKey(p)) ?? null;
      const size = rest.map(Number).find((n) => Number.isInteger(n) && n >= 1 && n <= 20) ?? null;
      const table = rest.find((p) => /^(table|t)\s*[\w-]+$/i.test(p))?.replace(/^(table|t)\s*/i, "") ?? null;
      return { name, contact: contact ? contact.slice(0, 254) : null, party_size: size, ...(table ? { table_label: table.slice(0, 40) } : {}) };
    });
}

type Status = { reply: Guest | null };

export default function InviteList({ eventId, guests, eventName, siteUrl, deadline, demo }: { eventId: string; guests: Guest[]; eventName: string; siteUrl: string | null; deadline?: string | null; demo?: boolean }) {
  const [list, setList] = useState<Invitee[] | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "waiting" | "replied">("all");
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Invitee | null>(null);

  useEffect(() => {
    if (demo) {
      setList([
        { id: "i1", name: "Maria Santos", contact: "maria@example.com", party_size: 2, created_at: "" },
        { id: "i2", name: "Paolo Cruz", contact: null, party_size: 1, created_at: "" },
        { id: "i3", name: "Tita Lorna", contact: "0917 555 0101", party_size: 2, created_at: "" },
        { id: "i4", name: "Jun Dela Cruz", contact: null, party_size: 1, created_at: "" },
      ]);
      return;
    }
    supabase
      .from("invitees")
      .select("*")
      .eq("event_id", eventId)
      .order("name")
      .then(({ data, error: e }) => setList(e ? null : ((data ?? []) as Invitee[])));
  }, [eventId, demo]);

  // Which reply (if any) belongs to each invitee. Each reply is used once.
  const rows = useMemo(() => {
    if (!list) return [];
    const used = new Set<string>();
    const find = (inv: Invitee) => {
      const e = emailKey(inv.contact);
      const p = phoneKey(inv.contact);
      const n = nameKey(inv.name);
      return (
        // Replied from their own personal link: certain.
        guests.find((g) => !used.has(g.id) && g.invitee_id === inv.id) ??
        guests.find((g) => !used.has(g.id) && ((e && emailKey(g.email) === e) || (p && phoneKey(g.phone) === p))) ??
        guests.find((g) => !used.has(g.id) && n && nameKey(g.name) === n) ??
        null
      );
    };
    return list.map((inv) => {
      const reply = find(inv);
      if (reply) used.add(reply.id);
      return { inv, reply } as { inv: Invitee } & Status;
    });
  }, [list, guests]);

  if (list === null) return null; // guest-features.sql not run yet
  if (list === undefined) return <p className="text-[var(--slate)]">Loading your invite list…</p>;

  const waiting = rows.filter((r) => !r.reply);
  const pending = parseInviteLines(text).length;
  const shown = rows.filter((r) => (filter === "waiting" ? !r.reply : filter === "replied" ? !!r.reply : true));

  const add = async () => {
    const parsed = parseInviteLines(text);
    if (!parsed.length) return setError("Type at least one name.");
    if (demo) return setError("This is a preview: adding guests is turned off.");
    setBusy(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("invitees")
      .insert(parsed.map((p) => ({ ...p, event_id: eventId })))
      .select("*");
    setBusy(false);
    if (e) return setError(/INVITE_LIMIT/.test(e.message) ? "You can have up to 1,000 guests on your list." : "Couldn’t add them. Please try again.");
    setList([...(list ?? []), ...((data ?? []) as Invitee[])].sort((a, b) => a.name.localeCompare(b.name)));
    setText("");
    setAdding(false);
  };
  const remove = async (inv: Invitee) => {
    if (demo || !window.confirm(`Remove ${inv.name} from your invite list?`)) return;
    const before = list;
    setList(list.filter((i) => i.id !== inv.id));
    const { error: e } = await supabase.from("invitees").delete().eq("id", inv.id);
    if (e) {
      setList(before);
      setError("Couldn’t remove them. Please try again.");
    }
  };
  const nudge = () => {
    const by = deadline
      ? ` by ${new Date(`${deadline}T12:00:00+08:00`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" })}`
      : "";
    const msg = `Hi! Just a friendly reminder to RSVP for ${eventName}${by}. Everything’s here: ${siteUrl ?? ""}`.trim();
    navigator.clipboard?.writeText(msg).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => window.prompt("Copy this message:", msg),
    );
  };

  // Each guest's own link: their name and seats are ready when they open it.
  const linkFor = (inv: Invitee) => (siteUrl && inv.token ? `${siteUrl}?g=${inv.token}` : null);
  const copyLink = (inv: Invitee) => {
    const link = linkFor(inv);
    if (!link) return;
    const first = inv.name.trim().split(/\s+/)[0];
    navigator.clipboard?.writeText(`Hi ${first}, you’re invited to ${eventName}. Here’s your personal link to RSVP: ${link}`).then(
      () => {
        setCopiedId(inv.id);
        setTimeout(() => setCopiedId(null), 2000);
      },
      () => window.prompt("Copy this message:", link),
    );
  };
  const downloadLinks = () =>
    downloadCsv(
      `${eventName.replace(/[^\w]+/g, "-").toLowerCase()}-invite-links.csv`,
      ["Name", "Email or mobile", "Seats", "Table", "Personal link", "Replied"],
      rows.map(({ inv, reply }) => [inv.name, inv.contact ?? "", inv.party_size ?? "", inv.table_label ?? "", linkFor(inv) ?? "", reply ? (reply.attending === false ? "Can't make it" : "Coming") : "Not yet"]),
    );
  const saveEdit = async (next: Invitee) => {
    if (demo) return setEditing(null);
    const patch = { name: next.name.trim().slice(0, 120), contact: next.contact?.trim() || null, party_size: next.party_size || null, table_label: next.table_label?.trim() || null };
    const { error: e } = await supabase.from("invitees").update(patch).eq("id", next.id);
    if (e) return setError(/table_label/.test(e.message) ? "Tables need a quick update on our side." : "Couldn’t save. Please try again.");
    setList((list ?? []).map((i) => (i.id === next.id ? { ...i, ...patch } : i)));
    setEditing(null);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-[15px] text-[var(--ink)]">
          {rows.length ? (
            <>
              <strong>{rows.length - waiting.length}</strong> of {rows.length} replied · <strong>{waiting.length}</strong> not yet
            </>
          ) : (
            "Add the people you invited to see who hasn’t replied yet."
          )}
        </p>
        {waiting.length && siteUrl ? (
          <PillButton onClick={nudge}>{copied ? "Copied" : "Copy a reminder message"}</PillButton>
        ) : null}
        {rows.length && siteUrl ? <PillButton onClick={downloadLinks}>Download personal links</PillButton> : null}
        <PillButton tone="dark" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "Add guests"}
        </PillButton>
      </div>

      {adding ? (
        <div className="mb-6 rounded-2xl border border-[var(--line)] bg-white p-4">
          <label htmlFor="invite-lines" className="text-[14px] font-semibold text-[var(--ink)]">
            One guest per line
          </label>
          <p className="mt-1 text-[13px] text-[var(--slate)]">After a comma, add an email or mobile if you have it, how many seats they get, and a table (e.g. Table 5). You can paste straight from Excel or Google Sheets.</p>
          <textarea
            id="invite-lines"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={"Maria Santos, maria@email.com, 2\nPaolo Cruz\nTita Lorna, 0917 555 0101"}
            className="mt-3 w-full rounded-xl border border-[var(--line)] px-4 py-3 text-[16px] outline-none md:text-[15px]"
          />
          <div className="mt-3 flex items-center gap-3">
            <PillButton tone="dark" onClick={add} disabled={busy || !text.trim()}>
              {busy ? "Adding…" : `Add ${pending ? `${pending} ` : ""}${pending === 1 ? "guest" : "guests"}`}
            </PillButton>
            {error ? <span className="text-[13px] text-[#c2412d]">{error}</span> : null}
          </div>
        </div>
      ) : null}

      {rows.length ? (
        <>
          <div className="mb-3 flex gap-2">
            {(["all", "waiting", "replied"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`min-h-[44px] rounded-full border px-4 text-[14px] md:min-h-[36px] md:text-[13px] ${filter === f ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)]"}`}
              >
                {f === "all" ? `All ${rows.length}` : f === "waiting" ? `Not yet ${waiting.length}` : `Replied ${rows.length - waiting.length}`}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white">
            {shown.map(({ inv, reply }) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[var(--ink)]">{inv.name}</p>
                  {inv.contact || inv.party_size || inv.table_label ? (
                    <p className="truncate text-[13px] text-[var(--slate)]">
                      {[inv.contact, inv.party_size ? `${inv.party_size} ${inv.party_size === 1 ? "seat" : "seats"}` : "", inv.table_label ? `Table ${inv.table_label}` : ""].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                {reply ? (
                  reply.attending === false ? (
                    <span className="shrink-0 rounded-full bg-[#ececec] px-2.5 py-1 text-[12px] font-semibold text-[#55556a]">Can’t make it</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[#ecfbcc] px-2.5 py-1 text-[12px] font-semibold text-[#3d5a12]">
                      Coming{reply.guest_count && reply.guest_count > 1 ? ` · ${reply.guest_count}` : ""}
                    </span>
                  )
                ) : (
                  <span className="shrink-0 rounded-full bg-[#fdf1cf] px-2.5 py-1 text-[12px] font-semibold text-[#7a5a00]">Not yet</span>
                )}
                {linkFor(inv) ? (
                  <button onClick={() => copyLink(inv)} title="Copy their personal invite (name and seats filled in)" className="hidden min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--ink)] hover:border-[var(--ink)] sm:inline-flex">
                    <i className="ri-link" aria-hidden /> {copiedId === inv.id ? "Copied" : "Copy invite"}
                  </button>
                ) : null}
                <button onClick={() => setEditing(inv)} aria-label={`Edit ${inv.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--slate)] hover:bg-[var(--paper)]">
                  <i className="ri-pencil-line text-[18px]" aria-hidden />
                </button>
                <button onClick={() => remove(inv)} aria-label={`Remove ${inv.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--slate)] hover:bg-[var(--paper)]">
                  <i className="ri-close-line text-[18px]" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {error && !adding ? <p className="mt-3 text-[13px] text-[#c2412d]">{error}</p> : null}
          <p className="mt-3 text-[13px] text-[var(--slate)]">
            Send each guest their own link (Copy invite, or Download personal links): their reply is matched for sure, and on Premium their seats are the most they can bring. Replies from the general link are matched by email, mobile or name.
          </p>
        </>
      ) : null}
      {editing ? <InviteeEditor inv={editing} onCancel={() => setEditing(null)} onSave={saveEdit} onCopy={linkFor(editing) ? () => copyLink(editing) : undefined} copied={copiedId === editing.id} /> : null}
    </div>
  );
}

/** Edit one guest: name, contact, seats and table (and copy their link on phones). */
function InviteeEditor({ inv, onCancel, onSave, onCopy, copied }: { inv: Invitee; onCancel: () => void; onSave: (next: Invitee) => void; onCopy?: () => void; copied: boolean }) {
  const [v, setV] = useState(inv);
  const input = "mt-1 w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[16px] outline-none md:text-[15px]";
  return (
    <div role="dialog" aria-modal="true" onClick={onCancel} className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[rgba(0,7,39,0.45)] p-4">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-[20px] bg-white p-6">
        <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">{inv.name}</h2>
        <div className="mt-4 grid gap-4">
          <label className="text-[14px] font-medium text-[var(--ink)]">
            Name
            <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={input} />
          </label>
          <label className="text-[14px] font-medium text-[var(--ink)]">
            Email or mobile (optional)
            <input value={v.contact ?? ""} onChange={(e) => setV({ ...v, contact: e.target.value })} autoCapitalize="none" className={input} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[14px] font-medium text-[var(--ink)]">
              Seats
              <input type="number" min={1} max={20} inputMode="numeric" value={v.party_size ?? ""} onChange={(e) => setV({ ...v, party_size: e.target.value ? Math.min(20, Math.max(1, Number(e.target.value))) : null })} className={input} />
            </label>
            <label className="text-[14px] font-medium text-[var(--ink)]">
              Table (optional)
              <input value={v.table_label ?? ""} onChange={(e) => setV({ ...v, table_label: e.target.value.slice(0, 40) })} placeholder="e.g. 5" className={input} />
            </label>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => v.name.trim() && onSave(v)} className="btn btn-primary">
            Save
          </button>
          {onCopy ? (
            <button onClick={onCopy} className="btn btn-ghost">
              {copied ? "Copied" : "Copy invite"}
            </button>
          ) : null}
          <button onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
