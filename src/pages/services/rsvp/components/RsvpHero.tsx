import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// The hero's moment: new RSVPs arriving like mail. These are the "New RSVP from …" emails
// hosts get for each reply (api/wedding-rsvp.ts), shown as phone notifications landing one
// by one, newest on top, in front of the real Guests tab on a laptop.
const ARRIVALS = [
  { name: "Maria Santos", body: "Coming · 2 guests · Vegetarian" },
  { name: "Paolo Cruz", body: "Can’t make it" },
  { name: "Bea Reyes", body: "Coming · 1 guest · “See you there 💛”" },
];
const EVERY = 2400; // ms between arrivals
const HOLD = 3200; // ms all three stay before they clear and start again

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(
    () =>
      setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches),
    [],
  );
  return reduce;
}

/** How many have arrived (0–3), and which round we're on (so each round animates afresh). */
function useArrivals() {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ count: 0, round: 0 });
  useEffect(() => {
    if (reduce) return setState({ count: ARRIVALS.length, round: 0 });
    let t = 0;
    const step = (count: number, round: number) => {
      setState({ count, round });
      if (count < ARRIVALS.length)
        t = window.setTimeout(
          () => step(count + 1, round),
          count === 0 ? 900 : EVERY,
        );
      else t = window.setTimeout(() => step(0, round + 1), HOLD);
    };
    step(0, 0);
    return () => window.clearTimeout(t);
  }, [reduce]);
  return state;
}

function Arrivals() {
  const { count, round } = useArrivals();
  // Newest first: the latest arrival sits on top and the others move down.
  const shown = ARRIVALS.slice(0, count).reverse();
  return (
    <div className="rsvp-arrivals" aria-hidden>
      <p key={count} className={`rsvp-arrivals-count ${count ? "is-on" : ""}`}>
        <span className="rsvp-dot" />
        {count || 1} new RSVP{count > 1 ? "s" : ""}
      </p>
      {shown.map((a, i) => (
        <div
          key={`${round}-${a.name}`}
          className="rsvp-slot"
          style={{
            transform: `translateY(calc(${i * 100}% + ${i * 8}px))`,
            zIndex: 10 - i,
          }}
        >
          <div className="rsvp-notice">
            <div className="rsvp-note-row">
              <span className="rsvp-app">
                <img src="/brand/brandmark-white.png" alt="" />
              </span>
              <div className="min-w-0">
                <p className="rsvp-note-top">
                  <b>The RSVP Studio</b>
                  <span>{i === 0 ? "now" : `${i * 2}m ago`}</span>
                </p>
                <p className="rsvp-note-title">New RSVP from {a.name}</p>
                <p className="rsvp-note-body">{a.body}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RsvpHero() {
  return (
    <section
      className="relative overflow-hidden pb-16 pt-10 text-center sm:pb-20 sm:pt-14 md:pb-24 md:pt-20"
      style={{
        background:
          "linear-gradient(180deg, #dfeaff 0%, #eef4ff 48%, var(--warm-white) 100%)",
      }}
    >
      <div className="container-x">
        {/* Sized like the Stationery Design hero. */}
        <h1
          className="mx-auto max-w-3xl font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] text-balance"
          style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
        >
          RSVP Management
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-[var(--slate)] text-balance md:text-xl">
          Know who’s coming the moment they reply.{" "}
          <br className="hidden sm:inline" />
          Free with every RSVP Studio&nbsp;website.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-x-6 gap-y-2 sm:flex-row">
          <Link
            to="/build"
            className="btn btn-primary w-full max-w-[280px] sm:w-auto"
          >
            Start free
          </Link>
          <a
            href="#how"
            className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-medium text-[var(--ink)]"
          >
            <span className="underline-offset-[5px] group-hover:underline">
              See how it works
            </span>
            <i className="ri-arrow-down-line" aria-hidden />
          </a>
        </div>

        {/* The real Guests tab (account portal, ?demo), with replies arriving in front of it. */}
        <div className="rsvp-hero-art relative mx-auto mt-12 md:mt-16">
          <div className="rsvp-laptop">
            <div className="rsvp-laptop-screen">
              <img
                src="/services/rsvp/guests-laptop.webp"
                alt="The Guests tab: every reply with party size, dietary needs and messages"
                width={1600}
                height={1000}
              />
            </div>
            <div className="rsvp-laptop-base" />
          </div>
          <Arrivals />
        </div>
        {/* Under the laptop, centred on it (the laptop sits right of centre on wide screens). */}
        <p className="rsvp-under-laptop mt-8 text-center text-[14px] text-[var(--slate)] text-balance">
          <a href="/build" className="font-medium text-[var(--ink)] underline underline-offset-4">Premium</a> emails you the moment each guest replies, and reminds guests two days before.
        </p>
      </div>
    </section>
  );
}
