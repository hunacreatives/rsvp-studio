import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { lenisRef } from "@/lib/lenis";
import { readInquiryParams } from "./prefill";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import Fireworks from "./components/Fireworks";
import FileDrop, { type PickedFile } from "./components/FileDrop";
import { DATE_INPUT, Field, Honeypot, INPUT, PillGroup, SectionTitle, SuccessCard } from "./components/form-ui";
import { todayISO } from "./today";
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
  { num: "01", title: "Inquiry", desc: "Once we receive your form, we'll reply within 1 business day to talk through your ideas, plans, and creative direction." },
  { num: "02", title: "Proposal & Contract", desc: "A tailored proposal detailing the scope, timeline, and investment, followed by a contract to formally secure your booking." },
  { num: "03", title: "Onboarding", desc: "We'll set up a shared folder with a guided content outline that helps simplify every step from day one." },
  { num: "04", title: "Design & Development", desc: "From concept to final refinements, each stage is thoughtfully considered, with room for your feedback throughout." },
  { num: "05", title: "Launch", desc: "We'll connect your domain, review every final detail, and launch your website smoothly — with one month of support after." },
];

const STEP_LABELS = ["The Occasion", "Event Details", "Services & Direction"];

type Values = Record<string, string | string[]>;

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Scroll an element to just under the sticky header (Lenis when it's running). */
function scrollToEl(el: HTMLElement, offset = -84) {
  // An absolute target (not the element) so Lenis can't aim from a stale position.
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY + offset);
  if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 0.6 });
  else window.scrollTo({ top, behavior: "smooth" });
}

export default function ProjectInquiry() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [omitted, setOmitted] = useState<string[]>([]);
  // Which step the visitor tried to leave with something missing (shows the messages).
  const [tried, setTried] = useState(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  // A CTA elsewhere can open the form already filled in (see ./prefill.ts).
  const [prefill] = useState(() => readInquiryParams(window.location.search));
  const [v, setV] = useState<Values>(() => ({ services: [], ...prefill.values }));
  const [askingAbout, setAskingAbout] = useState(prefill.summary);
  const clearPrefill = () => {
    setV((p) => {
      const next = { ...p, services: [] as string[] };
      for (const k of ["interested_in", "design_type", "semi_collections", "bespoke_collections"]) delete next[k];
      return next;
    });
    setAskingAbout(null);
  };

  // Clicking another inquiry link while already here (e.g. the menu's Inquire)
  // applies that link's choices too.
  const location = useLocation();
  const [seenSearch, setSeenSearch] = useState(location.search);
  useEffect(() => {
    if (location.search === seenSearch) return;
    setSeenSearch(location.search);
    const next = readInquiryParams(location.search);
    if (!next.summary) return;
    setV((p) => ({ ...p, services: [], ...next.values }));
    setAskingAbout(next.summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Links end in #start: bring the form into view (the router itself doesn't
  // scroll to hashes, and the page starts at the top on every navigation).
  useEffect(() => {
    if (location.hash !== "#start") return;
    const t = setTimeout(() => {
      const el = document.getElementById("start");
      if (!el) return;
      if (lenisRef.current) lenisRef.current.scrollTo(el, { offset: -90, duration: 0.8 });
      else el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, [location.key, location.hash]);
  const [files, setFiles] = useState<PickedFile[]>([]);

  const getStr = (k: string) => (v[k] as string) || "";
  const getArr = (k: string) => (v[k] as string[]) || [];
  const set = (k: string, val: string | string[]) =>
    setV((p) => {
      const next = { ...p, [k]: val };
      // Switching Custom ↔ Semi-Custom drops the other branch's picks, so hidden
      // choices never end up in the email.
      if (k === "design_type") {
        if (val === "bespoke") delete next.semi_collections, delete next.addons;
        if (val === "semi-custom") delete next.bespoke_collections;
      }
      return next;
    });

  const occasion = useMemo(
    () => OCCASIONS.find((o) => o.key === getStr("occasion")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v.occasion],
  );

  const visionLen = getStr("vision").length;

  const today = todayISO();
  // Missing/invalid answers per step, in the order they appear on screen.
  const problems: Record<string, string> =
    step === 1
      ? {
          ...(!getStr("occasion") && { occasion: "Choose what you’re celebrating." }),
          ...(!getStr("your_name").trim() && { your_name: "Add your name." }),
          ...(!getStr("email").trim()
            ? { email: "Add your email so we can reply." }
            : !EMAIL_OK.test(getStr("email").trim()) && { email: "Check your email address — it looks incomplete." }),
        }
      : step === 2
        ? {
            ...(!getStr("event_date")
              ? { event_date: "Add the event date — a best guess is fine." }
              : getStr("event_date") < today && { event_date: "Pick a date from today onwards." }),
            ...(!getStr("event_location").trim() && { event_location: "Add the city where it’s happening." }),
          }
        : {};
  const err = (k: string) => (tried === step ? problems[k] : undefined);

  // Changing step keeps the page where the button was, which on a phone lands deep in
  // the next step (or right on Submit). Bring the top of the form back into view and
  // move focus to the new step's heading.
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    const form = formRef.current;
    if (!form) return;
    // Keyboard users (focus still inside the form) continue from the new heading.
    const keyboard = form.contains(document.activeElement) && document.activeElement !== document.body;
    if (form.getBoundingClientRect().top < 72) scrollToEl(form);
    if (keyboard) form.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  }, [step]);

  const next = () => {
    const missing = Object.keys(problems);
    if (missing.length) {
      setTried(step);
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${missing[0]}"]`);
      if (el) {
        scrollToEl(el, -100);
        el.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
      }
      return;
    }
    setTried(0);
    setStep((s) => Math.min(3, s + 1));
  };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (visionLen > 500) return;
    setSubmitting(true);
    setError(false);
    try {
      const result = await submitInquiry(v, files, { form: "project-inquiry" });
      setOmitted(result.omitted ?? []);
      setSubmitted(true);
      // The thank-you card is much shorter than the form: bring it into view.
      requestAnimationFrame(() => sectionRef.current && scrollToEl(sectionRef.current));
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
            autoCapitalize={/_names?$/.test(spec.name) ? "words" : undefined}
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
          className="relative overflow-hidden pt-16 md:pt-24 pb-10"
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
            </p>
          </div>
        </section>

        <section ref={sectionRef} id="start" className="scroll-mt-24 pb-24 pt-4 md:pt-8" style={{ background: "var(--paper)" }}>
          <div className="container-x mx-auto max-w-2xl">
            {submitted ? (
              <SuccessCard
                title="Inquiry received"
                message="We'll reply within 1 business day (Monday to Friday, Philippine time)."
                note={
                  omitted.length ? (
                    <>
                      We couldn’t attach {omitted.length === 1 ? "this file" : "these files"}: {omitted.join(", ")}. Please email{" "}
                      {omitted.length === 1 ? "it" : "them"} to{" "}
                      <a href="mailto:hello@thersvpstudio.com" className="underline underline-offset-4">
                        hello@thersvpstudio.com
                      </a>
                      .
                    </>
                  ) : undefined
                }
              />
            ) : (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                noValidate
                className="relative rounded-2xl bg-white p-5 shadow-[0_24px_60px_-32px_rgba(0,7,39,0.25)] sm:p-6 md:p-10"
                style={{ border: "1px solid var(--line)" }}
              >
                <Honeypot value={getStr("website")} onChange={(val) => set("website", val)} />
                {askingAbout ? (
                  <div className="mb-8 flex items-start gap-3 rounded-xl bg-[var(--paper)] px-4 py-3 text-[14px] text-[var(--ink)]">
                    <i className="ri-sparkling-line mt-0.5 text-[var(--acc-blue)]" aria-hidden />
                    <p className="min-w-0 flex-1">
                      You’re asking about: <strong>{askingAbout}</strong>
                      <span className="block text-[13px] text-[var(--slate)] md:text-[12px]">We’ve filled that in for you on step 3 — you can change it there.</span>
                    </p>
                    <button type="button" onClick={clearPrefill} className="-my-2 -mr-2 min-h-[44px] shrink-0 px-2 text-[13px] text-[var(--slate)] underline underline-offset-2 hover:text-[var(--ink)]">
                      Clear
                    </button>
                  </div>
                ) : null}
                {/* Step indicator */}
                <div className="mb-8 sm:mb-10">
                <div className="flex items-center gap-3">
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
                {/* Phones hide the labels beside the dots, so name the current step here. */}
                <p className="mt-3 text-[13px] text-[var(--slate)] sm:hidden" aria-live="polite">
                  Step {step} of 3 · <span className="font-medium text-[var(--ink)]">{STEP_LABELS[step - 1]}</span>
                </p>
                </div>

                {/* STEP 1 */}
                {step === 1 && (
                  <div className="space-y-8">
                    <SectionTitle>The occasion</SectionTitle>
                    <Field label="What are we celebrating?" name="occasion" required error={err("occasion")}>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {OCCASIONS.map((o) => (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => set("occasion", o.key)}
                            aria-pressed={getStr("occasion") === o.key}
                            className={`min-h-[48px] rounded-xl border px-3 py-3 text-sm leading-snug transition-colors ${
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
                      <Field label="Your name" name="your_name" required error={err("your_name")}>
                        <input type="text" value={getStr("your_name")} onChange={(e) => set("your_name", e.target.value)} placeholder="Your name" autoComplete="name" autoCapitalize="words" className={INPUT} />
                      </Field>
                      <Field label="Email address" name="email" required error={err("email")}>
                        <input type="email" value={getStr("email")} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" autoComplete="email" autoCapitalize="none" spellCheck={false} className={INPUT} />
                      </Field>
                    </div>
                    <Field label="Instagram handle (optional)">
                      <input type="text" value={getStr("ig_handle")} onChange={(e) => set("ig_handle", e.target.value)} placeholder="@yourhandle" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={INPUT} />
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
                      <Field label="Event date" name="event_date" required error={err("event_date")}>
                        <input type="date" min={today} value={getStr("event_date")} onChange={(e) => set("event_date", e.target.value)} className={DATE_INPUT} />
                      </Field>
                      <Field label="Event location" name="event_location" required error={err("event_location")}>
                        <input type="text" value={getStr("event_location")} onChange={(e) => set("event_location", e.target.value)} placeholder="City, Country" autoCapitalize="words" className={INPUT} />
                      </Field>
                    </div>
                    <Field label="Approximate number of guests">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={getStr("guest_count")} onChange={(e) => set("guest_count", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 100" className={INPUT} />
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

                    <Field label="Custom or Semi-Custom?">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {[
                          { val: "bespoke", title: "Custom", desc: "Designed from scratch, just for your celebration." },
                          { val: "semi-custom", title: "Semi-Custom", desc: "One of our ready designs, personalised with your details, photos and colours." },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => set("design_type", opt.val)}
                            aria-pressed={getStr("design_type") === opt.val}
                            className={`relative rounded-xl border p-4 pr-10 text-left transition-colors ${
                              getStr("design_type") === opt.val
                                ? "border-[var(--ink)] bg-white ring-1 ring-[var(--ink)]"
                                : "border-[var(--line)] hover:border-[var(--ink)]"
                            }`}
                          >
                            {getStr("design_type") === opt.val ? (
                              <i className="ri-checkbox-circle-fill absolute right-3 top-3 text-lg text-[var(--ink)]" aria-hidden />
                            ) : null}
                            <p className="text-sm font-semibold text-[var(--ink)]">{opt.title}</p>
                            <p className="mt-1 text-[13px] text-[var(--slate)] md:text-xs">{opt.desc}</p>
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
                        label={getArr("services").includes("Stationery Design") ? "Which stationery suite?" : "Want a printed stationery suite too? (optional)"}
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
                      <p aria-live="polite" className={`mt-1 text-right text-xs md:text-[11px] ${visionLen > 480 ? "text-[#c2410c]" : "text-[var(--slate)]"}`}>
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
                  <p role="alert" className="mt-6 text-sm text-[#c2410c]">
                    Something went wrong sending your inquiry. Please try again, or email us
                    directly at{" "}
                    <a href="mailto:hello@thersvpstudio.com" className="underline underline-offset-4">
                      hello@thersvpstudio.com
                    </a>
                    .
                  </p>
                )}

                {/* Nav */}
                {/* Phones: full-width stacked buttons (main action first) so they never wrap or collide. */}
                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {step > 1 ? (
                    <button type="button" onClick={back} className="btn btn-ghost w-full sm:w-auto">
                      Back
                    </button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                  {step < 3 ? (
                    <button type="button" onClick={next} className="btn btn-primary w-full sm:w-auto">
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || visionLen > 500}
                      className="btn btn-primary w-full whitespace-nowrap disabled:opacity-50 sm:w-auto"
                    >
                      {submitting ? "Sending…" : "Submit Inquiry"}
                    </button>
                  )}
                </div>
              </form>
            )}
            {!submitted && (
              <p className="mt-6 text-center text-[13px]" style={{ color: "var(--slate)" }}>
                For urgent inquiries, email{" "}
                <a href="mailto:hello@thersvpstudio.com" className="underline underline-offset-4" style={{ color: "var(--ink)" }}>
                  hello@thersvpstudio.com
                </a>
              </p>
            )}
          </div>
        </section>

        {/* Process */}
        <section className="py-16 md:py-28" style={{ background: "var(--indigo)" }}>
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
