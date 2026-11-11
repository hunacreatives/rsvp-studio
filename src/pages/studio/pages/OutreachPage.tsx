import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Field, FilterTabs, Input, Modal, PillButton, Select, Textarea } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as o from "../outreach";
import { copyEmail, followupEmail, gmailCompose, openerEmail } from "../outreachEmail";

// Studio → Outreach: event businesses we invite to the partner program, by hand, 20 a day, like Leads
// (supabase/outreach.sql, outreach-email.sql, outreach-daily.sql). Each morning the next 20 land on
// Today: about half by email (copied, then sent from Gmail in hello@), half on Messenger / Instagram
// (copied, then pasted in their chat). Unfinished ones carry over. Follow-ups are due 5 days after the
// first message and a week after the first follow-up, and show first on Today. A dead email is marked by
// hand ("Email bounced"). Anyone who signs up or applies through their link (or with the same email /
// mobile / Instagram) moves to "Signed up" on its own.

const TABS: { value: o.OutreachTab; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "follow_up", label: "Follow up" },
  { value: "waiting", label: "Waiting" },
  { value: "replied", label: "Replied" },
  { value: "signed_up", label: "Signed up" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All businesses" },
];
const KINDS = o.KINDS;
const BLANK: o.ContactInput = { name: "", contact_person: null, kind: "coordinator", city: null, facebook: null, instagram: null, website: null, email: null, phone: null, found_via: null, notes: null };
const SHEET_HEAD = "name,contact_person,kind,city,facebook,instagram,website,email,phone,found_via,notes";
const byEmail = (c: o.Contact) => c.channel === "email" || c.channel === "email_auto";

type Toast = { text: string; undo?: () => Promise<void> };

export default function OutreachPage() {
  const { demo } = usePortal();
  const [counts, setCounts] = useState<o.Counts | null | undefined>(undefined);
  const [tab, setTab] = useState<o.OutreachTab>("today");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [kind, setKind] = useState("");
  const [rows, setRows] = useState<o.Contact[] | null>(null);
  const [days, setDays] = useState<o.Day[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<o.Messages | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; c: o.ContactInput } | null>(null);
  const [importing, setImporting] = useState(false);
  const [writing, setWriting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const recount = useCallback(() => o.refresh().then(setCounts), []);
  const load = useCallback(
    async (p = 0) => {
      const next = await o.loadTab(tab, { search, city, kind, page: p });
      // Today: follow-ups owed first, then the ones still to do, then the ones done today
      const rank = (c: o.Contact) => (o.followUpDue(c) ? 0 : c.status === "to_message" ? 1 : 2);
      const sorted = tab === "today" ? [...next].sort((a, b) => rank(a) - rank(b)) : next;
      setRows((r) => (p === 0 ? sorted : [...(r ?? []), ...sorted]));
      setPage(p);
      setMore(next.length === o.PAGE);
    },
    [tab, search, city, kind],
  );

  useEffect(() => {
    if (demo) return setCounts(null);
    // fill today's list first, so the counts and the list agree
    o.fillToday()
      .catch(() => undefined)
      .finally(() => {
        recount();
        o.loadDays().then(setDays);
      });
    o.loadCities().then(setCities);
    o.loadMessages().then(setMessages);
  }, [demo, recount]);
  // Search waits for a pause in typing.
  const ready = !!counts;
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => void load(0), search ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [ready, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (t: Toast) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), t.undo ? 10000 : 5000);
  };

  const after = async () => {
    await Promise.all([recount(), load(0)]);
  };
  const change = async (c: o.Contact, patch: Partial<o.Contact>, text: string) => {
    setBusy(c.id);
    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, c[k as keyof o.Contact]])) as Partial<o.Contact>;
    try {
      await o.update(c.id, patch);
      await after();
      say({ text, undo: async () => (await o.update(c.id, before), await after()) });
    } catch (e) {
      say({ text: e instanceof Error ? e.message : "Couldn't save that." });
    } finally {
      setBusy(null);
    }
  };

  /** Email: copy the email (formatted, with the tier picture) and open Gmail in hello@ with their address and
   *  the subject filled in. Chat: copy the message and open their Messenger / Instagram / Viber. Either way it's
   *  marked sent (Undo if it wasn't). The copy starts while this tab still has focus (browsers refuse it after),
   *  and the new tab opens in the same click so it isn't blocked. */
  const send = async (c: o.Contact, step: "opener" | "followup") => {
    const now = new Date().toISOString();
    const followPatch = { followed_up_at: now, followups: (c.followups ?? 0) + 1 };
    const useEmail = step === "followup" ? byEmail(c) && !!c.email && !c.bounced_at : o.wayFor(c)?.kind === "email";
    if (useEmail && c.email) {
      const mail = step === "opener" ? openerEmail(c) : followupEmail(c, (c.followups ?? 0) + 1);
      const copying = copyEmail(mail);
      window.open(gmailCompose(c.email, mail.subject), "_blank", "noopener");
      const copied = await copying.then(() => true, () => false);
      return change(
        c,
        step === "opener" ? { status: "messaged", messaged_at: now, channel: "email" } : followPatch,
        copied ? `Email copied. In Gmail, paste it (⌘V) and send. ${c.name} is marked emailed.` : "Gmail is open, but the email didn’t copy. Copy it from Messages instead.",
      );
    }
    const chat = o.chatFor(c);
    const audience = o.audienceOf(c.kind);
    const text = o.fillMessage(messages?.[o.messageKey(step, audience)] ?? "", c);
    const copying = navigator.clipboard?.writeText(text) ?? Promise.reject();
    if (chat) window.open(chat.url, "_blank", "noopener");
    const copied = await copying.then(() => true, () => false);
    await change(
      c,
      step === "opener" ? { status: "messaged", messaged_at: now, channel: chat?.channel ?? null } : followPatch,
      chat?.channel === "call"
        ? `Marked ${c.name} as called. The message is copied if you want to text it after.`
        : copied
          ? `Message copied. Paste it in the chat${step === "followup" ? "." : audience === "coordinator" ? " and attach the 4 coordinator images." : " and attach the 2 partner images."}`
          : "Couldn't copy the message. Open Messages to copy it by hand.",
    );
  };

  /** A dead email, marked by hand: never emailed again. With Messenger / Instagram they go back on the list
   *  for a chat; with nothing else they're closed. */
  const bounced = (c: o.Contact) => {
    const now = new Date().toISOString();
    const other = !!(c.fb_key || c.ig_key);
    return change(
      c,
      other
        ? { bounced_at: now, stop_reason: "email bounced", status: "to_message", channel: null, messaged_at: null, followed_up_at: null, followups: 0, queued_on: null, queue_channel: null }
        : { bounced_at: now, stop_reason: "email bounced", status: "skipped" },
      other ? `${c.name}’s email is marked dead. They’ll come back on ${c.fb_key ? "Messenger" : "Instagram"}.` : `${c.name}’s email is marked dead, and they’re closed (no other way to reach them).`,
    );
  };

  /** Their Facebook / Instagram / website icon: opens it and copies the message for them (the opener, or the
   *  follow-up once they've been messaged), ready to paste. It doesn't mark them messaged — "Message" does. */
  const copyFor = (c: o.Contact, where: string) => {
    if (c.status !== "to_message" && c.status !== "messaged") return;
    const step = c.status === "messaged" ? "followup" : "opener";
    const text = o.fillMessage(messages?.[o.messageKey(step, o.audienceOf(c.kind))] ?? "", c);
    if (!text) return;
    navigator.clipboard
      ?.writeText(text)
      .then(() => say({ text: `${step === "followup" ? "Follow-up" : "Message"} for ${c.name} copied. Paste it on ${where}.` }))
      .catch(() => undefined);
  };

  const find = (c: o.Contact) => {
    window.open(o.findUrl(c), "_blank", "noopener");
    setEditing({ id: c.id, c: pick(c) });
  };

  if (counts === undefined) return <StudioHeader title="Outreach" sub="Loading…" />;
  if (counts === null)
    return (
      <>
        <StudioHeader title="Outreach" />
        <p className="text-[14px] text-[var(--slate)]">{demo ? "Outreach isn’t part of demo data." : "Run supabase/outreach-daily.sql on the live database to switch this on."}</p>
      </>
    );

  return (
    <>
      <StudioHeader
        title="Outreach"
        sub={`${counts.not_contacted.toLocaleString()} not contacted yet · ${counts.total.toLocaleString()} on the list`}
        action={
          <div className="flex flex-wrap gap-2">
            <PillButton onClick={() => setWriting(true)}>
              <i className="ri-chat-quote-line" /> Messages
            </PillButton>
            <PillButton onClick={() => setImporting(true)}>
              <i className="ri-upload-2-line" /> Import
            </PillButton>
            <PillButton tone="dark" onClick={() => setEditing({ id: null, c: { ...BLANK } })}>
              <i className="ri-add-line" /> Add
            </PillButton>
          </div>
        }
      />

      <div className="mb-4">
        <FilterTabs<o.OutreachTab>
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({
            value: t.value,
            label: `${t.label} (${o.tabCount(counts, t.value).toLocaleString()})`,
          }))}
        />
      </div>

      {tab === "today" ? <TodayBar counts={counts} /> : null}

      {tab !== "today" ? (
        <div className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-[1fr_200px_200px]">
          <Input type="search" placeholder="Search by name, handle or city" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          <Select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
            <option value="">All cities</option>
            {cities.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </Select>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {(Object.entries(KINDS) as [o.OutreachKind, string][]).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {rows === null ? <p className="text-[14px] text-[var(--slate)]">Loading…</p> : null}
      {rows && !rows.length ? (
        <p className="rounded-[22px] border border-[var(--line)] bg-white p-6 text-[14px] text-[var(--slate)]">
          {search || city || kind ? "No one here matches that search." : tab === "today" ? "Nothing left to do today." : counts.total ? "No one here right now." : "The list is empty. Import a sheet or add someone to start."}
        </p>
      ) : null}

      {rows?.length ? (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[22px] border border-[var(--line)] bg-white">
          {rows.map((c) => {
            const done = tab === "today" && c.status !== "to_message" && !o.followUpDue(c);
            return (
              <li key={c.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 ${done ? "bg-[#fafaf8]" : ""}`}>
                <button type="button" onClick={() => setEditing({ id: c.id, c: pick(c) })} className="min-w-0 flex-1 basis-[240px] text-left">
                  <p className={`text-[15px] font-semibold [overflow-wrap:anywhere] ${done ? "text-[var(--slate)]" : "text-[var(--ink)]"}`}>
                    {done ? <i className="ri-checkbox-circle-fill mr-1.5 align-[-2px] text-[16px] text-[#2f8a4f]" aria-label="Done" /> : null}
                    {c.name}
                    {c.contact_person ? <span className="font-normal text-[var(--slate)]"> · {c.contact_person}</span> : null}
                  </p>
                  <p className="text-[13px] text-[var(--slate)]">{[KINDS[c.kind], c.city].filter(Boolean).join(" · ")}</p>
                  <ReachedBy c={c} />
                </button>
                <div className="flex items-center gap-1">
                  {o.pageUrls(c).map((u) => (
                    <a key={u.url} href={u.url} target="_blank" rel="noreferrer" onClick={() => copyFor(c, u.label === "Website" ? "their website" : u.label)} aria-label={`${c.name} on ${u.label}`} title={c.status === "to_message" || c.status === "messaged" ? `Opens ${u.label} and copies the message` : undefined} className="grid h-10 w-10 place-items-center rounded-full text-[19px] text-[var(--slate)] hover:bg-black/5 hover:text-[var(--ink)]">
                      <i className={u.icon} />
                    </a>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Actions c={c} busy={busy === c.id} send={send} change={change} find={find} bounced={bounced} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {more ? (
        <div className="mt-4 text-center">
          <PillButton onClick={() => load(page + 1)}>Show more</PillButton>
        </div>
      ) : null}

      {tab === "today" && days.length ? <PastDays days={days} /> : null}

      {editing ? (
        <ContactDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async (text) => {
            setEditing(null);
            await after();
            o.loadCities().then(setCities);
            say({ text });
          }}
          onAdded={(text) => {
            void after();
            say({ text });
          }}
        />
      ) : null}
      {importing ? (
        <ImportDialog
          onClose={() => setImporting(false)}
          onDone={async (text) => {
            setImporting(false);
            await after();
            o.loadCities().then(setCities);
            say({ text });
          }}
        />
      ) : null}
      {writing && messages ? (
        <MessagesDialog
          messages={messages}
          onClose={() => setWriting(false)}
          onSaved={(m) => {
            setMessages(m);
            setWriting(false);
            say({ text: "Messages saved." });
          }}
        />
      ) : null}

      {toast ? (
        <div role="status" className="fixed inset-x-4 bottom-[calc(80px_+_env(safe-area-inset-bottom))] z-[90] mx-auto flex max-w-[520px] items-center gap-3 rounded-2xl bg-[var(--ink)] px-4 py-3 text-[14px] text-white shadow-xl lg:bottom-6">
          <span className="flex-1">{toast.text}</span>
          {toast.undo ? (
            <button
              type="button"
              className="min-h-[40px] px-2 font-semibold text-[var(--acc-yellow)]"
              onClick={async () => {
                const u = toast.undo!;
                setToast(null);
                await u();
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const day = (iso: string | null) => (iso ? formatDate(iso) : "");

/** Today's progress: how many of the 20 are done, how many emails and messages went out, follow-ups owed. */
function TodayBar({ counts: k }: { counts: o.Counts }) {
  const pct = k.today_total ? Math.round((k.today_done / k.today_total) * 100) : 0;
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" });
  return (
    <section className="mb-5 rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[15px] font-semibold text-[var(--ink)]">{today}</p>
        <p className="text-[14px] text-[var(--slate)]">
          {k.today_done} of {k.today_total} done
          {k.follow_up ? ` · ${k.follow_up} follow-up${k.follow_up === 1 ? "" : "s"} first` : ""}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Today’s list">
        <div className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-[13px] text-[var(--slate)]">
        <span className="whitespace-nowrap"><i className="ri-mail-line align-[-2px]" aria-hidden /> {k.emailed_today} emailed</span>
        {" · "}
        <span className="whitespace-nowrap"><i className="ri-messenger-line align-[-2px]" aria-hidden /> {k.messaged_today} messaged</span>
        {" · "}
        <span className="whitespace-nowrap">emails go out from hello@ in Gmail</span>
      </p>
    </section>
  );
}

/** Earlier days, like Leads: how each day's list went. */
function PastDays({ days }: { days: o.Day[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--slate)]">Earlier days</h2>
      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[22px] border border-[var(--line)] bg-white">
        {days.map((d) => (
          <li key={d.day} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-[14px]">
            <span className="font-medium text-[var(--ink)]">{new Date(`${d.day}T12:00:00+08:00`).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Manila" })}</span>
            <span className="text-[var(--slate)]">
              {d.contacted} of {d.total} contacted
              {d.replied ? ` · ${d.replied} replied` : ""}
              {d.signed_up ? ` · ${d.signed_up} signed up` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Where they stand: how we reached them and when, what's next. */
function ReachedBy({ c }: { c: o.Contact }) {
  const way = o.wayFor(c);
  let icon = "ri-time-line";
  let text = "";
  const how = byEmail(c) ? "Emailed" : c.channel ? `Messaged on ${o.CHANNELS[c.channel]}` : "Contacted";
  if (c.status === "signed_up") (icon = "ri-check-double-line"), (text = `Signed up ${day(c.signed_up_at)}${c.matched_enquiry ? " · applied as a partner" : c.matched_profile ? " · made an account" : ""}`);
  else if (c.status === "replied") (icon = "ri-reply-line"), (text = `Replied ${day(c.replied_at)}${c.channel ? ` · we ${byEmail(c) ? "emailed" : "messaged"} them ${day(c.messaged_at)}` : ""}`);
  else if (c.status === "not_interested" || c.status === "skipped") (icon = "ri-close-circle-line"), (text = c.stop_reason ? `Closed · ${c.stop_reason}` : c.status === "skipped" ? "Skipped" : "Not interested");
  else if (c.status === "messaged") {
    const due = o.followUpDue(c);
    const next = o.nextFollowUp(c);
    icon = due ? "ri-alarm-line" : byEmail(c) ? "ri-mail-check-line" : "ri-chat-check-line";
    const followed = c.followups ? ` · followed up ${c.followups === 1 ? day(c.followed_up_at) : `twice, last ${day(c.followed_up_at)}`}` : "";
    text = `${due ? (c.followups ? "Last follow-up due · " : "Follow-up due · ") : ""}${how} ${day(c.messaged_at)}${followed}${!due && next ? ` · follow-up ${day(next)}` : !due && c.followups >= 2 ? " · no more follow-ups" : ""}`;
  } else if (way) {
    icon = way.icon;
    text = `${c.bounced_at ? "Email bounced · " : ""}${way.kind === "email" ? `Email · ${c.email}` : way.label === "Call" ? "Call them" : `On ${way.label}`}`;
  } else text = "No way to reach them yet";
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--ink)] [overflow-wrap:anywhere]">
      <i className={`${icon} text-[15px] text-[var(--slate)]`} aria-hidden />
      {text}
    </p>
  );
}

const pick = (c: o.Contact): o.ContactInput => ({
  name: c.name, contact_person: c.contact_person, kind: c.kind, city: c.city, facebook: c.facebook, instagram: c.instagram,
  website: c.website, email: c.email, phone: c.phone, found_via: c.found_via, notes: c.notes,
});

function Actions({ c, busy, send, change, find, bounced }: {
  c: o.Contact;
  busy: boolean;
  send: (c: o.Contact, step: "opener" | "followup") => Promise<void>;
  change: (c: o.Contact, patch: Partial<o.Contact>, text: string) => Promise<void>;
  /** no page on file yet: search Facebook for them and open the form to paste it in */
  find: (c: o.Contact) => void;
  bounced: (c: o.Contact) => Promise<void>;
}) {
  const now = () => new Date().toISOString();
  const replied = <PillButton disabled={busy} onClick={() => change(c, { status: "replied", replied_at: now() }, `${c.name} moved to Replied.`)}>Replied</PillButton>;
  const no = <PillButton disabled={busy} onClick={() => change(c, { status: "not_interested" }, `${c.name} won’t be contacted again.`)}>Not interested</PillButton>;
  const dead = byEmail(c) && c.email && !c.bounced_at ? <PillButton disabled={busy} title="Their email came back undelivered" onClick={() => bounced(c)}>Email bounced</PillButton> : null;
  if (c.status === "to_message") {
    const way = o.wayFor(c);
    return (
      <>
        <PillButton disabled={busy} onClick={() => change(c, { status: "skipped" }, `Skipped ${c.name}.`)}>Skip</PillButton>
        {way ? (
          <PillButton tone="primary" disabled={busy} title={way.kind === "email" ? "Copies the email and opens Gmail" : way.label === "Call" ? "Calls them and marks them contacted" : `Copies the message and opens ${way.label}`} onClick={() => send(c, "opener")}>
            <i className={way.icon} /> {way.kind === "email" ? "Email" : way.label === "Call" ? "Call" : "Message"}
          </PillButton>
        ) : (
          <PillButton tone="dark" disabled={busy} title="Searches Facebook for them and opens their details, so you can paste in their page" onClick={() => find(c)}>
            <i className="ri-search-line" /> Find them
          </PillButton>
        )}
      </>
    );
  }
  if (c.status === "messaged")
    return (
      <>
        {no}
        {dead}
        {replied}
        {o.followUpDue(c) ? (
          <PillButton tone="primary" disabled={busy} title={byEmail(c) ? "Copies the follow-up and opens Gmail" : "Copies the follow-up and opens their chat"} onClick={() => send(c, "followup")}>
            <i className={byEmail(c) ? "ri-mail-send-line" : "ri-chat-3-line"} /> Follow up
          </PillButton>
        ) : null}
      </>
    );
  if (c.status === "replied") return no;
  if (c.status === "signed_up")
    return c.matched_enquiry ? (
      <Link to="/studio/leads" className="text-[13px] font-medium text-[var(--ink)] underline underline-offset-4">
        See the application in Leads
      </Link>
    ) : null;
  // Closed: put them back where they were.
  return (
    <PillButton disabled={busy} onClick={() => change(c, { status: c.messaged_at ? "messaged" : "to_message" }, `${c.name} is back on the list.`)}>
      Reopen
    </PillButton>
  );
}

function ContactDialog({ initial, onClose, onSaved, onAdded }: {
  initial: { id: string | null; c: o.ContactInput };
  onClose: () => void;
  onSaved: (text: string) => Promise<void>;
  /** "Add another": saved, and the form stays open for the next one */
  onAdded: (text: string) => void;
}) {
  const [c, setC] = useState(initial.c);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(0);
  const set = (k: keyof o.ContactInput) => (e: { target: { value: string } }) => setC((x) => ({ ...x, [k]: e.target.value || null }));
  const save = async (another = false) => {
    if (!c.name?.trim()) return setErr("Add their business or name.");
    setSaving(true);
    setErr("");
    try {
      if (initial.id) {
        await o.update(initial.id, { ...c, name: c.name.trim() });
        await onSaved("Saved.");
      } else if (await o.add({ ...c, name: c.name.trim() })) {
        if (!another) return void (await onSaved(`Added ${c.name.trim()}${added ? ` and ${added} more` : ""}.`));
        // Keep the city, type and source: list building usually goes one city and source at a time.
        setC({ ...BLANK, kind: c.kind, city: c.city, found_via: c.found_via });
        setAdded((n) => n + 1);
        onAdded(`Added ${c.name.trim()}.`);
      } else setErr("They’re already on the list (same page, handle, email or mobile).");
    } catch (e) {
      setErr(/duplicate|unique/i.test(String(e)) ? "Someone else on the list already has that page, handle, email or mobile." : e instanceof Error ? e.message : "Couldn’t save.");
    } finally {
      setSaving(false);
    }
  };
  const del = async () => {
    if (!initial.id || !window.confirm(`Remove ${c.name} from the list? Use “Not interested” instead if they asked not to be messaged, so they aren’t added again.`)) return;
    await o.remove(initial.id);
    await onSaved(`Removed ${c.name}.`);
  };
  return (
    <Modal open onClose={onClose} title={initial.id ? c.name || "Contact" : "Add a business"} width={600}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business or name">
          <Input key={added} value={c.name ?? ""} onChange={set("name")} autoFocus={!initial.id} />
        </Field>
        <Field label="Contact person" hint="Optional. Used in “Hi {name}”.">
          <Input value={c.contact_person ?? ""} onChange={set("contact_person")} />
        </Field>
        <Field label="Type">
          <Select value={c.kind} onChange={(e) => setC((x) => ({ ...x, kind: e.target.value as o.OutreachKind }))}>
            {Object.entries(KINDS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City">
          <Input value={c.city ?? ""} onChange={set("city")} />
        </Field>
        <Field label="Facebook page">
          <Input value={c.facebook ?? ""} onChange={set("facebook")} placeholder="facebook.com/…" />
        </Field>
        <Field label="Instagram">
          <Input value={c.instagram ?? ""} onChange={set("instagram")} placeholder="@handle" />
        </Field>
        <Field label="Email">
          <Input type="email" value={c.email ?? ""} onChange={set("email")} />
        </Field>
        <Field label="Mobile / Viber">
          <Input type="tel" value={c.phone ?? ""} onChange={set("phone")} />
        </Field>
        <Field label="Website">
          <Input value={c.website ?? ""} onChange={set("website")} />
        </Field>
        <Field label="Found via">
          <Input value={c.found_via ?? ""} onChange={set("found_via")} placeholder="e.g. FB group, Instagram tag" />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Notes">
          <Textarea value={c.notes ?? ""} onChange={set("notes")} className="min-h-[80px]" />
        </Field>
      </div>
      <ErrorText>{err}</ErrorText>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {initial.id ? (
          <PillButton tone="danger" onClick={del}>
            Remove
          </PillButton>
        ) : null}
        <span className="flex-1" />
        <PillButton onClick={onClose}>{added ? "Done" : "Cancel"}</PillButton>
        {initial.id ? null : (
          <PillButton disabled={saving} onClick={() => save(true)}>
            Add another
          </PillButton>
        )}
        <PillButton tone="dark" disabled={saving} onClick={() => save()}>
          {saving ? "Saving…" : initial.id ? "Save" : "Add"}
        </PillButton>
      </div>
    </Modal>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const parsed = text.trim() ? o.rowsFromCsv(text) : null;
  const blank = `data:text/csv;charset=utf-8,${encodeURIComponent(SHEET_HEAD + "\n")}`;
  const run = async () => {
    if (!parsed?.rows.length) return;
    setErr("");
    setProgress(0);
    try {
      const added = await o.importRows(parsed.rows, setProgress);
      const dupes = parsed.rows.length - added;
      await onDone(`Added ${added.toLocaleString()}${dupes ? ` · ${dupes.toLocaleString()} already on the list` : ""}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t import.");
      setProgress(null);
    }
  };
  return (
    <Modal open onClose={onClose} title="Import businesses" width={640}>
      <p className="text-[14px] text-[var(--slate)]">
        A sheet with a heading row: name, plus any of contact_person, kind (venue, photo_video…; blank means coordinator), city, facebook, instagram, website, email, phone, found_via and notes. Anyone already on the list is skipped.{" "}
        <a href={blank} download="outreach-sheet.csv" className="font-medium text-[var(--ink)] underline underline-offset-4">
          Blank sheet
        </a>
      </p>
      <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
        <i className="ri-file-upload-line text-lg" /> Choose a CSV file
        <input type="file" accept=".csv,.tsv,text/csv,text/plain" className="sr-only" onChange={async (e) => setText(await (e.target.files?.[0]?.text() ?? Promise.resolve("")))} />
      </label>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="…or paste the sheet here (copy the cells from Google Sheets or Excel)" className="mt-2 font-mono text-[13px]" />
      {parsed ? (
        <p className="mt-3 text-[14px] text-[var(--ink)]">
          {parsed.rows.length.toLocaleString()} {parsed.rows.length === 1 ? "row" : "rows"} with a name
          {parsed.unknown.length ? <span className="text-[var(--slate)]"> · not used: {parsed.unknown.join(", ")}</span> : null}
        </p>
      ) : null}
      <ErrorText>{err}</ErrorText>
      <div className="mt-6 flex justify-end gap-2">
        <PillButton onClick={onClose}>Cancel</PillButton>
        <PillButton tone="dark" disabled={!parsed?.rows.length || progress !== null} onClick={run}>
          {progress !== null ? `Importing… ${progress.toLocaleString()}` : "Import"}
        </PillButton>
      </div>
    </Modal>
  );
}

function MessagesDialog({ messages, onClose, onSaved }: { messages: o.Messages; onClose: () => void; onSaved: (m: o.Messages) => void }) {
  const [m, setM] = useState(messages);
  const [who, setWho] = useState<o.Audience>("coordinator");
  const [err, setErr] = useState("");
  const opener = o.messageKey("opener", who);
  const followup = o.messageKey("followup", who);
  const save = async () => {
    try {
      const changed = (Object.keys(m) as o.MessageKey[]).filter((k) => m[k] !== messages[k]);
      await Promise.all(changed.map((k) => o.saveMessage(k, m[k])));
      onSaved(m);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t save.");
    }
  };
  return (
    <Modal open onClose={onClose} title="Messages" width={640}>
      <p className="text-[14px] text-[var(--slate)]">
        <b className="font-medium text-[var(--ink)]">{"{name}"}</b> becomes their first name (or the business name), and <b className="font-medium text-[var(--ink)]">{"{link}"}</b> their own sign-up link, so we can tell when they join. <b className="font-medium text-[var(--ink)]">{"{city}"}</b> becomes their town (&ldquo;in {"{city}"}&rdquo; is left out when we don&rsquo;t know it). Each contact gets the message for their type.
      </p>
      <div className="mt-4">
        <FilterTabs<o.Audience> value={who} onChange={setWho} options={(Object.entries(o.AUDIENCES) as [o.Audience, string][]).map(([value, label]) => ({ value, label }))} />
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="First message">
          <Textarea value={m[opener]} onChange={(e) => setM({ ...m, [opener]: e.target.value })} className="min-h-[200px]" />
        </Field>
        <Field label={`Follow-up (${o.FOLLOW_UP_DAYS} days later, if they haven’t replied)`}>
          <Textarea value={m[followup]} onChange={(e) => setM({ ...m, [followup]: e.target.value })} className="min-h-[100px]" />
        </Field>
      </div>
      <ErrorText>{err}</ErrorText>
      <div className="mt-6 flex justify-end gap-2">
        <PillButton onClick={onClose}>Cancel</PillButton>
        <PillButton tone="dark" onClick={save}>
          Save
        </PillButton>
      </div>
    </Modal>
  );
}
