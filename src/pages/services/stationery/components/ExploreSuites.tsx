import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

const SHARED_NOTES = [
  "One (1) format is included per project: either print-ready or website format.",
  "Posted rates apply to design and illustration services only.",
  "One (1) revision is included. Additional revisions will be charged accordingly.",
  "Printing costs are not included.",
  "Prices are subject to change without prior notice.",
];

const EXTEND_COPY =
  "Extend your collection with additional stationery pieces and/or custom illustrations, thoughtfully designed to complement your existing suite. Each addition is commissioned individually.";

type Group = { label: string; items: string[] };
type Suite = {
  id: string;
  tab: string;
  tagline: string;
  headline: string;
  includes: string[];
  img: string;
  price: string;
  summary: string;
  sub: string;
  groups: Group[];
  artwork: string[];
};

const SUITES: Suite[] = [
  {
    id: "essential",
    tab: "Essential",
    tagline: "Start small. Start personal.",
    headline: "For intimate celebrations seeking a refined artistic touch.",
    includes: [
      "Main Invitation",
      "Entourage Card",
      "Details Card",
      "Couple's Logo / Monogram",
      "3 Custom Illustrations",
    ],
    img: "/services/stationery/suite-essential.jpg",
    price: "₱8,500",
    summary: "A thoughtfully crafted three-piece invitation suite.",
    sub: "Perfect for understated celebrations with a refined artistic touch.",
    groups: [
      { label: "The Wedding Day", items: ["Main Invitation", "Entourage Card", "Details Card"] },
    ],
    artwork: [
      "Couple's Logo / Monogram",
      "3 Custom Illustrations — integrated across the Main Invitation, Entourage Card, and Details Card.",
    ],
  },
  {
    id: "signature",
    tab: "Signature",
    tagline: "A more detailed story, beautifully illustrated.",
    headline: "Created for celebrations with thoughtful details and a story worth telling.",
    includes: [
      "Main Invitation",
      "Entourage Card",
      "Details Card",
      "Directions / Map",
      "RSVP Card",
      "Couple's Logo / Monogram",
      "5 Custom Illustrations",
    ],
    img: "/services/stationery/suite-signature.jpg",
    price: "₱10,000",
    summary: "A thoughtfully crafted five-piece invitation suite.",
    sub: "Designed for couples who want a more elevated and expressive stationery experience — ideal for destination weddings, multi-day events, or couples who love thoughtful details.",
    groups: [
      {
        label: "The Wedding Day",
        items: ["Main Invitation", "Entourage", "Details Card", "Directions / Map", "RSVP Card"],
      },
    ],
    artwork: [
      "Couple's Logo / Monogram",
      "5 Custom Illustrations — integrated across the Main Invitation, Entourage, Details Card, Directions/Map, and RSVP Card.",
    ],
  },
  {
    id: "heirloom",
    tab: "Heirloom",
    tagline: "An illustrated world built entirely around your celebration.",
    headline: "Our most immersive stationery experience.",
    includes: [
      "Save the Date",
      "Invitation Suite",
      "Day-of Stationery",
      "Thank You Card",
      "Couple's Logo / Monogram",
      "14 Custom Illustrations",
    ],
    img: "/services/stationery/suite-heirloom.jpg",
    price: "₱22,000",
    summary:
      "A fully custom stationery experience with layered artwork, meaningful details, and a cohesive visual story carried across every touchpoint of your event.",
    sub: "Perfect for couples who want heirloom-worthy pieces with a highly personalised feel.",
    groups: [
      { label: "The Pre Wedding", items: ["Save the Date"] },
      {
        label: "The Wedding Day — Invitation Suite",
        items: ["Main Invitation", "Entourage", "Details Card", "Directions / Map", "Timeline", "RSVP Card"],
      },
      {
        label: "The Wedding Day — Day-of Papers",
        items: [
          "Menu",
          "Bar / Cocktails",
          "Place Cards",
          "Table Numbers",
          "Favor Tags",
          "Welcome Signage",
          "Seating Chart",
          "LED Wall Layout",
        ],
      },
      { label: "The Post Wedding", items: ["Thank You Card"] },
    ],
    artwork: [
      "Couple's Logo / Monogram",
      "14 Custom Illustrations — integrated across the Pre Wedding, Wedding Day, and Post Wedding.",
    ],
  },
];

const ADDITIONS = [
  {
    title: "Save the Dates",
    copy: "Create anticipation before the celebration begins.",
    img: "/services/stationery/add-save-the-date.jpg",
  },
  {
    title: "Welcome Signage",
    copy: "A first impression worth remembering.",
    img: "/services/stationery/add-welcome-signage.jpg",
  },
  {
    title: "Menus & Day-of Details",
    copy: "Thoughtful touches that complete the experience.",
    img: "/services/stationery/add-menus.jpg",
  },
];

const TABS = [...SUITES.map((s) => s.tab), "Additions"];

function SuitePanel({ suite }: { suite: Suite }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [extend, setExtend] = useState(false);

  return (
    <div>
      <div className="text-center">
        <p className="eyebrow">The {suite.tab} Suite</p>
        <h3
          className="mt-2 font-display font-semibold tracking-[-0.01em] text-[var(--ink)]"
          style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.4rem)" }}
        >
          {suite.tagline}
        </h3>
      </div>

      <div className="mt-10 rounded-3xl bg-white p-6 shadow-[0_30px_70px_-36px_rgba(0,7,39,0.24)] md:p-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-display text-xl font-semibold italic text-[var(--ink)]">
              {suite.headline}
            </p>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">
              Includes
            </p>
            <ul className="mt-3 space-y-2.5">
              {suite.includes.map((it) => (
                <li key={it} className="flex items-start gap-3 text-[var(--ink)]">
                  <i className="ri-checkbox-circle-line mt-0.5 text-[var(--acc-blue)]" />
                  {it}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="btn btn-primary"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
              >
                {open ? "Hide Details" : "Learn More"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate("/enquire#start")}
              >
                Book Now
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-[var(--paper)]">
            <img
              src={suite.img}
              alt={`${suite.tab} suite stationery`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {open && (
          <div className="mt-10 border-t border-[var(--line)] pt-8">
            <p className="font-display text-lg font-semibold text-[var(--ink)]">
              {suite.summary}
            </p>
            <p className="mt-2 text-[var(--slate)]">{suite.sub}</p>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div className="space-y-6">
                {suite.groups.map((g) => (
                  <div key={g.label}>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
                      {g.label}
                    </p>
                    <p className="mt-2 text-sm text-[var(--slate)]">
                      {g.items.join(", ")}
                    </p>
                  </div>
                ))}
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
                    The Artwork
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--slate)]">
                    {suite.artwork.map((a) => (
                      <li key={a}>• {a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ink)]">
                  Investment
                </p>
                <div className="mt-3 flex items-center gap-3 rounded-full bg-[var(--paper)] p-1.5 pl-4">
                  <span className="text-sm text-[var(--slate)]">
                    Starts at{" "}
                    <span className="font-semibold text-[var(--ink)]">{suite.price}</span>
                  </span>
                  <button
                    className="ml-auto rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] text-white"
                    onClick={() => navigate("/enquire#start")}
                  >
                    Book Now
                  </button>
                </div>

                <p className="mt-6 text-sm font-semibold text-[var(--ink)]">Notes</p>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--slate)]">
                  {SHARED_NOTES.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-[var(--paper)] p-5">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExtend((v) => !v)}
                aria-expanded={extend}
              >
                <span className="font-semibold text-[var(--ink)]">
                  Want to extend your suite?
                </span>
                <i
                  className={`ri-arrow-down-s-line text-xl text-[var(--slate)] transition-transform ${
                    extend ? "rotate-180" : ""
                  }`}
                />
              </button>
              {extend && (
                <p className="mt-3 text-sm text-[var(--slate)]">{EXTEND_COPY}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdditionsPanel() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="text-center">
        <p className="eyebrow">Additions</p>
        <h3
          className="mt-2 font-display font-semibold tracking-[-0.01em] text-[var(--ink)]"
          style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.4rem)" }}
        >
          Beyond invitations.
        </h3>
      </div>

      <div className="mt-10 rounded-3xl bg-white p-6 shadow-[0_30px_70px_-36px_rgba(0,7,39,0.24)] md:p-10">
        <p className="mx-auto max-w-2xl text-center font-display text-lg font-semibold italic text-[var(--ink)]">
          Additional stationery, designed to extend your invitation suite with the
          same thoughtful detail and timeless aesthetic.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ADDITIONS.map((a) => (
            <div key={a.title} className="overflow-hidden rounded-2xl bg-[var(--paper)]">
              <img
                src={a.img}
                alt={a.title}
                className="h-52 w-full object-cover object-top"
              />
              <div className="p-5">
                <p className="font-semibold text-[var(--ink)]">{a.title}</p>
                <p className="mt-1 text-sm text-[var(--slate)]">{a.copy}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--slate)]">and more…</p>

        <div className="mt-8 text-center">
          <button className="btn btn-primary" onClick={() => navigate("/collections")}>
            See All Stationery
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExploreSuites() {
  const [tab, setTab] = useState(TABS[0]);
  const active = SUITES.find((s) => s.tab === tab);

  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Explore the Suites
        </Reveal>

        <div className="mt-10 flex justify-center">
          <div className="flex flex-wrap justify-center gap-1 rounded-full bg-white p-1.5 shadow-[0_10px_30px_-18px_rgba(0,7,39,0.3)]">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  tab === t
                    ? "bg-[var(--ink)] text-white"
                    : "text-[var(--slate)] hover:text-[var(--ink)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14">
          {active ? <SuitePanel key={active.id} suite={active} /> : <AdditionsPanel />}
        </div>
      </div>
    </section>
  );
}
