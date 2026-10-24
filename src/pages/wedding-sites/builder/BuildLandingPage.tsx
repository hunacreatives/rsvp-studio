import { useEffect, useMemo, useRef, useState } from "react";
import ServiceCta from "@/components/ServiceCta";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { claimSignupRef, rememberSignupRef } from "@/lib/signupRef";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import AuthModal from "@/pages/home/components/AuthModal";
import CreateEventModal from "@/pages/account/components/CreateEventModal";
import { FAQ_CATEGORIES } from "@/pages/faqs/faq-data";
import { inquiryLink } from "@/pages/enquire/prefill";
import { useTemplateCatalog } from "../engine/catalog";
import { getTemplateDefinition, templateFitsEvent, type TemplateDefinition } from "../engine/registry";
import TemplateMockupPreview from "./components/TemplateMockupPreview";
import { trackEvent } from "@/lib/analytics";

// /build — "Build your website", the DIY front door. Designs first: a short hero with
// every template right under it (live previews, Free/Premium), how it works, Free vs
// Premium, a few FAQs, Mesa in one line, and "rather we make it?". Anyone can browse and
// preview; sign-up is asked for only when they pick a design (?start=<templateId>
// carries the choice through sign-up into the builder).

type Tier = "all" | "free" | "premium";

/** The events a visitor can narrow the designs to (templates.event_types), with the words people
 *  actually search for ("tinghon", "binyag", "18th"). Only the ones some design is for are shown. */
const EVENTS: { id: string; label: string; words: string[] }[] = [
  { id: "wedding", label: "Wedding", words: ["wedding", "kasal", "bride", "groom", "civil"] },
  { id: "engagement", label: "Ting Hun", words: ["engagement", "tinghun", "tinghon", "ting hun", "tinghoon", "chinese", "betrothal", "訂婚", "proposal", "pamamanhikan"] },
  { id: "birthday", label: "Birthday", words: ["birthday", "bday", "party", "turning"] },
  { id: "debut", label: "Debut", words: ["debut", "18th", "eighteenth", "18 roses", "cotillion"] },
  { id: "baby", label: "Christening & 1st birthday", words: ["christening", "binyag", "baptism", "baby", "first birthday", "1st birthday", "dedication"] },
  { id: "anniversary", label: "Anniversary", words: ["anniversary", "renewal of vows", "vow renewal"] },
];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

function usePrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase
      .from("site_prices")
      .select("tier, amount")
      .then(({ data }) => setPrices(Object.fromEntries((data ?? []).map((r) => [r.tier as string, Number(r.amount)]))));
  }, []);
  return prices;
}

// One tap per design: the card opens its full preview, where "Use this design" lives
// (no button on every card, so the grid stays about the designs).
function DesignCard({ t, price }: { t: TemplateDefinition; price: number | undefined }) {
  return (
    <li>
      <Link to={`/build/preview/${t.id}`} className="group block" aria-label={`Preview ${t.label}`}>
        <span className="relative block overflow-hidden rounded-[14px] border border-[var(--line)] bg-white shadow-[0_1px_3px_rgba(0,7,39,0.06)] transition-shadow group-hover:shadow-[0_18px_40px_-24px_rgba(0,7,39,0.35)] sm:rounded-[22px]" style={{ aspectRatio: "4 / 3" }}>
          <TemplateMockupPreview template={t} />
          <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[12px] ${t.tier === "premium" ? "bg-[var(--acc-yellow)] text-[var(--ink)]" : "bg-white text-[var(--ink)]"}`}>
            {t.tier === "premium" ? "Premium" : "Free"}
          </span>
          <span className="absolute inset-0 hidden items-center justify-center bg-[rgba(0,7,39,0.45)] opacity-0 transition-opacity group-hover:opacity-100 md:flex">
            <span className="rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-[var(--ink)]">Preview →</span>
          </span>
        </span>
        {/* Phones: name over price (two designs per row); wider: side by side. */}
        <span className="mt-2 flex flex-col sm:mt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <span className="font-display text-[15px] font-semibold leading-snug text-[var(--ink)] group-hover:underline sm:text-[1.2rem]">{t.label}</span>
          <span className="shrink-0 text-[13px] text-[var(--slate)] sm:text-[14px]">{t.tier === "premium" ? (price ? peso(price) : "Premium") : "Free"}</span>
        </span>
      </Link>
    </li>
  );
}

export default function BuildLandingPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);
  const [creating, setCreating] = useState<{ templateId?: string } | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [tier, setTier] = useState<Tier>("all");
  // ?event=engagement (e.g. from a Ting Hun page) opens on those designs.
  const [eventType, setEventType] = useState<string>(() => {
    const q = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("event");
    return EVENTS.some((e) => e.id === q) ? q! : "all";
  });
  const [query, setQuery] = useState("");
  const pendingStart = useRef<string | null>(null);
  const { templates, ready } = useTemplateCatalog();
  const prices = usePrices();

  useEffect(() => {
    // Arrived from a free site's "Make your own" link: remember which one.
    rememberSignupRef(window.location.search);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(Boolean(session));
      if (!session) return;
      claimSignupRef();
      const [own, member] = await Promise.all([
        supabase.from("events").select("id").eq("owner_id", session.user.id),
        supabase.from("event_members").select("events(id)").eq("profile_id", session.user.id),
      ]);
      setEventCount((own.data ?? []).length + (member.data ?? []).filter((r) => r.events).length);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        claimSignupRef();
        setSignedIn(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // "Use this design" / "Start free": sign up first if needed, then make the event
  // (the builder opens with the chosen design).
  const start = (templateId?: string) => {
    trackEvent("start_building", { template: templateId ?? "none" });
    if (signedIn === false) {
      pendingStart.current = templateId ?? "";
      setAuthOpen(true);
      return;
    }
    setCreating({ templateId });
  };
  // ?start=<id> (from a design preview, or back from signing up).
  useEffect(() => {
    if (signedIn === null || !params.has("start")) return;
    const id = params.get("start") || undefined;
    const next = new URLSearchParams(params);
    next.delete("start");
    setParams(next, { replace: true });
    start(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);
  // Signed up in the modal on this page: carry on with what they picked.
  useEffect(() => {
    if (signedIn && pendingStart.current !== null) {
      const id = pendingStart.current || undefined;
      pendingStart.current = null;
      setAuthOpen(false);
      setCreating({ templateId: id });
    }
  }, [signedIn]);

  // The events that have at least one design (no empty chips).
  const eventChips = useMemo(() => EVENTS.filter((e) => templates.some((t) => (t.occasions ?? []).includes(e.id))), [templates]);
  const shown = useMemo(() => {
    const q = norm(query);
    return templates.filter((t) => {
      if (tier !== "all" && t.tier !== tier) return false;
      if (eventType !== "all" && !templateFitsEvent(t, eventType)) return false;
      if (!q) return true;
      // A name ("porcelain"), an event ("tinghon" → engagement), or Free / Premium.
      const events = EVENTS.filter((e) => (t.occasions ?? []).includes(e.id));
      const hay = [t.label, t.tier, ...events.flatMap((e) => [e.label, ...e.words])].map(norm).join(" | ");
      return q.split(" ").every((w) => hay.includes(w));
    });
  }, [templates, tier, eventType, query]);
  // Nine at a time (three rows of three; eight on two-across phones, so no card sits alone),
  // the rest in a drawer that slides open underneath.
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const first = wide ? 9 : 8;
  const [drawer, setDrawer] = useState(false);
  useEffect(() => setDrawer(false), [tier, eventType, query]);
  // While filtering or searching, show every match (no drawer).
  const filtering = eventType !== "all" || !!query.trim();
  const firstShown = filtering ? shown.length : first;
  const drawerRef = useRef<HTMLDivElement>(null);
  const premiumPrice = prices.premium;
  const faqs = (FAQ_CATEGORIES.find((c) => c.slug === "build")?.items ?? []).slice(0, 5);
  const hasPremium = templates.some((t) => t.tier === "premium");

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />

      {/* Hero: the designs ARE the hero, so it's clear from the first screen that you pick a
          template. A soft warm wash behind the words and the first row of designs. */}
      <section className="pb-12 pt-10 sm:pb-16 sm:pt-14 md:pb-24 md:pt-16" style={{ background: "linear-gradient(180deg, #fff1cc 0%, #fff8e6 340px, var(--warm-white) 640px)" }}>
        <div className="container-x">
          <div className="text-center">
            <p className="eyebrow">Build your website</p>
            <h1 className="mx-auto mt-4 max-w-3xl font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] text-balance" style={{ fontSize: "clamp(2.1rem, 5vw, 3.4rem)" }}>
              Your event website, ready tonight.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--slate)] text-balance md:text-[18px]">
              Pick one of our designs, add your details and photos, and share one link. Guests RSVP right on the site. Free to start.
            </p>
            <div className="mt-7">
              {signedIn ? (
                <button onClick={() => start()} className="btn btn-primary w-full max-w-[280px] sm:w-auto">
                  Create a new event
                </button>
              ) : (
                <button onClick={() => start()} className="btn btn-primary w-full max-w-[280px] sm:w-auto" disabled={signedIn === null}>
                  Start free
                </button>
              )}
            </div>
            {signedIn && eventCount > 0 ? (
              <p className="mt-4 text-[14px] text-[var(--slate)]">
                Already started one?{" "}
                <Link to="/account/projects" className="font-medium text-[var(--ink)] underline underline-offset-4">
                  Continue your draft
                </Link>
              </p>
            ) : null}
          </div>

          <div id="designs" className="scroll-mt-24 pt-10 sm:pt-14">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold text-[var(--ink)]">Choose a design</h2>
              <label className="relative order-3 w-full sm:order-none sm:ml-auto sm:w-[260px]">
                <span className="sr-only">Search designs</span>
                <i className="ri-search-line pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--slate)]" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search, e.g. ting hun, debut"
                  className="min-h-[44px] w-full rounded-full border border-[var(--line)] bg-white pl-10 pr-4 text-[16px] text-[var(--ink)] outline-none focus:border-[var(--ink)] md:min-h-[38px] md:text-[14px]"
                />
              </label>
              {hasPremium ? (
                <div role="group" aria-label="Filter designs" className="flex gap-2">
                  {(["all", "free", "premium"] as Tier[]).map((x) => (
                    <button
                      key={x}
                      aria-pressed={tier === x}
                      onClick={() => setTier(x)}
                      className={`min-h-[44px] rounded-full border px-4 text-[14px] font-medium md:min-h-[38px] ${tier === x ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)]"}`}
                    >
                      {x === "all" ? "All" : x === "free" ? "Free" : "Premium"}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {/* The kind of event: one row of chips (scrolls sideways on phones). */}
            {eventChips.length > 1 ? (
              <div role="group" aria-label="Filter by event" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mb-6 sm:flex-wrap sm:overflow-visible sm:px-0">
                {[{ id: "all", label: "All events" }, ...eventChips].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={eventType === e.id}
                    onClick={() => setEventType(e.id)}
                    className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full border px-4 text-[14px] font-medium md:min-h-[34px] md:text-[13px] ${eventType === e.id ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]"}`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            ) : null}
            {ready && !shown.length ? (
              <div className="rounded-[22px] bg-[var(--paper)] px-6 py-12 text-center">
                <p className="text-[16px] font-medium text-[var(--ink)]">No designs match{query.trim() ? ` “${query.trim()}”` : ""}.</p>
                <button type="button" onClick={() => (setQuery(""), setEventType("all"), setTier("all"))} className="mt-3 text-[14px] font-medium text-[var(--acc-blue)] underline underline-offset-4">
                  Show all designs
                </button>
              </div>
            ) : !ready && !templates.length ? (
              // The same grid and card height as the real cards (image, then name and price), and
              // enough of them to fill the screen, so nothing jumps when the designs arrive.
              <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3" aria-hidden>
                {Array.from({ length: 9 }, (_, i) => (
                  <li key={i}>
                    <span className="block aspect-[4/3] animate-pulse rounded-[14px] bg-[var(--paper)] sm:rounded-[22px]" />
                    <span className="invisible mt-2 flex flex-col sm:mt-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                      <span className="font-display text-[15px] font-semibold leading-snug sm:text-[1.2rem]">Design</span>
                      <span className="text-[13px] sm:text-[14px]">Free</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
                  {shown.slice(0, firstShown).map((t) => (
                    <DesignCard key={t.id} t={t} price={prices[t.tier]} />
                  ))}
                </ul>
                {shown.length > firstShown ? (
                  <>
                    {/* The drawer: the rest of the designs, sliding open (grid rows 0fr → 1fr). */}
                    <div
                      ref={drawerRef}
                      className="grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none"
                      style={{ gridTemplateRows: drawer ? "1fr" : "0fr", opacity: drawer ? 1 : 0 }}
                      aria-hidden={!drawer}
                      inert={!drawer}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 pt-6 sm:gap-x-6 sm:gap-y-10 sm:pt-10 lg:grid-cols-3">
                          {shown.slice(firstShown).map((t) => (
                            <DesignCard key={t.id} t={t} price={prices[t.tier]} />
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-8 text-center sm:mt-10">
                      <button
                        type="button"
                        aria-expanded={drawer}
                        onClick={() => {
                          if (drawer) document.getElementById("designs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          setDrawer((d) => !d);
                        }}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[var(--ink)] bg-white px-6 text-[15px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white"
                      >
                        {drawer ? "Show fewer" : `See all ${shown.length} designs`}
                        <i className={`ri-arrow-down-s-line text-[18px] transition-transform duration-300 ${drawer ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            )}
            <p className="mt-6 text-[14px] text-[var(--slate)]">Switch designs anytime. Your details and photos carry over.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--line)] py-12 sm:py-16 md:py-24">
        <div className="container-x">
          <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">How it works</h2>
          <ol className="mx-auto mt-8 grid max-w-5xl gap-6 sm:mt-10 sm:gap-8 md:grid-cols-3">
            {[
              { icon: "ri-palette-line", title: "Pick a design", text: "Preview any design with sample details, then make it yours." },
              { icon: "ri-image-add-line", title: "Add your details", text: "Names, date, venue, schedule and photos — from your phone or laptop." },
              { icon: "ri-share-forward-line", title: "Share one link", text: "Send it by Messenger or text. Guests RSVP on the site; you see every reply." },
            ].map((s, i) => (
              // Phones: icon beside the text, so the three steps take a third of the height.
              <li key={s.title} className="flex items-start gap-4 text-left md:block md:text-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-[21px] text-[var(--ink)] md:mx-auto md:h-14 md:w-14 md:text-[24px]">
                  <i className={s.icon} aria-hidden />
                </span>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)] md:mt-4 md:text-[13px]">Step {i + 1}</p>
                  <p className="mt-0.5 font-display text-[1.15rem] font-semibold text-[var(--ink)] md:mt-1 md:text-[1.3rem]">{s.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--slate)] md:mx-auto md:mt-2 md:max-w-[30ch] md:text-[15px]">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Free vs Premium */}
      <section className="container-x py-12 sm:py-16 md:py-24">
        <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">Free, or Premium</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[15px] text-[var(--slate)]">Every site gets RSVPs and a guest list. Premium adds the extras, once per event.</p>
        <div className="mx-auto mt-8 max-w-3xl">
          {/* Fits a phone without scrolling sideways, so Premium is never hidden off-screen. */}
          <table className="w-full text-[13px] sm:text-[14px] md:text-[15px]">
            <thead>
              <tr className="text-left">
                <th className="pb-3 font-normal text-[var(--slate)]" />
                <th className="w-[19%] pb-3 text-center align-bottom font-display text-[1rem] font-semibold text-[var(--ink)] sm:w-[26%] sm:text-[1.05rem] md:w-[24%] md:text-[1.15rem]">Free</th>
                <th className="w-[27%] rounded-t-2xl bg-[#fff4cf] px-1 pb-3 pt-3 text-center align-bottom font-display text-[1rem] font-semibold text-[var(--ink)] sm:w-[30%] sm:text-[1.05rem] md:w-[28%] md:text-[1.15rem]">
                  <span className="mb-1.5 inline-block rounded-full bg-[var(--acc-yellow)] px-2.5 py-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink)]">Recommended</span>
                  <span className="block">Premium</span>
                  {premiumPrice ? <span className="block font-sans text-[12px] font-normal leading-snug text-[var(--slate)] md:text-[13px]">{peso(premiumPrice)} per event <span className="block md:inline">({peso(Math.floor(premiumPrice * 0.9))} for your first)</span></span> : null}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {[
                ["RSVPs and a guest list you can download", true, true],
                ["Looks great on phones", true, true],
                ["Cash gifts with your GCash or bank QR", true, true],
                ["Your RSVPs by email", "Daily summary", "Every reply, instantly"],
                ["Password protection, RSVP deadline and invite list", true, true],
                ["Guest confirmations sent in your names", false, true],
                ["A reminder to guests 2 days before", false, true],
                ["Guests share their photos", false, true],
                ["Premium designs", false, true],
                ["Online after your event", "30 days", "1 year"],
              ].map(([label, free, prem], row, all) => (
                <tr key={String(label)}>
                  <td className="py-2.5 pr-2 leading-snug text-[var(--ink)] sm:py-3 sm:pr-3">{label}</td>
                  {[free, prem].map((v, i) => (
                    <td key={i} className={`px-1 py-2.5 text-center text-[12px] leading-snug text-[var(--slate)] sm:py-3 sm:text-[inherit] ${i === 1 ? `bg-[#fff4cf] ${row === all.length - 1 ? "rounded-b-2xl" : ""}` : ""}`}>
                      {v === true ? <i className="ri-check-line text-[20px] text-[#3d7a12]" aria-label="Included" /> : v === false ? <span aria-label="Not included">—</span> : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-center text-[14px] text-[var(--slate)]">Want your own web address, like yournames.com? Add one when you publish.</p>
        </div>
      </section>

      {/* Questions */}
      {faqs.length ? (
        <section className="container-x py-12 sm:py-16 md:py-24">
          <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">Questions</h2>
          <div className="mx-auto mt-8 max-w-2xl divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {faqs.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-medium text-[var(--ink)]">
                  {f.q}
                  <i className="ri-add-line text-[20px] text-[var(--slate)] transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="pb-5 text-[15px] leading-relaxed text-[var(--slate)]">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-[14px] text-[var(--slate)]">
            More in the <Link to="/faqs#build" className="font-medium text-[var(--ink)] underline underline-offset-4">FAQ</Link>
          </p>
        </section>
      ) : null}

      {/* Mesa, our free seating chart maker: the next thing hosts need, in one line. */}
      <p className="container-x pb-10 text-center text-[15px] text-[var(--slate)] sm:pb-14">
        Seating everyone next? <Link to="/tools/seating-chart-maker" className="font-medium text-[var(--ink)] underline underline-offset-4">Mesa</Link>, our free seating chart maker, seats every family at the right table.
      </p>

      {/* Rather we make it? */}
      <section className="container-x pb-14 sm:pb-20 md:pb-28">
        <ServiceCta
          heading="Rather we make it for you?"
          line="Our designers build a website just for your event. Custom websites from ₱8,000."
          quote={() => navigate(inquiryLink({ service: "website", design: "custom" }))}
        />
      </section>

      <FooterSection />

      {/* The pending choice survives the modal closing itself after a sign-in. */}
      {authOpen ? <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" next="/build" /> : null}
      {creating ? <CreateEventModal templateId={creating.templateId} onClose={() => setCreating(null)} /> : null}
    </div>
  );
}
