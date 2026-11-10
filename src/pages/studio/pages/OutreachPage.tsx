import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Field, FilterTabs, Input, Modal, PillButton, Select, Textarea } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as o from "../outreach";

// Studio → Outreach: coordinators and planners we message ourselves, one at a time
// (supabase/outreach.sql). "Message" copies the opener with their personal link, opens their
// chat, and marks them messaged; five days later they show under "Follow up". Anyone who signs
// up or applies through their link (or with the same email / mobile / Instagram) moves to
// "Signed up" on its own.

const TABS: { value: o.OutreachTab; label: string }[] = [
  { value: "to_message", label: "To message" },
  { value: "due", label: "Follow up" },
  { value: "waiting", label: "Waiting" },
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
  const [tab, setTab] = useState<o.OutreachTab>("to_message");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [kind, setKind] = useState("");
  const [reach, setReach] = useState<o.Reach>("");
  const [rows, setRows] = useState<o.Contact[] | null>(null);
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
      const next = await o.loadTab(tab, { search, city, kind, reach, page: p });
      setRows((r) => (p === 0 ? next : [...(r ?? []), ...next]));
      setPage(p);
      setMore(next.length === o.PAGE);
    },
    [tab, search, city, kind, reach],
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
      kind === "opener" ? { status: "messaged", messaged_at: now } : { followed_up_at: now },
      copied
        ? `Message copied. Paste it in the chat${kind === "followup" ? "." : audience === "coordinator" ? " and attach the 4 coordinator images." : " and attach the 2 partner images."}`
        : "Couldn't copy the message. Open Messages to copy it by hand.",
    );
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
        <p className="text-[14px] text-[var(--slate)]">{demo ? "Outreach isn’t part of demo data." : "Run supabase/outreach.sql on the live database to switch this on."}</p>
      </>
    );

  return (
    <>
      <StudioHeader
        title="Outreach"
        sub={`Sent today: ${counts.sent_today} of ${o.DAILY_GOAL} · ${counts.messaged.toLocaleString()} messaged · ${counts.total.toLocaleString()} of ${o.LIST_GOAL.toLocaleString()} on the list`}
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
        <FilterTabs<o.OutreachTab> value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t.value, label: `${t.label} (${counts[t.value].toLocaleString()})` }))} />
      </div>
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_190px_190px_190px]">
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
        <Select value={reach} onChange={(e) => setReach(e.target.value as o.Reach)} aria-label="Contact details">
          <option value="">Everyone</option>
          <option value="ready">Ready to message</option>
          <option value="lookup">Needs their page</option>
        </Select>
      </div>

      {rows === null ? <p className="text-[14px] text-[var(--slate)]">Loading…</p> : null}
      {rows && !rows.length ? (
        <p className="rounded-[22px] border border-[var(--line)] bg-white p-6 text-[14px] text-[var(--slate)]">
          {search || city || kind || reach ? "No one here matches that search." : counts.total ? "No one here right now." : "The list is empty. Import a sheet or add someone to start."}
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
                <p className="text-[13px] text-[var(--slate)]">{[KINDS[c.kind], c.city, when(c)].filter(Boolean).join(" · ")}</p>
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

function when(c: o.Contact) {
  if (c.status === "signed_up") return `Signed up ${formatDate(c.signed_up_at)}${c.matched_enquiry ? " · applied as a partner" : c.matched_profile ? " · made an account" : ""}`;
  if (c.status === "replied") return `Replied ${formatDate(c.replied_at)}`;
  if (c.followed_up_at) return `Followed up ${formatDate(c.followed_up_at)}`;
  if (c.messaged_at) return `Messaged ${formatDate(c.messaged_at)}`;
  return c.found_via ? `Found via ${c.found_via}` : "";
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
  if (tab === "to_message")
    return (
      <>
        <PillButton disabled={busy} onClick={() => change(c, { status: "skipped" }, `Skipped ${c.name}.`)}>Skip</PillButton>
        {chat ? (
          <PillButton tone="primary" disabled={busy} title={`Copies the message and opens ${chat.label}`} onClick={() => send(c, "opener")}>
            <i className={chat.icon} /> Message
          </PillButton>
        ) : (
          <PillButton tone="dark" disabled={busy} title="Searches Facebook for them and opens their details, so you can paste in their page" onClick={() => find(c)}>
            <i className="ri-search-line" /> Find them
          </PillButton>
        )}
      </>
    );
  if (tab === "due")
    return (
      <>
        {no}
        {replied}
        <PillButton tone="primary" disabled={busy || !chat} onClick={() => send(c, "followup")}>
          <i className={chat?.icon ?? "ri-chat-3-line"} /> Follow up
        </PillButton>
      </>
    );
  if (tab === "waiting")
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
        <b className="font-medium text-[var(--ink)]">{"{name}"}</b> becomes their first name (or the business name), and <b className="font-medium text-[var(--ink)]">{"{link}"}</b> their own sign-up link, so we can tell when they join. Each contact gets the message for their type.
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
