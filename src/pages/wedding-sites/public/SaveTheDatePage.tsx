import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../../../lib/supabase";
import { SiteCreditProvider, CreditLine } from "../engine/siteCredit";
import { stdDaysLeft, stdGoogleCalendar, stdIcs, stdNames, stdOccasion, stdWhen, type SaveTheDate } from "../content/saveTheDate";
import { getSitePassword } from "./sitePassword";
import "./save-the-date.css";

// /invite/<slug> while it's a Save the Date (supabase/save-the-date.sql): the studio's card
// (or its video), the names and date, a countdown, Add to calendar, and, when the studio
// turned it on, "Get the invitation when it's ready", which adds the guest to the couple's
// invite list. The card's own colours tint the page (a blurred copy behind everything).

export default function SaveTheDatePage({ std, slug, preview = false }: { std: SaveTheDate; slug: string; preview?: boolean }) {
  const names = stdNames(std);
  const when = stdWhen(std);
  const days = stdDaysLeft(std);
  const link = `https://thersvpstudio.com/invite/${slug}`;
  const google = stdGoogleCalendar(std, link);
  const ics = useMemo(() => {
    const text = stdIcs(std, link);
    return text ? `data:text/calendar;charset=utf-8,${encodeURIComponent(text)}` : null;
  }, [std, link]);
  const [calOpen, setCalOpen] = useState(false);

  // One open per browser (Studio's preview doesn't count).
  useEffect(() => {
    if (preview) return;
    const key = `std-open:${slug}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* private mode: count it anyway */
    }
    // (A Supabase query only runs once it's awaited or .then()'d.)
    supabase.rpc("save_the_date_opened", { p_slug: slug }).then(() => {});
  }, [slug, preview]);

  return (
    <SiteCreditProvider value={{ show: true, slug }}>
      <main className="stdp">
        <div className="stdp-wash" style={{ backgroundImage: `url("${std.image.url}")` }} aria-hidden />
        <div className="stdp-inner">
          <p className="stdp-kicker">Save the date</p>
          <figure className="stdp-card" style={{ aspectRatio: `${std.image.width} / ${std.image.height}` }}>
            {std.video?.url ? (
              <video src={std.video.url} poster={std.image.url} autoPlay muted loop playsInline aria-label={`${names}’s Save the Date`} />
            ) : (
              <img src={std.image.url} alt={`${names}’s Save the Date`} width={std.image.width} height={std.image.height} />
            )}
          </figure>

          <h1 className="stdp-names">{names || stdOccasion(std)}</h1>
          {when ? (
            <p className="stdp-when">
              {when.long}
              {when.time ? ` · ${when.time}` : ""}
            </p>
          ) : null}
          {std.venue ? <p className="stdp-venue">{std.venue}</p> : null}
          {days !== null && days > 0 ? (
            <p className="stdp-count">
              <b>{days.toLocaleString("en-PH")}</b> {days === 1 ? "day" : "days"} to go
            </p>
          ) : days === 0 ? (
            <p className="stdp-count">
              <b>Today</b>
            </p>
          ) : null}

          {google || ics ? (
            <div className="stdp-cal">
              <button type="button" className="stdp-btn" onClick={() => setCalOpen((v) => !v)} aria-expanded={calOpen}>
                Add to calendar
              </button>
              {calOpen ? (
                <div className="stdp-cal-menu">
                  {google ? (
                    <a href={google} target="_blank" rel="noopener">
                      Google Calendar
                    </a>
                  ) : null}
                  {ics ? (
                    <a href={ics} download={`${slug}.ics`}>
                      Apple Calendar or Outlook
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <p className="stdp-follow">Invitation to follow.</p>

          {std.signup ? <Signup slug={slug} names={names} preview={preview} /> : null}

          <footer className="stdp-credit">
            <CreditLine linkStyle={{ color: "inherit", fontWeight: 600, textDecoration: "none" }} />
          </footer>
        </div>
      </main>
    </SiteCreditProvider>
  );
}

function Signup({ slug, names, preview }: { slug: string; names: string; preview: boolean }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (preview) return setState("done");
    setState("sending");
    setError(null);
    const { data, error: err } = await supabase.rpc("save_the_date_signup", {
      p_slug: slug,
      p_name: name,
      p_contact: contact,
      p_password: getSitePassword(slug) || null,
    });
    if (!err && (data === "ok" || data === "already")) return setState("done");
    const m = err?.message ?? "";
    setError(
      /STD_NAME/.test(m)
        ? "Please add your name."
        : /STD_CONTACT/.test(m)
          ? "Please add an email address or a mobile number."
          : /STD_BUSY/.test(m)
            ? "Lots of people are signing up right now. Please try again in a minute."
            : /STD_CLOSED/.test(m)
              ? "Sign-ups are closed for this Save the Date."
              : "That didn’t go through. Please try again.",
    );
    setState("error");
  };

  if (state === "done")
    return (
      <div className="stdp-signup stdp-done" role="status">
        <p className="stdp-signup-title">You’re on the list.</p>
        <p>We’ll send you {names ? `${names}’s` : "the"} invitation when it’s ready.</p>
      </div>
    );

  return (
    <form className="stdp-signup" onSubmit={submit}>
      <p className="stdp-signup-title">Get the invitation when it’s ready</p>
      <label>
        <span>Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoCapitalize="words" maxLength={120} required />
      </label>
      <label>
        <span>Email or mobile number</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={254} required />
      </label>
      {error ? <p className="stdp-error">{error}</p> : null}
      <button type="submit" className="stdp-btn" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send me the invitation"}
      </button>
      <p className="stdp-consent">
        Used only to send you {names ? `${names}’s` : "the"} invitation. Only the hosts and The RSVP Studio see it.
      </p>
    </form>
  );
}
