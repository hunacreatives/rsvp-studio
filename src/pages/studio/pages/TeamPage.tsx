import { useCallback, useEffect, useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate, timeAgo } from "@/pages/account/portal/format";
import { Avatar, ErrorText, Field, Input, Modal, PillButton, PrimaryButton } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as studio from "../studioApi";

type Loaded = Awaited<ReturnType<typeof studio.loadTeam>>;
type Ready = Extract<Loaded, { ready: true }>;

const DEMO: Ready = {
  ready: true,
  myRole: "owner",
  team: [
    { id: "demo-owner", full_name: "The RSVP Studio", email: "hello@thersvpstudio.com", avatar_url: null, staff_role: "owner", created_at: "2026-09-18T02:00:00Z" },
    { id: "demo-admin", full_name: "Huna Creatives", email: "hunacreatives@gmail.com", avatar_url: null, staff_role: "admin", created_at: "2026-10-09T02:00:00Z" },
  ],
  invites: [{ id: "demo-invite", email: "designer@example.com", role: "admin", created_at: "2026-10-09T03:00:00Z", last_sent_at: "2026-10-09T03:00:00Z" }],
  events: [],
};

const ACTION: Record<string, string> = {
  invited: "was invited as admin",
  invite_cancelled: "invite was cancelled",
  invite_accepted: "joined as admin",
  added: "was added as admin",
  removed: "was removed from the team",
  ownership_received: "became the owner",
  ownership_given: "handed over ownership",
  setup: "was set up as",
};

/**
 * Studio → Team. The owner adds and removes admins and can hand over
 * ownership; admins see the team read-only. The database enforces all of it
 * (supabase/team-roles.sql) — these buttons only call its team functions.
 */
export default function TeamPage() {
  const { profile, demo } = usePortal();
  const [data, setData] = useState<Loaded | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "transfer"; member: studio.TeamMember } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (demo) return setData(DEMO);
    studio.loadTeam(profile.id).then(setData);
  }, [demo, profile.id]);
  useEffect(reload, [reload]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setError(null);
    try {
      if (demo) throw new Error("Team changes are turned off in demo mode.");
      await work();
      setNotice(done);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  if (!data) return <StudioHeader title="Team" sub="Loading…" />;
  if (!data.ready) {
    return (
      <>
        <StudioHeader title="Team" sub="Who can open the Studio console." />
        <p className="max-w-xl text-[14px] text-[var(--slate)]">
          The team setup hasn’t been added to the database yet. Run <code>supabase/team-roles.sql</code> in the Supabase SQL editor, then reload this page.
        </p>
      </>
    );
  }

  const owner = data.myRole === "owner";
  const nameOf = (id: string | null) => data.team.find((m) => m.id === id)?.full_name ?? "Someone";

  return (
    <>
      <StudioHeader
        title="Team"
        sub={owner ? "Everyone who can open the Studio console. Admins can do everything except change the team." : "Everyone who can open the Studio console. Only the owner can change the team."}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--slate)]">
          {data.team.length} {data.team.length === 1 ? "person" : "people"}
          {data.invites.length ? ` · ${data.invites.length} invite${data.invites.length === 1 ? "" : "s"} pending` : ""}
        </p>
        {owner ? (
          <PillButton tone="dark" onClick={() => (setAdding(true), setNotice(null), setError(null))}>
            + Add admin
          </PillButton>
        ) : null}
      </div>

      {notice ? <p className="mb-4 rounded-xl bg-[#eef7ee] px-4 py-3 text-[14px] text-[#2f6b2f]">{notice}</p> : null}
      {error && !adding && !confirm ? <ErrorText>{error}</ErrorText> : null}

      <div className="overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="px-5 py-3 font-medium">Person</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              {owner ? <th className="px-5 py-3 font-medium" /> : null}
            </tr>
          </thead>
          <tbody>
            {data.team.map((m) => (
              <tr key={m.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar name={m.full_name ?? m.email} seed={m.id} url={m.avatar_url} size={36} />
                    <span>
                      <span className="block text-[var(--ink)]">
                        {m.full_name || "—"}
                        {m.id === profile.id ? <span className="text-[var(--slate)]"> (you)</span> : null}
                      </span>
                      <span className="block text-[12px] text-[var(--slate)]">{m.email}</span>
                    </span>
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className="rounded-full px-2.5 py-1 text-[12px] font-medium uppercase tracking-[0.04em]"
                    style={m.staff_role === "owner" ? { background: "var(--ink)", color: "#fff" } : { background: "var(--paper)", color: "var(--ink)" }}
                  >
                    {m.staff_role === "owner" ? "Owner" : "Admin"}
                  </span>
                </td>
                <td className="px-5 py-3 text-[var(--slate)]">{formatDate(m.created_at)}</td>
                {owner ? (
                  <td className="px-5 py-3 text-right">
                    {m.staff_role === "admin" ? (
                      <span className="inline-flex gap-2">
                        <PillButton onClick={() => (setConfirm({ kind: "transfer", member: m }), setError(null))}>Make owner</PillButton>
                        <PillButton tone="danger" onClick={() => (setConfirm({ kind: "remove", member: m }), setError(null))}>Remove</PillButton>
                      </span>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.invites.length ? (
        <>
          <h2 className="mt-10 mb-3 font-display text-[1.4rem] font-semibold text-[var(--ink)]">Pending invites</h2>
          <div className="rounded-[22px] border border-[var(--line)] bg-white">
            {data.invites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-3 last:border-0">
                <span>
                  <span className="block text-[var(--ink)]">{inv.email}</span>
                  <span className="block text-[12px] text-[var(--slate)]">
                    Invited as admin {timeAgo(inv.created_at)}
                    {inv.last_sent_at !== inv.created_at ? ` · last sent ${timeAgo(inv.last_sent_at)}` : ""}. Becomes admin when they sign up with this email.
                  </span>
                </span>
                {owner ? (
                  <span className="inline-flex gap-2">
                    <PillButton onClick={() => run(() => studio.resendStaffInvite(inv.email), `Invite sent again to ${inv.email}.`)}>Resend</PillButton>
                    <PillButton tone="danger" onClick={() => run(() => studio.cancelStaffInvite(inv.id), `Invite to ${inv.email} cancelled.`)}>Cancel</PillButton>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {data.events.length ? (
        <>
          <h2 className="mt-10 mb-3 font-display text-[1.4rem] font-semibold text-[var(--ink)]">Recent changes</h2>
          <ul className="space-y-2 text-[13px] text-[var(--slate)]">
            {data.events.map((e) => (
              <li key={e.id}>
                <span className="text-[var(--ink)]">{e.email ?? "Someone"}</span> {ACTION[e.action] ?? e.action}
                {e.action === "setup" ? ` ${e.to_role}` : ""}
                {e.actor_id && e.action !== "invite_accepted" && e.action !== "ownership_given" ? ` by ${nameOf(e.actor_id)}` : ""} · {timeAgo(e.created_at)}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <AddAdminModal
        open={adding}
        onClose={() => setAdding(false)}
        onDone={(msg) => {
          setAdding(false);
          setNotice(msg);
          reload();
        }}
        demo={demo}
      />

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.kind === "transfer" ? "Make owner?" : "Remove admin?"}>
        {confirm ? (
          <>
            <p className="text-[14px] leading-relaxed text-[var(--slate)]">
              {confirm.kind === "transfer" ? (
                <>
                  <strong className="text-[var(--ink)]">{confirm.member.full_name || confirm.member.email}</strong> becomes the owner and can change the team. You become an admin and
                  can&rsquo;t undo this yourself.
                </>
              ) : (
                <>
                  <strong className="text-[var(--ink)]">{confirm.member.full_name || confirm.member.email}</strong> loses access to the Studio console straight away. Their own account stays.
                </>
              )}
            </p>
            <ErrorText>{error}</ErrorText>
            <div className="mt-6 flex justify-end gap-2">
              <PillButton onClick={() => setConfirm(null)}>Keep as is</PillButton>
              <PillButton
                tone={confirm.kind === "transfer" ? "dark" : "danger"}
                onClick={() =>
                  run(
                    () => (confirm.kind === "transfer" ? studio.transferOwnership(confirm.member.id) : studio.removeAdmin(confirm.member.id)),
                    confirm.kind === "transfer" ? `${confirm.member.full_name || confirm.member.email} is now the owner.` : `${confirm.member.full_name || confirm.member.email} was removed from the team.`,
                  ).then(() => setConfirm(null))
                }
              >
                {confirm.kind === "transfer" ? "Make owner" : "Remove"}
              </PillButton>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}

function AddAdminModal({ open, onClose, onDone, demo }: { open: boolean; onClose: () => void; onDone: (msg: string) => void; demo: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) (setEmail(""), setError(null), setBusy(false));
  }, [open]);

  const add = async () => {
    setError(null);
    if (demo) return setError("Team changes are turned off in demo mode.");
    setBusy(true);
    try {
      const out = await studio.inviteAdmin(email);
      onDone(
        out.status === "added"
          ? `${email.trim()} is now an admin. We emailed them to let them know.`
          : `Invite sent to ${email.trim()}. They become an admin when they sign up with that email.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add them.");
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add an admin">
      <p className="text-[14px] leading-relaxed text-[var(--slate)]">
        Admins can open the Studio console and do everything there: projects, clients, invoices, support and templates. Only you can change the team.
      </p>
      <div className="mt-5">
        <Field label="Email" hint="If they already have an account they become an admin right away; otherwise they get an invite.">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus onKeyDown={(e) => e.key === "Enter" && email && add()} />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={add} disabled={busy || !email.trim()}>
          {busy ? "Adding…" : "Add admin"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
