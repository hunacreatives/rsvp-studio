import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import { supabase } from "../../../../lib/supabase";
import { getSitePassword } from "../../public/sitePassword";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Paddle } from "./art";

// The far baseline: "Who's playing" (the open-play paddle rack: everyone who said yes queues
// their paddle, first names only) and the RSVP. On the published page the names come from
// open_play_roster() (supabase/open-play-template.sql), which only answers when the host
// left the rack on; the sample and the builder show sample names. A yes slides the guest's
// own paddle into the rack.

const SAMPLE = ["Kai", "Bea", "Migs", "Ria", "Paolo", "Jas", "Nico", "Tin"];
const RACK = 12; // paddles shown before "+N more"

function useRoster(content: EventContent, live: boolean, enabled: boolean) {
  const [names, setNames] = useState<string[] | null>(live ? null : SAMPLE);
  useEffect(() => {
    if (!live || !enabled || !content.slug) return;
    let alive = true;
    supabase
      .rpc("open_play_roster", { p_slug: content.slug, p_password: getSitePassword(content.slug) || null })
      .then(({ data, error }) => {
        if (!alive) return;
        setNames(error ? [] : ((data as { first_name: string }[] | null) ?? []).map((r) => r.first_name).filter(Boolean));
      });
    return () => {
      alive = false;
    };
  }, [live, enabled, content.slug]);
  return [names, setNames] as const;
}

function Rack({ names, label, note, joined, sample }: { names: string[]; label: string; note?: string; joined: string | null; /** The builder: say these are stand-ins. */ sample?: boolean }) {
  const shown = names.slice(0, RACK);
  const more = names.length - shown.length;
  const empties = Math.max(0, 6 - shown.length);
  return (
    <div className="op-rack" data-reveal>
      <div className="op-rack__head">
        <p className="op-label">{label}</p>
        <p className="op-mono op-rack__count">{names.length ? `${names.length} playing` : "Be the first"}</p>
      </div>
      <div className="op-rack__track">
      <div className="op-rack__inner">
      <div className="op-rack__bar" />
      <ul className="op-rack__row">
        {shown.map((n, i) => (
          <li key={`${n}-${i}`} className={`op-rack__slot ${joined && i === shown.length - 1 && n === joined ? "is-new" : ""}`} style={{ ["--i" as string]: i }}>
            <Paddle name={n} tone={i} />
          </li>
        ))}
        {Array.from({ length: empties }, (_, i) => (
          <li key={`e${i}`} className="op-rack__slot op-rack__slot--empty">
            <Paddle tone={0} empty />
          </li>
        ))}
        {more > 0 ? (
          <li className="op-rack__more op-mono">+{more}</li>
        ) : null}
      </ul>
      </div>
      </div>
      {note ? <p className="op-small">{note}</p> : null}
      {sample ? <p className="op-small" style={{ opacity: 0.75 }}>Sample names for now. Guests who say yes take their place.</p> : null}
    </div>
  );
}

export default function Roster({ content, editorPreview, live, rackOn }: { content: EventContent; editorPreview: boolean; live: boolean; rackOn: boolean }) {
  const [names, setNames] = useRoster(content, live, rackOn);
  const [joined, setJoined] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const id = useId();
  const title = customValue(content, "rsvpTitle") || "Join the roster";
  const thanks = customValue(content, "thankYou") || "You’re on the roster. See you on court.";

  useEffect(() => {
    if (form.state !== "success") return;
    setDone(true);
    if (form.attending === "yes") {
      const first = (form.values.name ?? "").trim().split(/\s+/)[0];
      if (first) {
        setJoined(first);
        setNames((n) => [...(n ?? []).filter((x) => x !== first), first]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state, form.attending]);

  const going = form.values.attending === "yes";
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);

  return (
    <div className="op-roster">
      {rackOn && names ? <Rack names={names} label={customValue(content, "rackLabel") || "Who’s playing"} note={customValue(content, "paddleNote") || undefined} joined={joined} sample={editorPreview} /> : null}

      <section id="rsvp" className="op-rsvp" data-reveal>
        {done ? (
          <div className="op-done" role="status">
            <p className="op-label">{form.attending === "no" ? "Next time" : "Game on"}</p>
            <h2 className="op-h2">{form.attending === "no" ? "We’ll miss you" : "You’re in"}</h2>
            <p className="op-text">{form.attending === "no" ? "Thanks for letting us know." : thanks}</p>
            {form.copyNote ? <p className="op-small">{form.copyNote}</p> : null}
            <button type="button" className="op-btn op-btn--line" onClick={() => setDone(false)}>
              Change my reply
            </button>
          </div>
        ) : (
          <>
            <p className="op-label">Kindly reply</p>
            <h2 className="op-h2">{title}</h2>
            {form.replyBy ? <p className="op-small">{form.replyBy}</p> : null}
            {form.closed ? (
              <p className="op-text" role="status">
                {form.closedText}
              </p>
            ) : (
              <form className="op-form" onSubmit={form.submit} noValidate>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
                <div className="op-choice" role="group" aria-label="Are you playing?">
                  <button type="button" className={`op-choice__opt ${going ? "is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                    I’m playing
                  </button>
                  <button type="button" className={`op-choice__opt ${form.values.attending === "no" ? "is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                    Can’t make it
                  </button>
                </div>
                <div>
                  <label htmlFor={`${id}-name`}>Your name</label>
                  <input id={`${id}-name`} className="op-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="op-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="op-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>
                {going ? (
                  <div>
                    <label htmlFor={`${id}-guests`}>How many are coming, including you?</label>
                    <div className="op-count" id={`${id}-guests`} role="radiogroup" aria-label="How many are coming">
                      {counts.map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`op-count__n ${(form.values.guests ?? "1") === String(n) ? "is-picked" : ""}`} onClick={() => form.set("guests", String(n))}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="op-field" /> : null}
                <div>
                  <label htmlFor={`${id}-note`}>A note (optional)</label>
                  <textarea id={`${id}-note`} className="op-field" rows={3} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                </div>
                {form.error ? (
                  <p className="op-error" role="alert">
                    {form.error}
                  </p>
                ) : null}
                <button type="submit" className="op-btn op-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                  {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Put my paddle in"}
                </button>
                {editorPreview ? <p className="op-small">Preview only. Guests can reply once your site is published.</p> : null}
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
