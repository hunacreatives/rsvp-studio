import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import { CharacterTrio } from "@/components/CharacterLoader";
import { PARTNER_TIERS } from "@/pages/partners/tiers";
import { DATE_INPUT, Field, Honeypot, INPUT, PillGroup, SectionTitle, SuccessCard } from "./components/form-ui";
import { todayISO } from "./today";
import { HEAR_ABOUT } from "./occasions";
import { submitInquiry } from "./submit";
import { trackEvent } from "@/lib/analytics";

const ROLES = [
  "Wedding Planner", "Event Coordinator", "Venue", "Photographer", "Stylist / Designer", "Other Studio", "Other",
];
const VOLUME = ["Under 10", "10 – 25", "25 – 50", "50+"];
const PLATFORMS = ["Instagram", "TikTok", "Facebook", "YouTube", "Blog / website"];
const FOLLOWERS = ["Under 5K", "5K – 20K", "20K – 100K", "100K+"];
const PERKS = [
  { icon: "ri-coupon-3-line", title: "Your own code", desc: "A code and a short link, like thersvpstudio.com/p/YOURNAME." },
  { icon: "ri-gift-2-line", title: "10% off for them", desc: "Everyone who uses your code gets 10% off their website or package." },
  { icon: "ri-hand-coin-line", title: "10–20% for you", desc: "You earn 10% of what each person you send pays us, rising to 15% and 20% as you send more." },
  { icon: "ri-line-chart-line", title: "Your own dashboard", desc: "See your link visits, sign-ups, bookings and earnings as they happen." },
];
const LOOKING_FOR = [
  "Referral partnership",
  "White-label / on-behalf-of design",
  "Collaboration on a specific event",
  "Preferred-vendor listing",
  "Just introducing ourselves",
];

const HOW_IT_WORKS = [
  { num: "01", title: "Apply", desc: "Tell us about your studio and your clients below. We’ll set up a short call to get to know each other." },
  { num: "02", title: "Get your code", desc: "You get your own referral code and link. Clients use it when they enquire or sign up, and it’s credited to you automatically." },
  { num: "03", title: "Earn up to 20%", desc: "You start at 10% of what each client you send pays us, and move up to 15% and 20% as more of them book. Paid to your GCash or bank once they’ve paid." },
];

type Values = Record<string, string | string[]>;

export default function PartnerInquiry() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  // ?type=creator (from the menu) opens on the creator form.
  const [v, setV] = useState<Values>(() => ({
    looking_for: [],
    partner_type: new URLSearchParams(window.location.search).get("type") === "creator" ? "Creator or influencer" : "Planner or coordinator",
  }));

  const getStr = (k: string) => (v[k] as string) || "";
  const getArr = (k: string) => (v[k] as string[]) || [];
  const set = (k: string, val: string | string[]) => setV((p) => ({ ...p, [k]: val }));

  const specificEvent = getArr("looking_for").includes("Collaboration on a specific event");
  const creator = getStr("partner_type") === "Creator or influencer";
  // The menu's two links (/partners and /partners?type=creator) switch the page's
  // wording and the form, also when you're already here.
  const { search } = useLocation();
  const forCreators = new URLSearchParams(search).get("type") === "creator";
  useEffect(() => {
    setV((p) => ({ ...p, partner_type: forCreators ? "Creator or influencer" : "Planner or coordinator" }));
  }, [forCreators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      await submitInquiry(v, [], { form: "partner-inquiry" });
      setSubmitted(true);
      trackEvent("generate_lead", { form: "partner" });
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>
        <section className="pt-16 md:pt-28 pb-4 text-center" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-3xl">
            <p className="eyebrow">Partner program</p>
            <h1
              className="mt-4 font-display font-semibold tracking-[-0.02em] text-[var(--ink)] text-balance"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {forCreators ? "Share your code. Earn up to 20%." : "Send us your clients. Earn up to 20%."}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[var(--slate)] md:text-[17px]">
              {forCreators
                ? "For creators and influencers who post about weddings, birthdays and celebrations. Your followers get 10% off their event website or package, and you earn 10% to 20% of what they pay us."
                : "For event planners, coordinators and venues. The clients you send get 10% off, and you earn 10% to 20% of what they pay us."}
            </p>
            <p className="mt-4 text-[14px] text-[var(--slate)]">
              {forCreators ? (
                <Link to="/partners" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-[var(--ink)]">Planner or coordinator? See the planner program</Link>
              ) : (
                <Link to="/partners?type=creator" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-[var(--ink)]">Creator or influencer? See the creator program</Link>
              )}
            </p>
            <CharacterTrio className="mx-auto mt-8 w-[200px] md:w-[240px]" />
          </div>
        </section>

        <section className="pb-6 pt-10" style={{ background: "var(--warm-white)" }}>
          <ul className="container-x mx-auto grid max-w-5xl gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p) => (
              <li key={p.title}>
                <i className={`${p.icon} text-[26px] text-[var(--acc-blue)]`} aria-hidden />
                <p className="mt-2 font-semibold text-[var(--ink)]">{p.title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-[var(--slate)] [overflow-wrap:anywhere]">{p.desc}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* The tiers */}
        <section className="pb-4 pt-12" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-5xl">
            <h2 className="text-center font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem]">Earn more as you go</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-[15px] text-[var(--slate)] md:text-[16px]">
              Your clients always get 10% off. Your share grows with every paying client you send, and once you reach a tier, it’s yours to keep.
            </p>
            <ol className="mt-8 grid gap-3 sm:grid-cols-3">
              {PARTNER_TIERS.map((t) => (
                <li key={t.id} className="rounded-[22px] px-6 py-6" style={{ background: t.bg, color: t.ink }}>
                  <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} aria-hidden />
                    {t.name}
                  </p>
                  <p className="mt-2 font-display text-[2.6rem] font-semibold leading-none">{t.rate}%</p>
                  <p className="mt-3 text-[15px]">{t.at ? `After ${t.at} paying clients` : "From your first client"}</p>
                  <p className="mt-1 text-[14px] opacity-80">₱{((20000 * 0.9 * t.rate) / 100).toLocaleString("en-PH")} on a ₱20,000 booking</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="scroll-mt-24 pb-24 pt-12" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-2xl">
            {submitted ? (
              <SuccessCard
                title="Thanks for applying"
                message="We'll be in touch with your code and your partner dashboard."
              />
            ) : (
              <form onSubmit={handleSubmit} className="relative space-y-8">
                <Honeypot value={getStr("website")} onChange={(val) => set("website", val)} />
                <SectionTitle>About you</SectionTitle>

                <PillGroup
                  label="I'm a…"
                  options={["Planner or coordinator", "Creator or influencer", "Venue or other vendor"]}
                  value={getStr("partner_type")}
                  onChange={(val) => set("partner_type", val)}
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Your name" required>
                    <input type="text" value={getStr("your_name")} onChange={(e) => set("your_name", e.target.value)} placeholder="Your name" autoComplete="name" autoCapitalize="words" className={INPUT} required />
                  </Field>
                  {creator ? (
                    <Field label="Your handle" required>
                      <input type="text" value={getStr("instagram")} onChange={(e) => set("instagram", e.target.value)} placeholder="@yourname" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={INPUT} required />
                    </Field>
                  ) : (
                    <Field label="Business / studio name" required>
                      <input type="text" value={getStr("business_name")} onChange={(e) => set("business_name", e.target.value)} placeholder="Studio name" autoComplete="organization" autoCapitalize="words" className={INPUT} required />
                    </Field>
                  )}
                </div>

                {creator ? (
                  <>
                    <PillGroup label="Where you post" options={PLATFORMS} multi value={getArr("platforms")} onChange={(val) => set("platforms", val)} />
                    <PillGroup label="Followers (your biggest account)" options={FOLLOWERS} value={getStr("followers")} onChange={(val) => set("followers", val)} />
                  </>
                ) : (
                  <PillGroup
                    label="Your role"
                    options={ROLES}
                    value={getStr("role")}
                    onChange={(val) => set("role", val)}
                  />
                )}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Email" required>
                    <input type="email" value={getStr("email")} onChange={(e) => set("email", e.target.value)} placeholder="you@studio.com" autoComplete="email" autoCapitalize="none" spellCheck={false} className={INPUT} required />
                  </Field>
                  <Field label="Website (optional)">
                    {/* Not "website": that key is the hidden spam trap, and filling it drops the whole inquiry. */}
                    <input type="text" inputMode="url" value={getStr("website_url")} onChange={(e) => set("website_url", e.target.value)} placeholder="studio.com" autoComplete="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={INPUT} />
                  </Field>
                </div>
                {creator ? (
                  <Field label="Where you're based">
                    <input type="text" value={getStr("regions")} onChange={(e) => set("regions", e.target.value)} placeholder="e.g. Cebu" className={INPUT} />
                  </Field>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="Instagram (optional)">
                        <input type="text" value={getStr("instagram")} onChange={(e) => set("instagram", e.target.value)} placeholder="@studio" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={INPUT} />
                      </Field>
                      <Field label="Based in / regions you serve">
                        <input type="text" value={getStr("regions")} onChange={(e) => set("regions", e.target.value)} placeholder="e.g. Manila, destination weddings" className={INPUT} />
                      </Field>
                    </div>

                    <PillGroup
                      label="Roughly how many events per year?"
                      options={VOLUME}
                      value={getStr("volume")}
                      onChange={(val) => set("volume", val)}
                    />

                    <SectionTitle>What you&apos;re looking for</SectionTitle>

                    <PillGroup
                      label="Select all that apply"
                      options={LOOKING_FOR}
                      multi
                      value={getArr("looking_for")}
                      onChange={(val) => set("looking_for", val)}
                    />
                  </>
                )}

                {specificEvent && (
                  <>
                    <Field label="Event date">
                      <input type="date" min={todayISO()} value={getStr("event_date")} onChange={(e) => set("event_date", e.target.value)} className={DATE_INPUT} />
                    </Field>
                    <Field label="Brief on the event">
                      <textarea
                        rows={3}
                        value={getStr("event_brief")}
                        onChange={(e) => set("event_brief", e.target.value)}
                        placeholder="Who, where, and what you'd want us to handle…"
                        className={`${INPUT} resize-none`}
                      />
                    </Field>
                  </>
                )}

                <Field label={creator ? "Tell us about your content" : "Tell us about your studio and how you work"}>
                  <textarea
                    rows={5}
                    value={getStr("about")}
                    onChange={(e) => set("about", e.target.value)}
                    placeholder={creator ? "What you post about, who follows you, and how you'd share us…" : "Your aesthetic, your clients, your process, and what a good design partnership looks like to you…"}
                    className={`${INPUT} resize-none`}
                  />
                </Field>

                <PillGroup
                  label="How did you hear about us?"
                  options={HEAR_ABOUT}
                  value={getStr("hear_about")}
                  onChange={(val) => set("hear_about", val)}
                />

                {error && (
                  <p className="text-sm text-[var(--acc-coral)]">
                    Something went wrong sending your inquiry. Please try again, or email us
                    directly at{" "}
                    <a href="mailto:hello@thersvpstudio.com" className="underline underline-offset-4">
                      hello@thersvpstudio.com
                    </a>
                    .
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Apply to partner"}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="py-16 md:py-28" style={{ background: "var(--paper)" }}>
          <div className="container-x mx-auto max-w-3xl">
            <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
              How partnering works
            </Reveal>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((s, i) => (
                <Reveal
                  key={s.num}
                  delay={i * 0.06}
                  className="rounded-2xl border border-[var(--line)] bg-white p-6"
                >
                  <p className="font-display text-lg text-[var(--slate)]">{s.num}</p>
                  <p className="mt-1 font-semibold text-[var(--ink)]">{s.title}</p>
                  <p className="mt-2 text-sm text-[var(--slate)]">{s.desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </>
  );
}
