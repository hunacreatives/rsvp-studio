import { Link } from "react-router-dom";
import { inquiryLink } from "@/pages/enquire/prefill";
import { getTemplateDefinition } from "@/pages/wedding-sites/engine/registry";
import type { Project } from "../types";
import { usePortal } from "../PortalContext";
import { OutlineCard } from "../ui";

// DIY project → Website tab: what the studio can do for them. Each row opens the
// enquiry form already filled in with this project (date, names, occasion), and
// Studio → Leads shows which DIY project it came from. One list, inline actions.

const OCCASION: Record<string, string> = { wedding: "wedding", birthday: "birthday", anniversary: "anniversary", baby: "christening" };

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
    <OutlineCard className="mt-5 p-5 sm:p-6 md:p-8">
      <p className="eyebrow">From the studio</p>
      <ul className="mt-3 divide-y divide-[var(--line)]">
        {rows.map((r) => (
          <li key={r.title} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 first:pt-2 last:pb-0">
            <i className={`${r.icon} text-xl text-[var(--ink)]`} aria-hidden />
            <div className="min-w-0 flex-1 basis-[200px]">
              <p className="text-[15px] font-semibold text-[var(--ink)]">{r.title}</p>
              <p className="text-[14px] text-[var(--slate)]">{r.body}</p>
            </div>
            <Link
              to={r.to}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-[var(--line)] px-4 text-[14px] font-medium text-[var(--ink)] hover:border-[var(--ink)] md:min-h-[38px]"
            >
              Get a quote
            </Link>
          </li>
        ))}
      </ul>
    </OutlineCard>
  );
}
