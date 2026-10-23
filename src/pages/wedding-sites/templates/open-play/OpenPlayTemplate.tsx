import { useRef, type CSSProperties, type ReactNode } from "react";
import type { TemplateProps } from "../../engine/registry";
import { mutedText, resolveEventTheme } from "../../engine/theme";
import type { BaseTemplateSettings } from "../../presentation/types";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { parseEventDate } from "../../content/parseEventDate";
import VenueLinks from "../shared/VenueLinks";
import { CashGifts, hasCashGifts } from "../shared/CashGifts";
import EntourageBlock, { hasEntourage } from "../shared/Entourage";
import { Countdown } from "../shared/Countdown";
import { PhotoSlot } from "../shared/PhotoSlot";
import { photosOf, useReveal } from "../shared/reveal";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { Ball } from "./art";
import Roster from "./Roster";
import { OP_CSS } from "./styles";

// Open Play: the page is a pickleball court seen from above, and you scroll from one baseline
// to the other. The host's photo and name fill the two service boxes; a session card reads like
// an open-play booking (court, format, level, time); house rules and FAQs live in the kitchen;
// the net drops in; the far side holds the rounds, what to wear and bring, the venue and photos;
// the far baseline is the open-play paddle rack ("Who's playing") and the RSVP.
// Motion: court lines draw as they arrive, a ball arcs over each line and squashes as it lands,
// the net drops in with a spring, and paddles slide into the rack.

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const when = (iso: string) => {
  const d = iso ? parseEventDate(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase(),
    long: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    time: iso.includes("T") ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
  };
};
const timeOf = (iso: string) => {
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const headlineOf = (c: EventContent) => {
  const own = customValue(c, "headline");
  if (own) return own;
  const names = c.hosts.map((h) => h.name.trim()).filter(Boolean);
  if (!names.length) return "Open play";
  return names.length === 1 ? `${names[0]}’s\nOpen Play` : `${names.join(" & ")}\nOpen Play`;
};

/** A court line that draws itself, with a ball arcing over it. */
function Line({ kind = "h", ball = true, label }: { kind?: "h" | "kitchen"; ball?: boolean; label?: string }) {
  return (
    <div className={`op-line op-line--${kind}`} data-reveal>
      <span className="op-line__paint" />
      {label ? <span className="op-line__label op-mono">{label}</span> : null}
      {ball ? (
        <span className="op-arc" aria-hidden>
          <span className="op-arc__y">
            <Ball size={20} />
          </span>
        </span>
      ) : null}
    </div>
  );
}

function Zone({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`op-zone ${className}`} style={style}>
      {children}
    </div>
  );
}

export default function OpenPlayTemplate({ content, settings, editorPreview = false, live = false, gallery = false }: TemplateProps<BaseTemplateSettings>) {
  const credit = useSiteCredit();
  const theme = resolveEventTheme(settings);
  const v = settings.sectionVisibility;
  const root = useRef<HTMLDivElement | null>(null);
  const photos = photosOf(content).map((p) => p.image);
  const list = settings.heroImage ? [settings.heroImage, ...photos.filter((p) => p !== settings.heroImage)] : photos;
  const [hero, ...rest] = list;
  const w = when(content.eventDate);
  const loc = content.primaryLocation;
  const story = (content.story ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);
  const rules = lines(customValue(content, "kitchenRules"));
  const bring = lines(customValue(content, "bring"));
  const dress = customValue(content, "dressCode");
  const food = customValue(content, "foodLine");
  const schedule = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order);
  const kitchenOn = v.kitchen !== false && (rules.length || (v.faqs !== false && faqs.length) || editorPreview);
  const wearOn = v.wear !== false && (dress || (content.motifColors ?? []).length || editorPreview);
  const bringOn = v.bring !== false && (bring.length || editorPreview);
  const rackOn = v.roster !== false;
  const night = settings.paletteId === "night-court";
  useReveal(root, !editorPreview, [schedule.length, list.length]);

  const vars = {
    "--op-court": theme.background,
    "--op-line": theme.ink,
    "--op-text2": mutedText(theme),
    "--op-muted": theme.muted,
    "--op-display": theme.displayFont,
    "--op-body": theme.bodyFont,
    // The area around the court: green for the classic blue court, darker otherwise.
    "--op-out": settings.paletteId === "open-court" ? "#3e7a5b" : night ? "#070c16" : `color-mix(in srgb, ${theme.background} 72%, #000)`,
  } as CSSProperties;

  const session = [
    customValue(content, "courtLabel"),
    customValue(content, "format"),
    customValue(content, "skillNote"),
  ].filter(Boolean);

  return (
    <div ref={root} className={`op ${editorPreview ? "op--editor" : ""} ${night ? "op--night" : ""} ${gallery ? "op--gallery" : ""}`} style={vars}>
      <style>{OP_CSS}</style>
      <div className="op-court">
        {/* ---------- near side ---------- */}
        {v.hero ? (
          <>
            <Zone className="op-hero">
              <div className="op-box op-box--photo">
                {hero || editorPreview ? (
                  <PhotoSlot image={hero} editorPreview={editorPreview} className="op-photo" eager label="Add your photo" />
                ) : (
                  <div className="op-photo op-photo--ball">
                    <Ball size={88} />
                  </div>
                )}
              </div>
              <span className="op-center op-center--v" data-reveal />
              <div className="op-box op-box--words">
                <p className="op-label op-in" style={{ animationDelay: ".15s" }}>
                  {customValue(content, "kicker") || "Laro tayo"}
                </p>
                <h1 className="op-headline">
                  {lines(headlineOf(content)).map((l, i) => (
                    <span key={i} className="op-headline__l" style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
                      {l}
                    </span>
                  ))}
                </h1>
                {customValue(content, "occasionLine") ? (
                  <p className="op-text op-in" style={{ animationDelay: ".6s" }}>
                    {customValue(content, "occasionLine")}
                  </p>
                ) : null}
                <span className="op-drop" aria-hidden>
                  <Ball size={34} />
                </span>
              </div>
            </Zone>

            <Zone className="op-session-zone">
              <div className="op-session op-in" style={{ animationDelay: ".75s" }}>
                <div className="op-session__top">
                  <span className="op-mono">{w ? w.day : "DATE TBA"}</span>
                  {w?.time ? <span className="op-mono">{w.time}</span> : null}
                </div>
                <p className="op-session__name">{loc.name || (editorPreview ? "Your venue" : "")}</p>
                {loc.addressLine ? <p className="op-small op-session__addr">{loc.addressLine}</p> : null}
                {session.length ? (
                  <div className="op-chips">
                    {session.map((s) => (
                      <span key={s} className="op-chip">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
                {content.eventDate ? <Countdown iso={content.eventDate} live={!editorPreview} prefix="op" /> : null}
                <div className="op-session__cta">
                  {v.rsvp ? (
                    <a href="#rsvp" className="op-btn">
                      I’m playing
                    </a>
                  ) : null}
                  <VenueLinks content={content} font="var(--op-body)" color="var(--op-ink-on-card)" align="left" size={14} />
                </div>
              </div>
            </Zone>
          </>
        ) : null}

        {v.hostIntro !== false && story.length ? (
          <Zone className="op-message">
            {story.map((p, i) => (
              <p key={i} className="op-text op-text--lg" data-reveal>
                {p}
              </p>
            ))}
          </Zone>
        ) : null}

        {kitchenOn ? (
          <>
            <Line kind="kitchen" label="Non-volley zone" />
            <Zone className="op-kitchen">
              <h2 className="op-h2" data-reveal>
                {customValue(content, "kitchenTitle") || "Stay out of the kitchen"}
              </h2>
              {rules.length ? (
                <ol className="op-rules" data-reveal>
                  {rules.map((r, i) => (
                    <li key={i}>
                      <span className="op-mono">{String(i + 1).padStart(2, "0")}</span>
                      {r}
                    </li>
                  ))}
                </ol>
              ) : editorPreview ? (
                <p className="op-hint">Your house rules go here, one per line.</p>
              ) : null}
              {v.faqs !== false && faqs.length ? (
                <div className="op-faq">
                  {faqs.map((f) => (
                    <details key={f.id} data-reveal>
                      <summary>
                        {f.question}
                        <span aria-hidden>+</span>
                      </summary>
                      <p>{f.answer}</p>
                    </details>
                  ))}
                </div>
              ) : null}
            </Zone>
          </>
        ) : null}

        {/* ---------- the net ---------- */}
        <div className="op-net" data-reveal aria-hidden>
          <span className="op-net__post op-net__post--l" />
          <span className="op-net__mesh" />
          <span className="op-net__tape" />
          <span className="op-net__post op-net__post--r" />
        </div>

        {/* ---------- far side ---------- */}
        {v.schedule !== false && (schedule.length || editorPreview) ? (
          <Zone className="op-rounds-zone">
            <h2 className="op-h2" data-reveal>
              The rounds
            </h2>
            {schedule.length ? (
              <ol className="op-rounds">
                {schedule.map((s, i) => (
                  <li key={s.id} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                    <span className="op-mono op-rounds__r">{i === schedule.length - 1 && schedule.length > 2 ? "LAST" : `R${i + 1}`}</span>
                    <span className="op-mono op-rounds__t">{timeOf(s.startTime)}</span>
                    <span className="op-rounds__what">
                      <b>{s.label}</b>
                      {s.description ? <span>{s.description}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="op-hint">Add your schedule: warm-up, games, food.</p>
            )}
            {food ? (
              <p className="op-food" data-reveal>
                {food}
              </p>
            ) : null}
          </Zone>
        ) : null}

        {wearOn || bringOn ? (
          <>
            <Line kind="kitchen" />
            <Zone className="op-boxes">
              {wearOn ? (
                <div className="op-box" data-reveal>
                  <p className="op-label">What to wear</p>
                  {dress ? <p className="op-text">{dress}</p> : <p className="op-hint">Your dress code.</p>}
                  {(content.motifColors ?? []).length ? (
                    <div className="op-swatches">
                      {(content.motifColors ?? []).map((c) => (
                        <span key={c} style={{ background: c }} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {wearOn && bringOn ? <span className="op-center op-center--v" data-reveal /> : null}
              {bringOn ? (
                <div className="op-box" data-reveal>
                  <p className="op-label">What to bring</p>
                  {bring.length ? (
                    <ul className="op-bring">
                      {bring.map((b) => (
                        <li key={b}>
                          <Ball size={14} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="op-hint">One thing per line.</p>
                  )}
                </div>
              ) : null}
            </Zone>
          </>
        ) : null}

        {v.gallery !== false && (rest.length || editorPreview) ? (
          <>
            <Line />
            <Zone className="op-gallery-zone">
              <div className="op-gallery">
                {(rest.length ? rest.slice(0, 4) : [null, null]).map((img, i) => (
                  <div key={img?.id ?? i} className="op-gallery__item" data-reveal style={{ transitionDelay: `${(i % 2) * 90}ms` }}>
                    <PhotoSlot image={img} editorPreview={editorPreview} className="op-photo" />
                  </div>
                ))}
              </div>
            </Zone>
          </>
        ) : null}

        {v.entourage !== false && hasEntourage(content) ? (
          <Zone>
            <div data-reveal>
              <EntourageBlock content={content} ink={theme.ink} muted={theme.muted} displayFont={theme.displayFont} bodyFont={theme.bodyFont} />
            </div>
          </Zone>
        ) : null}

        {v.registry !== false && (content.registryLinks.length || hasCashGifts(content)) ? (
          <>
            <Line ball={false} />
            <Zone className="op-gifts">
              <h2 className="op-h2" data-reveal>
                Gifts
              </h2>
              <div className="op-giftlinks" data-reveal>
                {content.registryLinks.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="op-btn op-btn--line">
                    {r.storeName}
                  </a>
                ))}
              </div>
              <CashGifts content={content} look={{ ink: theme.ink, muted: mutedText(theme), surface: "color-mix(in srgb, currentColor 8%, transparent)", line: `${theme.ink}55`, bodyFont: theme.bodyFont, displayFont: theme.displayFont }} />
            </Zone>
          </>
        ) : null}

        {v.rsvp !== false ? (
          <>
            <Line />
            <Zone className="op-baseline">
              <Roster content={content} editorPreview={editorPreview} live={live} rackOn={rackOn} />
            </Zone>
          </>
        ) : null}
      </div>

      {credit.show ? (
        <footer className="op-foot">
          <CreditLine linkStyle={{ color: "inherit", fontWeight: 700 }} />
        </footer>
      ) : null}
    </div>
  );
}
