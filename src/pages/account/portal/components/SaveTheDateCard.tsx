import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import InviteShareButtons from "@/components/InviteShare";
import { stdNames, stdWhen } from "@/pages/wedding-sites/content/saveTheDate";
import { usePortal } from "../PortalContext";
import * as api from "../api";
import type { Project } from "../types";
import { OutlineCard, PillButton } from "../ui";
import { supabase } from "@/lib/supabase";

// The couple's view of their studio Save the Date link (supabase/save-the-date.sql): the link
// to share, how many opened it, and how many asked for the invitation (they're in the invite
// list). The studio sets it up in Studio → the project → Save the Date.
export default function SaveTheDateCard({ project }: { project: Project }) {
  const { sites, demo } = usePortal();
  const site = sites[project.id];
  const std = site?.std;
  const [stats, setStats] = useState<{ opens: number; signups: number } | null>(null);
  // Sign-ups who left an email and haven't had the invitation yet (supabase/email-additions.sql).
  const [toInvite, setToInvite] = useState(0);
  const [sending, setSending] = useState<"idle" | "sending" | { sent: number; failed: number }>("idle");
  const websiteShowing = !!site?.publishedAt && !site.stdLive && !site.ended;
  useEffect(() => {
    if (!std || demo || !websiteShowing) return;
    let live = true;
    supabase
      .from("invitees")
      .select("id", { count: "exact", head: true })
      .eq("event_id", project.id)
      .eq("source", "save_the_date")
      .not("consented_at", "is", null)
      .is("std_invited_at", null)
      .ilike("contact", "%@%")
      .then(({ count, error }) => live && setToInvite(error ? 0 : count ?? 0));
    return () => {
      live = false;
    };
  }, [project.id, std, demo, websiteShowing, sending]);
  const sendInvites = async () => {
    setSending("sending");
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ kind: "std_invite", eventId: project.id }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => null)) as { sent?: number; failed?: number } | null;
    setSending({ sent: j?.sent ?? 0, failed: j?.failed ?? (r?.ok ? 0 : toInvite) });
  };

  useEffect(() => {
    if (!std) return;
    if (demo) return setStats({ opens: 142, signups: 38 });
    let live = true;
    api.saveTheDateStats(project.id).then((s) => live && setStats(s));
    return () => {
      live = false;
    };
  }, [project.id, std, demo]);

  if (!site || !std) return null;
  const url = `${window.location.origin}/invite/${site.slug}`;
  const when = stdWhen(std);

  return (
    <OutlineCard className="mb-6 p-5 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-start gap-5">
        <img src={std.image.url} alt="" className="h-28 w-auto shrink-0 rounded-lg shadow-[0_10px_24px_-14px_rgba(0,7,39,0.45)]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Your Save the Date</p>
              <p className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">{stdNames(std)}</p>
              {when ? <p className="mt-1 text-[14px] text-[var(--slate)]">{when.long}</p> : null}
            </div>
            <span className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] ${site.stdLive ? "bg-[#ecfbcc] text-[#3d5a12]" : "bg-[#ececec] text-[#55556a]"}`}>
              {site.stdLive ? "Live" : websiteShowing ? "Done" : "Not shared yet"}
            </span>
          </div>
          {stats ? (
            <p className="mt-3 text-[14px] text-[var(--ink)]">
              <b>{stats.opens.toLocaleString("en-PH")}</b> {stats.opens === 1 ? "open" : "opens"} · <b>{stats.signups.toLocaleString("en-PH")}</b> asked for the invitation
              {stats.signups ? (
                <>
                  {" · "}
                  <Link to={`/account/projects/${project.id}?tab=guests`} className="font-medium text-[var(--acc-blue)] hover:underline">
                    See them in your invite list
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {site.stdLive ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--paper)] px-4 py-3">
            <i className="ri-link text-[var(--slate)]" />
            <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-[14px] text-[var(--acc-blue)] hover:underline sm:flex-none sm:truncate">
              {url}
            </a>
            <PillButton className="ml-auto" onClick={() => navigator.clipboard?.writeText(url)}>
              Copy link
            </PillButton>
          </div>
          <InviteShareButtons url={url} slug={site.slug} title={`${stdNames(std)} — Save the Date`} className="mt-3" />
        </>
      ) : websiteShowing ? null : (
        <p className="mt-5 text-[14px] text-[var(--slate)]">We’ll share the link with you here once your Save the Date is ready.</p>
      )}
      {/* The Save the Date promised them the invitation: one click, once each. */}
      {websiteShowing && (toInvite > 0 || typeof sending === "object") ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] px-4 py-3">
          <p className="min-w-0 flex-1 text-[14px] text-[var(--ink)]">
            {typeof sending === "object"
              ? sending.sent
                ? `Sent to ${sending.sent} ${sending.sent === 1 ? "person" : "people"}.${sending.failed ? ` ${sending.failed} didn’t go through. Try again in a bit.` : ""}`
                : "Couldn’t send them. Please try again."
              : `${toInvite} ${toInvite === 1 ? "person" : "people"} asked for the invitation on your Save the Date.`}
          </p>
          {toInvite > 0 ? (
            <PillButton tone="dark" onClick={sendInvites} disabled={sending === "sending"}>
              {sending === "sending" ? "Sending…" : `Send them the invitation`}
            </PillButton>
          ) : null}
        </div>
      ) : null}
      <p className="mt-5 text-[14px] text-[var(--slate)]">
        {websiteShowing ? "Your Save the Date link now opens your website, so guests never needed a new one." : "When your invitation is ready, this same link becomes your website, so guests never need a new one."}
      </p>
    </OutlineCard>
  );
}
