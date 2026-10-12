import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate, formatMoney } from "@/pages/account/portal/format";
import { ErrorText, FilterTabs, Input, PillButton, Textarea, Toggle } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as studio from "../studioApi";

// Studio → Partners: planners, coordinators and creators who send us clients
// (supabase/revenue.sql). Each has a code and a link (thersvpstudio.com/p/CODE);
// the people they send get `discount`% off and the partner earns `rate`% of what
// those people pay. Open a partner to see exactly who they brought, and record payouts.

type Filter = "all" | "planner" | "influencer" | "paused";
const KIND: Record<studio.PartnerKind, string> = { planner: "Planner", influencer: "Creator", other: "Other" };
const HOW: Record<string, string> = { enquiry: "Enquired", signup: "Signed up", project: "Project" };

const blank = (): studio.PartnerInput => ({ code: "", kind: "planner", name: "", business: "", email: "", phone: "", handle: "", payout_details: "", rate: 20, discount: 20, active: true, notes: "" });
const suggestCode = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

export default function PartnersPage() {
  const { demo } = usePortal();
  const [rows, setRows] = useState<studio.PartnerRow[] | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; leadId?: string; p: studio.PartnerInput } | null>(null);
  const reload = () => studio.loadPartners().then(setRows);
  // From Leads → "Add as partner": the application, filled in.
  const location = useLocation();
  const navigate = useNavigate();
  const fromLead = (location.state as { fromLead?: studio.Lead } | null)?.fromLead;
  useEffect(() => {
    if (!fromLead) return;
    const v = fromLead.values ?? {};
    const s = (k: string) => (Array.isArray(v[k]) ? (v[k] as string[]).join(", ") : String(v[k] ?? ""));
    const creator = /creator|influencer/i.test(s("partner_type"));
    const name = fromLead.name ?? s("your_name");
    setEditing({
      id: null,
      leadId: fromLead.id,
      p: { ...blank(), kind: creator ? "influencer" : "planner", name, code: suggestCode(name), business: s("business_name") || null, email: fromLead.email, phone: fromLead.phone, handle: s("instagram") || null },
    });
    navigate(".", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLead]);
  useEffect(() => {
    if (demo) return setRows([]);
    reload();
  }, [demo]);

  const shown = useMemo(
    () => (rows ?? []).filter((r) => (filter === "all" ? r.active : filter === "paused" ? !r.active : r.active && r.kind === filter)),
    [rows, filter],
  );
  const totals = useMemo(() => (rows ?? []).reduce((t, r) => ({ revenue: t.revenue + r.revenue, owed: t.owed + r.owed }), { revenue: 0, owed: 0 }), [rows]);

  if (rows === undefined) return <StudioHeader title="Partners" sub="Loading…" />;
  if (rows === null)
    return (
      <>
        <StudioHeader title="Partners" />
        <p className="text-[14px] text-[var(--slate)]">Run supabase/revenue.sql on the live database to switch on the partner program.</p>
      </>
    );

  return (
    <>
      <StudioHeader
        title="Partners"
        sub="Planners and creators who send us clients. The people they send get a discount; partners earn a share of what those people pay."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Active (${rows.filter((r) => r.active).length})` },
            { value: "planner", label: "Planners" },
            { value: "influencer", label: "Creators" },
            { value: "paused", label: "Paused" },
          ]}
        />
        <PillButton tone="dark" onClick={() => setEditing({ id: null, p: blank() })}>
          Add partner
        </PillButton>
      </div>

      {rows.length ? (
        <p className="mb-4 text-[14px] text-[var(--slate)]">
          Partners have brought in {formatMoney(totals.revenue)}. Commission still to pay: <strong className="text-[var(--ink)]">{formatMoney(totals.owed)}</strong>.
        </p>
      ) : null}

      {editing ? (
        <PartnerEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            if (editing.leadId) await studio.setLeadStatus(editing.leadId, "converted").catch(() => undefined);
            setEditing(null);
            await reload();
          }}
        />
      ) : null}

      {shown.length === 0 ? (
        <p className="rounded-[22px] border border-[var(--line)] bg-white px-5 py-10 text-center text-[14px] text-[var(--slate)]">
          {rows.length ? "No partners here." : "No partners yet. Add one when a planner or creator signs up from the partner page."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-[22px] border border-[var(--line)] bg-white">
              <button onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-left">
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="text-[15px] font-semibold text-[var(--ink)]">
                    {r.name}
                    {r.business ? <span className="font-normal text-[var(--slate)]"> · {r.business}</span> : null}
                  </p>
                  <p className="text-[13px] text-[var(--slate)]">
                    {KIND[r.kind]} · code <span className="font-semibold tracking-[0.04em] text-[var(--ink)]">{r.code}</span> · {r.rate}% to them, {r.discount}% off for clients
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-x-5 gap-y-1 text-[13px] sm:grid-cols-6 [font-variant-numeric:tabular-nums]">
                  {[
                    ["Visits", r.clicks],
                    ["Sign-ups", r.signups],
                    ["Enquiries", r.enquiries],
                    ["Paying", r.paying],
                    ["Brought in", formatMoney(r.revenue)],
                    ["To pay", formatMoney(r.owed)],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="text-[var(--slate)]">{k}</dt>
                      <dd className={`font-semibold ${k === "To pay" && r.owed > 0 ? "text-[#b3382c]" : "text-[var(--ink)]"}`}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <i className={`ri-arrow-down-s-line text-xl text-[var(--slate)] transition-transform ${open === r.id ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {open === r.id ? <PartnerDetail r={r} onEdit={() => setEditing({ id: r.id, p: { ...r } })} onChanged={reload} /> : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PartnerDetail({ r, onEdit, onChanged }: { r: studio.PartnerRow; onEdit: () => void; onChanged: () => void }) {
  const [people, setPeople] = useState<studio.PartnerPersonRow[] | null>(null);
  const [amount, setAmount] = useState(r.owed > 0 ? String(r.owed) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    studio.loadPartnerPeople(r.id).then(setPeople);
  }, [r.id]);
  const link = `https://thersvpstudio.com/p/${r.code}`;

  const pay = async () => {
    const n = Number(amount);
    if (!(n > 0)) return setError("Enter the amount you paid.");
    setBusy(true);
    setError(null);
    try {
      await studio.addPartnerPayout(r.id, n, note);
      setNote("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t record the payout.");
    }
    setBusy(false);
  };

  return (
    <div className="border-t border-[var(--line)] px-5 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 break-all rounded-full bg-[var(--paper)] px-4 py-2 text-[14px] text-[var(--ink)]">{link}</span>
        <PillButton
          onClick={async () => {
            await navigator.clipboard.writeText(link).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy link"}
        </PillButton>
        <PillButton onClick={onEdit}>Edit</PillButton>
      </div>
      <p className="mt-3 text-[14px] text-[var(--slate)]">
        {[r.email, r.phone, r.handle].filter(Boolean).join(" · ") || "No contact details"}
        {r.payout_details ? ` · Pays to: ${r.payout_details}` : ""}
      </p>
      {r.email ? null : <p className="mt-1 text-[13px] text-[#8a5a00]">Add their email so they can see their partner dashboard (they log in with it).</p>}

      <h3 className="mt-6 text-[14px] font-semibold text-[var(--ink)]">Who they brought</h3>
      {people === null ? (
        <p className="mt-2 text-[14px] text-[var(--slate)]">Loading…</p>
      ) : people.length === 0 ? (
        <p className="mt-2 text-[14px] text-[var(--slate)]">No one yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)]">
          {people.map((p, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[14px]">
              <div className="min-w-0 flex-1 basis-[200px]">
                <p className="font-medium text-[var(--ink)]">
                  {p.person || "—"}
                  {p.email ? <span className="font-normal text-[var(--slate)]"> · {p.email}</span> : null}
                </p>
                <p className="text-[13px] text-[var(--slate)]">
                  {HOW[p.kind]} {formatDate(p.created_at)} · {p.status}
                  {p.project ? ` · ${p.project}` : ""}
                </p>
              </div>
              <p className="text-right [font-variant-numeric:tabular-nums]">
                <span className="block font-semibold text-[var(--ink)]">{p.revenue > 0 ? formatMoney(p.revenue) : "—"}</span>
                {p.commission > 0 ? <span className="block text-[13px] text-[var(--slate)]">{formatMoney(p.commission)} to them</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 text-[14px] font-semibold text-[var(--ink)]">Record a payout</h3>
      <p className="text-[13px] text-[var(--slate)]">
        Earned {formatMoney(r.commission)} · paid {formatMoney(r.paid_out)} · still to pay {formatMoney(r.owed)}
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
          Amount (₱)
          <Input type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-[140px]" />
        </label>
        <label className="min-w-0 flex-1 basis-[200px] text-[14px] text-[var(--ink)] md:text-[13px]">
          Note (optional)
          <Input value={note} placeholder="e.g. GCash ref 1234" onChange={(e) => setNote(e.target.value)} className="mt-1 w-full" />
        </label>
        <PillButton tone="dark" onClick={pay} disabled={busy}>
          {busy ? "Saving…" : "Record payout"}
        </PillButton>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function PartnerEditor({ initial, onCancel, onSaved }: { initial: { id: string | null; p: studio.PartnerInput }; onCancel: () => void; onSaved: () => void }) {
  const [p, setP] = useState<studio.PartnerInput>(initial.p);
  const [codeTouched, setCodeTouched] = useState(!!initial.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<studio.PartnerInput>) => setP((x) => ({ ...x, ...patch }));

  const save = async () => {
    setError(null);
    if (!p.name.trim()) return setError("Add their name.");
    if (!/^[A-Z0-9]{3,20}$/.test(p.code.trim().toUpperCase())) return setError("Codes are 3–20 letters or numbers, no spaces.");
    setBusy(true);
    try {
      await studio.savePartner(initial.id, p);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
      setBusy(false);
    }
  };

  const field = (label: string, key: keyof studio.PartnerInput, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
      {label}
      <Input value={String(p[key] ?? "")} onChange={(e) => set({ [key]: e.target.value } as Partial<studio.PartnerInput>)} className="mt-1 w-full" {...extra} />
    </label>
  );

  return (
    <section className="mb-5 rounded-[22px] border border-[var(--ink)] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-[var(--ink)]">{initial.id ? `Edit ${initial.p.name}` : "New partner"}</h2>
        <label className="flex items-center gap-3 text-[14px] text-[var(--ink)]">
          {p.active ? "Active" : "Paused"}
          <Toggle checked={p.active} onChange={(v) => set({ active: v })} label="Partner active" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Partner type">
        {(["planner", "influencer", "other"] as const).map((k) => (
          <button
            key={k}
            role="radio"
            aria-checked={p.kind === k}
            onClick={() => set({ kind: k })}
            className={`min-h-[44px] rounded-full border px-4 text-[14px] md:min-h-[38px] ${p.kind === k ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] text-[var(--ink)]"}`}
          >
            {k === "planner" ? "Planner / coordinator" : k === "influencer" ? "Creator / influencer" : "Other"}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
          Name
          <Input
            value={p.name}
            onChange={(e) => set({ name: e.target.value, ...(codeTouched ? {} : { code: suggestCode(e.target.value) }) })}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
          Code
          <Input
            value={p.code}
            onChange={(e) => {
              setCodeTouched(true);
              set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) });
            }}
            autoCapitalize="characters"
            className="mt-1 w-full tracking-[0.04em]"
          />
        </label>
        {field(p.kind === "influencer" ? "Brand / page (optional)" : "Business (optional)", "business")}
        {field("Email (their dashboard login)", "email", { type: "email", autoCapitalize: "none", spellCheck: false })}
        {field("Phone (optional)", "phone", { type: "tel" })}
        {field(p.kind === "influencer" ? "Instagram / TikTok" : "Instagram (optional)", "handle", { autoCapitalize: "none", spellCheck: false })}
        {field("Pays to (GCash / bank)", "payout_details")}
        <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
          Their commission (%)
          <Input type="number" min={0} max={100} value={p.rate} onChange={(e) => set({ rate: Number(e.target.value) })} className="mt-1 w-full" />
        </label>
        <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
          Discount for their clients (%)
          <Input type="number" min={0} max={90} value={p.discount} onChange={(e) => set({ discount: Number(e.target.value) })} className="mt-1 w-full" />
        </label>
      </div>
      <label className="mt-3 block text-[14px] text-[var(--ink)] md:text-[13px]">
        Notes (only the studio sees these)
        <Textarea value={p.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} rows={2} className="mt-1 w-full" />
      </label>
      <div className="mt-4 flex gap-3">
        <PillButton tone="dark" onClick={save} disabled={busy}>
          {busy ? "Saving…" : initial.id ? "Save" : "Add partner"}
        </PillButton>
        <PillButton onClick={onCancel}>Cancel</PillButton>
      </div>
      <ErrorText>{error}</ErrorText>
    </section>
  );
}
