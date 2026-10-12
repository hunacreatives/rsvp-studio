import { useEffect, useState } from "react";
import { inboxStamp } from "@/pages/account/portal/format";
import * as studio from "./studioApi";

// Studio → Overview: is the site up (UptimeRobot), and what's breaking for visitors
// (Sentry, real visitors only, last 14 days). Fixed or not-a-problem errors are
// marked Resolved in Sentry and drop off this list.

const DEMO: studio.SiteHealth = {
  uptime: { configured: true, monitors: [{ name: "The RSVP Studio", url: "https://thersvpstudio.com", status: "up", uptime30: 99.98 }] },
  sentry: {
    configured: true,
    issues: [
      { id: "1", shortId: "RSVP-STUDIO-4", title: "TypeError: Cannot read properties of undefined (reading 'items')", culprit: "/invite/isabella-and-mateo", count: 3, users: 2, firstSeen: new Date(Date.now() - 2 * 86_400_000).toISOString(), lastSeen: new Date(Date.now() - 3 * 3_600_000).toISOString(), level: "error", url: "#" },
    ],
  },
};

export default function SiteHealthCard({ demo = false }: { demo?: boolean }) {
  const [h, setH] = useState<studio.SiteHealth | null | undefined>(demo ? DEMO : undefined);
  useEffect(() => {
    if (!demo) studio.loadSiteHealth().then(setH);
  }, [demo]);
  if (h === null) return null; // not deployed yet / offline

  const s = h?.sentry;
  const u = h?.uptime;
  const down = u?.configured ? u.monitors.filter((m) => m.status === "down") : [];
  const site = u?.configured ? u.monitors[0] : undefined;

  return (
    <section className="mt-8 rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Site health</h2>
          <p className="text-[13px] text-[var(--slate)]">Errors visitors hit in the last 14 days.</p>
        </div>
        {/* Uptime, in one line. */}
        {u === undefined ? null : !u.configured ? (
          <span className="text-[13px] text-[var(--slate)]">Uptime: add UPTIMEROBOT_API_KEY in Vercel</span>
        ) : u.error ? (
          <span className="text-[13px] text-[#8a5a00]">Uptime: {u.error}</span>
        ) : site ? (
          <a href={u.dashboardUrl} target="_blank" rel="noreferrer" className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-[13px] font-medium md:min-h-[32px] ${down.length ? "bg-[#fdf0ed] text-[#8a2a17]" : "bg-[#eef6e6] text-[#3d5a12]"}`}>
            <span className={`h-2 w-2 rounded-full ${down.length ? "bg-[#c2412d]" : "bg-[#4f8a1c]"}`} aria-hidden />
            {down.length ? `Down: ${down.map((m) => m.name).join(", ")}` : `Up${site.uptime30 !== null ? ` · ${site.uptime30.toFixed(2)}% this month` : ""}`}
          </a>
        ) : null}
      </div>

      {s === undefined ? (
        <p className="mt-4 text-[14px] text-[var(--slate)]">Loading…</p>
      ) : !s.configured ? (
        <p className="mt-4 text-[14px] text-[var(--slate)]">Add SENTRY_AUTH_TOKEN in Vercel to see errors here.</p>
      ) : s.error ? (
        <p className="mt-4 text-[14px] text-[#8a5a00]">{s.error}</p>
      ) : s.issues.length === 0 ? (
        <p className="mt-4 text-[14px] text-[var(--slate)]">No errors. Everything’s running smoothly.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {s.issues.map((i) => (
            <li key={i.id}>
              <a href={i.url} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-start justify-between gap-3 py-3 hover:bg-[var(--paper)]/40">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[var(--ink)]">{i.title}</span>
                  <span className="block truncate text-[13px] text-[var(--slate)]">{i.culprit || i.shortId}</span>
                </span>
                <span className="shrink-0 text-right text-[12px] text-[var(--slate)] [font-variant-numeric:tabular-nums]">
                  <span className="block font-semibold text-[var(--ink)]">{i.count}×</span>
                  {inboxStamp(i.lastSeen)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {s?.configured && s.allUrl && !s.error ? (
        <a href={s.allUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-[44px] items-center text-[14px] text-[var(--acc-blue)] hover:underline md:min-h-0 md:text-[13px]">
          Open Sentry →
        </a>
      ) : null}
    </section>
  );
}
