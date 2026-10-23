import { Fragment, useRef, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { mutedText, resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import { parseEventDate } from "../../content/parseEventDate";
import EntourageBlock, { entourageTitle, hasEntourage } from "../shared/Entourage";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import VenueLinks from "../shared/VenueLinks";
import RsvpForm from "../shared/RsvpForm";
import { photosOf, useReveal } from "../shared/reveal";
import { PhotoSlot, withAddSlots } from "../shared/PhotoSlot";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { MM_CSS } from "./styles";
import { MM_SECTIONS } from "./sections";
import { AddItem, Field, HiddenSection, inOrder, siteEdit } from "../shared/siteEdit";

// Modern Minimal: a Swiss grid, made for a phone. The hero splits big stacked names from a
// tall photo (it slides in from a mask); a band of names and date scrolls underneath; then
// numbered sections (01 Story, 02 Schedule…) whose hairline rules draw across as they arrive.
// Headings use the pairing's sans (body) font at a heavy weight, so it reads as type-led
// rather than stationery. Colours and fonts come from the chosen palette/pairing.

const dateParts = (iso: string) => {
  const d = iso ? parseEventDate(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    short: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`,
    long: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    time: iso.includes("T") ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
  };
};
const timeOf = (iso: string) => {
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
};

function Section({ n, label, children, id, tint, edit }: { n: number; label: string; children: ReactNode; id?: string; tint?: boolean; edit?: Record<string, string> }) {
  return (
    <section id={id} className={`mm-sec ${tint ? "mm-sec--tint" : ""}`} {...edit}>
      <div className="mm-sec__rule" data-reveal />
      <div className="mm-sec__grid">
        <div className="mm-sec__label" data-reveal>
          <span className="mm-num">{String(n).padStart(2, "0")}</span>
          <h2>{label}</h2>
        </div>
        <div className="mm-sec__body">{children}</div>
      </div>
    </section>
  );
}

export default function ModernMinimalTemplate({ content, settings, editorPreview = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const v = settings.sectionVisibility;
  const root = useRef<HTMLDivElement | null>(null);
  const photos = photosOf(content);
  const hero = settings.heroImage ?? photos[0]?.image ?? null;
  const gallery = photos.filter((p) => p.image !== hero);
  const names = content.hosts.map((h) => h.name.trim()).filter(Boolean);
  const d = dateParts(content.eventDate);
  const loc = content.primaryLocation;
  const story = (content.story ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);
  useReveal(root, !editorPreview, [content.schedule.length, photos.length]);

  // Section numbers follow what's actually shown.
  let n = 0;
  const next = () => ++n;
  const band = [names.join(" & "), d?.long, loc.name].filter(Boolean).join("   —   ");


  // The movable sections (MM_SECTIONS). In the builder each one also shows while empty, with
  // its "+ Add …" item, so it can be filled in on the page.
  const ed = siteEdit(editorPreview);
  const people = content.keyPeople;
  const stays = v.accommodations ? content.accommodations : [];
  const travel = v.travelInformation ? content.travelInformation : [];
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order);
  const blocks: Record<string, () => ReactNode> = {
    hostIntro: () =>
      story.length || people.length || ed.on ? (
        <Section n={next()} label={content.occasion === "wedding" || !content.occasion ? "Our story" : "About"} edit={ed.section("hostIntro")}>
          {(story.length ? story : ed.on ? [""] : []).map((p, i) => (
            <Field key={i} as="p" path={`story#${i}`} value={p} placeholder="A few lines in your own words: how it began, what the day means to you." editor={editorPreview} multiline className={i === 0 ? "mm-lede" : "mm-p"} data-reveal />
          ))}
          {people.length || ed.on ? (
            <ul className="mm-people" {...ed.list("keyPeople")}>
              {people.map((p, i) => (
                <li key={p.id} {...ed.item(p.id)} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                  {p.photo ? <PhotoSlot image={p.photo} className="mm-people__photo" /> : null}
                  <Field as="b" path="name" value={p.name} placeholder="Name" editor={editorPreview} />
                  <Field as="span" path="role" value={p.role} placeholder="Role" editor={editorPreview} />
                </li>
              ))}
            </ul>
          ) : null}
          <AddItem list="keyPeople" label={people.length ? "Add a person" : "Add the people standing beside you"} editor={editorPreview} style={{ marginTop: 18 }} />
        </Section>
      ) : null,

    schedule: () =>
      content.schedule.length || ed.on ? (
        <Section n={next()} label="Schedule" tint edit={ed.section("schedule")}>
          <ol className="mm-sched" {...ed.list("schedule")}>
            {content.schedule.map((s, i) => (
              <li key={s.id} {...ed.item(s.id)} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                <time>{timeOf(s.startTime)}</time>
                <div>
                  <Field as="b" path="label" value={s.label} placeholder="What’s happening" editor={editorPreview} />
                  {s.description ? <Field as="p" path="description" value={s.description} placeholder="" editor={editorPreview} multiline /> : null}
                  {s.location?.name ? <p className="mm-small">{s.location.name}</p> : null}
                </div>
              </li>
            ))}
          </ol>
          <AddItem list="schedule" label={content.schedule.length ? "Add to the schedule" : "Add your schedule"} editor={editorPreview} style={{ marginTop: 18 }} />
        </Section>
      ) : null,

    venue: () =>
      loc.name || loc.addressLine || ed.on ? (
        <Section n={next()} label="Venue" edit={ed.section("venue")}>
          <div className="mm-venue" data-reveal>
            {loc.photo ? <PhotoSlot image={loc.photo} className="mm-venue__photo" /> : null}
            <Field as="p" className="mm-venue__name" path="primaryLocation.name" value={loc.name} placeholder="Venue name" editor={editorPreview} />
            <Field as="p" className="mm-small" path="primaryLocation.addressLine" value={loc.addressLine} placeholder="Address" editor={editorPreview} />
            <VenueLinks content={content} font={theme.bodyFont} color={theme.ink} align="left" style={{ marginTop: 12 }} />
          </div>
        </Section>
      ) : null,

    stay: () =>
      stays.length || travel.length || ed.on ? (
        <Section n={next()} label="Travel" tint edit={ed.section("stay", ["accommodations", "travelInformation"])}>
          <div className="mm-list">
            <div {...ed.list("accommodations")} style={{ display: "contents" }}>
              {stays.map((a) => (
                <div key={a.id} {...ed.item(a.id)} className="mm-item" data-reveal>
                  <p className="mm-meta">Stay</p>
                  <Field as="b" path="name" value={a.name} placeholder="Hotel name" editor={editorPreview} />
                  <Field as="p" path="addressLine" value={a.addressLine} placeholder="Address" editor={editorPreview} />
                  {a.notes ? <Field as="p" className="mm-small" path="notes" value={a.notes} placeholder="" editor={editorPreview} multiline /> : null}
                  {a.bookingUrl ? (
                    <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer" className="mm-link">
                      Book a room →
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            <div {...ed.list("travelInformation")} style={{ display: "contents" }}>
              {travel.map((t) => (
                <div key={t.id} {...ed.item(t.id)} className="mm-item" data-reveal>
                  <p className="mm-meta">Getting there</p>
                  <Field as="b" path="title" value={t.title} placeholder="By car, by plane…" editor={editorPreview} />
                  <Field as="p" path="body" value={t.body} placeholder="How to get there" editor={editorPreview} multiline />
                </div>
              ))}
            </div>
          </div>
          {ed.on ? (
            <div className="mm-adds">
              {v.accommodations ? <AddItem list="accommodations" label="Add a place to stay" editor /> : null}
              {v.travelInformation ? <AddItem list="travelInformation" label="Add travel info" editor /> : null}
            </div>
          ) : null}
        </Section>
      ) : null,

    entourage: () =>
      hasEntourage(content) || ed.on ? (
        <Section n={next()} label={entourageTitle(content).replace(/^The /, "")} edit={ed.section("entourage")}>
          <div data-reveal>
            <EntourageBlock content={content} ink={theme.ink} muted={theme.muted} displayFont={theme.bodyFont} bodyFont={theme.bodyFont} heading={false} editor={editorPreview} />
          </div>
        </Section>
      ) : null,

    gallery: () =>
      gallery.length || editorPreview ? (
        <Section n={next()} label={content.galleries.find((g) => g.title)?.title || "Photos"} edit={ed.section("gallery")}>
          <div className="mm-gallery" {...ed.list("gallery")}>
            {withAddSlots(gallery, editorPreview, 3).map((g, i) => (
              <figure key={g?.id ?? i} {...(g ? ed.item(g.id) : {})} className="mm-gallery__item" data-reveal style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                <PhotoSlot image={g?.image} editorPreview={editorPreview} className="mm-gallery__img" />
                <figcaption>
                  <span className="mm-num">{String(i + 1).padStart(2, "0")}</span>
                  {g?.caption ? <Field path="caption" value={` ${g.caption}`} placeholder="" editor={editorPreview} /> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      ) : null,

    registry: () =>
      content.registryLinks.length || hasCashGifts(content) || ed.on ? (
        <Section n={next()} label="Gifts" tint edit={ed.section("registry")}>
          <div data-reveal>
            <div className="mm-links" {...ed.list("registryLinks")}>
              {content.registryLinks.map((r) => (
                <a key={r.id} {...ed.item(r.id)} href={ed.on ? undefined : r.url} target="_blank" rel="noopener noreferrer">
                  <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={editorPreview} />
                  <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
            <AddItem list="registryLinks" label="Add a gift link" editor={editorPreview} style={{ marginTop: 14 }} />
            <CashGifts content={content} editor={editorPreview} look={{ ink: theme.ink, muted: mutedText(theme), surface: theme.background, line: `${theme.muted}55`, bodyFont: theme.bodyFont, radius: 0, align: "left" }} />
          </div>
        </Section>
      ) : null,

    faqs: () =>
      faqs.length || ed.on ? (
        <Section n={next()} label="Questions" edit={ed.section("faqs")}>
          <div className="mm-faq" {...ed.list("faqs")}>
            {faqs.map((f) => (
              <details key={f.id} {...ed.item(f.id)} open={ed.on || undefined} data-reveal>
                <summary>
                  <Field path="question" value={f.question} placeholder="A question guests ask" editor={editorPreview} />
                  <span className="mm-faq__x" aria-hidden>
                    +
                  </span>
                </summary>
                <Field as="p" path="answer" value={f.answer} placeholder="The answer" editor={editorPreview} multiline />
              </details>
            ))}
          </div>
          <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add your first question"} editor={editorPreview} style={{ marginTop: 18 }} />
        </Section>
      ) : null,
  };

  const vars = {
    "--mm-bg": theme.background,
    "--mm-ink": theme.ink,
    "--mm-muted": theme.muted,
    "--mm-text2": mutedText(theme),
    "--mm-display": theme.displayFont,
    "--mm-body": theme.bodyFont,
  } as React.CSSProperties;

  return (
    <div ref={root} className={`mm ${editorPreview ? "mm--editor" : ""}`} style={vars}>
      <style>{MM_CSS}</style>

      {v.hero ? (
        <>
          <header className="mm-hero">
            <div className="mm-hero__words">
              <p className="mm-meta mm-in" style={{ animationDelay: "0.1s" }}>
                {content.occasion === "birthday" ? "You’re invited to the birthday of" : content.occasion && content.occasion !== "wedding" ? "You’re invited" : "The wedding of"}
              </p>
              <h1 className="mm-names" aria-label={names.join(" & ")} {...ed.list("hosts")}>
                {(editorPreview ? content.hosts : content.hosts.filter((h) => h.name.trim())).length ? (
                  (editorPreview ? content.hosts : content.hosts.filter((h) => h.name.trim())).map((h, i) => (
                    <span key={h.id} className="mm-line" {...ed.item(h.id)}>
                      <span style={{ animationDelay: `${0.2 + i * 0.14}s` }}>
                        {i > 0 ? <em className="mm-amp">&amp; </em> : null}
                        <Field path="name" value={h.name.trim()} placeholder="Name" editor={editorPreview} />
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="mm-line">
                    <span>Our celebration</span>
                  </span>
                )}
              </h1>
              <div className="mm-hero__facts mm-in" style={{ animationDelay: "0.7s" }}>
                {d ? (
                  <div>
                    <p className="mm-meta">When</p>
                    <p className="mm-big">{d.short}</p>
                    <p className="mm-small">
                      {d.long}
                      {d.time ? ` · ${d.time}` : ""}
                    </p>
                  </div>
                ) : null}
                {loc.name ? (
                  <div>
                    <p className="mm-meta">Where</p>
                    <Field as="p" className="mm-big mm-big--text" path="primaryLocation.name" value={loc.name} placeholder="" editor={editorPreview} />
                    {/* The address and map links are in the Venue section, once. */}
                    {!v.venue && loc.addressLine ? <p className="mm-small">{loc.addressLine}</p> : null}
                  </div>
                ) : null}
              </div>
              <div className="mm-hero__cta mm-in" style={{ animationDelay: "0.9s" }}>
                {v.rsvp ? (
                  <a href="#rsvp" className="mm-btn">
                    RSVP <span aria-hidden>→</span>
                  </a>
                ) : null}
                {content.eventDate ? <Countdown iso={content.eventDate} live={!editorPreview} prefix="mm" /> : null}
              </div>
            </div>
            {hero || editorPreview ? (
              <div className="mm-hero__photo">
                <PhotoSlot image={hero} editorPreview={editorPreview} className="mm-hero__img" eager label="Add your photo" />
              </div>
            ) : null}
          </header>
          {band ? (
            <div className="mm-band" aria-hidden>
              <div className="mm-band__track">
                {[0, 1, 2, 3].map((k) => (
                  <span key={k}>{band}&nbsp;&nbsp;&nbsp;—&nbsp;&nbsp;&nbsp;</span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {inOrder(MM_SECTIONS.map((x) => x.key), settings.sectionOrder).map((k) => {
        const def = MM_SECTIONS.find((x) => x.key === k)!;
        const vis = def.vis ?? [k];
        const on = vis.some((x) => v[x] !== false);
        return <Fragment key={k}>{on ? blocks[k]() : <HiddenSection k={k} vis={vis} label={def.label} editor={editorPreview} />}</Fragment>;
      })}

      {v.rsvp ? (
        <Section n={next()} label="RSVP" id="rsvp" tint>
          <div className="mm-rsvp" data-reveal>
            <p className="mm-rsvp__h">Will you join us?</p>
            <RsvpForm
              content={content}
              editorPreview={editorPreview}
              skin={{
                font: theme.bodyFont,
                ink: theme.ink,
                muted: mutedText(theme),
                field: { className: "mm-field" },
                button: { className: "mm-btn mm-btn--block" },
                choice: (on) => ({ className: `mm-field mm-choice ${on ? "is-on" : ""}` }),
              }}
            />
          </div>
        </Section>
      ) : null}

      {credit.show ? (
        <footer className="mm-foot">
          <span>{names.join(" & ")}</span>
          <span>{d?.short}</span>
          <span className="mm-foot__credit">
            <CreditLine linkStyle={{ color: "inherit", fontWeight: 700 }} />
          </span>
        </footer>
      ) : null}
    </div>
  );
}
