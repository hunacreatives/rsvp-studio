import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import * as api from "../api";
import { usePortal } from "../PortalContext";
import { countdown, daysUntil, formatDate, timeAgo } from "../format";
import { matchInvitees, reminderMessage } from "../inviteMatch";
import type { Project } from "../types";
import { PillButton } from "../ui";
import { CopyLink } from "./blocks";

// A site the host runs themselves → Overview: the one summary they open the page for. How many
// have replied (and who's coming), when replies close, who still hasn't replied (with the
// reminder to send them), and the latest replies. The full lists live under Guests.

type Inv = { id: string; name: string; contact: string | null; party_size: number | null };

export default function EventOverview({ project, openGuests }: { project: Project; openGuests: (list: "replies" | "invites") => void }) {
  const { sites } = usePortal();
  const navigate = useNavigate();
  const site = sites[project.id];
  const [guests, setGuests] = useState<api.Guest[] | null>(null);
  const [invitees, setInvitees] = useState<Inv[]>([]);
  const [deadline, setDeadline] = useState<string | null>(site?.deadline ?? null);
  const [copied, setCopied] = useState(false);
  const live = !!site?.publishedAt && !site.ended;
  const url = site ? `${window.location.origin}/invite/${site.slug}` : null;

  useEffect(() => {
    let on = true;
    api.loadGuests(project).then((g) => on && setGuests(g));
    supabase
      .from("invitees")
      .select("id, name, contact, party_size")
      .eq("event_id", project.id)
      .order("name")
      .then(({ data }) => on && setInvitees((data ?? []) as Inv[]));
    // What guests see: the published "Replies close on".
    supabase
      .from("wedding_sites")
      .select("deadline:published_content->>rsvpDeadline")
      .eq("event_id", project.id)
      .maybeSingle()
      .then(({ data }) => on && setDeadline(((data as { deadline?: string | null } | null)?.deadline as string | null) ?? null));
    return () => {
      on = false;
    };
  }, [project]);

  const waiting = useMemo(() => (guests ? matchInvitees(invitees, guests).filter((r) => !r.reply).map((r) => r.inv) : []), [guests, invitees]);

  if (!site?.publishedAt) {
    return (
      <Card>
        <p className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">Not live yet</p>
        <p className="mt-1 max-w-md text-[15px] text-[var(--slate)]">Publish your site to start collecting replies. You can add your guest list now so it’s ready.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PillButton tone="dark" onClick={() => navigate(`/account/events/${project.id}/site-builder${site ? "/edit" : ""}`)}>
            <i className="ri-edit-2-line" /> {site ? "Continue building" : "Pick a design"}
          </PillButton>
          <PillButton onClick={() => openGuests("invites")}>
            <i className="ri-user-add-line" /> Add your guest list
          </PillButton>
        </div>
      </Card>
    );
  }
  if (!guests) return <p className="text-[var(--slate)]">Loading replies…</p>;

  const coming = guests.filter((g) => g.attending !== false);
  const people = coming.reduce((n, g) => n + (g.guest_count ?? 1), 0);
  const declined = guests.length - coming.length;
  const replied = invitees.length - waiting.length;
  const closesIn = daysUntil(deadline);
  const latest = [...guests].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 5);
  const copyReminder = () => {
    const msg = reminderMessage(project.name, url, deadline);
    navigator.clipboard?.writeText(msg).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => window.prompt("Copy this message:", msg),
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-[16px] text-[var(--ink)]">
            {invitees.length ? (
              <>
                <b className="font-display text-[2rem] font-semibold">{replied}</b> of {invitees.length} replied
              </>
            ) : (
              <>
                <b className="font-display text-[2rem] font-semibold">{guests.length}</b> {guests.length === 1 ? "reply" : "replies"}
              </>
            )}
          </p>
          {deadline ? (
            <p className={`text-[14px] ${closesIn !== null && closesIn >= 0 && closesIn <= 3 ? "font-medium text-[#8a5a00]" : "text-[var(--slate)]"}`}>
              {closesIn !== null && closesIn < 0 ? `Replies closed ${formatDate(deadline)}` : `Replies close ${formatDate(deadline)}${closesIn !== null ? ` · ${countdown(deadline).toLowerCase().replace(" to go", " left")}` : ""}`}
            </p>
          ) : null}
        </div>
        {invitees.length ? (
          <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-[#e6e6ea]" role="progressbar" aria-valuenow={replied} aria-valuemin={0} aria-valuemax={invitees.length} aria-label="Replied">
            <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${(replied / Math.max(1, invitees.length)) * 100}%` }} />
          </div>
        ) : null}
        <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-[rgba(0,7,39,0.1)] pt-4">
          <Stat label="Coming" value={people} hint={`${coming.length} ${coming.length === 1 ? "reply" : "replies"}`} />
          <Stat label="Can’t make it" value={declined} />
          <Stat label={invitees.length ? "Not replied yet" : "On your list"} value={invitees.length ? waiting.length : 0} hint={invitees.length ? undefined : "Add your guests"} />
        </dl>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">{invitees.length ? "Haven’t replied" : "Who hasn’t replied?"}</h2>
            {invitees.length ? (
              <button onClick={() => openGuests("invites")} className="text-[14px] font-medium text-[var(--acc-blue)] hover:underline">
                Invite list →
              </button>
            ) : null}
          </div>
          {!invitees.length ? (
            <>
              <p className="text-[14px] text-[var(--slate)]">Add the people you invited and we’ll show who still needs a nudge.</p>
              <PillButton className="mt-4" onClick={() => openGuests("invites")}>
                <i className="ri-user-add-line" /> Add your guest list
              </PillButton>
            </>
          ) : !waiting.length ? (
            <p className="text-[14px] text-[var(--slate)]">Everyone on your list has replied.</p>
          ) : (
            <>
              <ul className="divide-y divide-[rgba(0,7,39,0.08)]">
                {waiting.slice(0, 6).map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-2 text-[15px] text-[var(--ink)]">
                    <span className="truncate">{inv.name}</span>
                    {inv.party_size ? <span className="shrink-0 text-[13px] text-[var(--slate)]">{inv.party_size === 1 ? "1 seat" : `${inv.party_size} seats`}</span> : null}
                  </li>
                ))}
              </ul>
              {waiting.length > 6 ? <p className="mt-2 text-[13px] text-[var(--slate)]">and {waiting.length - 6} more</p> : null}
              {live ? (
                <PillButton tone="dark" className="mt-4" onClick={copyReminder}>
                  <i className={copied ? "ri-check-line" : "ri-file-copy-line"} /> {copied ? "Copied. Paste it in Messenger or Viber" : "Copy a reminder"}
                </PillButton>
              ) : null}
            </>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-[var(--ink)]">Latest replies</h2>
            {guests.length ? (
              <button onClick={() => openGuests("replies")} className="text-[14px] font-medium text-[var(--acc-blue)] hover:underline">
                All {guests.length} →
              </button>
            ) : null}
          </div>
          {latest.length ? (
            <ul className="divide-y divide-[rgba(0,7,39,0.08)]">
              {latest.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-2 text-[15px]">
                  <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{g.name}</span>
                  <span className={`shrink-0 text-[13px] ${g.attending === false ? "text-[var(--slate)]" : "text-[#3d5a12]"}`}>
                    {g.attending === false ? "Can’t make it" : `Coming${(g.guest_count ?? 1) > 1 ? ` · ${g.guest_count}` : ""}`}
                  </span>
                  <span className="w-[72px] shrink-0 text-right text-[12.5px] text-[var(--slate)]">{g.created_at ? timeAgo(g.created_at) : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="text-[14px] text-[var(--slate)]">No replies yet. Send your link to get the first ones in.</p>
              {live && url ? (
                <div className="mt-4">
                  <CopyLink url={url} />
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-[22px] border border-[rgba(0,7,39,0.14)] bg-white p-5 md:p-6">{children}</section>;
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-[var(--slate)]">{label}</dt>
      <dd className="mt-0.5 text-[22px] font-semibold leading-tight text-[var(--ink)]">{value}</dd>
      {hint ? <dd className="text-[12.5px] text-[var(--slate)]">{hint}</dd> : null}
    </div>
  );
}
