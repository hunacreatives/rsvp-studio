import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Guest } from "../../components/GuestTable";
import { PillButton } from "../ui";
import { downloadCsv } from "@/lib/csv";
import { matchInvitees, phoneKey, reminderMessage, sameGuest } from "../inviteMatch";

// Guests → Invite list (supabase/guest-features.sql → invitees): the hosts' own list,
// matched against the RSVPs that came in, so they can see who hasn't replied yet and
// copy a friendly nudge to send by Messenger or Viber.
// Matching replies to invitees: ../inviteMatch.ts.

/** `source`: "save_the_date" = they asked for the invitation on the Save the Date link (supabase/save-the-date.sql). */
export type Invitee = { id: string; name: string; contact: string | null; party_size: number | null; created_at: string; token?: string; table_label?: string | null; source?: string | null };

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

/** `reply`: the invitee's own (or first) reply. `others`: people who replied on their
 *  forwarded personal link, sharing the invitation's seats. */
type Status = { reply: Guest | null; others: Guest[] };

/** readOnly: a viewer on the event (coordinator-mode.sql) sees the list but can't change it. */
export default function InviteList({ eventId, guests: loaded, eventName, siteUrl, deadline, demo, readOnly }: { eventId: string; guests: Guest[]; eventName: string; siteUrl: string | null; deadline?: string | null; demo?: boolean; readOnly?: boolean }) {
  const [list, setList] = useState<Invitee[] | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Replies moved onto the kept copy by a merge (invitee id → kept id), until the page reloads.
  const [moved, setMoved] = useState<Record<string, string>>({});
  const guests = useMemo(
    () => loaded.map((g) => (g.invitee_id && moved[g.invitee_id] ? { ...g, invitee_id: moved[g.invitee_id] } : g)),
    [loaded, moved],
  );
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
        { id: "i5", name: "Bea Reyes", contact: "bea@example.com", party_size: 1, created_at: "" },
        { id: "i6", name: "Miguel Tan", contact: "miguel@example.com", party_size: 2, created_at: "" },
        { id: "i7", name: "Carla Villanueva", contact: "carla@example.com", party_size: 1, created_at: "" },
        { id: "i8", name: "Tito Ramon Aquino", contact: "0918 555 0144", party_size: 4, created_at: "" },
        { id: "i9", name: "Ate Joy Mercado", contact: "joy.mercado@example.com", party_size: null, created_at: "", source: "save_the_date" },
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

  // Which replies belong to each invitee (../inviteMatch.ts).
  const rows = useMemo(() => (list ? (matchInvitees(list, guests) as ({ inv: Invitee } & Status)[]) : []), [list, guests]);
  // Guests on the list more than once (added before repeats were skipped). Kept: the copy whose
  // link someone has replied on, else the first one added.
  const repeats = useMemo(() => {
    if (!list) return [];
    const linked = new Set(guests.map((g) => g.invitee_id).filter(Boolean));
    const seen: Invitee[] = [];
    const groups: { keep: Invitee; drop: Invitee[] }[] = [];
    const byAge = [...list].sort((a, b) => Number(linked.has(b.id)) - Number(linked.has(a.id)) || a.created_at.localeCompare(b.created_at));
    for (const inv of byAge) {
      const match = seen.find((s) => sameGuest(s, inv));
      if (!match) seen.push(inv);
      else {
        const g = groups.find((x) => x.keep === match);
        if (g) g.drop.push(inv);
        else groups.push({ keep: match, drop: [inv] });
      }
    }
    return groups;
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
    setNotice(null);
    // Someone already on the list (or twice in the paste) isn't added again: one guest, one
    // link. Details they didn't have yet (seats, table, contact) are filled in.
    const fresh: typeof parsed = [];
    const fills = new Map<string, Partial<Invitee>>();
    for (const p of parsed) {
      if (fresh.some((f) => sameGuest(f, p))) continue;
      const have = list.find((i) => sameGuest(i, p));
      if (!have) {
        fresh.push(p);
        continue;
      }
      const fill: Partial<Invitee> = {
        ...(!have.contact && p.contact ? { contact: p.contact } : {}),
        ...(!have.party_size && p.party_size ? { party_size: p.party_size } : {}),
        ...(!have.table_label && p.table_label ? { table_label: p.table_label } : {}),
      };
      if (Object.keys(fill).length) fills.set(have.id, { ...fills.get(have.id), ...fill });
    }
    const skipped = parsed.length - fresh.length;
    let added: Invitee[] = [];
    if (fresh.length) {
      const { data, error: e } = await supabase
        .from("invitees")
        .insert(fresh.map((p) => ({ ...p, event_id: eventId })))
        .select("*");
      if (e) {
        setBusy(false);
        return setError(/INVITE_LIMIT/.test(e.message) ? "You can have up to 1,000 guests on your list." : "Couldn’t add them. Please try again.");
      }
      added = (data ?? []) as Invitee[];
    }
    await Promise.all([...fills].map(([id, patch]) => supabase.from("invitees").update(patch).eq("id", id)));
    setBusy(false);
    setList(
      [...list.map((i) => (fills.has(i.id) ? { ...i, ...fills.get(i.id) } : i)), ...added].sort((a, b) => a.name.localeCompare(b.name)),
    );
    if (skipped)
      setNotice(
        `${added.length ? `Added ${added.length}. ` : ""}${skipped === 1 ? "1 was" : `${skipped} were`} already on your list${fills.size ? "; we filled in what was new" : ""}.`,
      );
    setText("");
    setAdding(false);
  };
  // Folds each repeat into the copy that's kept: replies on the extra copy's link move over
  // (as party members, sharing its seats), and details only the extra had are kept.
  const merge = async () => {
    if (demo) return;
    setBusy(true);
    setError(null);
    let next = list;
    for (const { keep, drop } of repeats) {
      const patch: Partial<Invitee> = {};
      for (const d of drop) {
        if (!keep.contact && !patch.contact && d.contact) patch.contact = d.contact;
        if (!keep.party_size && !patch.party_size && d.party_size) patch.party_size = d.party_size;
        if (!keep.table_label && !patch.table_label && d.table_label) patch.table_label = d.table_label;
      }
      const ids = drop.map((d) => d.id);
      const moved = await supabase.from("rsvps").update({ invitee_id: keep.id }).in("invitee_id", ids);
      if (moved.error) break;
      const gone = await supabase.from("invitees").delete().in("id", ids);
      if (gone.error) break;
      if (Object.keys(patch).length) await supabase.from("invitees").update(patch).eq("id", keep.id);
      next = next.filter((i) => !ids.includes(i.id)).map((i) => (i.id === keep.id ? { ...i, ...patch } : i));
      setMoved((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, keep.id])) }));
    }
    setBusy(false);
    if (next.length + repeats.reduce((n, g) => n + g.drop.length, 0) !== list.length) setError("Couldn’t merge them all. Please try again.");
    setList(next);
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
    const msg = reminderMessage(eventName, siteUrl, deadline);
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
        {readOnly ? null : (
          <PillButton tone="dark" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Add guests"}
          </PillButton>
        )}
      </div>

      {repeats.length && !adding && !readOnly ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3">
          <p className="min-w-0 flex-1 text-[14px] text-[var(--ink)]">
            {repeats.length === 1 ? `${repeats[0].keep.name} is on your list ${repeats[0].drop.length === 1 ? "twice" : `${repeats[0].drop.length + 1} times`}.` : `${repeats.length} guests are on your list more than once.`}
            <span className="text-[var(--slate)]"> Merging keeps the link they’ve used.</span>
          </p>
          <PillButton onClick={merge} disabled={busy}>
            {busy ? "Merging…" : repeats.length === 1 ? "Merge" : "Merge them"}
          </PillButton>
        </div>
      ) : null}
      {notice && !adding ? <p className="mb-5 text-[14px] text-[var(--slate)]">{notice}</p> : null}

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
            {shown.map(({ inv, reply, others }) => {
              const coming = [reply, ...others].filter((g): g is Guest => !!g && g.attending !== false);
              const seats = coming.reduce((n, g) => n + (g.guest_count ?? 1), 0);
              return (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-[var(--ink)]">{inv.name}</p>
                  {inv.contact || inv.party_size || inv.table_label || inv.source === "save_the_date" || others.length ? (
                    <p className="truncate text-[13px] text-[var(--slate)]">
                      {[
                        others.length ? `With ${others.map((g) => g.name).join(", ")}` : "",
                        inv.contact,
                        inv.party_size ? `${inv.party_size} ${inv.party_size === 1 ? "seat" : "seats"}` : "",
                        inv.table_label ? `Table ${inv.table_label}` : "",
                        inv.source === "save_the_date" ? "From your Save the Date" : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                {reply ? (
                  !coming.length ? (
                    <span className="shrink-0 rounded-full bg-[#ececec] px-2.5 py-1 text-[12px] font-semibold text-[#55556a]">Can’t make it</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[#ecfbcc] px-2.5 py-1 text-[12px] font-semibold text-[#3d5a12]">
                      Coming{seats > 1 ? ` · ${seats}` : ""}
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
                {readOnly ? null : (
                  <>
                    <button onClick={() => setEditing(inv)} aria-label={`Edit ${inv.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--slate)] hover:bg-[var(--paper)]">
                      <i className="ri-pencil-line text-[18px]" aria-hidden />
                    </button>
                    <button onClick={() => remove(inv)} aria-label={`Remove ${inv.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--slate)] hover:bg-[var(--paper)]">
                      <i className="ri-close-line text-[18px]" aria-hidden />
                    </button>
                  </>
                )}
              </li>
              );
            })}
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
