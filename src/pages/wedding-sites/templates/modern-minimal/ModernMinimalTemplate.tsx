import { useRef, type ReactNode } from "react";
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
import { PhotoSlot } from "../shared/PhotoSlot";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { MM_CSS } from "./styles";

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

function Section({ n, label, children, id, tint }: { n: number; label: string; children: ReactNode; id?: string; tint?: boolean }) {
  return (
    <section id={id} className={`mm-sec ${tint ? "mm-sec--tint" : ""}`}>
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
              <h1 className="mm-names" aria-label={names.join(" & ")}>
                {(names.length ? names : ["Our celebration"]).map((nm, i) => (
                  <span key={i} className="mm-line">
                    <span style={{ animationDelay: `${0.2 + i * 0.14}s` }}>
                      {i > 0 ? <em className="mm-amp">&amp; </em> : null}
                      {nm}
                    </span>
                  </span>
                ))}
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
                    <p className="mm-big mm-big--text">{loc.name}</p>
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

      {v.hostIntro && (story.length || content.keyPeople.length) ? (
        <Section n={next()} label={content.occasion === "wedding" || !content.occasion ? "Our story" : "About"}>
          {story.map((p, i) => (
            <p key={i} className={i === 0 ? "mm-lede" : "mm-p"} data-reveal>
              {p}
            </p>
          ))}
          {content.keyPeople.length ? (
            <ul className="mm-people">
              {content.keyPeople.map((p, i) => (
                <li key={p.id} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                  {p.photo ? <PhotoSlot image={p.photo} className="mm-people__photo" /> : null}
                  <b>{p.name}</b>
                  {p.role ? <span>{p.role}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {v.schedule && content.schedule.length ? (
        <Section n={next()} label="Schedule" tint>
          <ol className="mm-sched">
            {content.schedule.map((s, i) => (
              <li key={s.id} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                <time>{timeOf(s.startTime)}</time>
                <div>
                  <b>{s.label}</b>
                  {s.description ? <p>{s.description}</p> : null}
                  {s.location?.name ? <p className="mm-small">{s.location.name}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {v.venue && (loc.name || loc.addressLine) ? (
        <Section n={next()} label="Venue">
          <div className="mm-venue" data-reveal>
            {loc.photo ? <PhotoSlot image={loc.photo} className="mm-venue__photo" /> : null}
            <p className="mm-venue__name">{loc.name}</p>
            {loc.addressLine ? <p className="mm-small">{loc.addressLine}</p> : null}
            <VenueLinks content={content} font={theme.bodyFont} color={theme.ink} align="left" style={{ marginTop: 12 }} />
          </div>
        </Section>
      ) : null}

      {(v.accommodations && content.accommodations.length) || (v.travelInformation && content.travelInformation.length) ? (
        <Section n={next()} label="Travel" tint>
          <div className="mm-list">
            {v.accommodations
              ? content.accommodations.map((a) => (
                  <div key={a.id} className="mm-item" data-reveal>
                    <p className="mm-meta">Stay</p>
                    <b>{a.name}</b>
                    <p>{a.addressLine}</p>
                    {a.notes ? <p className="mm-small">{a.notes}</p> : null}
                    {a.bookingUrl ? (
                      <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer" className="mm-link">
                        Book a room →
                      </a>
                    ) : null}
                  </div>
                ))
              : null}
            {v.travelInformation
              ? content.travelInformation.map((t) => (
                  <div key={t.id} className="mm-item" data-reveal>
                    <p className="mm-meta">Getting there</p>
                    <b>{t.title}</b>
                    <p>{t.body}</p>
                  </div>
                ))
              : null}
          </div>
        </Section>
      ) : null}

      {hasEntourage(content) ? (
        <Section n={next()} label={entourageTitle(content).replace(/^The /, "")}>
          <div data-reveal>
            <EntourageBlock content={content} ink={theme.ink} muted={theme.muted} displayFont={theme.bodyFont} bodyFont={theme.bodyFont} heading={false} />
          </div>
        </Section>
      ) : null}

      {v.gallery && (gallery.length || editorPreview) ? (
        <Section n={next()} label={content.galleries.find((g) => g.title)?.title || "Photos"}>
          <div className="mm-gallery">
            {(gallery.length ? gallery : [null, null, null]).map((g, i) => (
              <figure key={g?.id ?? i} className="mm-gallery__item" data-reveal style={{ transitionDelay: `${(i % 3) * 80}ms` }}>
                <PhotoSlot image={g?.image} editorPreview={editorPreview} className="mm-gallery__img" />
                <figcaption>
                  <span className="mm-num">{String(i + 1).padStart(2, "0")}</span>
                  {g?.caption ? ` ${g.caption}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      ) : null}

      {v.registry && (content.registryLinks.length || hasCashGifts(content)) ? (
        <Section n={next()} label="Gifts" tint>
          <div data-reveal>
            <div className="mm-links">
              {content.registryLinks.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.storeName}
                  <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
            <CashGifts content={content} look={{ ink: theme.ink, muted: mutedText(theme), surface: theme.background, line: `${theme.muted}55`, bodyFont: theme.bodyFont, radius: 0, align: "left" }} />
          </div>
        </Section>
      ) : null}

      {v.faqs && content.faqs.length ? (
        <Section n={next()} label="Questions">
          <div className="mm-faq">
            {[...content.faqs]
              .sort((a, b) => a.order - b.order)
              .map((f) => (
                <details key={f.id} data-reveal>
                  <summary>
                    <span>{f.question}</span>
                    <span className="mm-faq__x" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p>{f.answer}</p>
                </details>
              ))}
          </div>
        </Section>
      ) : null}

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
