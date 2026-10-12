import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CharacterTrio } from "@/components/CharacterLoader";
import CharacterLoader from "@/components/CharacterLoader";
import * as api from "../api";
import { usePortal } from "../PortalContext";
import { formatDate, formatMoney } from "../format";

// /account/partner — a partner's own dashboard (supabase/revenue.sql → my_partner):
// their code and link, what they've earned, and everyone they've brought in
// (first name + last initial). Partners are matched by the email they log in with.

const SITE = "thersvpstudio.com";

const KIND_LABEL: Record<string, string> = { planner: "Planner partner", influencer: "Creator partner", other: "Partner" };
const PERSON_LABEL: Record<string, string> = { enquiry: "Enquired", signup: "Signed up", project: "Project" };
const STATUS_LABEL: Record<string, string> = {
  new: "New enquiry",
  contacted: "In talks",
  converted: "Booked",
  archived: "Closed",
  "signed up": "Making their site",
  paid: "Paid",
  project: "Booked",
};

function captions(p: api.MyPartner) {
  const link = `${SITE}/p/${p.code}`;
  return p.kind === "influencer"
    ? [
        `Planning a wedding, birthday or any celebration? Make your event website with The RSVP Studio — RSVPs built in. Use my code ${p.code} for ${p.discount}% off: ${link}`,
        `Our event website was made with The RSVP Studio. Guests RSVP right on the site. Code ${p.code} gets you ${p.discount}% off → ${link}`,
        `${p.discount}% off event websites, invitations and stationery from The RSVP Studio with code ${p.code}. ${link}`,
      ]
    : [
        `For your event website and invitations, I work with The RSVP Studio. Use this link and you'll get ${p.discount}% off: ${link}`,
        `Here's the studio I recommend for your event website, RSVPs and stationery. Enter code ${p.code} when you enquire for ${p.discount}% off: ${link}`,
      ];
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* the text is on screen to select */
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };
  return { copied, copy };
}

// ?demo (dev): sample numbers, to see the page without a partner account.
const DEMO: api.MyPartner = { code: "GELREYES", kind: "influencer", name: "Gel Reyes", rate: 20, discount: 20, active: true, clicks: 412, enquiries: 6, signups: 23, paying: 5, revenue: 21495, commission: 4299, paid_out: 2500, owed: 1799 };
const DEMO_PEOPLE: api.PartnerPerson[] = [
  { kind: "signup", person: "Trixia M.", status: "paid", revenue: 399, commission: 79.8, created_at: "2026-10-09T10:00:00Z" },
  { kind: "enquiry", person: "Carlo D.", status: "converted", revenue: 6400, commission: 1280, created_at: "2026-10-04T10:00:00Z" },
  { kind: "signup", person: "Nikki A.", status: "signed up", revenue: 0, commission: 0, created_at: "2026-10-02T10:00:00Z" },
  { kind: "enquiry", person: "Sophia R.", status: "contacted", revenue: 0, commission: 0, created_at: "2026-09-28T10:00:00Z" },
];

export default function PartnerPage() {
  const { demo } = usePortal();
  const [partner, setPartner] = useState<api.MyPartner | null | undefined>(undefined);
  const [people, setPeople] = useState<api.PartnerPerson[] | null>(null);
  const [payouts, setPayouts] = useState<api.PartnerPayout[]>([]);
  const { copied, copy } = useCopy();

  useEffect(() => {
    if (demo) {
      setPartner(DEMO);
      setPeople(DEMO_PEOPLE);
      setPayouts([{ amount: 2500, paid_at: "2026-10-01", note: "GCash" }]);
      return;
    }
    api.myPartner(true).then((p) => {
      setPartner(p);
      if (p) {
        api.myPartnerPeople().then(setPeople);
        api.myPartnerPayouts().then(setPayouts);
      }
    });
  }, [demo]);

  if (partner === undefined) return <CharacterLoader message="Loading your partner page…" />;
  if (!partner)
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <CharacterTrio className="mx-auto w-[220px]" />
        <h1 className="mt-8 font-display text-[1.9rem] font-semibold text-[var(--ink)]">Partner program</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-[var(--slate)]">
          Planners, coordinators and creators earn 20% of every booking they send us, and the people they send get 20% off. Already a partner? Log in with the email you gave us.
        </p>
        <Link to="/partners" className="btn btn-primary mt-7 inline-flex">
          Become a partner
        </Link>
      </div>
    );

  const link = `${SITE}/p/${partner.code}`;
  const funnel = [
    { label: "Link visits", value: partner.clicks },
    { label: "Sign-ups", value: partner.signups },
    { label: "Enquiries", value: partner.enquiries },
    { label: "Paying clients", value: partner.paying },
  ];

  return (
    <div className="pb-10">
      {/* Hello + the characters */}
      <section className="flex flex-col-reverse items-center gap-6 pt-2 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div className="min-w-0">
          <p className="eyebrow">{KIND_LABEL[partner.kind] ?? "Partner"}</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)] md:text-[2.5rem]">
            Your partner dashboard
          </h1>
          <p className="mt-2 max-w-[52ch] text-[16px] leading-relaxed text-[var(--slate)]">
            Everyone who uses your code gets {partner.discount}% off, and you earn {partner.rate}% of what they pay us.
          </p>
        </div>
        <CharacterTrio className="w-[200px] shrink-0 md:w-[240px]" />
      </section>

      {/* The code */}
      <section className="mt-8 rounded-[28px] bg-[#eef3ff] p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--indigo)]">Your code</p>
            <p className="mt-1 font-display text-[2.6rem] font-semibold leading-none tracking-[0.06em] text-[var(--ink)] md:text-[3.2rem]">{partner.code}</p>
            {!partner.active ? <p className="mt-2 text-[14px] text-[#b3382c]">Paused — message us to switch it back on.</p> : null}
          </div>
          <div className="flex min-w-0 flex-col gap-2 md:max-w-[420px] md:flex-1">
            <div className="flex min-w-0 items-center gap-2 rounded-full bg-white py-1.5 pl-5 pr-1.5">
              <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--ink)]">{link}</span>
              <button onClick={() => copy("link", `https://${link}`)} className="min-h-[44px] shrink-0 rounded-full bg-[var(--ink)] px-5 text-[14px] font-medium text-white md:min-h-[40px]">
                {copied === "link" ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="px-2 text-[13px] text-[var(--slate)]">They can also type {partner.code} on the enquiry form or at checkout.</p>
          </div>
        </div>
      </section>

      {/* Earnings */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "You’ve earned", value: partner.commission, note: `${partner.rate}% of ${formatMoney(partner.revenue)}` },
          { label: "Paid to you", value: partner.paid_out, note: payouts[0] ? `Last paid ${formatDate(payouts[0].paid_at)}` : "No payouts yet" },
          { label: "Coming to you", value: partner.owed, note: partner.owed > 0 ? "Paid to your GCash or bank" : "All settled" },
        ].map((s) => (
          <div key={s.label} className="rounded-[22px] border border-[var(--line)] bg-white px-5 py-4">
            <p className="text-[14px] text-[var(--slate)]">{s.label}</p>
            <p className="mt-1 font-display text-[1.9rem] font-semibold leading-tight text-[var(--ink)] [font-variant-numeric:tabular-nums]">{formatMoney(s.value)}</p>
            <p className="mt-0.5 text-[13px] text-[var(--slate)]">{s.note}</p>
          </div>
        ))}
      </section>

      {/* From visit to paying client */}
      <section className="mt-6 rounded-[22px] border border-[var(--line)] bg-white px-5 py-5">
        <ol className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
          {funnel.map((f, i) => (
            <li key={f.label} className="flex items-center gap-3">
              <div>
                <p className="font-display text-[1.6rem] font-semibold leading-none text-[var(--ink)] [font-variant-numeric:tabular-nums]">{f.value}</p>
                <p className="mt-1 text-[13px] text-[var(--slate)]">{f.label}</p>
              </div>
              {i < funnel.length - 1 ? <i className="ri-arrow-right-line ml-auto mr-3 hidden text-[var(--line)] sm:block" aria-hidden /> : null}
            </li>
          ))}
        </ol>
      </section>

      {/* People */}
      <section className="mt-10">
        <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">People you’ve sent</h2>
        {people === null ? (
          <CharacterLoader message="One moment…" />
        ) : people.length === 0 ? (
          <p className="mt-3 text-[15px] text-[var(--slate)]">No one yet. Share your link or a caption below to get started.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)] rounded-[22px] border border-[var(--line)] bg-white">
            {people.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                <div className="min-w-0 flex-1 basis-[160px]">
                  <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{p.person || "Someone"}</p>
                  <p className="text-[13px] text-[var(--slate)]">
                    {PERSON_LABEL[p.kind]} {formatDate(p.created_at)} · {STATUS_LABEL[p.status] ?? p.status}
                  </p>
                </div>
                <p className={`text-[15px] font-semibold [font-variant-numeric:tabular-nums] ${p.commission > 0 ? "text-[#3d7a12]" : "text-[var(--slate)]"}`}>
                  {p.commission > 0 ? `+${formatMoney(Math.round(p.commission))}` : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ready-made posts */}
      <section className="mt-10">
        <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">{partner.kind === "influencer" ? "Ready-made captions" : "Messages for your clients"}</h2>
        <p className="mt-1 text-[14px] text-[var(--slate)]">Copy one, or write your own — just include your code or link.</p>
        <ul className="mt-4 space-y-3">
          {captions(partner).map((c, i) => (
            <li key={i} className="flex flex-col gap-3 rounded-[22px] bg-[var(--paper)] p-5 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-[var(--ink)]">{c}</p>
              <button onClick={() => copy(`c${i}`, c)} className="min-h-[44px] shrink-0 self-start rounded-full border border-[var(--line)] bg-white px-5 text-[14px] font-medium text-[var(--ink)] sm:self-center md:min-h-[38px]">
                {copied === `c${i}` ? "Copied" : "Copy"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Payouts */}
      {payouts.length ? (
        <section className="mt-10">
          <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">Payouts</h2>
          <ul className="mt-4 divide-y divide-[var(--line)] rounded-[22px] border border-[var(--line)] bg-white">
            {payouts.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-[15px] text-[var(--ink)]">{formatDate(p.paid_at)}</p>
                  {p.note ? <p className="truncate text-[13px] text-[var(--slate)]">{p.note}</p> : null}
                </div>
                <p className="text-[15px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{formatMoney(p.amount)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-[14px] text-[var(--slate)]">
        Commission is counted once your client has paid. To change your payout details, <Link to="/account/help/contact" className="text-[var(--acc-blue)] underline-offset-2 hover:underline">message us</Link>.
      </p>
    </div>
  );
}
