import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Reveal } from "@/lib/Reveal";

// How it works, told by one guest: Maria replies on a Botanical site, her reply lands in the
// Guests tab, she gets her confirmation, then the reminder, and the hosts see who's still
// missing. Every screen is our real product (public/services/rsvp):
//   guest-replies.mp4      a screen recording of the real Botanical RSVP form (template preview)
//   guests-arrive-*.webp   the phone Guests tab (?demo) without and with Maria's card
//   email-*.webp           the real guest emails (api/_lib/guest-mail.ts), Isabella & Mateo sample
//   invite-list-phone.mp4  a recording of the phone invite list, tapping "Not yet"
// Desktop: the phone stays put while the steps scroll past it. Phones: each step has its own.

/** Where things sit in the phone Guests captures (CSS px of a 390 × 844 screen). */
const ARRIVE = { listTop: 369.3, shift: 185.5, cardH: 173.5, tabTop: 787, h: 844 };
const pct = (px: number) => `${((px / ARRIVE.h) * 100).toFixed(2)}%`;
/** How far an email capture scrolls: everything but one screen's height (heights at 390 wide). */
const readTo = (imgH: number) => `-${((1 - ARRIVE.h / imgH) * 100).toFixed(1)}%`;

type Screen = (on: boolean) => ReactNode;

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return reduce;
}

/** A recording that plays from the start each time its step comes up, then holds and replays. */
function Recording({ on, src, poster, label }: { on: boolean; src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const v = ref.current;
    if (!v || reduce) return;
    let timer = 0;
    const again = () => (timer = window.setTimeout(() => ((v.currentTime = 0), v.play().catch(() => {})), 2200));
    if (on) {
      v.currentTime = 0;
      v.play().catch(() => {});
      v.addEventListener("ended", again);
    } else v.pause();
    return () => {
      v.removeEventListener("ended", again);
      window.clearTimeout(timer);
    };
  }, [on, reduce]);
  return reduce ? (
    <img src={poster} alt={label} />
  ) : (
    <video ref={ref} src={src} poster={poster} muted playsInline preload="metadata" aria-label={label} />
  );
}

function Arrive({ on }: { on: boolean }) {
  const vars = {
    "--list": pct(ARRIVE.listTop),
    "--tab": pct(ARRIVE.tabTop),
    "--shift": pct(ARRIVE.shift),
    "--card-top": pct(ARRIVE.listTop - 1),
    "--card-h": pct(ARRIVE.cardH),
  } as CSSProperties;
  const list = "/services/rsvp/guests-arrive-list.webp";
  return (
    <div className={`rsvp-arrive ${on ? "is-on" : ""}`} style={vars} role="img" aria-label="Maria’s reply arriving at the top of the guest list">
      <img src={list} alt="" className="top" loading="lazy" />
      <img src={list} alt="" className="list" loading="lazy" />
      <img src="/services/rsvp/guests-arrive-card.webp" alt="" className="card" loading="lazy" />
      <span className="ring" />
      <img src={list} alt="" className="tab" loading="lazy" />
    </div>
  );
}

function Mail({ on, src, imgH, from, subject, preview, label }: { on: boolean; src: string; imgH: number; from: string; subject: string; preview: string; label: string }) {
  return (
    <div className={`rsvp-mail ${on ? "is-on" : ""}`} style={{ "--read": readTo(imgH) } as CSSProperties}>
      <img src={src} alt={label} loading="lazy" />
      <div className="rsvp-banner" aria-hidden>
        <div className="rsvp-note-row">
          <span className="rsvp-app">
          <img src="/brand/brandmark-white.png" alt="" />
        </span>
          <div className="min-w-0">
            <p className="rsvp-note-top">
              <b>{from}</b>
              <span>now</span>
            </p>
            <p className="rsvp-note-title">{subject}</p>
            <p className="rsvp-note-body">{preview}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS: { title: string; copy: string; premium?: boolean; tint: string; accent: string; screen: Screen }[] = [
  {
    title: "A guest replies on your website",
    copy: "Her name, her email or mobile number, yes or no, how many are coming, any food allergies and a note for you. No app and no account: she replies right on your site.",
    tint: "#fbeee4",
    accent: "#a8452a",
    screen: (on) => <Recording on={on} src="/services/rsvp/guest-replies.mp4" poster="/services/rsvp/guest-replies-poster.webp" label="A guest filling in the RSVP form on the Botanical design" />,
  },
  {
    title: "It lands in your guest list",
    copy: "Every reply shows up in your Guests tab the moment it’s sent. Search it, filter it, or download it as a spreadsheet. Free sites email you a summary each morning; on Premium, you get an email for every reply.",
    tint: "#e4edff",
    accent: "#2f61d5",
    screen: (on) => <Arrive on={on} />,
  },
  {
    title: "She gets her confirmation",
    copy: "A “You’re on the list” email with the date, the venue, directions and an add-to-calendar button. On Premium, it comes in your names.",
    tint: "#fff3d2",
    accent: "#a2720a",
    screen: (on) => (
      <Mail
        on={on}
        src="/services/rsvp/email-confirmation.webp"
        imgH={1788}
        from="Isabella & Mateo via The RSVP Studio"
        subject="You’re on the list — Isabella & Mateo"
        preview="Monday, June 14, 2027 · Villa Aurelia. Save the date."
        label="The confirmation email a guest gets after replying"
      />
    ),
  },
  {
    title: "And a reminder two days before",
    copy: "Everyone who said yes gets the details again: the time, the venue and directions, two days before your event.",
    premium: true,
    tint: "#ffe9e2",
    accent: "#c4482b",
    screen: (on) => (
      <Mail
        on={on}
        src="/services/rsvp/email-reminder.webp"
        imgH={1608}
        from="Isabella & Mateo via The RSVP Studio"
        subject="See you on Monday, Maria"
        preview="Monday, June 14, 2027 · 4:00 PM · Villa Aurelia. Directions and details inside."
        label="The reminder email guests get two days before"
      />
    ),
  },
  {
    title: "See who hasn’t replied",
    copy: "Add your guest list and give everyone their own link. Your invite list shows who’s coming, who can’t make it and who hasn’t answered yet, so you know exactly who to message.",
    tint: "#e2f5e9",
    accent: "#1f8a4c",
    screen: (on) => <Recording on={on} src="/services/rsvp/invite-list-phone.mp4" poster="/services/rsvp/invite-list-phone-poster.webp" label="The invite list on a phone, filtered to guests who haven’t replied" />,
  },
];

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="rsvp-phone">
      <div className="rsvp-phone-screen">{children}</div>
    </div>
  );
}

/** One screen in a phone: shown or not, and playing (its step is the one being read) or not. */
function Screen({ shown, children }: { shown: boolean; children: ReactNode }) {
  return <div className={`rsvp-screen ${shown ? "is-shown" : ""}`}>{children}</div>;
}

function useDesktop() {
  const [desk, setDesk] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesk(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return desk;
}

export default function Walkthrough() {
  // The step being read; -1 until the walkthrough reaches the middle of the screen, so
  // nothing plays before anyone sees it.
  const [active, setActive] = useState(-1);
  const shown = Math.max(active, 0);
  const desktop = useDesktop();
  const steps = useRef<(HTMLElement | null)[]>([]);

  // The step crossing the middle of the screen is the one playing.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [desktop]);

  return (
    <section id="how" className="rsvp-walk scroll-mt-16 py-16 md:py-28" style={{ backgroundColor: STEPS[shown].tint }}>
      <div className="container-x">
        <Reveal className="text-center">
          <h2 className="font-display font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--slate)] text-balance md:text-[19px]">
            Follow one guest, Maria, from her reply to two days before the wedding.
          </p>
        </Reveal>

        <div className="mt-12 lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          {desktop ? (
            <div className="relative">
              <div className="sticky top-[calc(50vh-310px)] flex justify-center py-[10vh]">
                <Phone>
                  {STEPS.map((s, i) => (
                    <Screen key={i} shown={i === shown}>
                      {s.screen(i === active)}
                    </Screen>
                  ))}
                </Phone>
              </div>
            </div>
          ) : null}
          <ol className="space-y-16 lg:space-y-0">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                ref={(el) => {
                  steps.current[i] = el;
                }}
                data-step={i}
                className="lg:flex lg:min-h-[74vh] lg:items-center"
              >
                <div className={`rsvp-step-text mx-auto max-w-[460px] text-center lg:mx-0 lg:text-left ${i === shown ? "is-on" : ""}`}>
                  <span className="rsvp-step-n" style={{ color: s.accent }}>
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-display text-[1.6rem] font-semibold leading-tight text-[var(--ink)] md:text-[2rem] text-balance">
                    {s.title}
                    {s.premium ? <span className="rsvp-premium">Premium</span> : null}
                  </h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-[var(--slate)] md:text-[17px]" style={{ textWrap: "pretty" }}>
                    {s.copy}
                  </p>
                </div>
                {!desktop ? (
                  <div className="mt-8 flex justify-center">
                    <Phone>
                      <Screen shown>{s.screen(i === active)}</Screen>
                    </Phone>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
