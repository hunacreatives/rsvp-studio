import { useEffect, useRef, useState } from "react";
import { lenisRef } from "@/lib/lenis";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import { FAQ_CATEGORIES } from "./faq-data";
import { submitInquiry } from "@/pages/enquire/submit";
import { Honeypot, INPUT, LABEL } from "@/pages/enquire/components/form-ui";
import ChatLinks from "@/components/ChatLinks";
import { trackEvent } from "@/lib/analytics";

/** Scroll to a category, clearing the sticky header (and the phone category bar). */
function jumpTo(slug: string) {
  const el = document.getElementById(slug);
  if (!el) return;
  const offset = window.matchMedia("(min-width: 1024px)").matches ? -112 : -152;
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY + offset);
  if (lenisRef.current) lenisRef.current.scrollTo(top, { duration: 0.8 });
  else window.scrollTo({ top, behavior: "smooth" });
}

function FaqItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--line)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-6 py-5 text-left"
        aria-expanded={open}
        aria-controls={id}
      >
        <span
          className={`font-display text-[17px] leading-snug ${
            open ? "text-[var(--ink)]" : "text-[var(--ink)]/80"
          }`}
        >
          {q}
        </span>
        <span
          className={`mt-1 shrink-0 text-xl leading-none text-[var(--slate)] transition-transform ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div id={id} className="pb-6">
          {a.split("\n\n").map((para, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-[var(--slate)] first:mt-0">
              {para.split("\n").map((line, j, arr) => (
                <span key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (charCount > 500) return;
    const f = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await submitInquiry(
        { your_name: String(f.get("full_name") ?? ""), email: String(f.get("email") ?? ""), message: String(f.get("message") ?? "") },
        [],
        { form: "faq-question", website },
      );
      setSubmitted(true);
      trackEvent("generate_lead", { form: "question" });
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to submit inquiry" ? err.message : "That didn’t send. Please try again, or email hello@thersvpstudio.com.");
    } finally {
      setSubmitting(false);
    }
  };

  // Shared with the inquiry forms: 16px fields on phones (no iOS zoom), 12px labels.
  const input = INPUT;
  const label = LABEL;

  if (submitted) {
    return (
      <div className="py-10 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--acc-blue)]">
          <i className="ri-check-line" />
        </span>
        <p className="mt-4 font-display text-xl font-semibold text-[var(--ink)]">
          Message received
        </p>
        <p className="mt-1 text-sm text-[var(--slate)]">
          We&apos;ll reply within 1 business day (Monday to Friday, Philippine time).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4">
      <Honeypot value={website} onChange={setWebsite} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="faq-name" className={label}>Name</label>
          <input id="faq-name" type="text" name="full_name" required placeholder="Your name" autoComplete="name" autoCapitalize="words" className={input} />
        </div>
        <div>
          <label htmlFor="faq-email" className={label}>Email</label>
          <input id="faq-email" type="email" name="email" required placeholder="your@email.com" autoComplete="email" autoCapitalize="none" spellCheck={false} className={input} />
        </div>
      </div>
      <div>
        <label htmlFor="faq-message" className={label}>Message</label>
        <textarea
          id="faq-message"
          name="message"
          required
          rows={4}
          maxLength={500}
          placeholder="What would you like to know?"
          className={`${input} resize-none`}
          onChange={(e) => setCharCount(e.target.value.length)}
        />
        <p aria-live="polite" className={`mt-1 text-right text-xs md:text-[11px] ${charCount > 480 ? "text-[#c2410c]" : "text-[var(--slate)]"}`}>
          {charCount}/500
        </p>
      </div>
      <button
        type="submit"
        disabled={submitting || charCount > 500}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send Message"}
      </button>
      {error ? <p role="alert" className="text-sm text-[#c2410c]">{error}</p> : null}
    </form>
  );
}

export default function FaqsPage() {
  // Phones: a sticky, sideways-scrolling bar of categories (the sidebar is desktop-only).
  const [active, setActive] = useState(FAQ_CATEGORIES[0]?.slug ?? "");
  const barRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    for (const c of FAQ_CATEGORIES) {
      const el = document.getElementById(c.slug);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - 24, behavior: "smooth" });
  }, [active]);

  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="pt-16 md:pt-28 pb-4 text-center" style={{ background: "var(--warm-white)" }}>
          <div className="container-x mx-auto max-w-4xl">
            <h1
              className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)] sm:whitespace-nowrap"
              style={{ fontSize: "clamp(1.9rem, 4.4vw, 3rem)" }}
            >
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[var(--slate)]">
              Everything you need to know about our services, collections,{" "}
              <br className="hidden sm:inline" />
              timelines, and process — all in one place.
            </p>
          </div>
        </section>

        {/* FAQ content */}
        <section className="py-16 md:py-24" style={{ background: "var(--warm-white)" }}>
          <div className="container-x">
            <div className="grid gap-14 lg:grid-cols-[0.28fr_0.72fr] lg:gap-20">
              <aside className="hidden lg:block">
                <nav className="sticky top-28 space-y-2">
                  {FAQ_CATEGORIES.map((cat) => (
                    <a
                      key={cat.slug}
                      href={`#${cat.slug}`}
                      onClick={(e) => {
                        e.preventDefault();
                        jumpTo(cat.slug);
                      }}
                      className="block py-1.5 text-sm text-[var(--slate)] transition-colors hover:text-[var(--ink)]"
                    >
                      {cat.category}
                    </a>
                  ))}
                </nav>
              </aside>

              {/* min-w-0: the sideways-scrolling bar mustn't widen this grid column. */}
              <div className="min-w-0">
                <nav
                  aria-label="FAQ categories"
                  className="sticky top-[64px] z-20 -mx-6 -mt-6 mb-8 border-b border-[var(--line)] bg-[var(--warm-white)] md:-mx-10 lg:hidden"
                >
                  <div
                    ref={barRef}
                    className="flex gap-2 overflow-x-auto px-6 py-3 [scrollbar-width:none] md:px-10 [&::-webkit-scrollbar]:hidden"
                  >
                    {FAQ_CATEGORIES.map((cat) => (
                      <a
                        key={cat.slug}
                        data-slug={cat.slug}
                        href={`#${cat.slug}`}
                        aria-current={active === cat.slug ? "true" : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          setActive(cat.slug);
                          jumpTo(cat.slug);
                        }}
                        className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${
                          active === cat.slug
                            ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                            : "border-[var(--line)] bg-white text-[var(--slate)]"
                        }`}
                      >
                        {cat.category}
                      </a>
                    ))}
                  </div>
                </nav>
              <div className="space-y-16">
                {FAQ_CATEGORIES.map((cat) => (
                  <div key={cat.slug} id={cat.slug} className="scroll-mt-[152px] lg:scroll-mt-28">
                    <h2 className="mb-3 font-display text-2xl font-semibold text-[var(--ink)]">
                      {cat.category}
                    </h2>
                    <div className="border-t border-[var(--line)]">
                      {cat.items.map((item, i) => (
                        <FaqItem key={item.q} id={`${cat.slug}-a${i}`} q={item.q} a={item.a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </section>

        {/* Still have questions */}
        <section id="ask" className="py-20 md:py-24" style={{ background: "var(--paper)" }}>
          <div className="container-x">
            <div className="grid items-start gap-14 lg:grid-cols-2">
              <Reveal>
                <h2 className="h-section text-[var(--ink)]">Still have questions?</h2>
                <p className="mt-4 max-w-sm text-[var(--slate)]">
                  We&apos;d love to hear about your event and help bring your vision
                  to life. Send us a message and we&apos;ll reply within 1 business day.
                </p>
                <ChatLinks className="mt-6" />
              </Reveal>
              <Reveal delay={0.08}>
                <ContactForm />
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </>
  );
}
