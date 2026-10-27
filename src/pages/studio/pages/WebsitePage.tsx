import { useEffect, useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { StudioHeader } from "../StudioLayout";
import BannerCard from "../BannerCard";
import SourcesCard from "../SourcesCard";
import SiteHealthCard from "../SiteHealthCard";
import { loadFreeSiteStats, type FreeSiteStats } from "../studioApi";

// Studio → Website: thersvpstudio.com itself — is it up, where visitors and signups come from,
// and the banner across the top. Moved off Overview, which is only what needs a person today
// (a site that's down still shows there).

export default function WebsitePage() {
  const { demo } = usePortal();
  const [freeSites, setFreeSites] = useState<FreeSiteStats | null>(null);
  useEffect(() => {
    if (!demo) loadFreeSiteStats().then(setFreeSites);
  }, [demo]);

  return (
    <>
      <StudioHeader title="Website" sub="How thersvpstudio.com is doing, and the banner across the top." />
      <SiteHealthCard demo={demo} />
      {freeSites ? (
        <section className="mt-5 min-w-0 rounded-[22px] border border-[var(--line)] bg-white px-5 py-4">
          <h2 className="mb-1 font-display text-[1.25rem] font-semibold text-[var(--ink)]">Signups from free sites</h2>
          <div className="divide-y divide-[var(--line)]">
            <p className="py-3 text-[14px] text-[var(--ink)]">
              <strong>{freeSites.signups}</strong> in the last 30 days
              <span className="text-[var(--slate)]">
                {" "}
                · {freeSites.viaSite} from a site’s “Make your own” link · {freeSites.viaEmail} from a guest email
              </span>
            </p>
            {freeSites.topSites.map((s) => (
              <a key={s.slug} href={`/invite/${s.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-3 hover:opacity-80">
                <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)]">/invite/{s.slug}</span>
                <span className="text-[12px] text-[var(--slate)]">
                  {s.count} {s.count === 1 ? "signup" : "signups"}
                </span>
              </a>
            ))}
            <p className="py-3 text-[13px] text-[var(--slate)]">RSVP emails sent in the last 24 hours: {freeSites.rsvpEmails24h}. Resend’s free plan allows 100 a day for everything.</p>
          </div>
        </section>
      ) : null}
      <SourcesCard />
      <BannerCard />
    </>
  );
}
