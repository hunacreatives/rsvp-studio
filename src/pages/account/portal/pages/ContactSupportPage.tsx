import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { FileChips, pickFiles } from "../components/ChatPane";
import { SUPPORT, TOPICS } from "../help-data";
import { categoryLabel, SUPPORT_CATEGORIES, ticketCode } from "../support";
import type { SupportCategory, Thread } from "../types";
import { ErrorText, Field, PrimaryButton, Select, Textarea } from "../ui";

export default function ContactSupportPage() {
  const { projects, startThread } = usePortal();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<SupportCategory | "">("");
  const [sent, setSent] = useState<Thread | null>(null);
  const [projectId, setProjectId] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Help answers for the chosen topic, shown above the message box.
  const helpTopic = TOPICS.find((t) => t.slug === SUPPORT_CATEGORIES.find((c) => c.id === category)?.help);
  const suggestions = helpTopic?.items.slice(0, 3) ?? [];

  const submit = async () => {
    if (!category) return setError("Choose what this is about.");
    if (!body.trim()) return setError("Write your message.");
    setBusy(true);
    setError(null);
    try {
      const t = await startThread({ eventId: projectId || null, kind: "support", subject: categoryLabel(category), category, body: body.trim(), files });
      setSent(t);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send — please try again.");
      setBusy(false);
    }
  };

  const addFiles = (list: FileList | null) => {
    const r = pickFiles(files, list);
    setFiles(r.files);
    setError(r.error);
  };

  if (sent) {
    return (
      <>
        <PageHeader title="Contact Support" sub="We’re here to help." />
        <div className="max-w-2xl rounded-[22px] border border-[rgba(0,7,39,0.16)] bg-white px-6 py-9 text-center md:px-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e6f4e6] text-2xl text-[#2f6b2f]">
            <i className="ri-check-line" />
          </span>
          <p className="mt-5 text-[13px] uppercase tracking-[0.08em] text-[var(--slate)]">Request received</p>
          <h2 className="mt-1 font-display text-[2rem] font-semibold text-[var(--ink)]">{ticketCode(sent.ticket_number) || "Thank you"}</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--slate)]">
            Thanks — we’ve got your message about <strong className="text-[var(--ink)]">{categoryLabel(sent.category)}</strong>. We reply within 1 business day, and
            we’ve emailed you a copy with your request number.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <PrimaryButton onClick={() => navigate(`/account/messages?thread=${sent.id}`)}>View your request</PrimaryButton>
            <Link to="/account/help" className="btn btn-ghost">
              Back to Help
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Contact Support" sub="We’re here to help." />
      <p className="-mt-5 max-w-2xl text-[16px] text-[var(--slate)]">
        Have a question about your project, need assistance, or just want to chat? Send us a message and our team will get back to you as soon as possible.
      </p>

      <div className="mt-7 grid gap-6 rounded-[22px] bg-[#eef3fe] px-6 py-7 md:grid-cols-3 md:gap-0">
        <InfoTile icon="ri-time-line" title="Support Hours">{SUPPORT.hours}</InfoTile>
        <InfoTile icon="ri-chat-3-line" title="Average Response Time" divider>{SUPPORT.responseTime}</InfoTile>
        <InfoTile icon="ri-mail-line" title="Prefer Email?" divider>
          You can also reach us at{" "}
          <a href={`mailto:${SUPPORT.email}`} className="text-[var(--ink)] hover:underline">{SUPPORT.email}</a>
        </InfoTile>
      </div>

      <div className="mt-7 grid gap-8 rounded-[22px] border border-[rgba(0,7,39,0.16)] bg-white px-6 py-8 md:px-7 lg:grid-cols-[1fr_280px]">
        <div>
          <h2 className="font-display text-[1.7rem] font-semibold text-[var(--ink)]">Send us a message</h2>
          <p className="mt-1 text-[13px] text-[var(--slate)]">Fill out the form below and we’ll get back to you soon.</p>
          <div className="mt-6 space-y-5">
            <Field label="What’s this about?">
              <Select value={category} onChange={(e) => setCategory(e.target.value as SupportCategory | "")}>
                <option value="">Choose a topic</option>
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </Field>
            {suggestions.length ? (
              <div className="rounded-xl bg-[var(--paper)] px-4 py-3">
                <p className="text-[13px] font-medium text-[var(--ink)]">These might answer it right away</p>
                <div className="mt-1 divide-y divide-[var(--line)]">
                  {suggestions.map((qa) => (
                    <details key={qa.q} className="py-2 text-[13px]">
                      <summary className="cursor-pointer text-[var(--ink)]">{qa.q}</summary>
                      <p className="mt-1.5 leading-relaxed text-[var(--slate)]">{qa.a}</p>
                    </details>
                  ))}
                </div>
                <Link to={`/account/help?topic=${helpTopic!.slug}`} className="mt-1 inline-block text-[12px] text-[var(--acc-blue)] hover:underline">
                  More about {helpTopic!.title.toLowerCase()} →
                </Link>
              </div>
            ) : null}
            <Field label="Project (optional)">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Message">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message here..." />
            </Field>
            <div>
              <p className="mb-1.5 text-[14px] font-medium text-[var(--ink)]">Attachments (optional)</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition-colors ${dragging ? "border-[var(--acc-blue)] bg-[#f3f7ff]" : "border-[rgba(0,7,39,0.16)]"}`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--paper)] text-lg text-[var(--ink)]"><i className="ri-attachment-2" /></span>
                <span>
                  <span className="block text-[14px] text-[var(--slate)]">Click to upload files or drag and drop</span>
                  <span className="block text-[11px] text-[var(--slate)]">You can upload images, PDFs, or other relevant files (Max 10MB per file)</span>
                </span>
              </button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <div className="mt-2">
                <FileChips files={files} onRemove={(i) => setFiles((f) => f.filter((_, j) => j !== i))} />
              </div>
            </div>
          </div>
          <ErrorText>{error}</ErrorText>
          <PrimaryButton className="mt-6" onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send Message →"}
          </PrimaryButton>
          <p className="mt-3 text-[12px] text-[var(--slate)]">
            We reply within 1 business day ({SUPPORT.hours}). Event in the next 7 days? Also message us on{" "}
            <a href={SUPPORT.instagramUrl} target="_blank" rel="noreferrer" className="text-[var(--acc-blue)] hover:underline">
              Instagram {SUPPORT.instagram}
            </a>
            .
          </p>
        </div>

        <aside className="lg:border-l lg:border-[var(--line)] lg:pl-6">
          <h2 className="font-display text-[1.7rem] font-semibold text-[var(--ink)]">Common topics</h2>
          <p className="mt-1 text-[13px] text-[var(--slate)]">You can also check our help articles for quick answers.</p>
          <div className="mt-5 space-y-2.5">
            {TOPICS.map((t) => (
              <Link
                key={t.slug}
                to={`/account/help?topic=${t.slug}`}
                className="flex items-center gap-3 rounded-xl bg-[var(--paper)] px-3.5 py-3 text-[14px] text-[var(--ink)] transition-colors hover:bg-[#ececee]"
              >
                <i className={`${t.icon} text-lg`} />
                <span className="flex-1">{t.title}</span>
                <i className="ri-arrow-right-s-line text-lg" />
              </Link>
            ))}
          </div>
          <Link to="/account/help" className="mt-5 inline-block text-[16px] text-[var(--acc-blue)] hover:underline">
            Browse All Help Articles →
          </Link>
        </aside>
      </div>

      <h2 className="mt-12 font-display text-[1.7rem] font-semibold text-[var(--ink)]">Other ways to reach us</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <ReachCard icon="ri-mail-line" title="Email" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</ReachCard>
        <ReachCard icon="ri-instagram-line" title="Instagram" href={SUPPORT.instagramUrl}>{SUPPORT.instagram}</ReachCard>
        <ReachCard icon="ri-map-pin-line" title="Our Studio">{SUPPORT.base}</ReachCard>
      </div>
    </>
  );
}

function InfoTile({ icon, title, children, divider }: { icon: string; title: string; children: ReactNode; divider?: boolean }) {
  return (
    <div className={`md:px-6 ${divider ? "md:border-l md:border-[#c9d3ea]" : "md:pl-2"}`}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl text-[var(--ink)]"><i className={icon} /></span>
      <p className="mt-4 text-[16px] font-semibold text-[var(--ink)]">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--slate)]">{children}</p>
    </div>
  );
}

function ReachCard({ icon, title, href, children }: { icon: string; title: string; href?: string; children: ReactNode }) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e4e4e8] text-lg text-[var(--ink)]"><i className={icon} /></span>
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold text-[var(--ink)]">{title}</span>
        <span className="block text-[13px] text-[var(--slate)]">{children}</span>
      </span>
    </>
  );
  const cls = "flex items-center gap-3 rounded-[20px] border border-[rgba(0,7,39,0.18)] bg-white px-4 py-4";
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`${cls} transition-colors hover:border-[var(--ink)]`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
