import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Field, FilterTabs, Input, Modal, PillButton, Select, Textarea } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as o from "../outreach";

// Studio → Outreach: event businesses we invite to the partner program, two lanes working together
// (supabase/outreach.sql + outreach-email.sql). Everyone with an email gets Angela's email from the
// daily job (api/_lib/outreach-mail.ts) once it's started; everyone else is "Your turn": "Message"
// copies the opener with their personal link, opens their chat, and marks them messaged; five days
// later they come back to the top for a follow-up. Replies to the emails mark themselves; anyone who
// signs up or applies through their link (or with the same email / mobile / Instagram) moves to
// "Signed up" on its own.

const TABS: { value: o.OutreachTab; label: string }[] = [
  { value: "your_turn", label: "Your turn" },
  { value: "emailing", label: "Emailing" },
  { value: "sent", label: "Sent by you" },
  { value: "replied", label: "Replied" },
  { value: "signed_up", label: "Signed up" },
  { value: "closed", label: "Closed" },
];
const KINDS = o.KINDS;
const BLANK: o.ContactInput = { name: "", contact_person: null, kind: "coordinator", city: null, facebook: null, instagram: null, website: null, email: null, phone: null, found_via: null, notes: null };
const SHEET_HEAD = "name,contact_person,kind,city,facebook,instagram,website,email,phone,found_via,notes";

type Toast = { text: string; undo?: () => Promise<void> };

export default function OutreachPage() {
  const { demo } = usePortal();
  const [counts, setCounts] = useState<o.Counts | null | undefined>(undefined);
  const [tab, setTab] = useState<o.OutreachTab>("your_turn");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [kind, setKind] = useState("");
  const [rows, setRows] = useState<o.Contact[] | null>(null);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<o.Messages | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; c: o.ContactInput } | null>(null);
  const [importing, setImporting] = useState(false);
  const [writing, setWriting] = useState(false);
  const [starting, setStarting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const recount = useCallback(() => o.refresh().then(setCounts), []);
  const load = useCallback(
    async (p = 0) => {
      const next = await o.loadTab(tab, { search, city, kind, page: p });
      setRows((r) => (p === 0 ? next : [...(r ?? []), ...next]));
      setPage(p);
      setMore(next.length === o.PAGE);
    },
    [tab, search, city, kind],
  );

  useEffect(() => {
    if (demo) return setCounts(null);
    recount();
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

  /** Copy the message, open their chat, mark it sent. The copy starts while this tab still has
   *  focus (browsers refuse it after), and the chat opens in the same click so it isn't blocked. */
  const send = async (c: o.Contact, kind: "opener" | "followup") => {
    const chat = o.chatFor(c);
    const audience = o.audienceOf(c.kind);
    const text = o.fillMessage(messages?.[o.messageKey(kind, audience)] ?? "", c);
    const copying = navigator.clipboard?.writeText(text) ?? Promise.reject();
    if (chat) window.open(chat.url, "_blank", "noopener");
    let copied = true;
    try {
      await copying;
    } catch {
      copied = false;
    }
    const now = new Date().toISOString();
    await change(
      c,
      kind === "opener" ? { status: "messaged", messaged_at: now, channel: chat?.channel ?? null } : { followed_up_at: now },
      chat?.channel === "call"
        ? `Marked ${c.name} as called. The message is copied if you want to text it after.`
        : copied
          ? `Message copied. Paste it in the chat${kind === "followup" ? "." : audience === "coordinator" ? " and attach the 4 coordinator images." : " and attach the 2 partner images."}`
          : "Couldn't copy the message. Open Messages to copy it by hand.",
    );
  };

  const test = async () => {
    try {
      const r = await o.sendTest();
      say({ text: `Sent ${r.sent} test emails to ${r.to}, one for each type of business.` });
    } catch (e) {
      say({ text: e instanceof Error ? e.message : "The test didn’t send." });
    }
  };
  const toggle = async (on: boolean) => {
    try {
      await o.setAutoEmail(on);
      setStarting(false);
      await recount();
      say({ text: on ? "Emailing is on. Angela’s first batch goes out at 9:30 AM." : "Emailing is paused. Nothing more goes out until you start it again." });
    } catch (e) {
      say({ text: e instanceof Error ? e.message : "Couldn’t change that." });
    }
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
        <p className="text-[14px] text-[var(--slate)]">{demo ? "Outreach isn’t part of demo data." : "Run supabase/outreach.sql and outreach-email.sql on the live database to switch this on."}</p>
      </>
    );

  return (
    <>
      <StudioHeader
        title="Outreach"
        sub={`${counts.total.toLocaleString()} businesses on the list`}
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

      <Lanes
        counts={counts}
        onTest={test}
        onToggle={() => (counts.auto_on ? toggle(false) : setStarting(true))}
        onStart={() => {
          setTab("your_turn");
          listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <div className="mb-4 scroll-mt-6" ref={listRef}>
        <FilterTabs<o.OutreachTab> value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.value, label: `${t.label} (${o.tabCount(counts, t.value).toLocaleString()})` }))} />
      </div>
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

      {rows === null ? <p className="text-[14px] text-[var(--slate)]">Loading…</p> : null}
      {rows && !rows.length ? (
        <p className="rounded-[22px] border border-[var(--line)] bg-white p-6 text-[14px] text-[var(--slate)]">
          {search || city || kind ? "No one here matches that search." : counts.total ? "No one here right now." : "The list is empty. Import a sheet or add someone to start."}
        </p>
      ) : null}

      {rows?.length ? (
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[22px] border border-[var(--line)] bg-white">
          {rows.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
              <button type="button" onClick={() => setEditing({ id: c.id, c: pick(c) })} className="min-w-0 flex-1 basis-[240px] text-left">
                <p className="text-[15px] font-semibold text-[var(--ink)] [overflow-wrap:anywhere]">
                  {c.name}
                  {c.contact_person ? <span className="font-normal text-[var(--slate)]"> · {c.contact_person}</span> : null}
                </p>
                <p className="text-[13px] text-[var(--slate)]">{[KINDS[c.kind], c.city].filter(Boolean).join(" · ")}</p>
                <ReachedBy c={c} />
              </button>
              <div className="flex items-center gap-1">
                {o.pageUrls(c).map((u) => (
                  <a key={u.url} href={u.url} target="_blank" rel="noreferrer" aria-label={`${c.name} on ${u.label}`} className="grid h-10 w-10 place-items-center rounded-full text-[19px] text-[var(--slate)] hover:bg-black/5 hover:text-[var(--ink)]">
                    <i className={u.icon} />
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Actions c={c} tab={tab} busy={busy === c.id} send={send} change={change} find={find} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {more ? (
        <div className="mt-4 text-center">
          <PillButton onClick={() => load(page + 1)}>Show more</PillButton>
        </div>
      ) : null}

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
      {starting ? (
        <Modal open onClose={() => setStarting(false)} title="Start emailing?" width={480}>
          <p className="text-[15px] leading-relaxed text-[var(--ink)]">
            Every morning at 9:30 AM, Angela’s email goes to the next {counts.daily_limit} businesses with an email address, coordinators and caterers first. Anyone who hasn’t answered gets one follow-up 5 days later.
          </p>
          <p className="mt-3 text-[14px] text-[var(--slate)]">Replies go to hello@ and move them to Replied. A “stop” closes them for good. You can pause anytime.</p>
          <div className="mt-6 flex justify-end gap-2">
            <PillButton onClick={() => setStarting(false)}>Not yet</PillButton>
            <PillButton tone="dark" onClick={() => toggle(true)}>Start emailing</PillButton>
          </div>
        </Modal>
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
const followUpOn = (iso: string) => day(new Date(new Date(iso).getTime() + o.FOLLOW_UP_DAYS * 864e5).toISOString());

/** Who reached them, how and when — or whose turn it is. */
function ReachedBy({ c }: { c: o.Contact }) {
  const auto = c.channel === "email_auto";
  const chat = o.chatFor(c);
  let icon = "ri-time-line";
  let text = "";
  if (c.status === "signed_up") (icon = "ri-check-double-line"), (text = `Signed up ${day(c.signed_up_at)}${c.matched_enquiry ? " · applied as a partner" : c.matched_profile ? " · made an account" : ""}`);
  else if (c.status === "replied") (icon = "ri-reply-line"), (text = `Replied ${day(c.replied_at)}${auto ? " to Angela’s email" : c.channel ? ` on ${o.CHANNELS[c.channel]}` : ""}`);
  else if (c.status === "not_interested" || c.status === "skipped") (icon = "ri-close-circle-line"), (text = c.stop_reason ? `Closed · ${c.stop_reason}` : c.status === "skipped" ? "Skipped" : "Not interested");
  else if (auto) {
    icon = "ri-mail-send-line";
    text = `Emailed automatically ${day(c.messaged_at)}${c.followed_up_at ? ` · followed up ${day(c.followed_up_at)}` : c.messaged_at ? ` · follow-up ${followUpOn(c.messaged_at)}` : ""}`;
  } else if (c.status === "messaged") {
    icon = o.followUpDue(c) ? "ri-alarm-line" : "ri-user-voice-line";
    const how = c.channel ? ` on ${o.CHANNELS[c.channel]}` : "";
    text = o.followUpDue(c) ? `Follow-up due · you messaged them${how} ${day(c.messaged_at)}` : `Messaged by you${how} ${day(c.messaged_at)}${c.followed_up_at ? ` · followed up ${day(c.followed_up_at)}` : ""}`;
  } else if (c.email && !c.bounced_at) (icon = "ri-mail-line"), (text = "In line for Angela’s email");
  else (icon = chat?.icon ?? "ri-hand"), (text = `${c.bounced_at ? "Email bounced · " : ""}${!chat ? "No way to reach them yet" : chat.channel === "call" ? "Call them" : `On ${chat.label}`}`);
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[var(--ink)]">
      <i className={`${icon} text-[15px] text-[var(--slate)]`} aria-hidden />
      {text}
    </p>
  );
}

const manilaHour = () => {
  const d = new Date(Date.now() + 8 * 3600_000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
};

/** The two lanes: what Angela's email job did, and what's waiting for the team. */
function Lanes({ counts: k, onTest, onToggle, onStart }: { counts: o.Counts; onTest: () => void; onToggle: () => void; onStart: () => void }) {
  const card = "flex flex-col rounded-[22px] border border-[var(--line)] bg-white p-5";
  const label = "flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--slate)]";
  const big = "mt-3 font-display text-[2.1rem] font-semibold leading-none text-[var(--ink)]";
  const small = "text-[15px] font-normal text-[var(--slate)]";
  const next = !k.auto_on
    ? `Once started: ${k.daily_limit} a day at 9:30 AM, from Angela.`
    : k.auto_today >= k.daily_limit || manilaHour() >= 9.75
      ? "Next batch tomorrow at 9:30 AM."
      : "Next batch today at 9:30 AM.";
  const ways = [
    ["Messenger", k.your_messenger],
    ["Viber", k.your_viber],
    ["Instagram", k.your_instagram],
    ["Call", k.your_call],
  ].filter(([, n]) => Number(n) > 0);
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-2">
      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <p className={label}>
            <i className="ri-mail-send-line text-[15px]" aria-hidden /> Emailed automatically
          </p>
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${k.auto_on ? "bg-[#e3f5e9] text-[#1d6b3a]" : "bg-black/5 text-[var(--slate)]"}`}>{k.auto_on ? "On" : "Paused"}</span>
        </div>
        <p className={big}>
          {k.auto_today} <span className={small}>of {k.daily_limit} today</span>
        </p>
        <p className="mt-2 text-[14px] text-[var(--ink)]">
          {k.auto_total.toLocaleString()} emailed · {k.auto_replied.toLocaleString()} replied · {k.email_queue.toLocaleString()} in line
        </p>
        <p className="mt-1 text-[13px] text-[var(--slate)]">{next}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <PillButton onClick={onTest}>
            <i className="ri-mail-check-line" /> Send me a test
          </PillButton>
          <PillButton tone={k.auto_on ? undefined : "dark"} onClick={onToggle}>
            <i className={k.auto_on ? "ri-pause-line" : "ri-play-line"} /> {k.auto_on ? "Pause" : "Start emailing"}
          </PillButton>
        </div>
      </section>
      <section className={card}>
        <p className={label}>
          <i className="ri-hand text-[15px]" aria-hidden /> Your turn
        </p>
        <p className={big}>
          {k.team_today} <span className={small}>of {o.DAILY_GOAL} today</span>
        </p>
        <p className="mt-2 text-[14px] text-[var(--ink)]">
          {ways.length
            ? ways.map(([w, n], i) => (
                <span key={w} className="whitespace-nowrap">
                  {i ? " · " : ""}
                  {w} {Number(n).toLocaleString()}
                </span>
              ))
            : "No one waiting on you."}
        </p>
        <p className="mt-1 text-[13px] text-[var(--slate)]">{k.your_followups ? `${k.your_followups.toLocaleString()} follow-up${k.your_followups === 1 ? "" : "s"} due first.` : "Businesses without an email. Message them from here."}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <PillButton tone="primary" onClick={onStart}>
            <i className="ri-send-plane-line" /> Start messaging
          </PillButton>
        </div>
      </section>
    </div>
  );
}

const pick = (c: o.Contact): o.ContactInput => ({
  name: c.name, contact_person: c.contact_person, kind: c.kind, city: c.city, facebook: c.facebook, instagram: c.instagram,
  website: c.website, email: c.email, phone: c.phone, found_via: c.found_via, notes: c.notes,
});

function Actions({ c, tab, busy, send, change, find }: {
  c: o.Contact;
  /** no page on file yet: search Facebook for them and open the form to paste it in */
  find: (c: o.Contact) => void;
  tab: o.OutreachTab;
  busy: boolean;
  send: (c: o.Contact, kind: "opener" | "followup") => Promise<void>;
  change: (c: o.Contact, patch: Partial<o.Contact>, text: string) => Promise<void>;
}) {
  const now = () => new Date().toISOString();
  const replied = <PillButton disabled={busy} onClick={() => change(c, { status: "replied", replied_at: now() }, `${c.name} moved to Replied.`)}>Replied</PillButton>;
  const no = <PillButton disabled={busy} onClick={() => change(c, { status: "not_interested" }, `${c.name} won’t be messaged again.`)}>Not interested</PillButton>;
  const chat = o.chatFor(c);
  if (tab === "your_turn" && o.followUpDue(c))
    return (
      <>
        {no}
        {replied}
        <PillButton tone="primary" disabled={busy || !chat} onClick={() => send(c, "followup")}>
          <i className={chat?.icon ?? "ri-chat-3-line"} /> Follow up
        </PillButton>
      </>
    );
  if (tab === "your_turn")
    return (
      <>
        <PillButton disabled={busy} onClick={() => change(c, { status: "skipped" }, `Skipped ${c.name}.`)}>Skip</PillButton>
        {chat ? (
          <PillButton tone="primary" disabled={busy} title={chat.channel === "call" ? "Calls them and marks them contacted" : `Copies the message and opens ${chat.label}`} onClick={() => send(c, "opener")}>
            <i className={chat.icon} /> {chat.channel === "call" ? "Call" : "Message"}
          </PillButton>
        ) : (
          <PillButton tone="dark" disabled={busy} title="Searches Facebook for them and opens their details, so you can paste in their page" onClick={() => find(c)}>
            <i className="ri-search-line" /> Find them
          </PillButton>
        )}
      </>
    );
  // In line for the email: take them out of it. Emailed: mark what happened.
  if (tab === "emailing")
    return c.status === "to_message" ? (
      <PillButton disabled={busy} onClick={() => change(c, { status: "skipped" }, `${c.name} won’t be emailed.`)}>Skip</PillButton>
    ) : (
      <>
        {no}
        {replied}
      </>
    );
  if (tab === "sent")
    return (
      <>
        {no}
        {replied}
      </>
    );
  if (tab === "replied") return no;
  if (tab === "signed_up")
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
