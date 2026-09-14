import { useMemo, useState } from "react";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import Fireworks from "./components/Fireworks";
import FileDrop, { type PickedFile } from "./components/FileDrop";
import { Field, INPUT, PillGroup, SectionTitle, SuccessCard } from "./components/form-ui";
import { submitInquiry } from "./submit";
import {
  ADDONS,
  BESPOKE_COLLECTIONS,
  BUDGETS,
  HEAR_ABOUT,
  OCCASIONS,
  SEMI_COLLECTIONS,
  SERVICES,
  TIMELINES,
  type FieldSpec,
} from "./occasions";

const processSteps = [
  { num: "01", title: "Inquiry", desc: "Once we receive your form, we'll get back to you within two business days to chat through your ideas, plans, and creative direction." },
  { num: "02", title: "Proposal & Contract", desc: "A tailored proposal detailing the scope, timeline, and investment, followed by a contract to formally secure your booking." },
  { num: "03", title: "Onboarding", desc: "We'll set up a shared folder with a guided content outline that helps simplify every step from day one." },
  { num: "04", title: "Design & Development", desc: "From concept to final refinements, each stage is thoughtfully considered, with room for your feedback throughout." },
  { num: "05", title: "Launch", desc: "We'll connect your domain, review every final detail, and launch your website smoothly — with one month of support after." },
];

const STEP_LABELS = ["The Occasion", "Event Details", "Services & Direction"];

type Values = Record<string, string | string[]>;

export default function ProjectInquiry() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [v, setV] = useState<Values>({ services: [] });
  const [files, setFiles] = useState<PickedFile[]>([]);

  const getStr = (k: string) => (v[k] as string) || "";
  const getArr = (k: string) => (v[k] as string[]) || [];
  const set = (k: string, val: string | string[]) => setV((p) => ({ ...p, [k]: val }));

  const occasion = useMemo(
    () => OCCASIONS.find((o) => o.key === getStr("occasion")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v.occasion],
  );

  const visionLen = getStr("vision").length;

  const step1Valid = getStr("occasion") && getStr("your_name").trim() && getStr("email").trim();
  const step2Valid = getStr("event_date") && getStr("event_location").trim();

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (visionLen > 500) return;
    setSubmitting(true);
    setError(false);
    try {
      await submitInquiry(v, files, { form: "project-inquiry" });
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSpec = (spec: FieldSpec) => {
    if (spec.kind === "text") {
      return (
        <Field key={spec.name} label={spec.label}>
          <input
            type="text"
            value={getStr(spec.name)}
            onChange={(e) => set(spec.name, e.target.value)}
            placeholder={spec.placeholder}
            className={INPUT}
          />
        </Field>
      );
    }
    if (spec.kind === "textarea") {
      return (
        <Field key={spec.name} label={spec.label}>
          <textarea
            rows={3}
            value={getStr(spec.name)}
            onChange={(e) => set(spec.name, e.target.value)}
            placeholder={spec.placeholder}
            className={`${INPUT} resize-none`}
          />
        </Field>
      );
    }
    return (
      <PillGroup
        key={spec.name}
        label={spec.label}
        options={spec.options}
        multi={spec.multi}
        value={spec.multi ? getArr(spec.name) : getStr(spec.name)}
        onChange={(val) => set(spec.name, val)}
      />
    );
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>
        <section
          className="relative overflow-hidden pt-16 md:pt-28 pb-4"
          style={{ background: "var(--warm-white)" }}
        >
          <Fireworks />
          <div className="container-x relative z-10 mx-auto max-w-2xl text-center">
            <p className="eyebrow">Start a Project</p>
            <h1
              className="mt-4 font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)" }}
            >
              Let&apos;s bring your celebration to life.
            </h1>
            <p className="mt-5 text-[var(--slate)]">
              Tell us about your event — as much or as little as you know so far.
              We&apos;ll take it from there and fill in the rest together.
            </p>
            <p className="mt-4 text-sm text-[var(--slate)]">
              For urgent inquiries, email us at{" "}
              <a href="mailto:hello@thersvpstudio.com" className="text-[var(--ink)] underline underline-offset-4">
                hello@thersvpstudio.com
              </a>
            </p>
          </div>
        </section>

        <section id="start" className="scroll-mt-24 pb-24 pt-12" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-2xl">
            {submitted ? (
              <SuccessCard
                title="Inquiry received"
                message="We'll be in touch within two business days."
              />
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Step indicator */}
                <div className="mb-10 flex items-center gap-3">
                  {STEP_LABELS.map((label, i) => {
                    const n = i + 1;
                    const state = n === step ? "current" : n < step ? "done" : "todo";
                    return (
                      <div key={label} className="flex flex-1 items-center gap-3">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                            state === "current"
                              ? "bg-[var(--ink)] text-white"
                              : state === "done"
                                ? "bg-[var(--acc-blue)] text-white"
                                : "bg-[var(--paper)] text-[var(--slate)]"
                          }`}
                        >
                          {state === "done" ? <i className="ri-check-line" /> : n}
                        </span>
                        <span
                          className={`hidden text-xs font-medium uppercase tracking-[0.1em] sm:block ${
                            state === "todo" ? "text-[var(--slate)]" : "text-[var(--ink)]"
                          }`}
                        >
                          {label}
                        </span>
                        {n < 3 && <span className="h-px flex-1 bg-[var(--line)]" />}
                      </div>
                    );
                  })}
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                  <div className="space-y-8">
                    <SectionTitle>The occasion</SectionTitle>
                    <Field label="What are we celebrating?">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {OCCASIONS.map((o) => (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => set("occasion", o.key)}
                            className={`rounded-xl border px-3 py-3 text-sm transition-colors ${
                              getStr("occasion") === o.key
                                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                                : "border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)]"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="Your name">
                        <input type="text" value={getStr("your_name")} onChange={(e) => set("your_name", e.target.value)} placeholder="Your name" className={INPUT} />
                      </Field>
                      <Field label="Email address">
                        <input type="email" value={getStr("email")} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" className={INPUT} />
                      </Field>
                    </div>
                    <Field label="Instagram handle (optional)">
                      <input type="text" value={getStr("ig_handle")} onChange={(e) => set("ig_handle", e.target.value)} placeholder="@yourhandle" className={INPUT} />
                    </Field>
                    <PillGroup
                      label="How did you hear about us?"
                      options={HEAR_ABOUT}
                      value={getStr("hear_about")}
                      onChange={(val) => set("hear_about", val)}
                    />
                  </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <div className="space-y-8">
                    <SectionTitle>Event details</SectionTitle>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="Event date">
                        <input type="date" value={getStr("event_date")} onChange={(e) => set("event_date", e.target.value)} className={INPUT} />
                      </Field>
                      <Field label="Event location">
                        <input type="text" value={getStr("event_location")} onChange={(e) => set("event_location", e.target.value)} placeholder="City, Country" className={INPUT} />
                      </Field>
                    </div>
                    <Field label="Approximate number of guests">
                      <input type="number" value={getStr("guest_count")} onChange={(e) => set("guest_count", e.target.value)} placeholder="e.g. 100" className={INPUT} />
                    </Field>

                    {occasion?.fields.map(renderSpec)}

                    <Field label="Mood board / design peg (optional)">
                      <FileDrop files={files} onChange={setFiles} />
                    </Field>
                  </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <div className="space-y-8">
                    <SectionTitle>Services &amp; direction</SectionTitle>

                    <Field label="Bespoke Design or Semi-Custom?">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {[
                          { val: "bespoke", title: "Bespoke Design", desc: "A fully custom, made-from-scratch experience tailored to your celebration." },
                          { val: "semi-custom", title: "Semi-Custom", desc: "Personalised from one of our signature collections." },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => set("design_type", opt.val)}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                              getStr("design_type") === opt.val
                                ? "border-[var(--ink)] bg-white"
                                : "border-[var(--line)] hover:border-[var(--ink)]"
                            }`}
                          >
                            <p className="text-sm font-semibold text-[var(--ink)]">{opt.title}</p>
                            <p className="mt-1 text-xs text-[var(--slate)]">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </Field>

                    <PillGroup
                      label="Which services are you interested in?"
                      options={SERVICES}
                      multi
                      value={getArr("services")}
                      onChange={(val) => set("services", val)}
                    />

                    {getStr("design_type") === "bespoke" && (
                      <PillGroup
                        label="Which bespoke collection?"
                        options={BESPOKE_COLLECTIONS}
                        multi
                        value={getArr("bespoke_collections")}
                        onChange={(val) => set("bespoke_collections", val)}
                      />
                    )}
                    {getStr("design_type") === "semi-custom" && (
                      <>
                        <PillGroup
                          label="Which collections would you like to explore?"
                          options={SEMI_COLLECTIONS}
                          multi
                          value={getArr("semi_collections")}
                          onChange={(val) => set("semi_collections", val)}
                        />
                        <PillGroup
                          label="Optional add-ons"
                          options={ADDONS}
                          multi
                          value={getArr("addons")}
                          onChange={(val) => set("addons", val)}
                        />
                      </>
                    )}

                    <Field label="What is your vision for the design?" hint="Describe the feeling, aesthetic, colours, or references that inspire you.">
                      <textarea
                        rows={5}
                        maxLength={500}
                        value={getStr("vision")}
                        onChange={(e) => set("vision", e.target.value)}
                        placeholder="Describe the feeling, aesthetic, colours, or references…"
                        className={`${INPUT} resize-none`}
                      />
                      <p className={`mt-1 text-right text-[11px] ${visionLen > 480 ? "text-[var(--acc-coral)]" : "text-[var(--slate)]"}`}>
                        {visionLen}/500
                      </p>
                    </Field>

                    <PillGroup
                      label="Ideal project timeline"
                      options={TIMELINES}
                      value={getStr("timeline")}
                      onChange={(val) => set("timeline", val)}
                    />
                    <PillGroup
                      label="Budget range (optional)"
                      hint="A rough range helps us tailor the proposal — it's not binding."
                      options={BUDGETS}
                      value={getStr("budget")}
                      onChange={(val) => set("budget", val)}
                    />
                  </div>
                )}

                {error && (
                  <p className="mt-6 text-sm text-[var(--acc-coral)]">
                    Something went wrong sending your inquiry. Please try again, or email us
                    directly at{" "}
                    <a href="mailto:hello@thersvpstudio.com" className="underline underline-offset-4">
                      hello@thersvpstudio.com
                    </a>
                    .
                  </p>
                )}

                {/* Nav */}
                <div className="mt-10 flex items-center justify-between">
                  {step > 1 ? (
                    <button type="button" onClick={back} className="btn btn-ghost">
                      Back
                    </button>
                  ) : (
                    <span />
                  )}
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={next}
                      disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || visionLen > 500}
                      className="btn btn-primary disabled:opacity-50"
                    >
                      {submitting ? "Sending…" : "Submit Inquiry"}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Process */}
        <section className="py-16 md:py-28" style={{ background: "var(--ink)" }}>
          <div className="container-x mx-auto max-w-3xl">
            <Reveal
              as="h2"
              className="text-center font-display font-semibold tracking-[-0.02em] text-white"
              style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)" }}
            >
              Your journey begins here.
            </Reveal>
            <div className="mt-14 divide-y divide-white/10">
              {processSteps.map((s) => (
                <Reveal key={s.num} className="grid gap-4 py-8 md:grid-cols-[0.8fr_1.2fr]">
                  <div>
                    <p className="text-sm text-white/50">{s.num}</p>
                    <p className="mt-1 font-semibold text-white">{s.title}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-white/70">{s.desc}</p>
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
