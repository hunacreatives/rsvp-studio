import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Field, FilterTabs, Input, Modal, PillButton, PrimaryButton } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import SavedReplies from "../SavedReplies";
import EmailEditor, { EMAIL_SHELL_MESSAGE, type EmailEditorHandle } from "../EmailEditor";
import * as studio from "../studioApi";
import { dayDate, manilaDay, nextFollowup } from "../../../../api/_lib/lead-followup-plan";

// Studio → Leads. Everyone who filled in an inquiry form (project, partner, or a
// question from the FAQ page). Reply from here in our branded email (it's kept on the lead
// and marks them contacted), and turn them into a project when you start working together.

type Filter = "new" | "contacted" | "converted" | "archived" | "all";
const FORM_LABEL: Record<string, string> = { "project-inquiry": "Project inquiry", "partner-inquiry": "Partner inquiry", "faq-question": "Question (FAQ page)" };
const STATUS_LABEL: Record<studio.LeadStatus, string> = { new: "New", contacted: "Contacted", converted: "Project started", archived: "Archived", spam: "Spam" };
// Shown first, in this order; anything else the form sent follows.
const ORDER = ["interested_in", "diy_project", "diy_event", "partner_code", "source", "source_detail", "occasion", "event_date", "event_location", "guest_count", "services", "design_type", "semi_collections", "bespoke_collections", "addons", "budget", "timeline", "vision", "message", "business_name", "role", "looking_for", "regions", "volume", "event_brief", "ig_handle", "instagram", "hear_about"];
const HIDDEN = new Set(["your_name", "full_name", "email", "website", "account_verified"]);
const LABEL: Record<string, string> = { interested_in: "Asked about", event_date: "Event date", event_location: "Where", guest_count: "Guests", design_type: "Custom or Semi-Custom", semi_collections: "Collections", bespoke_collections: "Stationery suites", addons: "Add-ons", vision: "Their vision", ig_handle: "Instagram", hear_about: "Found us via", event_brief: "Event brief", looking_for: "Looking for", website_url: "Website", files_not_attached: "Files not attached", diy_project: "From their DIY project", diy_event: "Their event", partner_code: "Referral code", source: "Came from", source_detail: "Source detail" };
const labelize = (k: string) => LABEL[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function LeadsPage() {
  const { demo } = usePortal();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<studio.Lead[] | null>(null);
  const [filter, setFilter] = useState<Filter>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, studio.LeadReply[]>>({});
  const [saved, setSaved] = useState<studio.SavedReply[]>([]);
  const [replying, setReplying] = useState<studio.Lead | null>(null);
  // Unsent replies, per lead: closing the dialog by accident keeps what you wrote.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const reload = () => Promise.all([studio.loadLeads().then((l) => setLeads(l ?? [])), studio.loadLeadReplies().then(setReplies)]);
  const reloadSaved = () => studio.loadSavedReplies().then(setSaved);
  // Partner applicants: already on the desk? (Helps decide.)
  const [applicants, setApplicants] = useState<Record<string, studio.Applicant>>({});
  useEffect(() => {
    if (!leads) return;
    studio.applicantAccounts(leads.filter((l) => l.form === "partner-inquiry" && l.email).map((l) => l.email!)).then(setApplicants);
  }, [leads]);
  useEffect(() => {
    if (demo) return setLeads([]);
    reload();
    reloadSaved();
  }, [demo]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of leads ?? []) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);
  const shown = (leads ?? []).filter((l) => (filter === "all" ? l.status !== "spam" : filter === "archived" ? l.status === "archived" || l.status === "spam" : l.status === filter));

  const setStatus = async (l: studio.Lead, status: studio.LeadStatus) => {
    setBusy(l.id);
    try {
      await studio.setLeadStatus(l.id, status);
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const act = async (l: studio.Lead, work: (id: string) => Promise<void>) => {
    setBusy(l.id);
    try {
      await work(l.id);
      await reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <StudioHeader title="Leads" sub="Everyone who filled in an inquiry form. Reply from here in our branded email, then turn them into a project when you start working together." />
      <div className="mb-5">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "new", label: `New (${counts.new ?? 0})` },
            { value: "contacted", label: `Contacted (${counts.contacted ?? 0})` },
            { value: "converted", label: "Project started" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
      {demo ? <p className="text-[14px] text-[var(--slate)]">Leads aren’t part of demo data.</p> : null}
      {leads === null ? <p className="text-[14px] text-[var(--slate)]">Loading…</p> : null}

      <div className="space-y-4">
        {shown.map((l) => {
          const v = l.values ?? {};
          const fu = followupInfo(l, replies[l.id] ?? []);
          const keys = [...ORDER.filter((k) => k in v), ...Object.keys(v).filter((k) => !ORDER.includes(k) && !HIDDEN.has(k))].filter((k) => (Array.isArray(v[k]) ? v[k].length : v[k]));
          return (
            <article key={l.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="break-words text-[17px] font-semibold text-[var(--ink)]">{l.name || "No name"}</p>
                  <p className="text-[13px] text-[var(--slate)]">
                    {FORM_LABEL[l.form] ?? l.form} · {formatDate(l.created_at)}
                    {l.status !== "new" ? ` · ${STATUS_LABEL[l.status]}` : ""}
                  </p>
                  {l.form === "partner-inquiry" && l.email && applicants[l.email.toLowerCase()] ? (
                    <p className="text-[13px] text-[var(--slate)]">{applicantLine(applicants[l.email.toLowerCase()], v.account_verified === "yes")}</p>
                  ) : null}
                  <p className="mt-1 text-[14px] [overflow-wrap:anywhere]">
                    {l.email ? <span className="text-[var(--ink)]">{l.email}</span> : null}
                    {l.phone ? <span className="text-[var(--slate)]"> · {l.phone}</span> : null}
                  </p>
                  <FollowupChip info={fu} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.email ? <PillButton onClick={() => setReplying(l)}>Reply</PillButton> : null}
                  {fu.waitingOnThem ? (
                    <>
                      <PillButton disabled={busy === l.id} onClick={() => act(l, studio.markLeadReplied)}>
                        <i className="ri-chat-check-line mr-1" />
                        Mark replied
                      </PillButton>
                      <PillButton disabled={busy === l.id} onClick={() => act(l, studio.stopLeadFollowups)}>
                        Stop follow-ups
                      </PillButton>
                    </>
                  ) : null}
                  {l.status === "new" ? <PillButton disabled={busy === l.id} onClick={() => setStatus(l, "contacted")}>Mark contacted</PillButton> : null}
                  {l.status !== "converted" && l.form === "partner-inquiry" ? (
                    <PillButton tone="dark" disabled={busy === l.id} onClick={() => navigate("/studio/partners", { state: { fromLead: l } })}>
                      Add as partner
                    </PillButton>
                  ) : l.status !== "converted" && l.form !== "faq-question" ? (
                    <PillButton tone="dark" disabled={busy === l.id} onClick={() => navigate(`/studio/projects?project=new&lead=${l.id}`)}>
                      Turn into project
                    </PillButton>
                  ) : null}
                  {l.status === "converted" && l.event_id ? (
                    <PillButton onClick={() => navigate(`/studio/projects?project=${l.event_id}`)}>Open project</PillButton>
                  ) : null}
                  {l.status !== "archived" && l.status !== "converted" ? (
                    <PillButton disabled={busy === l.id} onClick={() => setStatus(l, "archived")}>Archive</PillButton>
                  ) : l.status === "archived" ? (
                    <PillButton disabled={busy === l.id} onClick={() => setStatus(l, "new")}>Move back to New</PillButton>
                  ) : null}
                </div>
              </header>
              {keys.length ? (
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
                  {keys.map((k) => (
                    <div key={k} className={["vision", "message", "event_brief"].includes(k) ? "sm:col-span-2" : ""}>
                      <dt className="text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">{labelize(k)}</dt>
                      <dd className="whitespace-pre-line text-[var(--ink)] [overflow-wrap:anywhere]">
                        {k === "diy_event" ? (
                          <button className="font-medium text-[var(--acc-blue)] hover:underline" onClick={() => navigate(`/studio/projects?project=${String(v[k])}`)}>
                            Open their event
                          </button>
                        ) : Array.isArray(v[k]) ? (
                          (v[k] as string[]).join(", ")
                        ) : /^\d{4}-\d{2}-\d{2}$/.test(String(v[k])) ? (
                          formatDate(String(v[k]))
                        ) : (
                          String(v[k])
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {l.attachments?.length ? <p className="mt-3 text-[13px] text-[var(--slate)] [overflow-wrap:anywhere]">Files (in the hello@ email): {l.attachments.join(", ")}</p> : null}
              {replies[l.id]?.length ? (
                <div className="mt-4 space-y-1 border-t border-[var(--line)] pt-3">
                  {replies[l.id].map((r) => (
                    <details key={r.id} className="text-[13px]">
                      <summary className="cursor-pointer text-[var(--slate)] [overflow-wrap:anywhere]">
                        Replied {formatDate(r.created_at)}
                        {r.sender_name ? ` by ${r.sender_name}` : ""} · <span className="text-[var(--ink)]">{r.subject}</span>
                      </summary>
                      <p className="mt-2 whitespace-pre-line rounded-xl bg-[var(--paper)] p-3 text-[14px] text-[var(--ink)] [overflow-wrap:anywhere]">{r.body}</p>
                    </details>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
        {leads && !shown.length ? (
          <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/60 p-10 text-center text-[14px] text-[var(--slate)]">
            {filter === "new" ? "No new leads — new inquiries show up here (and in your hello@ inbox)." : "Nothing in this list."}
          </div>
        ) : null}
      </div>
      {replying ? (
        <ReplyDialog
          lead={replying}
          last={replies[replying.id]?.at(-1)}
          draft={drafts[replying.id]}
          onDraft={(d) => setDrafts((all) => ({ ...all, [replying.id]: d }))}
          saved={saved}
          reloadSaved={reloadSaved}
          onClose={() => setReplying(null)}
          onSent={() => {
            setDrafts(({ [replying.id]: _, ...rest }) => rest);
            setReplying(null);
            reload();
          }}
        />
      ) : null}
    </>
  );
}

type Draft = { subject: string; message: string };
// Our first reply answers the instant email they got (api/_lib/enquiry-mail.ts → enquiryReceipt), so it
// lands in the same thread: one conversation, not two.
const SUBJECT: Record<string, string> = {
  "project-inquiry": "Re: We got your RSVP — The RSVP Studio",
  "partner-inquiry": "Re: Your application is in — The RSVP Studio partners",
  "faq-question": "Re: We got your question — The RSVP Studio",
};

/** Write a reply, see it in the branded email, send it. Sent from hello@; their answer comes back there. */
function ReplyDialog({ lead, last, draft, onDraft, saved, reloadSaved, onClose, onSent }: {
  lead: studio.Lead;
  last?: studio.LeadReply;
  draft?: Draft;
  onDraft: (d: Draft) => void;
  saved: studio.SavedReply[];
  reloadSaved: () => void;
  onClose: () => void;
  onSent: () => void;
}) {
  const first = (lead.name ?? "").trim().split(/\s+/)[0] ?? "";
  const d = draft ?? {
    subject: last ? (/^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`) : (SUBJECT[lead.form] ?? SUBJECT["project-inquiry"]),
    message: `Hi ${first || "there"},\n\n`,
  };
  const [shell, setShell] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const tools = useRef<EmailEditorHandle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  // the email around the message (logo, illustration, sign-off, footer), from the server that sends it
  useEffect(() => {
    let live = true;
    studio
      .sendLeadReply({ enquiryId: lead.id, subject: d.subject || "Preview", message: EMAIL_SHELL_MESSAGE, preview: true })
      .then((r) => live && setShell(r.html ?? null))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn’t load the email."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);
  const ready = d.subject.trim() && d.message.replace(/^hi\b[^,\n]*,?/i, "").trim();
  // A saved reply starts with its own "Hi {name}," — it replaces an untouched greeting.
  const insert = (text: string) => {
    const rest = d.message.replace(/^hi\b[^,\n]*,?\s*/i, "");
    onDraft({ ...d, message: /^hi\b/i.test(text) && !rest.trim() ? text : `${d.message.trimEnd()}${d.message.trim() ? "\n\n" : ""}${text}` });
    setVersion((v) => v + 1);
  };
  const tool = (cmd: "bold" | "insertUnorderedList" | "insertOrderedList", icon: string, label: string) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => tools.current?.run(cmd)}
      className="grid h-9 w-9 place-items-center rounded-full text-[17px] text-[var(--ink)] hover:bg-[var(--paper)]"
    >
      <i className={icon} />
    </button>
  );
  return (
    <Modal open onClose={onClose} title={`Reply to ${lead.name || lead.email}`} width={720}>
      <div className="space-y-4">
        <p className="text-[13px] text-[var(--slate)] [overflow-wrap:anywhere]">To {lead.email} · from hello@thersvpstudio.com</p>
        <Field label="Subject">
          <Input value={d.subject} onChange={(e) => onDraft({ ...d, subject: e.target.value })} maxLength={150} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-[var(--ink)]">Message</span>
            <span className="flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-white p-0.5">
              {tool("bold", "ri-bold", "Bold")}
              {tool("insertUnorderedList", "ri-list-unordered", "Bulleted list")}
              {tool("insertOrderedList", "ri-list-ordered", "Numbered list")}
            </span>
          </div>
          {shell ? (
            <EmailEditor shell={shell} value={d.message} version={version} onChange={(message) => onDraft({ ...d, message })} handle={tools} />
          ) : (
            <div className="grid h-[62dvh] place-items-center rounded-xl border border-[var(--line)] bg-[#f3f3f5] text-[13px] text-[var(--slate)]">{error ? "" : "Loading the email…"}</div>
          )}
          <p className="mt-2 text-[12px] text-[var(--slate)]">Type straight into the email. This is exactly what {first || "they"} will get.</p>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SavedReplies replies={saved} reload={reloadSaved} firstName={first} onPick={insert} />
          <PrimaryButton disabled={busy || !ready || !shell} onClick={() => run(async () => (await studio.sendLeadReply({ enquiryId: lead.id, ...d }), onSent()))}>
            {busy ? "Sending…" : "Send"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/** Where their follow-ups stand (api/_lib/lead-followup-plan.ts, the same rules the daily job sends by).
 *  `waitingOnThem`: follow-ups are on and they haven't answered, so Mark replied (an answer by call or
 *  Instagram) and Stop make sense. Leads from before follow-ups (never tracked) show nothing. */
function followupInfo(lead: studio.Lead, replies: studio.LeadReply[]): { text: string | null; tone: "on" | "done" | "replied"; waitingOnThem: boolean } {
  const sent = lead.enquiry_followups ?? [];
  const next = nextFollowup(lead, replies, sent);
  if (lead.replied_at) return { text: `Replied ${formatDate(lead.replied_at)}`, tone: "replied", waitingOnThem: false };
  if (next.state === "scheduled") {
    const today = manilaDay(Date.now());
    const manilaHour = new Date(Date.now() + 8 * 3_600_000).getUTCHours();
    const when = next.day <= today ? (manilaHour < 9 ? "today, 9 AM" : "tomorrow, 9 AM") : formatDate(dayDate(next.day).toISOString());
    return { text: `Follow-up ${next.nth} of ${next.total} · ${when}`, tone: "on", waitingOnThem: true };
  }
  if (next.state === "stopped") {
    const text = { finished: `Follow-ups finished · ${sent.length} sent`, unsubscribed: "Unsubscribed from follow-ups", stopped: `Follow-ups stopped${sent.length ? ` · ${sent.length} sent` : ""}`, replied: "Replied", event: sent.length ? "Follow-ups done · event is close" : null, project: null, archived: null }[next.reason] ?? null;
    return { text, tone: next.reason === "replied" ? "replied" : "done", waitingOnThem: false };
  }
  return { text: null, tone: "done", waitingOnThem: false };
}

const CHIP_TONE = {
  on: "bg-[#e8eeff] text-[#1d4fd7]",
  replied: "bg-[#e6f4e6] text-[#2f6b2f]",
  done: "bg-[var(--paper)] text-[var(--slate)]",
};
function FollowupChip({ info }: { info: ReturnType<typeof followupInfo> }) {
  if (!info.text) return null;
  return (
    <p className="mt-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${CHIP_TONE[info.tone]}`}>
        <i className={info.tone === "replied" ? "ri-chat-check-line" : "ri-mail-send-line"} />
        {info.text}
      </span>
    </p>
  );
}

/** One line on a partner applicant: what they already do with us, and whether the email is
 *  really theirs (applied while signed in to it; api/enquire marks it). Signed-out, anyone can
 *  type a planner's email, so that account's history isn't theirs until confirmed. */
function applicantLine(a: studio.Applicant, verified: boolean) {
  if (!a.account) return "No account with this email yet";
  const what = a.coordinator ? `a coordinator · ${a.clients} client ${a.clients === 1 ? "event" : "events"}` : "not a coordinator";
  return verified ? `Applied from their account, ${what}` : `Applied signed out, so not confirmed as theirs. This email’s account is ${what}`;
}
