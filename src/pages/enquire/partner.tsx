import { useState } from "react";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import { Field, INPUT, PillGroup, SectionTitle, SuccessCard } from "./components/form-ui";
import { HEAR_ABOUT } from "./occasions";
import { submitInquiry } from "./submit";

const ROLES = [
  "Wedding Planner", "Event Coordinator", "Venue", "Photographer", "Stylist / Designer", "Other Studio", "Other",
];
const VOLUME = ["Under 10", "10 – 25", "25 – 50", "50+"];
const LOOKING_FOR = [
  "Referral partnership",
  "White-label / on-behalf-of design",
  "Collaboration on a specific event",
  "Preferred-vendor listing",
  "Just introducing ourselves",
];

const HOW_IT_WORKS = [
  { num: "01", title: "Intro call", desc: "A short call to learn about your studio, your clients, and how you like to work with design partners." },
  { num: "02", title: "Trial project", desc: "We collaborate on one upcoming event so both sides can feel out the fit — process, communication, and craft." },
  { num: "03", title: "Ongoing referrals", desc: "Once it clicks, we set up a steady referral and collaboration rhythm, with clear terms on both sides." },
];

type Values = Record<string, string | string[]>;

export default function PartnerInquiry() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [v, setV] = useState<Values>({ looking_for: [] });

  const getStr = (k: string) => (v[k] as string) || "";
  const getArr = (k: string) => (v[k] as string[]) || [];
  const set = (k: string, val: string | string[]) => setV((p) => ({ ...p, [k]: val }));

  const specificEvent = getArr("looking_for").includes("Collaboration on a specific event");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      await submitInquiry(v, [], { form: "partner-inquiry" });
      setSubmitted(true);
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
            <p className="eyebrow">Become a Partner</p>
            <h1
              className="mt-4 font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              Better experiences begin
              <br className="hidden sm:inline" />
              with better collaborations.
            </h1>
            <p className="mt-5 text-[var(--slate)]">
              For planners, coordinators, venues, and studios. Tell us a little
              about how you work and what you&apos;re looking for in a design partner.
            </p>
          </div>
        </section>

        <section className="scroll-mt-24 pb-24 pt-12" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-2xl">
            {submitted ? (
              <SuccessCard
                title="Thanks for reaching out"
                message="We'll be in touch about partnering soon."
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <SectionTitle>About you</SectionTitle>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Your name">
                    <input type="text" value={getStr("your_name")} onChange={(e) => set("your_name", e.target.value)} placeholder="Your name" className={INPUT} required />
                  </Field>
                  <Field label="Business / studio name">
                    <input type="text" value={getStr("business_name")} onChange={(e) => set("business_name", e.target.value)} placeholder="Studio name" className={INPUT} required />
                  </Field>
                </div>

                <PillGroup
                  label="Your role"
                  options={ROLES}
                  value={getStr("role")}
                  onChange={(val) => set("role", val)}
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Email">
                    <input type="email" value={getStr("email")} onChange={(e) => set("email", e.target.value)} placeholder="you@studio.com" className={INPUT} required />
                  </Field>
                  <Field label="Website (optional)">
                    <input type="text" value={getStr("website")} onChange={(e) => set("website", e.target.value)} placeholder="studio.com" className={INPUT} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Instagram (optional)">
                    <input type="text" value={getStr("instagram")} onChange={(e) => set("instagram", e.target.value)} placeholder="@studio" className={INPUT} />
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

                {specificEvent && (
                  <>
                    <Field label="Event date">
                      <input type="date" value={getStr("event_date")} onChange={(e) => set("event_date", e.target.value)} className={INPUT} />
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

                <Field label="Tell us about your studio and how you work">
                  <textarea
                    rows={5}
                    value={getStr("about")}
                    onChange={(e) => set("about", e.target.value)}
                    placeholder="Your aesthetic, your clients, your process, and what a good design partnership looks like to you…"
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
                  {submitting ? "Sending…" : "Submit"}
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
