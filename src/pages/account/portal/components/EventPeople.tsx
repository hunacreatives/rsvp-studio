import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePortal } from "../PortalContext";
import * as api from "../api";
import { canBill, isUnclaimed, type EventAccess, type Project } from "../types";
import { PillButton, Select } from "../ui";

// Overview → People: who can open this event, and inviting more (supabase/coordinator-mode.sql).
// The couple and cohosts invite anyone and remove anyone but the couple; a coordinator invites
// their own team as viewers and can remove those; a viewer only sees the list.
// A client event the coordinator added and still owns (coordinator-desk.sql) also gets
// "Hand over to your client": an 'owner' invite. Once the client accepts, it's theirs.

const ROLE: Record<EventAccess, { label: string; what: string }> = {
  owner: { label: "Host", what: "" },
  cohost: { label: "Co-host", what: "Edits everything and can pay for upgrades." },
  coordinator: { label: "Coordinator", what: "Edits the website, guests and seating, and runs check-in. Can’t pay or see invoices." },
  viewer: { label: "Viewer", what: "Sees the website, replies and guests. Can’t change anything." },
};

/** Who owns the event, by kind: "Couple" for a wedding, "Celebrant" for a birthday or debut. */
const hostLabel = (type: string | null) => (type === "wedding" || type === "engagement" || type === "anniversary" ? "Couple" : type === "birthday" || type === "debut" ? "Celebrant" : "Host");

export default function EventPeople({ project }: { project: Project }) {
  const { profile, demo, refresh } = usePortal();
  const [people, setPeople] = useState<api.EventPerson[] | null>(null);
  const [email, setEmail] = useState("");
  const bill = canBill(project);
  const coordinator = project.access === "coordinator";
  // My client's event, not handed over yet: I'm its coordinator, and my team comes first.
  const handover = isUnclaimed(project);
  const roles: Exclude<EventAccess, "owner">[] = handover ? ["viewer", "cohost", "coordinator"] : bill ? ["coordinator", "cohost", "viewer"] : coordinator ? ["viewer"] : [];
  const [role, setRole] = useState<Exclude<EventAccess, "owner">>(roles[0] ?? "viewer");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [sure, setSure] = useState<string | null>(null);

  const load = () => api.loadEventPeople(project.id).then(setPeople);
  useEffect(() => {
    if (!demo) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, demo]);
  // The desk's "Hand over →" links here (#people).
  const { hash } = useLocation();
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    if (people && hash === "#people") box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [people, hash]);

  if (demo || !people) return null;

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setNote(null);
    const problem = await api.inviteToEvent(project.id, email.trim(), role);
    setBusy(false);
    if (problem) return setNote({ ok: false, text: problem });
    setNote({ ok: true, text: `Invite sent to ${email.trim()}. The link works for 14 days.` });
    setEmail("");
    load();
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      setSure(null);
      await load();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };
  // Who this person may take off: not the couple, not themselves (that's "Leave this event").
  const label = (p: api.EventPerson) =>
    p.role === "owner" ? (p.kind === "invite" || (project.client_of && !handover && project.access !== "owner") ? "Client" : handover ? "Coordinator" : hostLabel(project.event_type)) : ROLE[p.role].label;
  const removable = (p: api.EventPerson) => p.kind === "person" && p.role !== "owner" && p.id !== profile.id && (bill || (coordinator && p.role === "viewer" && p.added_by === profile.id));
  const cancellable = (p: api.EventPerson) => p.kind === "invite" && (bill || p.added_by === profile.id);

  return (
    <section ref={box} id="people" className="scroll-mt-24 rounded-[22px] border border-[rgba(0,7,39,0.14)] bg-white p-5 md:p-6">
      <h2 className="text-[16px] font-semibold text-[var(--ink)]">People</h2>
      <p className="mt-0.5 text-[14px] text-[var(--slate)]">{coordinator || handover ? "Bring your team in to see the guest list on the day." : "Your coordinator, a co-host, or family who can help."}</p>
      <ul className="mt-3 divide-y divide-[rgba(0,7,39,0.08)]">
        {people.map((p) => (
          <li key={`${p.kind}-${p.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-[15px]">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[var(--ink)]">
                {p.kind === "invite" ? p.email : p.name || p.email}
                {p.kind === "person" && p.id === profile.id ? <span className="text-[var(--slate)]"> (you)</span> : null}
              </span>
              {p.kind === "person" && p.name && p.email ? <span className="block truncate text-[13px] text-[var(--slate)]">{p.email}</span> : null}
            </span>
            <span className="shrink-0 text-[13px] text-[var(--slate)]">{p.kind === "invite" ? `${label(p)} · invited` : label(p)}</span>
            {sure === p.id ? (
              <span className="flex shrink-0 items-center gap-3 text-[13px]">
                <button className="font-medium text-[#c2412d] hover:underline" disabled={busy} onClick={() => act(() => (p.kind === "invite" ? api.cancelEventInvite(p.id) : api.removeEventMember(project.id, p.id)))}>
                  {p.kind === "invite" ? "Cancel invite" : "Remove"}
                </button>
                <button className="text-[var(--slate)] hover:underline" onClick={() => setSure(null)}>
                  Keep
                </button>
              </span>
            ) : removable(p) || cancellable(p) ? (
              <button className="shrink-0 text-[13px] font-medium text-[var(--acc-blue)] hover:underline" onClick={() => setSure(p.id)} aria-label={`${p.kind === "invite" ? "Cancel the invite to" : "Remove"} ${p.name || p.email}`}>
                {p.kind === "invite" ? "Cancel" : "Remove"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {sure && people.find((p) => p.id === sure)?.role === "coordinator" ? (
        <p className="mt-1 text-[13px] text-[var(--slate)]">Their seating plans for this event become yours, and the check-in link changes, so their phones stop working.</p>
      ) : null}
      {handover ? (
        <HandOver
          project={project}
          pending={people.some((p) => p.kind === "invite" && p.role === "owner")}
          onSent={() => {
            load();
            refresh();
          }}
        />
      ) : null}
      {roles.length ? (
        <form onSubmit={invite} className="mt-4 border-t border-[rgba(0,7,39,0.1)] pt-4">
          {handover ? <p className="mb-3 text-[15px] font-semibold text-[var(--ink)]">Invite your team</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="their@email.com"
              aria-label="Their email"
              className="min-h-[44px] min-w-0 flex-1 rounded-full border border-[rgba(0,7,39,0.18)] bg-white px-4 text-[16px] text-[var(--ink)] outline-none focus:border-[var(--ink)] md:text-[15px]"
            />
            {roles.length > 1 ? (
              <div className="sm:w-[170px]">
                <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="What they can do">
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE[r].label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <PillButton tone="dark" type="submit" disabled={busy || !valid}>
              {busy ? "Sending…" : "Send invite"}
            </PillButton>
          </div>
          <p className="mt-2 text-[13px] text-[var(--slate)]">{ROLE[role].what}</p>
          {note ? <p className={`mt-2 text-[13px] ${note.ok ? "text-[#2f6b2f]" : "text-[#c2412d]"}`}>{note.text}</p> : null}
        </form>
      ) : null}
    </section>
  );
}

/** My client's event → theirs: an 'owner' invite. One open at a time; a new one replaces it. */
function HandOver({ project, pending, onSent }: { project: Project; /** One is out already (it's in the list above). */ pending: boolean; onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setNote(null);
    const problem = await api.inviteToEvent(project.id, email.trim(), "owner");
    setBusy(false);
    if (problem) return setNote({ ok: false, text: problem });
    setNote({ ok: true, text: `Sent to ${email.trim()}. The link works for 14 days.` });
    setEmail("");
    onSent();
  };
  return (
    <form onSubmit={send} className="mt-4 border-t border-[rgba(0,7,39,0.1)] pt-4">
      <p className="text-[15px] font-semibold text-[var(--ink)]">Hand over to your client</p>
      <p className="mt-0.5 text-[13px] text-[var(--slate)]">
        When they accept, the event and its payments are theirs, and you stay on as their&nbsp;coordinator.{pending ? " A new invite replaces the one that’s out." : ""}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@email.com"
          aria-label="Your client’s email"
          className="min-h-[44px] min-w-0 flex-1 rounded-full border border-[rgba(0,7,39,0.18)] bg-white px-4 text-[16px] text-[var(--ink)] outline-none focus:border-[var(--ink)] md:text-[15px]"
        />
        <PillButton tone="dark" type="submit" disabled={busy || !valid}>
          {busy ? "Sending…" : "Send hand-over"}
        </PillButton>
      </div>
      {note ? <p className={`mt-2 text-[13px] ${note.ok ? "text-[#2f6b2f]" : "text-[#c2412d]"}`}>{note.text}</p> : null}
    </form>
  );
}
