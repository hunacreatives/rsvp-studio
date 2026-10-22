import { useRef, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { mutedText, resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import type { EventContent, ImageAsset } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import EntourageBlock, { hasEntourage } from "../shared/Entourage";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import { Countdown } from "../shared/Countdown";
import VenueLinks from "../shared/VenueLinks";
import RsvpForm from "../shared/RsvpForm";
import { Paper, PAPER_FIBRES, PAPER_GRAIN, STATIONERY_CSS } from "../shared/stationery";
import { photosOf, useReveal } from "../shared/reveal";
import { PhotoSlot } from "../shared/PhotoSlot";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { deriveLocality } from "./content";
import { SB_CSS } from "./styles";

// Scrapbook: a linen keepsake album. Warm paper with real grain; the couple's photos as
// printed snapshots held down with washi tape or photo corners, which drop onto the page and
// settle as you scroll; hand-drawn botanical sprigs in the palette's ink; deckle-edged note
// cards, a ticket stub for the date, a postcard for the venue, lined notebook paper for the
// questions. The palette's ink (burgundy by default) is an accent, not a flood of colour.

type Tape = "tl" | "tr" | "top" | "corners" | "none";

/** A printed snapshot. `tilt` in degrees; `tape` how it's held down. */
function Print({ image, editorPreview, tilt = 0, tape = "top", caption, className = "", style, delay = 0, ratio = "4 / 5" }: { image?: ImageAsset | null; editorPreview?: boolean; tilt?: number; tape?: Tape; caption?: string; className?: string; style?: CSSProperties; delay?: number; ratio?: string }) {
  if (!image && !editorPreview) return null;
  return (
    <figure className={`sb-print ${className}`} data-reveal style={{ ...style, ["--tilt" as string]: `${tilt}deg`, transitionDelay: `${delay}ms` }}>
      <div className="sb-print__photo" style={{ aspectRatio: ratio }}>
        <PhotoSlot image={image} editorPreview={editorPreview} className="sb-print__img" />
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
      {tape === "corners" ? (
        <>
          <span className="sb-corner sb-corner--tl" />
          <span className="sb-corner sb-corner--tr" />
          <span className="sb-corner sb-corner--bl" />
          <span className="sb-corner sb-corner--br" />
        </>
      ) : tape !== "none" ? (
        <span className={`sb-tape sb-tape--${tape}`} />
      ) : null}
    </figure>
  );
}

/** A hand-drawn botanical sprig, in the palette's ink. */
function Sprig({ className = "", style, flip = false }: { className?: string; style?: CSSProperties; flip?: boolean }) {
  return (
    <svg className={`sb-sprig ${className}`} style={{ ...style, transform: flip ? "scaleX(-1)" : undefined }} viewBox="0 0 120 220" aria-hidden>
      <path className="sb-sprig__stem" d="M62 214 C58 170 64 130 58 92 C54 64 60 36 70 8" />
      {[
        [60, 180, -1],
        [61, 152, 1],
        [59, 124, -1],
        [58, 98, 1],
        [60, 72, -1],
        [64, 48, 1],
        [68, 26, -1],
      ].map(([x, y, side], i) => (
        <path
          key={i}
          className="sb-sprig__leaf"
          d={`M${x} ${y} C${x + side * 14} ${y - 6} ${x + side * 30} ${y - 4} ${x + side * 36} ${y - 18} C${x + side * 22} ${y - 22} ${x + side * 8} ${y - 14} ${x} ${y}`}
          style={{ animationDelay: `${0.4 + i * 0.12}s` }}
        />
      ))}
      <circle cx="70" cy="8" r="3.2" className="sb-sprig__bud" />
    </svg>
  );
}

function Hand({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`sb-hand ${className}`}>{children}</p>;
}

function Heading({ hand, children }: { hand?: string; children: ReactNode }) {
  return (
    <div className="sb-head" data-reveal>
      {hand ? <Hand>{hand}</Hand> : null}
      <h2>{children}</h2>
    </div>
  );
}

const dateBits = (iso: string) => {
  const d = iso ? parseEventDate(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    dots: `${pad(d.getDate())} · ${pad(d.getMonth() + 1)} · ${d.getFullYear()}`,
    long: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate(),
    year: d.getFullYear(),
    time: iso.includes("T") ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
  };
};
const timeOf = (iso: string) => {
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const namesOf = (c: EventContent) => c.hosts.map((h) => h.name.trim()).filter(Boolean);

export default function ScrapbookTemplate({ content, settings, editorPreview = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const v = settings.sectionVisibility;
  const root = useRef<HTMLDivElement | null>(null);
  const photos = photosOf(content).map((p) => p.image);
  // Each photo once: two on the cover, two beside the story, one on the postcard, the rest in the album.
  const list = settings.heroImage ? [settings.heroImage, ...photos.filter((p) => p !== settings.heroImage)] : photos;
  const [cover1, cover2, story1, story2, ...more] = list;
  const loc = content.primaryLocation;
  const postcard = loc.photo ?? more[0] ?? null;
  const album = loc.photo ? more : more.slice(1);
  const names = namesOf(content);
  const d = dateBits(content.eventDate);
  const town = deriveLocality(loc);
  const wedding = !content.occasion || content.occasion === "wedding";
  const story = (content.story ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);
  useReveal(root, !editorPreview, [content.schedule.length, list.length]);

  const vars = {
    "--sb-bg": theme.background,
    "--sb-ink": theme.ink,
    "--sb-muted": theme.muted,
    "--sb-text2": mutedText(theme),
    "--sb-display": theme.displayFont,
    "--sb-body": theme.bodyFont,
    "--sb-grain": `url("${PAPER_GRAIN}")`,
    "--sb-fibres": `url("${PAPER_FIBRES}")`,
    "--st-paper": "#fbf7ee",
    "--st-ink": theme.ink,
  } as CSSProperties;

  return (
    <div ref={root} className={`sb ${editorPreview ? "sb--editor" : ""}`} style={vars}>
      <style>{STATIONERY_CSS + SB_CSS}</style>

      {v.hero ? (
        <header className="sb-cover">
          <div className="sb-cover__words">
            <Hand className="sb-in">{wedding ? "a little book of us" : "you’re invited"}</Hand>
            <h1 className="sb-names" aria-label={names.join(" & ")}>
              {(names.length ? names : ["Our celebration"]).map((n, i) => (
                <span key={i} className="sb-names__n" style={{ animationDelay: `${0.25 + i * 0.22}s` }}>
                  {i > 0 ? <em>&amp;</em> : null}
                  {n}
                </span>
              ))}
            </h1>
            <p className="sb-cover__line sb-in" style={{ animationDelay: "0.8s" }}>
              {wedding ? "are getting married" : "are celebrating"}
              {town ? ` in ${town}` : ""}
            </p>
            {d ? (
              <div className="sb-ticket sb-in" style={{ animationDelay: "1s" }}>
                <div className="sb-ticket__main">
                  <span className="sb-ticket__k">Save the date</span>
                  <span className="sb-ticket__d">{d.dots}</span>
                  <span className="sb-ticket__k">{[d.weekday, d.time, loc.name].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="sb-ticket__stub">
                  <span>{d.month}</span>
                  <b>{d.day}</b>
                </div>
              </div>
            ) : null}
            {content.eventDate ? (
              <div className="sb-in" style={{ animationDelay: "1.15s" }}>
                <Countdown iso={content.eventDate} live={!editorPreview} prefix="sb" />
              </div>
            ) : null}
            {v.rsvp ? (
              <a href="#rsvp" className="sb-btn sb-in" style={{ animationDelay: "1.3s" }}>
                Kindly reply
              </a>
            ) : null}
          </div>
          <div className="sb-cover__collage" aria-hidden={!cover1}>
            <Sprig className="sb-cover__sprig" />
            <Print image={cover1} editorPreview={editorPreview} tilt={-4} tape="top" className="sb-cover__p1 sb-drop" />
            {cover2 || editorPreview ? <Print image={cover2} editorPreview={editorPreview} tilt={6} tape="corners" className="sb-cover__p2 sb-drop" style={{ animationDelay: "0.35s" }} /> : null}
            {d ? (
              <Paper edge="deckle" seed={3} className="sb-cover__note sb-drop" style={{ animationDelay: "0.6s" }}>
                <Hand>see you {town ? `in ${town}` : "there"}</Hand>
                <p className="sb-cover__note-d">{d.dots}</p>
              </Paper>
            ) : null}
          </div>
        </header>
      ) : null}

      {v.hostIntro && (story.length || content.keyPeople.length) ? (
        <section className="sb-page">
          <div className="sb-story">
            <div className="sb-story__prints">
              <Print image={story1} editorPreview={editorPreview} tilt={-3} tape="tl" />
              <Print image={story2} editorPreview={editorPreview} tilt={4} tape="tr" className="sb-story__p2" delay={150} />
              <Sprig className="sb-story__sprig" flip />
            </div>
            <div className="sb-story__text">
              <Heading hand={wedding ? "how it began" : "a little about"}>Our story</Heading>
              <Paper edge="deckle" seed={5} className="sb-letter">
                {story.map((p, i) => (
                  <p key={i} data-reveal>
                    {p}
                  </p>
                ))}
                {names.length ? <Hand className="sb-sign">— {names.join(" & ")}</Hand> : null}
              </Paper>
            </div>
          </div>
          {content.keyPeople.length ? (
            <div className="sb-people" data-reveal>
              <Hand>standing beside us</Hand>
              <ul>
                {content.keyPeople.map((p) => (
                  <li key={p.id}>
                    {p.photo ? <PhotoSlot image={p.photo} className="sb-people__photo" /> : null}
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
        <section className="sb-page sb-page--deep">
          <Heading hand={d ? d.long : undefined}>The day</Heading>
          <ol className="sb-day">
            {content.schedule.map((s, i) => (
              <li key={s.id} data-reveal style={{ transitionDelay: `${i * 90}ms`, ["--tilt" as string]: `${[-1.5, 1.2, -0.8, 1.6][i % 4]}deg` }}>
                <span className="sb-day__pin" />
                <time>{timeOf(s.startTime)}</time>
                <b>{s.label}</b>
                {s.description ? <p>{s.description}</p> : null}
                {s.location?.name ? <p className="sb-small">{s.location.name}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {v.venue && (loc.name || loc.addressLine) ? (
        <section className="sb-page">
          <Heading hand="where">The venue</Heading>
          <div className="sb-postcard" data-reveal>
            {postcard || editorPreview ? (
              <div className="sb-postcard__photo">
                <PhotoSlot image={postcard} editorPreview={editorPreview} className="sb-print__img" />
              </div>
            ) : null}
            <div className="sb-postcard__back">
              <span className="sb-stamp" aria-hidden>
                <span>{d ? d.year : "♥"}</span>
              </span>
              {d ? <span className="sb-postmark" aria-hidden>{d.dots}</span> : null}
              <p className="sb-postcard__name">{loc.name}</p>
              {loc.addressLine ? <p className="sb-postcard__addr">{loc.addressLine}</p> : null}
              <VenueLinks content={content} font={theme.bodyFont} color={theme.ink} align="left" style={{ marginTop: 12 }} />
            </div>
          </div>
        </section>
      ) : null}

      {(v.accommodations && content.accommodations.length) || (v.travelInformation && content.travelInformation.length) ? (
        <section className="sb-page sb-page--deep">
          <Heading hand="getting there">Travel &amp; stay</Heading>
          <div className="sb-cards">
            {[
              ...(v.accommodations ? content.accommodations.map((a) => ({ id: a.id, k: "Where to stay", t: a.name, b: [a.addressLine, a.notes].filter(Boolean) as string[], url: a.bookingUrl })) : []),
              ...(v.travelInformation ? content.travelInformation.map((t) => ({ id: t.id, k: "Getting there", t: t.title, b: [t.body], url: undefined as string | undefined })) : []),
            ].map((c, i) => (
              <div key={c.id} className="sb-index" data-reveal style={{ transitionDelay: `${(i % 3) * 90}ms`, ["--tilt" as string]: `${[-1.2, 1, -0.6][i % 3]}deg` }}>
                <span className="sb-tape sb-tape--top" />
                <Hand>{c.k}</Hand>
                <b>{c.t}</b>
                {c.b.map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="sb-link">
                    Book a room →
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasEntourage(content) ? (
        <section className="sb-page" data-reveal>
          <EntourageBlock content={content} ink={theme.ink} muted={theme.muted} displayFont={theme.displayFont} bodyFont={theme.bodyFont} />
        </section>
      ) : null}

      {v.gallery && (album.length || editorPreview) ? (
        <section className="sb-page sb-page--deep">
          <Heading hand="moments">{content.galleries.find((g) => g.title)?.title || "Our album"}</Heading>
          <div className={`sb-album ${album.length === 4 || album.length === 2 ? "sb-album--two" : ""}`}>
            {(album.length ? album : [null, null, null]).map((img, i) => (
              <Print
                key={img?.id ?? i}
                image={img}
                editorPreview={editorPreview}
                tilt={[-3, 2.5, -1.5, 3.5, -2.5, 1.5][i % 6]}
                tape={(["top", "corners", "tr", "tl", "top", "corners"] as Tape[])[i % 6]}
                ratio={img && img.width > img.height ? "4 / 3" : "4 / 5"}
                delay={(i % 3) * 100}
                className="sb-album__p"
              />
            ))}
          </div>
        </section>
      ) : null}

      {v.registry && (content.registryLinks.length || hasCashGifts(content)) ? (
        <section className="sb-page">
          <Heading hand="with love">Gifts</Heading>
          <div className="sb-gifts" data-reveal>
            <div className="sb-tags">
              {content.registryLinks.map((r, i) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="sb-giftag" style={{ ["--tilt" as string]: `${i % 2 ? 2 : -2}deg` }}>
                  <span className="sb-giftag__hole" />
                  {r.storeName}
                </a>
              ))}
            </div>
            <CashGifts content={content} look={{ ink: theme.ink, muted: mutedText(theme), surface: "#fbf7ee", line: `${theme.muted}55`, bodyFont: theme.bodyFont, displayFont: theme.displayFont }} />
          </div>
        </section>
      ) : null}

      {v.faqs && content.faqs.length ? (
        <section className="sb-page sb-page--deep">
          <Heading hand="good to know">Questions</Heading>
          <div className="sb-notebook" data-reveal>
            {[...content.faqs]
              .sort((a, b) => a.order - b.order)
              .map((f) => (
                <details key={f.id}>
                  <summary>
                    {f.question}
                    <span aria-hidden>+</span>
                  </summary>
                  <p>{f.answer}</p>
                </details>
              ))}
          </div>
        </section>
      ) : null}

      {v.rsvp ? (
        <section id="rsvp" className="sb-page">
          <div className="sb-rsvp" data-reveal>
            <Sprig className="sb-rsvp__sprig" />
            <Paper edge="deckle" seed={9} className="sb-rsvp__card">
              <Hand>kindly reply</Hand>
              <h2 className="sb-rsvp__h">Will you be there?</h2>
              <RsvpForm
                content={content}
                editorPreview={editorPreview}
                skin={{
                  font: theme.bodyFont,
                  ink: theme.ink,
                  muted: mutedText(theme),
                  field: { className: "sb-field" },
                  button: { className: "sb-btn sb-btn--block" },
                  choice: (on) => ({ className: `sb-field sb-choice ${on ? "is-on" : ""}` }),
                  success: { style: { textAlign: "center" } },
                }}
              />
            </Paper>
          </div>
        </section>
      ) : null}

      {credit.show ? (
        <footer className="sb-foot">
          <Hand>with love,</Hand>
          <p className="sb-foot__names">{names.join(" & ")}</p>
          <p className="sb-foot__credit">
            <CreditLine linkStyle={{ color: "inherit", fontWeight: 600 }} />
          </p>
        </footer>
      ) : null}
    </div>
  );
}
