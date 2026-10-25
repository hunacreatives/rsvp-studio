import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../PortalLayout";
import { GUIDES, SUPPORT, TOP_QUESTIONS, TOPICS } from "../help-data";
import type { QA } from "../help-data";
import { PillButton, PrimaryButton } from "../ui";
import { usePortal } from "../PortalContext";
import { inboxStamp } from "../format";
import { categoryLabel, parseTicket, requestCode } from "../support";
import { SupportChip } from "./MessagesPage";
import { inquiryLink } from "@/pages/enquire/prefill";
import { isDiy } from "../components/blocks";

export default function HelpPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const topic = TOPICS.find((t) => t.slug === params.get("topic")) ?? null;

  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;
    const seen = new Set<string>();
    const qa: QA[] = [];
    for (const item of [...TOP_QUESTIONS, ...TOPICS.flatMap((t) => t.items)]) {
      if (seen.has(item.q)) continue;
      seen.add(item.q);
      if (`${item.q} ${item.a}`.toLowerCase().includes(q)) qa.push(item);
    }
    const guides = GUIDES.filter((g) => `${g.title} ${g.summary} ${g.sections.map((s) => s.body).join(" ")}`.toLowerCase().includes(q));
    return { qa, guides };
  }, [query]);

  const setTopic = (slug: string | null) => {
    const next = new URLSearchParams(params);
    if (slug) next.set("topic", slug);
    else next.delete("topic");
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Help & Support" sub="Find answers, learn more, or get in touch with our team." />

      <label className="-mt-3 flex items-center gap-3 rounded-full bg-[#efeaf4] px-6 py-3.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for help articles, topics, or keywords..."
          className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--slate)]"
        />
        <i className="ri-search-line text-xl text-[var(--ink)]" />
      </label>

      <FinishForMe />
      <MyRequests />

      {searchHits ? (
        <section className="mt-10">
          <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)]">Results for “{query.trim()}”</h2>
          {searchHits.guides.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {searchHits.guides.map((g) => (
                <GuideCard key={g.slug} slug={g.slug} title={g.title} icon={g.icon} />
              ))}
            </div>
          ) : null}
          <div className="mt-5">
            {searchHits.qa.length ? (
              <Accordion items={searchHits.qa} />
            ) : (
              <p className="text-[15px] text-[var(--slate)]">
                Nothing matched. <Link to="/account/help/contact" className="text-[var(--acc-blue)] hover:underline">Ask our team</Link> instead.
              </p>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="mt-12">
            <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)]">Browse by topic</h2>
            <p className="text-[17px] text-[var(--ink)]">Quickly find helpful resources based on what you need.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {TOPICS.map((t) => {
                const active = topic?.slug === t.slug;
                return (
                  <button
                    key={t.slug}
                    onClick={() => setTopic(active ? null : t.slug)}
                    aria-pressed={active}
                    className={`flex items-start gap-4 rounded-[18px] p-4 text-left transition-colors ${active ? "bg-[#e6e6ea] ring-1 ring-[var(--ink)]" : "bg-[var(--paper)] hover:bg-[#ececee]"}`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[22px] text-[var(--ink)]" style={{ background: t.tint }}>
                      <i className={t.icon} />
                    </span>
                    <span>
                      <span className="block text-[16px] font-semibold text-[var(--ink)]">{t.title}</span>
                      <span className="mt-1 block text-[14px] leading-snug text-[var(--slate)] md:text-[13px]">{t.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-12">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)]">
                {topic ? topic.title : "Frequently asked questions"}
              </h2>
              <div className="flex gap-2">
                {topic ? <PillButton onClick={() => setTopic(null)}>All topics</PillButton> : null}
                {topic?.link ? <PillButton onClick={() => navigate(topic.link!.to)}>{topic.link.label}</PillButton> : null}
                <PillButton onClick={() => navigate("/faqs")}>View All</PillButton>
              </div>
            </div>
            <Accordion items={topic ? topic.items : TOP_QUESTIONS} />
          </section>
        </>
      )}

      <section className="mt-12 grid gap-6 rounded-[22px] bg-[var(--paper)] px-5 py-8 sm:px-6 md:grid-cols-[1fr_auto_250px] md:px-9">
        <div>
          <h2 className="font-display text-[1.8rem] font-semibold text-[var(--ink)]">Still need help?</h2>
          <p className="mt-1 max-w-md text-[16px] text-[var(--ink)]">
            Our team is here to support you. Send us a message and we’ll get back to you as soon as possible.
          </p>
          <PrimaryButton className="mt-6" onClick={() => navigate("/account/help/contact")}>Contact Support</PrimaryButton>
        </div>
        <span className="hidden w-px bg-[#c9c9cf] md:block" />
        <dl className="space-y-4 text-[var(--ink)]">
          <div>
            <dt className="text-[16px] font-semibold">Email us</dt>
            <dd className="text-[14px] text-[var(--slate)] md:text-[13px]"><a href={`mailto:${SUPPORT.email}`} className="inline-flex min-h-[44px] items-center break-all hover:underline md:min-h-0">{SUPPORT.email}</a></dd>
          </div>
          <div>
            <dt className="text-[16px] font-semibold">Support hours</dt>
            <dd className="text-[14px] text-[var(--slate)] md:text-[13px]">{SUPPORT.hours}</dd>
          </div>
          <div>
            <dt className="text-[16px] font-semibold">We reply</dt>
            <dd className="text-[14px] text-[var(--slate)] md:text-[13px]">{SUPPORT.responseTime}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)]">Helpful resources</h2>
        <p className="text-[16px] text-[var(--ink)]">Guides, tips, and inspiration to help you get the most out of your RSVP Studio experience.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {GUIDES.map((g) => (
            <GuideCard key={g.slug} slug={g.slug} title={g.title} icon={g.icon} />
          ))}
        </div>
      </section>
    </>
  );
}

function GuideCard({ slug, title, icon }: { slug: string; title: string; icon: string }) {
  return (
    <Link
      to={`/account/help/guides/${slug}`}
      className="group flex gap-3 rounded-[20px] border border-[rgba(0,7,39,0.18)] bg-white p-2 transition-colors hover:border-[var(--ink)]"
    >
      <span className="grid h-[86px] w-[72px] shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#dfe4f2] to-[#c9d2ea] text-[26px] text-[var(--indigo)]">
        <i className={icon} />
      </span>
      <span className="flex flex-col justify-between py-1.5 pr-2">
        <span className="text-[16px] font-semibold leading-tight text-[var(--ink)]">{title}</span>
        <i className="ri-arrow-right-up-line text-xl text-[var(--ink)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function Accordion({ items }: { items: QA[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="rounded-[22px] border border-[rgba(0,7,39,0.18)] bg-white px-5 md:px-7">
      {items.map((item, i) => (
        <div key={item.q} className={i ? "border-t border-[var(--line)]" : ""}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] text-[var(--ink)] md:text-[19px]"
          >
            {item.q}
            <i className={`ri-arrow-down-s-line shrink-0 text-2xl text-[var(--slate)] transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i ? <p className="-mt-1 whitespace-pre-line pb-5 text-[15px] leading-relaxed text-[var(--slate)]">{item.a}</p> : null}
        </div>
      ))}
    </div>
  );
}

/** The customer's own support requests: number, topic, status, last update. */
function MyRequests() {
  const { threads } = usePortal();
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  // Ones waiting on the customer first, then the newest.
  const mine = threads
    .filter((t) => t.kind === "support" && t.ticket_number)
    .sort((a, b) => Number(b.status === "waiting") - Number(a.status === "waiting") || b.last_message_at.localeCompare(a.last_message_at));
  if (!mine.length) return null;
  const n = parseTicket(q);
  const term = q.trim().toLowerCase();
  const shown = mine.filter(
    (t) => !term || (n !== null ? t.ticket_number === n : [requestCode(t.ticket_number), categoryLabel(t.category), t.lastMessage?.body].some((v) => v?.toLowerCase().includes(term))),
  );
  const list = all || term ? shown : shown.slice(0, 4);
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)]">My support requests</h2>
          <p className="text-[14px] text-[var(--slate)] md:text-[13px]">Find one by its number (like {requestCode(mine[0].ticket_number)}) or a word from it.</p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search requests"
          className="w-full rounded-full border border-[rgba(0,7,39,0.16)] bg-white px-4 py-2.5 text-[16px] outline-none focus:border-[var(--ink)] sm:w-56 md:py-2 md:text-[13px]"
        />
      </div>
      <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--line)] bg-white">
        {list.map((t) => (
          <Link
            key={t.id}
            to={`/account/messages?thread=${t.id}`}
            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-b border-[var(--line)] px-4 py-3.5 last:border-0 hover:bg-[var(--paper)] sm:flex sm:gap-x-4 sm:px-5 sm:py-3"
          >
            {/* Phones: number + time on top, then topic + status, then the last message. */}
            <span className="whitespace-nowrap font-medium text-[var(--ink)] sm:w-[86px] sm:shrink-0 sm:whitespace-normal">{requestCode(t.ticket_number)}</span>
            <span className="text-right text-[12px] text-[var(--slate)] sm:order-last sm:w-[70px] sm:shrink-0">{inboxStamp(t.last_message_at)}</span>
            <span className="col-span-2 min-w-0 sm:flex-1">
              <span className="flex items-center gap-2 text-[14px] text-[var(--ink)]">
                <span className="min-w-0 truncate">{categoryLabel(t.category)}</span>
                <span className="sm:hidden"><SupportChip t={t} /></span>
              </span>
              <span className="block truncate text-[13px] text-[var(--slate)] sm:text-[12px]">{t.lastMessage?.body || "Sent a file"}</span>
            </span>
            <span className="hidden sm:inline"><SupportChip t={t} /></span>
          </Link>
        ))}
        {!list.length ? <p className="px-5 py-6 text-center text-[13px] text-[var(--slate)]">No request matches “{q.trim()}”.</p> : null}
      </div>
      {!all && !term && shown.length > 4 ? (
        <button onClick={() => setAll(true)} className="mt-1 min-h-[44px] text-[14px] text-[var(--acc-blue)] hover:underline md:min-h-0 md:text-[13px]">
          Show all {shown.length}
        </button>
      ) : null}
    </section>
  );
}

/** "Rather we do it?": the enquiry form, filled in from their most recent website they haven't
 *  published yet (or a fresh one), so nobody retypes their names and date. */
function FinishForMe() {
  const { projects, sites, demo } = usePortal();
  const draft = projects.filter((p) => isDiy(p) && sites[p.id] && !sites[p.id].publishedAt).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const to = inquiryLink({
    service: "website",
    design: "custom",
    date: draft?.event_date ?? undefined,
    names: draft?.name,
    from: draft ? `${draft.name} (unfinished DIY site, Help & Support)` : "Help & Support",
    event: draft?.id,
    occasion: draft?.event_type ? (({ wedding: "wedding", engagement: "engagement", birthday: "birthday", anniversary: "anniversary" } as Record<string, string>)[draft.event_type] ?? "other") : undefined,
  });
  if (demo) return null;
  return (
    <Link to={to} className="mt-6 flex items-center gap-4 rounded-[22px] border border-[rgba(0,7,39,0.14)] bg-white px-5 py-4 transition-colors hover:border-[var(--ink)] md:px-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-[20px] text-[var(--ink)]">
        <i className="ri-quill-pen-line" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-[var(--ink)]">{draft ? "Rather we finish your website?" : "Rather we make it for you?"}</span>
        <span className="block text-[14px] text-[var(--slate)]">Our designers take it from here. Custom websites from ₱8,000.</span>
      </span>
      <i className="ri-arrow-right-line text-[18px] text-[var(--slate)]" aria-hidden />
    </Link>
  );
}
