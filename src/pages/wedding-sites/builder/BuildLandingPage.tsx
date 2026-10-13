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
        <span className="relative block overflow-hidden rounded-[22px] border border-[var(--line)] bg-white shadow-[0_1px_3px_rgba(0,7,39,0.06)] transition-shadow group-hover:shadow-[0_18px_40px_-24px_rgba(0,7,39,0.35)]" style={{ aspectRatio: "4 / 3" }}>
          <TemplateMockupPreview template={t} />
          <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[12px] font-semibold ${t.tier === "premium" ? "bg-[var(--acc-yellow)] text-[var(--ink)]" : "bg-white text-[var(--ink)]"}`}>
            {t.tier === "premium" ? "Premium" : "Free"}
          </span>
          <span className="absolute inset-0 hidden items-center justify-center bg-[rgba(0,7,39,0.45)] opacity-0 transition-opacity group-hover:opacity-100 md:flex">
            <span className="rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-[var(--ink)]">Preview →</span>
          </span>
        </span>
        <span className="mt-3 flex items-baseline justify-between gap-3">
          <span className="font-display text-[1.2rem] font-semibold text-[var(--ink)] group-hover:underline">{t.label}</span>
          <span className="shrink-0 text-[14px] text-[var(--slate)]">{t.tier === "premium" ? (price ? peso(price) : "Premium") : "Free"}</span>
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
      className="mx-auto block w-full max-w-[300px] rounded-[38px] bg-[#161616] p-[9px] shadow-[0_30px_60px_-30px_rgba(0,7,39,0.5)]"
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
      <section className="pb-12 pt-14 text-center md:pb-16 md:pt-20" style={{ background: "linear-gradient(180deg, #fff1cc 0%, #fff8e6 55%, var(--warm-white) 100%)" }}>
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
        <CharacterTrio className="mx-auto mt-10 w-[180px] md:w-[220px]" />
        </div>
      </section>

      {/* The designs */}
      <section id="designs" className="container-x scroll-mt-24 pb-16 md:pb-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
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
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="aspect-[4/3] animate-pulse rounded-[22px] bg-[var(--paper)]" />
            ))}
          </ul>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((t) => (
              <DesignCard key={t.id} t={t} price={prices[t.tier]} />
            ))}
          </ul>
        )}
        <p className="mt-6 text-[14px] text-[var(--slate)]">Tap a design to see it in full. Switch anytime — your details and photos carry over.</p>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24" style={{ background: "#e9f6fb" }}>
        <div className="container-x">
          <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">How it works</h2>
          <ol className="mx-auto mt-10 grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { icon: "ri-palette-line", bg: "var(--acc-yellow)", ink: "var(--ink)", title: "Pick a design", text: "Preview any design with sample details, then make it yours." },
              { icon: "ri-image-add-line", bg: "var(--acc-coral)", ink: "#fff", title: "Add your details", text: "Names, date, venue, schedule and photos — from your phone or laptop." },
              { icon: "ri-share-forward-line", bg: "var(--acc-green)", ink: "#fff", title: "Share one link", text: "Send it by Messenger or text. Guests RSVP on the site; you see every reply." },
            ].map((s, i) => (
              <li key={s.title} className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full text-[24px]" style={{ background: s.bg, color: s.ink }}>
                  <i className={s.icon} aria-hidden />
                </span>
                <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">Step {i + 1}</p>
                <p className="mt-1 font-display text-[1.3rem] font-semibold text-[var(--ink)]">{s.title}</p>
                <p className="mx-auto mt-2 max-w-[30ch] text-[15px] leading-relaxed text-[var(--slate)]">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Free vs Premium */}
      <section className="container-x py-16 md:py-24">
        <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">Free, or Premium</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[15px] text-[var(--slate)]">Every site gets RSVPs and a guest list. Premium adds the extras, once per event.</p>
        <div className="mx-auto mt-8 max-w-3xl">
          {/* Fits a phone without scrolling sideways, so Premium is never hidden off-screen. */}
          <table className="w-full text-[14px] md:text-[15px]">
            <thead>
              <tr className="text-left">
                <th className="pb-3 font-normal text-[var(--slate)]" />
                <th className="w-[26%] pb-3 text-center align-bottom font-display text-[1.05rem] font-semibold text-[var(--ink)] md:w-[24%] md:text-[1.15rem]">Free</th>
                <th className="w-[30%] rounded-t-2xl bg-[#fff4cf] px-1 pb-3 pt-3 text-center align-bottom font-display text-[1.05rem] font-semibold text-[var(--ink)] md:w-[28%] md:text-[1.15rem]">
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
                  <td className="py-3 pr-3 text-[var(--ink)]">{label}</td>
                  {[free, prem].map((v, i) => (
                    <td key={i} className={`px-1 py-3 text-center leading-snug text-[var(--slate)] ${i === 1 ? `bg-[#fff4cf] ${row === all.length - 1 ? "rounded-b-2xl" : ""}` : ""}`}>
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

      {/* A real one: a soft pink that picks up the Cinematic design. */}
      <section className="py-16 md:py-24" style={{ background: "#fcecf2" }}>
        <div className="container-x grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <PhoneDemo templateId="cinematic" />
          <div>
            <p className="eyebrow">What guests see</p>
            <h2 className="mt-3 font-display text-[1.8rem] font-semibold leading-tight text-[var(--ink)] md:text-[2.2rem] text-balance">One link, opened on a phone</h2>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-[var(--slate)]">
              This is Cinematic with sample details. Photos, the date and venue, a dress code, and an RSVP card guests fill in right there. Gel’s 30th started as this exact design.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => start("cinematic")} className="btn btn-primary">Use Cinematic</button>
              <Link to="/build/preview/cinematic" className="btn btn-ghost">Preview it</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Questions */}
      {faqs.length ? (
        <section className="container-x py-16 md:py-24">
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
      <section className="container-x pb-20 md:pb-28">
        <div className="rounded-[28px] bg-[var(--acc-blue)] px-6 py-14 text-center md:py-20">
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
