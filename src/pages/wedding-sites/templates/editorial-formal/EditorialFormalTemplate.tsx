import { useRef } from "react";
import type { TemplateProps } from "../../engine/registry";
import { mutedText, resolveEventTheme } from "../../engine/theme";
import type { EditorialFormalSettings } from "./index";
import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import EntourageBlock, { hasEntourage } from "../shared/Entourage";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import VenueLinks from "../shared/VenueLinks";
import RsvpForm from "../shared/RsvpForm";
import { photosOf, useReveal } from "../shared/reveal";
import { PhotoSlot } from "../shared/PhotoSlot";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { EF_CSS } from "./styles";

// Editorial Formal: formal stationery, made for a phone. An arched portrait for the hero
// (the couple's photo, slowly drifting) with the names set large and a countdown; the story
// beside two layered photos and a drop cap; a schedule whose line draws as you scroll; an
// editorial gallery; and the RSVP on a framed card. Every section fades up as it arrives.
// heroTreatment: "centered-numeral" stacks the hero; "left-aligned-eyebrow" sets the words
// beside the photo on wider screens. Colours and fonts come from the chosen palette/pairing.

const when = (iso: string) => {
  const d = iso ? parseEventDate(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    day: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "long" }),
    year: d.getFullYear(),
    time: iso.includes("T") ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
  };
};
const timeOf = (iso: string) => {
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

function Names({ content }: { content: EventContent }) {
  const names = content.hosts.map((h) => h.name.trim()).filter(Boolean);
  if (!names.length) return <h1 className="ef-names">Our celebration</h1>;
  return (
    <h1 className="ef-names" aria-label={names.join(" & ")}>
      {names.map((n, i) => (
        <span key={i} className="ef-names__row">
          {i > 0 ? <span className="ef-amp">&amp;</span> : null}
          <span className="ef-names__n" style={{ animationDelay: `${0.35 + i * 0.25}s` }}>
            {n}
          </span>
        </span>
      ))}
    </h1>
  );
}

function Ornament() {
  return (
    <svg className="ef-orn" viewBox="0 0 120 14" aria-hidden>
      <path d="M2 7 H48 M72 7 H118" />
      <path d="M60 2 L65 7 L60 12 L55 7 Z" />
    </svg>
  );
}

function Title({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <div className="ef-title" data-reveal>
      {kicker ? <p className="ef-kicker">{kicker}</p> : null}
      <h2>{children}</h2>
      <Ornament />
    </div>
  );
}

export default function EditorialFormalTemplate({ content, settings, editorPreview = false }: TemplateProps<EditorialFormalSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const v = settings.sectionVisibility;
  const root = useRef<HTMLDivElement | null>(null);
  const photos = photosOf(content);
  const hero = settings.heroImage ?? photos[0]?.image ?? null;
  const w = when(content.eventDate);
  const split = settings.heroTreatment === "left-aligned-eyebrow";
  const wedding = !content.occasion || content.occasion === "wedding";
  const story = (content.story ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);
  const loc = content.primaryLocation;
  const hasVenue = Boolean(loc.name || loc.addressLine);
  // Each photo is shown once: the hero, then two beside the story, the rest in the gallery.
  const rest = photos.filter((p) => p.image !== hero);
  const storyA = rest[0]?.image ?? null;
  const storyB = rest[1]?.image ?? null;
  const gallery = rest.slice(2);
  useReveal(root, !editorPreview, [content.schedule.length, photos.length]);

  const vars = {
    "--ef-bg": theme.background,
    "--ef-ink": theme.ink,
    "--ef-muted": theme.muted,
    "--ef-text2": mutedText(theme),
    "--ef-display": theme.displayFont,
    "--ef-body": theme.bodyFont,
  } as React.CSSProperties;

  return (
    <div ref={root} className={`ef ${editorPreview ? "ef--editor" : ""}`} style={vars}>
      <style>{EF_CSS}</style>

      {v.hero ? (
        <header className={`ef-hero ${split ? "ef-hero--split" : ""}`}>
          <div className="ef-hero__photo">
            {hero || editorPreview ? (
              <PhotoSlot image={hero} editorPreview={editorPreview} className="ef-arch" eager label="Add your photo" />
            ) : w ? (
              <div className="ef-arch ef-arch--date" aria-hidden>
                <span>{w.day}</span>
                <small>{w.month}</small>
              </div>
            ) : null}
          </div>
          <div className="ef-hero__words">
            <p className="ef-kicker ef-in" style={{ animationDelay: "0.15s" }}>
              {wedding ? "Together with their families" : "You’re invited to celebrate"}
            </p>
            <Names content={content} />
            {w ? (
              <p className="ef-when ef-in" style={{ animationDelay: "0.9s" }}>
                {w.weekday}
                <span className="ef-dot" />
                {w.day} {w.month} {w.year}
                {w.time ? (
                  <>
                    <span className="ef-dot" />
                    {w.time}
                  </>
                ) : null}
              </p>
            ) : null}
            {loc.name ? (
              <p className="ef-where ef-in" style={{ animationDelay: "1.05s" }}>
                {loc.name}
              </p>
            ) : null}
            {content.eventDate ? (
              <div className="ef-in" style={{ animationDelay: "1.25s" }}>
                <Countdown iso={content.eventDate} live={!editorPreview} prefix="ef" />
              </div>
            ) : null}
            {v.rsvp ? (
              <a href="#rsvp" className="ef-btn ef-in" style={{ animationDelay: "1.4s" }}>
                RSVP
              </a>
            ) : null}
          </div>
        </header>
      ) : null}

      {v.hostIntro && (story.length || content.keyPeople.length) ? (
        <section className="ef-sec">
          {story.length ? (
            <div className="ef-story">
              <div className={`ef-story__photos ${storyA || editorPreview ? "" : "is-empty"}`} data-reveal>
                <PhotoSlot image={storyA} editorPreview={editorPreview} className="ef-story__a" />
                <PhotoSlot image={storyB} editorPreview={editorPreview} className="ef-story__b" label="Add" />
              </div>
              <div className="ef-story__text">
                <Title kicker={wedding ? "How it began" : "About"}>Our story</Title>
                {story.map((p, i) => (
                  <p key={i} className={i === 0 ? "ef-lede" : ""} data-reveal>
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
          {content.keyPeople.length ? (
            <div className="ef-people">
              <p className="ef-kicker" data-reveal>
                Standing beside us
              </p>
              <ul>
                {content.keyPeople.map((p, i) => (
                  <li key={p.id} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                    {p.photo ? <PhotoSlot image={p.photo} className="ef-people__photo" /> : null}
                    <b>{p.name}</b>
                    {p.role ? <span>{p.role}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {v.schedule && content.schedule.length ? (
        <section className="ef-sec ef-sec--tint">
          <Title kicker={w ? `${w.weekday}, ${w.day} ${w.month}` : undefined}>The day</Title>
          <ol className="ef-timeline" data-reveal>
            {content.schedule.map((s, i) => (
              <li key={s.id} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                <time>
                  {timeOf(s.startTime)}
                  {s.endTime ? ` – ${timeOf(s.endTime)}` : ""}
                </time>
                <span className="ef-timeline__dot" />
                <div>
                  <b>{s.label}</b>
                  {s.description ? <p>{s.description}</p> : null}
                  {s.location?.name ? <p className="ef-small">{s.location.name}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {v.venue && hasVenue ? (
        <section className="ef-sec">
          <Title kicker="Where">The venue</Title>
          <div className="ef-venue" data-reveal>
            {loc.photo ? <PhotoSlot image={loc.photo} className="ef-venue__photo" /> : null}
            <p className="ef-venue__name">{loc.name}</p>
            {loc.addressLine ? <p className="ef-venue__addr">{loc.addressLine}</p> : null}
            <VenueLinks content={content} font={theme.bodyFont} color={theme.ink} style={{ marginTop: 14 }} />
          </div>
        </section>
      ) : null}

      {(v.accommodations && content.accommodations.length) || (v.travelInformation && content.travelInformation.length) ? (
        <section className="ef-sec ef-sec--tint">
          <Title kicker="Getting there">Travel &amp; stay</Title>
          <div className="ef-cols">
            {v.accommodations
              ? content.accommodations.map((a, i) => (
                  <div key={a.id} className="ef-card" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                    <p className="ef-kicker">Where to stay</p>
                    <b>{a.name}</b>
                    <p>{a.addressLine}</p>
                    {a.notes ? <p className="ef-small">{a.notes}</p> : null}
                    {a.bookingUrl ? (
                      <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer" className="ef-link">
                        Book a room →
                      </a>
                    ) : null}
                  </div>
                ))
              : null}
            {v.travelInformation
              ? content.travelInformation.map((t, i) => (
                  <div key={t.id} className="ef-card" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                    <p className="ef-kicker">Getting there</p>
                    <b>{t.title}</b>
                    <p>{t.body}</p>
                  </div>
                ))
              : null}
          </div>
        </section>
      ) : null}

      {hasEntourage(content) ? (
        <section className="ef-sec" data-reveal>
          <EntourageBlock content={content} ink={theme.ink} muted={theme.muted} displayFont={theme.displayFont} bodyFont={theme.bodyFont} />
        </section>
      ) : null}

      {v.gallery && (gallery.length || editorPreview) ? (
        <section className="ef-sec ef-sec--wide">
          <Title kicker="Moments">{content.galleries.find((g) => g.title)?.title || "Gallery"}</Title>
          <div className={`ef-gallery ${gallery.length >= 7 ? "ef-gallery--many" : ""}`}>
            {(gallery.length ? gallery : [null, null, null, null]).map((g, i) => (
              <figure
                key={g?.id ?? i}
                className="ef-gallery__item"
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 90}ms`, aspectRatio: g?.image ? `${g.image.width || 4} / ${g.image.height || 5}` : ["4 / 5", "1", "3 / 4", "4 / 3"][i % 4] }}
              >
                <PhotoSlot image={g?.image} editorPreview={editorPreview} className="ef-gallery__img" />
                {g?.caption ? <figcaption>{g.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {v.registry && (content.registryLinks.length || hasCashGifts(content)) ? (
        <section className="ef-sec ef-sec--tint">
          <Title kicker="With love">Gifts</Title>
          <div className="ef-center" data-reveal>
            <div className="ef-pills">
              {content.registryLinks.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="ef-pill">
                  {r.storeName}
                </a>
              ))}
            </div>
            <CashGifts content={content} look={{ ink: theme.ink, muted: mutedText(theme), surface: theme.background, line: `${theme.muted}55`, bodyFont: theme.bodyFont, displayFont: theme.displayFont }} />
          </div>
        </section>
      ) : null}

      {v.faqs && content.faqs.length ? (
        <section className="ef-sec">
          <Title kicker="Good to know">Questions</Title>
          <div className="ef-faq">
            {[...content.faqs]
              .sort((a, b) => a.order - b.order)
              .map((f, i) => (
                <details key={f.id} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                  <summary>
                    {f.question}
                    <span className="ef-faq__plus" aria-hidden />
                  </summary>
                  <p>{f.answer}</p>
                </details>
              ))}
          </div>
        </section>
      ) : null}

      {v.rsvp ? (
        <section id="rsvp" className="ef-sec ef-sec--tint">
          <div className="ef-rsvp" data-reveal>
            <span className="ef-rsvp__corner ef-rsvp__corner--tl" aria-hidden />
            <span className="ef-rsvp__corner ef-rsvp__corner--br" aria-hidden />
            <p className="ef-kicker">Kindly reply</p>
            <h2 className="ef-rsvp__h">Will you join us?</h2>
            <Ornament />
            <RsvpForm
              content={content}
              editorPreview={editorPreview}
              skin={{
                font: theme.bodyFont,
                ink: theme.ink,
                muted: mutedText(theme),
                field: { className: "ef-field" },
                button: { className: "ef-btn ef-btn--block" },
                choice: (on) => ({ className: `ef-field ef-choice ${on ? "is-on" : ""}` }),
                success: { style: { textAlign: "center" } },
              }}
            />
          </div>
        </section>
      ) : null}

      {credit.show ? (
        <footer className="ef-foot">
          <p className="ef-foot__names">{content.hosts.map((h) => h.name).filter(Boolean).join(" & ")}</p>
          <p className="ef-foot__credit">
            <CreditLine linkStyle={{ color: "inherit", fontWeight: 600 }} />
          </p>
        </footer>
      ) : null}
    </div>
  );
}
