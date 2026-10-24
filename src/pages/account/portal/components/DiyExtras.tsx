import { Link } from "react-router-dom";
import { inquiryLink } from "@/pages/enquire/prefill";
import { getTemplateDefinition } from "@/pages/wedding-sites/engine/registry";
import type { Project } from "../types";
import { usePortal } from "../PortalContext";
import { OutlineCard } from "../ui";

// DIY project → Website tab: what the studio can do for them. Each row opens the
// enquiry form already filled in with this project (date, names, occasion), and
// Studio → Leads shows which DIY project it came from. One list, inline actions.

const OCCASION: Record<string, string> = { wedding: "wedding", birthday: "birthday", anniversary: "anniversary", baby: "christening", engagement: "engagement" };

export default function DiyExtras({ project }: { project: Project }) {
  const { sites } = usePortal();
  const site = sites[project.id];
  if (!site || site.ended) return null;
  const live = !!site.publishedAt;
  const template = site.templateId ? getTemplateDefinition(site.templateId)?.label ?? site.templateId : null;
  const ctx = {
    occasion: OCCASION[project.event_type ?? ""] ?? "other",
    date: project.event_date ?? undefined,
    names: project.name,
    from: `${project.name}${template ? ` (${template} template)` : ""}`,
  };

  const rows = [
    {
      icon: "ri-quill-pen-line",
      title: live ? "Have us redesign it" : "Rather have us design it?",
      body: "A website made just for your event by our designers. Custom websites from ₱8,000.",
      to: inquiryLink({ ...ctx, service: "website", design: "custom" }),
    },
    ...(live
      ? [
          { icon: "ri-qr-code-line", title: "Printed QR cards", body: "Table cards that open your website and RSVP form.", to: inquiryLink({ ...ctx, service: "stationery", pkg: "QR cards" }) },
          { icon: "ri-mail-send-line", title: "Matching save the date", body: "A digital save the date in your website’s design.", to: inquiryLink({ ...ctx, service: "save-the-date" }) },
          { icon: "ri-heart-2-line", title: "Thank-you cards", body: "For after the event, sent to your guest list.", to: inquiryLink({ ...ctx, service: "stationery", pkg: "Thank-you cards" }) },
        ]
      : []),
  ];

  return (
    <OutlineCard className="mt-5 p-5 sm:p-6">
      <p className="eyebrow">From the studio</p>
      <p className="mt-1 text-[13px] text-[var(--slate)]">Each one opens a quote request with your event filled in.</p>
      {/* Tiles, not rows: each is the link, so there's no "Get a quote" repeated four times. */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.title}>
            <Link to={r.to} className="group flex h-full items-start gap-3 rounded-2xl border border-[var(--line)] px-4 py-3 transition-colors hover:border-[var(--ink)]">
              <i className={`${r.icon} mt-0.5 text-[19px] text-[var(--ink)]`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[var(--ink)]">{r.title}</span>
                <span className="block text-[13.5px] leading-snug text-[var(--slate)]">{r.body}</span>
              </span>
              <i className="ri-arrow-right-up-line mt-0.5 text-[var(--slate)] group-hover:text-[var(--ink)]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </OutlineCard>
  );
}
