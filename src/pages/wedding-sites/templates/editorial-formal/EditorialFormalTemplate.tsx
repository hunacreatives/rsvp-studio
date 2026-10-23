import { Fragment, useRef } from "react";
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
import { PhotoSlot, withAddSlots } from "../shared/PhotoSlot";
import { CreditLine, useSiteCredit } from "../../engine/siteCredit";
import { EF_CSS } from "./styles";
import { EF_SECTIONS } from "./sections";
import { AddItem, Field, HiddenSection, inOrder, siteEdit } from "../shared/siteEdit";

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

function Names({ content, editor }: { content: EventContent; editor?: boolean }) {
  const ed = siteEdit(editor);
  const hosts = editor ? content.hosts : content.hosts.filter((h) => h.name.trim());
  if (!hosts.length) return <h1 className="ef-names">Our celebration</h1>;
  return (
    <h1 className="ef-names" aria-label={hosts.map((h) => h.name.trim()).join(" & ")} {...ed.list("hosts")}>
      {hosts.map((h, i) => (
        <span key={h.id} className="ef-names__row" {...ed.item(h.id)}>
          {i > 0 ? <span className="ef-amp">&amp;</span> : null}
          <Field path="name" value={h.name.trim()} placeholder="Name" editor={editor} className="ef-names__n" style={{ animationDelay: `${0.35 + i * 0.25}s` }} />
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
  // Each photo is shown once: the hero, then two beside the story (when it shows), the rest in the gallery.
  const rest = photos.filter((p) => p.image !== hero);
  const storyShown = v.hostIntro && story.length > 0;
  const storyA = storyShown ? (rest[0]?.image ?? null) : null;
  const storyB = storyShown ? (rest[1]?.image ?? null) : null;
  const gallery = rest.slice(storyShown ? 2 : 0);
  useReveal(root, !editorPreview, [content.schedule.length, photos.length]);


  // The movable sections (EF_SECTIONS). In the builder each one also shows when it's still
  // empty, with its "+ Add …" item, so it can be filled in on the page.
  const ed = siteEdit(editorPreview);
  const people = content.keyPeople;
  const stays = v.accommodations ? content.accommodations : [];
  const travel = v.travelInformation ? content.travelInformation : [];
  const faqs = [...content.faqs].sort((a, b) => a.order - b.order);
  const blocks: Record<string, () => React.ReactNode> = {
    hostIntro: () =>
      story.length || people.length || ed.on ? (
        <section className="ef-sec" {...ed.section("hostIntro")}>
          {story.length || ed.on ? (
            <div className="ef-story">
              {story.length ? (
                <div className={`ef-story__photos ${storyA || editorPreview ? "" : "is-empty"}`} data-reveal>
                  <PhotoSlot image={storyA} editorPreview={editorPreview} className="ef-story__a" />
                  <PhotoSlot image={storyB} editorPreview={editorPreview} className="ef-story__b" label="Add" />
                </div>
              ) : null}
              <div className="ef-story__text">
                <Title kicker={wedding ? "How it began" : "About"}>Our story</Title>
                {(story.length ? story : [""]).map((p, i) => (
                  <Field key={i} as="p" path={`story#${i}`} value={p} placeholder="A few lines in your own words: how it began, what the day means to you." editor={editorPreview} multiline className={i === 0 ? "ef-lede" : ""} data-reveal />
                ))}
              </div>
            </div>
          ) : null}
          {people.length || ed.on ? (
            <div className="ef-people">
              <p className="ef-kicker" data-reveal>
                Standing beside us
              </p>
              <ul {...ed.list("keyPeople")}>
                {people.map((p, i) => (
                  <li key={p.id} {...ed.item(p.id)} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                    {p.photo ? <PhotoSlot image={p.photo} className="ef-people__photo" /> : null}
                    <Field as="b" path="name" value={p.name} placeholder="Name" editor={editorPreview} />
                    <Field as="span" path="role" value={p.role} placeholder="Role" editor={editorPreview} />
                  </li>
                ))}
              </ul>
              <AddItem list="keyPeople" label={people.length ? "Add a person" : "Add the people standing beside you"} editor={editorPreview} style={{ marginTop: 24 }} />
            </div>
          ) : null}
        </section>
      ) : null,

    schedule: () =>
      content.schedule.length || ed.on ? (
        <section className="ef-sec ef-sec--tint" {...ed.section("schedule")}>
          <Title kicker={w ? `${w.weekday}, ${w.day} ${w.month}` : undefined}>The day</Title>
          <ol className="ef-timeline" data-reveal {...ed.list("schedule")}>
            {content.schedule.map((s, i) => (
              <li key={s.id} {...ed.item(s.id)} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
                <time>
                  {timeOf(s.startTime)}
                  {s.endTime ? ` – ${timeOf(s.endTime)}` : ""}
                </time>
                <span className="ef-timeline__dot" />
                <div>
                  <Field as="b" path="label" value={s.label} placeholder="What’s happening" editor={editorPreview} />
                  {s.description ? <Field as="p" path="description" value={s.description} placeholder="" editor={editorPreview} multiline /> : null}
                  {s.location?.name ? <p className="ef-small">{s.location.name}</p> : null}
                </div>
              </li>
            ))}
          </ol>
          <p className="ef-center">
            <AddItem list="schedule" label={content.schedule.length ? "Add to the schedule" : "Add your schedule"} editor={editorPreview} />
          </p>
        </section>
      ) : null,

    venue: () =>
      hasVenue || ed.on ? (
        <section className="ef-sec" {...ed.section("venue")}>
          <Title kicker="Where">The venue</Title>
          <div className="ef-venue" data-reveal>
            {loc.photo ? <PhotoSlot image={loc.photo} className="ef-venue__photo" /> : null}
            <Field as="p" className="ef-venue__name" path="primaryLocation.name" value={loc.name} placeholder="Venue name" editor={editorPreview} />
            <Field as="p" className="ef-venue__addr" path="primaryLocation.addressLine" value={loc.addressLine} placeholder="Address" editor={editorPreview} />
            <VenueLinks content={content} font={theme.bodyFont} color={theme.ink} style={{ marginTop: 14 }} />
          </div>
        </section>
      ) : null,

    stay: () =>
      stays.length || travel.length || ed.on ? (
        <section className="ef-sec ef-sec--tint" {...ed.section("stay", ["accommodations", "travelInformation"])}>
          <Title kicker="Getting there">Travel &amp; stay</Title>
          <div className="ef-cols">
            <div {...ed.list("accommodations")} style={{ display: "contents" }}>
              {stays.map((a, i) => (
                <div key={a.id} {...ed.item(a.id)} className="ef-card" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                  <p className="ef-kicker">Where to stay</p>
                  <Field as="b" path="name" value={a.name} placeholder="Hotel name" editor={editorPreview} />
                  <Field as="p" path="addressLine" value={a.addressLine} placeholder="Address" editor={editorPreview} />
                  {a.notes ? <Field as="p" className="ef-small" path="notes" value={a.notes} placeholder="" editor={editorPreview} multiline /> : null}
                  {a.bookingUrl ? (
                    <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer" className="ef-link">
                      Book a room →
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            <div {...ed.list("travelInformation")} style={{ display: "contents" }}>
              {travel.map((t, i) => (
                <div key={t.id} {...ed.item(t.id)} className="ef-card" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                  <p className="ef-kicker">Getting there</p>
                  <Field as="b" path="title" value={t.title} placeholder="By car, by plane…" editor={editorPreview} />
                  <Field as="p" path="body" value={t.body} placeholder="How to get there" editor={editorPreview} multiline />
                </div>
              ))}
            </div>
          </div>
          {ed.on ? (
            <p className="ef-center ef-adds">
              {v.accommodations ? <AddItem list="accommodations" label="Add a place to stay" editor /> : null}
              {v.travelInformation ? <AddItem list="travelInformation" label="Add travel info" editor /> : null}
            </p>
          ) : null}
        </section>
      ) : null,

    entourage: () =>
      hasEntourage(content) || ed.on ? (
        <section className="ef-sec" data-reveal {...ed.section("entourage")}>
          <EntourageBlock content={content} ink={theme.ink} muted={theme.muted} displayFont={theme.displayFont} bodyFont={theme.bodyFont} editor={editorPreview} />
        </section>
      ) : null,

    gallery: () =>
      gallery.length || editorPreview ? (
        <section className="ef-sec ef-sec--wide" {...ed.section("gallery")}>
          <Title kicker="Moments">{content.galleries.find((g) => g.title)?.title || "Gallery"}</Title>
          <div className={`ef-gallery ${gallery.length >= 7 ? "ef-gallery--many" : ""}`} {...ed.list("gallery")}>
            {withAddSlots(gallery, editorPreview, 4).map((g, i) => (
              <figure
                key={g?.id ?? i}
                {...(g ? ed.item(g.id) : {})}
                className="ef-gallery__item"
                data-reveal
                style={{ transitionDelay: `${(i % 3) * 90}ms`, aspectRatio: g?.image ? `${g.image.width || 4} / ${g.image.height || 5}` : ["4 / 5", "1", "3 / 4", "4 / 3"][i % 4] }}
              >
                <PhotoSlot image={g?.image} editorPreview={editorPreview} className="ef-gallery__img" />
                {g?.caption ? <Field as="figcaption" path="caption" value={g.caption} placeholder="" editor={editorPreview} /> : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null,

    registry: () =>
      content.registryLinks.length || hasCashGifts(content) || ed.on ? (
        <section className="ef-sec ef-sec--tint" {...ed.section("registry")}>
          <Title kicker="With love">Gifts</Title>
          <div className="ef-center" data-reveal>
            <div className="ef-pills" {...ed.list("registryLinks")}>
              {content.registryLinks.map((r) => (
                <a key={r.id} {...ed.item(r.id)} href={ed.on ? undefined : r.url} target="_blank" rel="noopener noreferrer" className="ef-pill">
                  <Field path="storeName" value={r.storeName} placeholder="Store or fund name" editor={editorPreview} />
                </a>
              ))}
            </div>
            <AddItem list="registryLinks" label="Add a gift link" editor={editorPreview} style={{ marginTop: 14 }} />
            <CashGifts content={content} editor={editorPreview} look={{ ink: theme.ink, muted: mutedText(theme), surface: theme.background, line: `${theme.muted}55`, bodyFont: theme.bodyFont, displayFont: theme.displayFont }} />
          </div>
        </section>
      ) : null,

    faqs: () =>
      faqs.length || ed.on ? (
        <section className="ef-sec" {...ed.section("faqs")}>
          <Title kicker="Good to know">Questions</Title>
          <div className="ef-faq" {...ed.list("faqs")}>
            {faqs.map((f, i) => (
              <details key={f.id} {...ed.item(f.id)} open={ed.on || undefined} data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
                <summary>
                  <Field path="question" value={f.question} placeholder="A question guests ask" editor={editorPreview} />
                  <span className="ef-faq__plus" aria-hidden />
                </summary>
                <Field as="p" path="answer" value={f.answer} placeholder="The answer" editor={editorPreview} multiline />
              </details>
            ))}
          </div>
          <p className="ef-center" style={{ marginTop: 22 }}>
            <AddItem list="faqs" label={faqs.length ? "Add a question" : "Add your first question"} editor={editorPreview} />
          </p>
        </section>
      ) : null,
  };

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
            <Names content={content} editor={editorPreview} />
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
            {loc.name ? <Field as="p" className="ef-where ef-in" style={{ animationDelay: "1.05s" }} path="primaryLocation.name" value={loc.name} placeholder="" editor={editorPreview} /> : null}
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

      {inOrder(EF_SECTIONS.map((x) => x.key), settings.sectionOrder).map((k) => {
        const def = EF_SECTIONS.find((x) => x.key === k)!;
        const vis = def.vis ?? [k];
        const on = vis.some((x) => v[x] !== false);
        return <Fragment key={k}>{on ? blocks[k]() : <HiddenSection k={k} vis={vis} label={def.label} editor={editorPreview} />}</Fragment>;
      })}

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
