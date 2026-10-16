import { useEffect, useMemo, useRef, useState } from "react";
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
import { getTemplateDefinition, type TemplateDefinition } from "../engine/registry";
import TemplateMockupPreview from "./components/TemplateMockupPreview";
import { CharacterTrio } from "@/components/CharacterLoader";
import SeatingArt from "@/pages/home/components/SeatingArt";
import { trackEvent } from "@/lib/analytics";

// /build — "Build your website", the DIY front door. Designs first: a short hero,
// then every template (live previews, Free/Premium), how it works, Free vs Premium,
// a real example, a few FAQs, and "rather we make it?". Anyone can browse and
// preview; sign-up is asked for only when they pick a design (?start=<templateId>
// carries the choice through sign-up into the builder).

type Tier = "all" | "free" | "premium";
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

// A design's real phone layout (templates size themselves to their container, so
// laying it out 390px wide gives the phone version), scaled into a phone shell.
const PHONE_W = 390;
const PHONE_H = 760;
function PhoneDemo({ templateId }: { templateId: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);
  const t = getTemplateDefinition(templateId);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setScale(box.clientWidth / PHONE_W));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);
  if (!t?.demoContent) return null;
  const Template = t.component;
  return (
    <Link
      to={`/build/preview/${templateId}`}
      aria-label={`Preview ${t.label}`}
      className="mx-auto block w-full max-w-[210px] rounded-[32px] bg-[#161616] p-[8px] shadow-[0_30px_60px_-30px_rgba(0,7,39,0.5)] sm:max-w-[300px] sm:rounded-[38px] sm:p-[9px]"
    >
      <div ref={boxRef} className="relative overflow-hidden rounded-[30px] bg-white" style={{ height: scale ? PHONE_H * scale : undefined, aspectRatio: scale ? undefined : `${PHONE_W} / ${PHONE_H}` }}>
        {scale ? (
          <div aria-hidden style={{ width: PHONE_W, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", inset: "0 auto auto 0", pointerEvents: "none" }}>
            <Template content={t.demoContent} settings={t.defaultSettings} />
          </div>
        ) : null}
      </div>
    </Link>
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

  const shown = useMemo(() => templates.filter((t) => tier === "all" || t.tier === tier), [templates, tier]);
  const premiumPrice = prices.premium;
  const faqs = (FAQ_CATEGORIES.find((c) => c.slug === "build")?.items ?? []).slice(0, 5);
  const hasPremium = templates.some((t) => t.tier === "premium");

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />

      {/* Hero: a soft warm wash and our three characters. */}
      <section className="pb-8 pt-10 text-center sm:pb-12 sm:pt-14 md:pb-16 md:pt-20" style={{ background: "linear-gradient(180deg, #fff1cc 0%, #fff8e6 55%, var(--warm-white) 100%)" }}>
        <div className="container-x">
        <p className="eyebrow">Build your website</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] text-balance" style={{ fontSize: "clamp(2.1rem, 5vw, 3.4rem)" }}>
          Your event website, ready tonight.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--slate)] text-balance md:text-[18px]">
          Pick a design, add your details and photos, and share one link. Guests RSVP right on the site. Free to start.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-x-6 gap-y-2 sm:flex-row">
          {signedIn ? (
            <button onClick={() => start()} className="btn btn-primary w-full max-w-[280px] sm:w-auto">
              Create a new event
            </button>
          ) : (
            <button onClick={() => start()} className="btn btn-primary w-full max-w-[280px] sm:w-auto" disabled={signedIn === null}>
              Start free
            </button>
          )}
          <a href="#designs" className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]">
            <span className="underline-offset-[5px] group-hover:underline">See the designs</span>
            <i className="ri-arrow-down-line" aria-hidden />
          </a>
        </div>
        {signedIn && eventCount > 0 ? (
          <p className="mt-4 text-[14px] text-[var(--slate)]">
            Already started one?{" "}
            <Link to="/account/projects" className="font-medium text-[var(--ink)] underline underline-offset-4">
              Continue your draft
            </Link>
          </p>
        ) : null}
        <CharacterTrio className="mx-auto mt-7 w-[150px] sm:mt-10 sm:w-[180px] md:w-[220px]" />
        </div>
      </section>

      {/* The designs */}
      <section id="designs" className="container-x scroll-mt-24 pb-12 sm:pb-16 md:pb-24">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">Choose a design</h2>
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
        {!ready && !templates.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="aspect-[4/3] animate-pulse rounded-[14px] bg-[var(--paper)] sm:rounded-[22px]" />
            ))}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
            {shown.map((t) => (
              <DesignCard key={t.id} t={t} price={prices[t.tier]} />
            ))}
          </ul>
        )}
        <p className="mt-6 text-[14px] text-[var(--slate)]">Tap a design to see it in full. Switch anytime — your details and photos carry over.</p>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 md:py-24" style={{ background: "#e9f6fb" }}>
        <div className="container-x">
          <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">How it works</h2>
          <ol className="mx-auto mt-8 grid max-w-5xl gap-6 sm:mt-10 sm:gap-8 md:grid-cols-3">
            {[
              { icon: "ri-palette-line", bg: "var(--acc-yellow)", ink: "var(--ink)", title: "Pick a design", text: "Preview any design with sample details, then make it yours." },
              { icon: "ri-image-add-line", bg: "var(--acc-coral)", ink: "#fff", title: "Add your details", text: "Names, date, venue, schedule and photos — from your phone or laptop." },
              { icon: "ri-share-forward-line", bg: "var(--acc-green)", ink: "#fff", title: "Share one link", text: "Send it by Messenger or text. Guests RSVP on the site; you see every reply." },
            ].map((s, i) => (
              // Phones: icon beside the text, so the three steps take a third of the height.
              <li key={s.title} className="flex items-start gap-4 text-left md:block md:text-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[21px] md:mx-auto md:h-14 md:w-14 md:text-[24px]" style={{ background: s.bg, color: s.ink }}>
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

      {/* A real one: a soft pink that picks up the Cinematic design.
          Phones: centred, words → phone → buttons. Desktop: phone left, words and buttons right. */}
      <section className="py-12 sm:py-16 md:py-24" style={{ background: "#fcecf2" }}>
        <div className="container-x grid items-center gap-y-7 [grid-template-areas:'text'_'visual'_'actions'] md:grid-cols-2 md:gap-x-14 md:gap-y-6 md:[grid-template-areas:'visual_text'_'visual_actions']">
          <div className="[grid-area:visual]">
            <PhoneDemo templateId="cinematic" />
          </div>
          <div className="text-center [grid-area:text] md:self-end md:text-left">
            <p className="eyebrow">What guests see</p>
            <h2 className="mt-3 font-display text-[1.8rem] font-semibold leading-tight text-[var(--ink)] md:text-[2.2rem] text-balance">One link, opened on a phone</h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--slate)] sm:text-[16px] md:mx-0" style={{ textWrap: "pretty" }}>
              This is Cinematic with sample details. Photos, the date and venue, a dress code, and an RSVP card guests fill in right there. Gel’s 30th started as this exact design.
            </p>
          </div>
          <div className="flex justify-center gap-3 [grid-area:actions] md:self-start md:justify-start">
            <button onClick={() => start("cinematic")} className="btn btn-primary">Use Cinematic</button>
            <Link to="/build/preview/cinematic" className="btn btn-ghost">Preview it</Link>
          </div>
        </div>
      </section>

      {/* Mesa, our free seating chart maker: the next thing hosts need after the website.
          Phones: centred, the tables illustration instead of the (unreadably small) editor screenshot. */}
      <section className="py-12 sm:py-16 md:py-24" style={{ background: "#fff6dc" }}>
        <div className="container-x grid items-center gap-y-7 [grid-template-areas:'text'_'visual'_'actions'] md:grid-cols-[0.9fr_1.1fr] md:gap-x-14 md:gap-y-6 md:[grid-template-areas:'text_visual'_'actions_visual']">
          <div className="text-center [grid-area:text] md:self-end md:text-left">
            <p className="eyebrow">Mesa · free seating charts</p>
            <h2 className="mt-3 font-display text-[1.8rem] font-semibold leading-tight text-[var(--ink)] md:text-[2.2rem] text-balance">Then seat everyone with Mesa</h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--slate)] sm:text-[16px] md:mx-0" style={{ textWrap: "pretty" }}>
              Paste your guest list and Mesa seats every family, sponsor and barkada at the right table. Print the plan, or let guests find their table on your website.
            </p>
          </div>
          <Link to="/tools/seating-chart-maker" className="block [grid-area:visual]" aria-label="Open Mesa">
            <SeatingArt className="mx-auto block aspect-[8/7] w-full max-w-[340px] rounded-[20px] md:hidden" />
            <span className="hidden overflow-hidden rounded-[20px] border-[8px] border-[#111] bg-[#111] shadow-[0_40px_80px_-40px_rgba(0,7,39,0.45)] md:block">
              <img src="/tools/mesa/editor-1440.webp" alt="Mesa’s editor with every guest seated" loading="lazy" className="block aspect-[16/10] w-full rounded-[10px] object-cover object-left-top" />
            </span>
          </Link>
          <div className="flex justify-center gap-3 [grid-area:actions] md:self-start md:justify-start">
            <Link to="/tools/seating-chart-maker" className="btn btn-primary">
              Open Mesa
            </Link>
            <Link to="/tools/seating-chart-maker#how" className="btn btn-ghost">
              {/* "See" drops on phones so both buttons fit on one line */}
              <span className="sm:hidden">How it works</span>
              <span className="hidden sm:inline">See how it works</span>
            </Link>
          </div>
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

      {/* Rather we make it? */}
      <section className="container-x pb-14 sm:pb-20 md:pb-28">
        <div className="rounded-[24px] bg-[var(--acc-blue)] px-6 py-11 text-center sm:rounded-[28px] sm:py-14 md:py-20">
          <h2 className="mx-auto max-w-xl font-display font-semibold leading-tight text-white text-balance" style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)" }}>
            Rather we make it for you?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[16px] text-white/85 text-balance">Our designers build a website just for your event. Custom websites from ₱8,000.</p>
          <button onClick={() => navigate(inquiryLink({ service: "website", design: "custom" }))} className="btn btn-white mt-7">
            Get a quote
          </button>
        </div>
      </section>

      <FooterSection />

      {/* The pending choice survives the modal closing itself after a sign-in. */}
      {authOpen ? <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" next="/build" /> : null}
      {creating ? <CreateEventModal templateId={creating.templateId} onClose={() => setCreating(null)} /> : null}
    </div>
  );
}
