import { useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import type { SectionVisibility } from "../../presentation/types";
import type { BlockSectionSpec, BlockType } from "../schema";
import { colorOf, useSpecTheme, type SpecTheme } from "./theme";

// The shared block library: every section an uploaded template needs that
// the designer's file didn't draw. Built once, styled entirely from the
// template's tokens, sized in `cqw` of the template root. Each block
// renders nothing on the published page when its content is empty, and a
// labelled placeholder in the builder (editorPreview) so a fresh draft
// still reads as a designed page.

interface BlockProps {
  section: BlockSectionSpec;
  content: EventContent;
  visibility: SectionVisibility;
  editorPreview?: boolean;
}

const DEFAULT_HEADINGS: Record<BlockType, string> = {
  story: "Our Story",
  keyPeople: "Our People",
  schedule: "Schedule",
  venue: "The Venue",
  gallery: "Gallery",
  registry: "Gifts",
  faqs: "Questions",
  rsvp: "Kindly Respond",
  footer: "",
};

const EMPTY_HINTS: Record<BlockType, string> = {
  story: "Add your story in the editor",
  keyPeople: "Add the people who matter most",
  schedule: "Add your schedule",
  venue: "Add your venue",
  gallery: "Add photos to your gallery",
  registry: "Add gift or registry links",
  faqs: "Add questions guests often ask",
  rsvp: "",
  footer: "",
};

export function Block(props: BlockProps) {
  switch (props.section.block) {
    case "story":
      return <StoryBlock {...props} />;
    case "keyPeople":
      return <KeyPeopleBlock {...props} />;
    case "schedule":
      return <ScheduleBlock {...props} />;
    case "venue":
      return <VenueBlock {...props} />;
    case "gallery":
      return <GalleryBlock {...props} />;
    case "registry":
      return <RegistryBlock {...props} />;
    case "faqs":
      return <FaqBlock {...props} />;
    case "rsvp":
      return <RsvpBlock {...props} />;
    case "footer":
      return <FooterBlock />;
  }
}

// ---------------------------------------------------------------- frame

function Frame({ section, width = 640, children, id }: { section: BlockSectionSpec; width?: number; children: ReactNode; id?: string }) {
  const theme = useSpecTheme();
  return (
    <section
      id={id}
      style={{
        background: colorOf(theme, section.band),
        padding: "clamp(48px, 9cqw, 96px) clamp(18px, 4cqw, 32px)",
        textAlign: section.align,
      }}
    >
      <div style={{ width: `min(${width}px, 100%)`, margin: "0 auto" }}>
        <Heading section={section} />
        {children}
      </div>
    </section>
  );
}

function Heading({ section }: { section: BlockSectionSpec }) {
  const theme = useSpecTheme();
  const text = section.heading ?? DEFAULT_HEADINGS[section.block];
  if (!text) return null;
  return (
    <>
      <h2
        style={{
          fontFamily: theme.displayFont,
          fontSize: "clamp(28px, 5cqw, 44px)",
          fontWeight: 500,
          lineHeight: 1.15,
          color: colorOf(theme, "ink"),
          margin: 0,
        }}
      >
        {text}
      </h2>
      <Divider kind={section.divider} align={section.align} />
    </>
  );
}

function Divider({ kind, align }: { kind: BlockSectionSpec["divider"]; align: "center" | "left" }) {
  const theme = useSpecTheme();
  const c = colorOf(theme, "accent");
  const wrap: CSSProperties = { display: "flex", justifyContent: align === "center" ? "center" : "flex-start", margin: "16px 0 32px" };
  if (kind === "none") return <div style={{ height: 24 }} />;
  if (kind === "dots")
    return (
      <div style={wrap} aria-hidden>
        <svg width="44" height="8" viewBox="0 0 44 8">
          <circle cx="6" cy="4" r="2.5" fill={c} />
          <circle cx="22" cy="4" r="2.5" fill={c} />
          <circle cx="38" cy="4" r="2.5" fill={c} />
        </svg>
      </div>
    );
  if (kind === "leaf")
    return (
      <div style={wrap} aria-hidden>
        <svg width="120" height="18" viewBox="0 0 120 18" fill="none" stroke={c} strokeWidth="1.2">
          <path d="M2 9h44M74 9h44" />
          <path d="M60 2c-5 3-7 5-7 7s2 4 7 7c5-3 7-5 7-7s-2-4-7-7z" fill={c} fillOpacity="0.25" />
        </svg>
      </div>
    );
  return (
    <div style={wrap} aria-hidden>
      <span style={{ display: "block", width: 48, height: 1.5, background: c }} />
    </div>
  );
}

/** Builder-only placeholder for an empty block; nothing on the live page. */
function EmptyHint({ section, editorPreview }: { section: BlockSectionSpec; editorPreview?: boolean }) {
  const theme = useSpecTheme();
  if (!editorPreview) return null;
  return (
    <Frame section={section}>
      <div
        style={{
          border: `2px dashed ${colorOf(theme, "muted")}66`,
          borderRadius: theme.radius.card,
          padding: "28px 20px",
          color: colorOf(theme, "muted"),
          fontFamily: theme.bodyFont,
          fontStyle: "italic",
          fontSize: 15,
          textAlign: "center",
        }}
      >
        {EMPTY_HINTS[section.block]}
      </div>
    </Frame>
  );
}

const body = (theme: SpecTheme, extra?: CSSProperties): CSSProperties => ({
  fontFamily: theme.bodyFont,
  fontSize: "clamp(15px, 2.2cqw, 18px)",
  lineHeight: 1.7,
  color: colorOf(theme, "ink"),
  margin: 0,
  ...extra,
});

const small = (theme: SpecTheme, extra?: CSSProperties): CSSProperties => ({
  fontFamily: theme.bodyFont,
  fontSize: 14,
  lineHeight: 1.55,
  color: colorOf(theme, "muted"),
  margin: 0,
  ...extra,
});

function buttonStyle(theme: SpecTheme, filled: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "11px 22px",
    borderRadius: theme.radius.control,
    border: `1px solid ${colorOf(theme, "accent")}`,
    background: filled ? colorOf(theme, "accent") : "transparent",
    color: filled ? colorOf(theme, "onAccent") : colorOf(theme, "accent"),
    fontFamily: theme.bodyFont,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.03em",
    textDecoration: "none",
    cursor: "pointer",
  };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function formatTime(iso: string) {
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) || !iso.includes("T") ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ---------------------------------------------------------------- blocks

function StoryBlock({ section, content, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  const paragraphs = (content.story ?? "").split("\n\n").map((p) => p.trim()).filter(Boolean);
  if (!paragraphs.length) return <EmptyHint section={section} editorPreview={editorPreview} />;
  return (
    <Frame section={section}>
      {paragraphs.map((p, i) => (
        <p key={i} style={body(theme, { marginBottom: 16 })}>
          {p}
        </p>
      ))}
    </Frame>
  );
}

function KeyPeopleBlock({ section, content, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  if (!content.keyPeople.length) return <EmptyHint section={section} editorPreview={editorPreview} />;
  return (
    <Frame section={section} width={820}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: section.align === "center" ? "center" : "flex-start", gap: 28 }}>
        {content.keyPeople.map((p) => (
          <div key={p.id} style={{ width: 132, textAlign: "center" }}>
            <div
              style={{
                width: 88,
                height: 88,
                margin: "0 auto 10px",
                borderRadius: "50%",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                background: colorOf(theme, "surface"),
                border: `1px solid ${colorOf(theme, "accent")}44`,
              }}
            >
              {p.photo ? (
                <img src={p.photo.masterUrl} alt={p.photo.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontFamily: theme.displayFont, fontSize: 26, color: colorOf(theme, "ink") }}>{initials(p.name)}</span>
              )}
            </div>
            <p style={body(theme, { fontSize: 15, fontWeight: 600, lineHeight: 1.3 })}>{p.name}</p>
            {p.role ? <p style={small(theme, { fontSize: 13 })}>{p.role}</p> : null}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ScheduleBlock({ section, content, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  const items = [...content.schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (!items.length) return <EmptyHint section={section} editorPreview={editorPreview} />;
  return (
    <Frame section={section} width={560}>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, textAlign: "left" }}>
        {items.map((item, i) => {
          const time = [formatTime(item.startTime), item.endTime ? formatTime(item.endTime) : ""].filter(Boolean).join(" – ");
          return (
            <li
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(84px, 26%) 1fr",
                gap: 18,
                padding: "16px 0",
                borderTop: i ? `1px solid ${colorOf(theme, "ink")}1f` : "none",
              }}
            >
              <span style={small(theme, { color: colorOf(theme, "accent"), fontWeight: 600, letterSpacing: "0.04em" })}>{time || "—"}</span>
              <span>
                <span style={{ ...body(theme), display: "block", fontFamily: theme.displayFont, fontSize: "clamp(18px, 2.8cqw, 22px)", lineHeight: 1.3 }}>
                  {item.label}
                </span>
                {item.location?.name ? <span style={{ ...small(theme), display: "block" }}>{item.location.name}</span> : null}
                {item.description ? <span style={{ ...small(theme), display: "block", marginTop: 4 }}>{item.description}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </Frame>
  );
}

/** Google Calendar "add event" link for the event day (all-day when no time). */
function calendarUrl(content: EventContent): string | null {
  if (!content.eventDate) return null;
  const d = parseEventDate(content.eventDate);
  if (Number.isNaN(d.getTime())) return null;
  const ymd = (x: Date) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
  const next = new Date(d);
  next.setDate(d.getDate() + 1);
  const title = content.hosts.map((h) => h.name).filter(Boolean).join(" & ") || "Celebration";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${ymd(d)}/${ymd(next)}`,
    location: [content.primaryLocation.name, content.primaryLocation.addressLine].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function VenueBlock({ section, content, visibility, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  const loc = content.primaryLocation;
  const hasVenue = Boolean(loc.name || loc.addressLine);
  const stays = visibility.accommodations ? content.accommodations : [];
  const travel = visibility.travelInformation ? content.travelInformation : [];
  if (!hasVenue && !stays.length && !travel.length) return <EmptyHint section={section} editorPreview={editorPreview} />;
  const cal = calendarUrl(content);
  return (
    <Frame section={section}>
      {hasVenue && visibility.venue ? (
        <div>
          {loc.photo ? (
            <img
              src={loc.photo.masterUrl}
              alt={loc.photo.alt}
              style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: theme.radius.card, marginBottom: 20 }}
            />
          ) : null}
          {loc.name ? <p style={{ ...body(theme), fontFamily: theme.displayFont, fontSize: "clamp(22px, 3.4cqw, 28px)", lineHeight: 1.3 }}>{loc.name}</p> : null}
          {loc.addressLine ? <p style={small(theme, { fontSize: 15, marginTop: 4 })}>{loc.addressLine}</p> : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 20, justifyContent: section.align === "center" ? "center" : "flex-start" }}>
            {loc.mapUrl ? (
              <a href={loc.mapUrl} target="_blank" rel="noopener noreferrer" style={buttonStyle(theme, true)}>
                View map
              </a>
            ) : null}
            {cal ? (
              <a href={cal} target="_blank" rel="noopener noreferrer" style={buttonStyle(theme, false)}>
                Add to calendar
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {stays.length ? (
        <div style={{ marginTop: 44 }}>
          <p style={small(theme, { textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600, marginBottom: 14 })}>Where to stay</p>
          <div style={{ display: "grid", gap: 12, textAlign: "left" }}>
            {stays.map((a) => (
              <div key={a.id} style={{ background: colorOf(theme, "surface"), borderRadius: theme.radius.card, padding: "16px 18px" }}>
                <p style={body(theme, { fontWeight: 600, fontSize: 16 })}>{a.name}</p>
                {a.addressLine ? <p style={small(theme)}>{a.addressLine}</p> : null}
                {a.notes ? <p style={small(theme, { marginTop: 4 })}>{a.notes}</p> : null}
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  {a.bookingUrl ? (
                    <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer" style={small(theme, { color: colorOf(theme, "accent"), fontWeight: 600 })}>
                      Book
                    </a>
                  ) : null}
                  {a.mapUrl ? (
                    <a href={a.mapUrl} target="_blank" rel="noopener noreferrer" style={small(theme, { color: colorOf(theme, "accent"), fontWeight: 600 })}>
                      Map
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {travel.length ? (
        <div style={{ marginTop: 44, textAlign: "left" }}>
          <p style={small(theme, { textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600, marginBottom: 14, textAlign: section.align })}>
            Getting there
          </p>
          {travel.map((t) => (
            <div key={t.id} style={{ marginBottom: 18 }}>
              <p style={body(theme, { fontWeight: 600, fontSize: 16 })}>{t.title}</p>
              <p style={small(theme, { fontSize: 15, whiteSpace: "pre-line" })}>{t.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Frame>
  );
}

function GalleryBlock({ section, content, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  const items = content.galleries.flatMap((g) => g.items).sort((a, b) => a.order - b.order);
  if (!items.length) return <EmptyHint section={section} editorPreview={editorPreview} />;
  return (
    <Frame section={section} width={960}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(220px, 44%), 1fr))", gridAutoFlow: "dense", gridAutoRows: "clamp(140px, 22cqw, 220px)", gap: 10 }}>
        {items.map((item) => (
          <figure
            key={item.id}
            style={{
              margin: 0,
              gridColumn: item.layoutHint === "wide" ? "span 2" : undefined,
              gridRow: item.layoutHint === "portrait" ? "span 2" : undefined,
              borderRadius: theme.radius.card,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <img
              src={item.image.masterUrl}
              alt={item.image.alt}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${item.image.focalPoint.x * 100}% ${item.image.focalPoint.y * 100}%` }}
            />
            {item.caption ? (
              <figcaption
                style={{
                  position: "absolute",
                  insetInline: 0,
                  bottom: 0,
                  padding: "18px 12px 8px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
                  color: "#fff",
                  fontFamily: theme.bodyFont,
                  fontSize: 13,
                  textAlign: "left",
                }}
              >
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </Frame>
  );
}

function RegistryBlock({ section, content, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  if (!content.registryLinks.length) return <EmptyHint section={section} editorPreview={editorPreview} />;
  return (
    <Frame section={section}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: section.align === "center" ? "center" : "flex-start" }}>
        {content.registryLinks.map((r) => (
          <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" style={buttonStyle(theme, true)}>
            {r.storeName}
          </a>
        ))}
      </div>
    </Frame>
  );
}

function FaqBlock({ section, content, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order);
  if (!faqs.length) return <EmptyHint section={section} editorPreview={editorPreview} />;
  return (
    <Frame section={section}>
      <div style={{ textAlign: "left" }}>
        {faqs.map((f, i) => (
          <div key={f.id} style={{ padding: "18px 0", borderTop: i ? `1px solid ${colorOf(theme, "ink")}1f` : "none" }}>
            <p style={body(theme, { fontFamily: theme.displayFont, fontSize: "clamp(18px, 2.8cqw, 21px)", lineHeight: 1.35 })}>{f.question}</p>
            <p style={small(theme, { fontSize: 15, marginTop: 6, whiteSpace: "pre-line" })}>{f.answer}</p>
          </div>
        ))}
      </div>
    </Frame>
  );
}

type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * The one RSVP form every uploaded template uses. In the builder it can't
 * submit — a host testing their draft must not create real RSVPs.
 */
function RsvpBlock({ section, content, editorPreview }: BlockProps) {
  const theme = useSpecTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [attending, setAttending] = useState<"yes" | "no" | null>(null);
  const [guests, setGuests] = useState(1);
  const [dietary, setDietary] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (editorPreview) return;
    if (!attending) {
      setError("Please let us know if you can come.");
      setState("error");
      return;
    }
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/wedding-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: content.slug,
          name,
          email,
          message,
          website,
          attending,
          guests: attending === "yes" ? guests : 0,
          dietary: attending === "yes" ? dietary : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong — please try again.");
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setState("error");
    }
  }

  const input: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: theme.bodyFont,
    fontSize: 15,
    padding: "13px 16px",
    borderRadius: theme.radius.control === 999 ? 999 : theme.radius.control,
    border: `1px solid ${colorOf(theme, "ink")}33`,
    background: colorOf(theme, "bg"),
    color: colorOf(theme, "ink"),
    outline: "none",
  };

  return (
    <Frame section={section} width={460} id="rsvp">
      {state === "success" ? (
        <p style={body(theme, { fontStyle: "italic" })}>
          {attending === "no"
            ? `Thank you, ${name.split(" ")[0]} — we’ll miss you. Your reply has been sent.`
            : `Thank you, ${name.split(" ")[0]} — your RSVP is in. A confirmation is on its way to your inbox.`}
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 12, textAlign: "left" }}>
          <input required aria-label="Full name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={input} />
          <input required type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
          <fieldset style={{ border: 0, padding: 0, margin: "4px 0 0", display: "grid", gap: 8 }}>
            <legend style={small(theme, { fontSize: 14, marginBottom: 8, color: colorOf(theme, "ink") })}>Will you be joining us?</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(
                [
                  ["yes", "Joyfully accepts"],
                  ["no", "Regretfully declines"],
                ] as const
              ).map(([value, label]) => {
                const on = attending === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAttending(value)}
                    style={{
                      ...input,
                      cursor: "pointer",
                      textAlign: "center",
                      fontSize: 14,
                      background: on ? colorOf(theme, "accent") : colorOf(theme, "bg"),
                      color: on ? colorOf(theme, "onAccent") : colorOf(theme, "ink"),
                      borderColor: on ? colorOf(theme, "accent") : `${colorOf(theme, "ink")}33`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {attending === "yes" ? (
            <>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={small(theme, { fontSize: 14, color: colorOf(theme, "ink") })}>How many in your party (including you)?</span>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} style={input}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <input
                aria-label="Dietary restrictions (optional)"
                placeholder="Dietary restrictions (optional)"
                maxLength={300}
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                style={input}
              />
            </>
          ) : null}
          <textarea
            aria-label="Message (optional)"
            placeholder="Message (optional)"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ ...input, borderRadius: theme.radius.control === 999 ? 18 : theme.radius.control, resize: "vertical" }}
          />
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
          />
          <button type="submit" disabled={state === "submitting" || editorPreview} style={{ ...buttonStyle(theme, true), width: "100%", padding: "14px 22px", opacity: state === "submitting" || editorPreview ? 0.6 : 1 }}>
            {state === "submitting" ? "Sending…" : "Send RSVP"}
          </button>
          {editorPreview ? (
            <p style={small(theme, { fontSize: 13, textAlign: "center" })}>Guests can RSVP once your site is published.</p>
          ) : null}
          {error ? <p style={small(theme, { fontSize: 13, color: "#c2412d", textAlign: "center" })}>{error}</p> : null}
        </form>
      )}
    </Frame>
  );
}

function FooterBlock() {
  const theme = useSpecTheme();
  return (
    <footer style={{ background: colorOf(theme, "accent"), padding: "22px 16px", textAlign: "center" }}>
      <p style={{ margin: 0, fontFamily: theme.bodyFont, fontSize: 12, letterSpacing: "0.06em", color: colorOf(theme, "onAccent") }}>
        Made with love by{" "}
        <a href="https://thersvpstudio.com" target="_blank" rel="noopener noreferrer" style={{ color: colorOf(theme, "onAccent"), fontWeight: 700 }}>
          The RSVP Studio
        </a>
      </p>
    </footer>
  );
}
