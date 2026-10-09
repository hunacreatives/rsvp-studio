import { createContext, useContext, useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { bindingSample, boundText } from "../bindings";
import type { CanvasSectionSpec, FieldLayerSpec, LayerSpec, LinkLayerSpec, TemplateSpec, TextLayerSpec } from "../schema";
import { colorOf, useSpecTheme } from "./theme";
import { useRsvpForm } from "./useRsvpForm";

// The art-directed part of an uploaded design: a background image with
// layers placed in normalized boxes. All sizes are `cqw` of the canvas
// (container-type: inline-size), so the composition scales as one piece
// on every screen — no viewport units, no position:fixed (both break
// inside the builder's scaled preview; see the decision log).

interface Props {
  section: CanvasSectionSpec;
  spec: TemplateSpec;
  content: EventContent;
  editorPreview?: boolean;
}

export default function CanvasSection({ section, spec, content, editorPreview }: Props) {
  const theme = useSpecTheme();
  const [w, h] = section.aspect;
  const bg = section.backgroundAssetId ? spec.assets[section.backgroundAssetId] : undefined;
  const hostCount = content.hosts.filter((x) => x.name.trim()).length;

  const visible = (layer: LayerSpec) => {
    if (!layer.when) return true;
    // In the builder an empty draft has 0 hosts — show the 2-host design.
    const n = editorPreview && hostCount === 0 ? 2 : hostCount;
    if (layer.when.minHosts !== undefined && n < layer.when.minHosts) return false;
    if (layer.when.maxHosts !== undefined && n > layer.when.maxHosts) return false;
    return true;
  };

  const frame: CSSProperties = {
    position: "relative",
    width: `min(${section.maxWidth}px, 100%)`,
    margin: "0 auto",
    aspectRatio: `${w} / ${h}`,
    containerType: "inline-size",
  };
  const inner = (
    <>
      {bg ? <img src={bg.url} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      {section.layers.filter(visible).map((layer) => (
        <Layer key={layer.id} layer={layer} spec={spec} content={content} editorPreview={editorPreview} />
      ))}
    </>
  );
  const hasForm = section.layers.some((l) => l.type === "field");

  return (
    <section style={{ background: colorOf(theme, section.band), padding: section.padding === "none" ? 0 : "clamp(24px, 6cqw, 64px) clamp(12px, 3cqw, 24px)" }}>
      {hasForm ? (
        <DrawnForm section={section} content={content} editorPreview={editorPreview} style={frame}>
          {inner}
        </DrawnForm>
      ) : (
        <div style={frame}>{inner}</div>
      )}
    </section>
  );
}

/** The union of some layers' boxes (canvas fractions). */
function unionBox(layers: LayerSpec[]) {
  const x0 = Math.min(...layers.map((l) => l.box.x));
  const y0 = Math.min(...layers.map((l) => l.box.y));
  const x1 = Math.max(...layers.map((l) => l.box.x + l.box.w));
  const y1 = Math.max(...layers.map((l) => l.box.y + l.box.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * A traced design whose drawing includes an RSVP form: the section is a real
 * <form>; its field layers are inputs over the drawn boxes and its "submit"
 * link is the drawn button. Thanks / errors appear over the drawn form.
 */
function DrawnForm({ section, content, editorPreview, style, children }: { section: CanvasSectionSpec; content: EventContent; editorPreview?: boolean; style: CSSProperties; children: ReactNode }) {
  const theme = useSpecTheme();
  const form = useRsvpForm(content, editorPreview, { asksAttending: false });
  const parts = section.layers.filter((l) => l.type === "field" || (l.type === "link" && l.action === "submit"));
  const area = unionBox(parts);
  const submitBox = section.layers.find((l): l is LinkLayerSpec => l.type === "link" && l.action === "submit")?.box;
  const note = (text: string, color: string): ReactNode => (
    <p
      role="status"
      style={{
        position: "absolute",
        left: `${area.x * 100}%`,
        width: `${area.w * 100}%`,
        top: `${((submitBox ? submitBox.y + submitBox.h : area.y + area.h) + 0.004) * 100}%`,
        zIndex: 60,
        margin: 0,
        textAlign: "center",
        fontFamily: theme.bodyFont,
        fontSize: "max(2.2cqw, 12px)",
        color,
      }}
    >
      {text}
    </p>
  );
  return (
    <form id="rsvp" data-rsvp onSubmit={form.submit} style={style}>
      <style>{".rs-drawn-field::placeholder{color:var(--ph);opacity:1}"}</style>
      <FormCtx.Provider value={form}>{children}</FormCtx.Provider>
      <input tabIndex={-1} autoComplete="off" aria-hidden value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
      {form.state === "success" ? (
        <div
          role="status"
          style={{
            position: "absolute",
            left: `${area.x * 100}%`,
            top: `${area.y * 100}%`,
            width: `${area.w * 100}%`,
            height: `${area.h * 100}%`,
            zIndex: 70,
            display: "grid",
            placeItems: "center",
            padding: "4cqw",
            boxSizing: "border-box",
            textAlign: "center",
            background: `${colorOf(theme, "bg")}f2`,
            borderRadius: "3cqw",
            fontFamily: theme.bodyFont,
            fontSize: "max(3cqw, 15px)",
            color: colorOf(theme, "ink"),
          }}
        >
          Thank you — your RSVP is in. A confirmation is on its way to your inbox.
        </div>
      ) : null}
      {form.error ? note(form.error, "#c2412d") : null}
      {editorPreview ? note("Guests can RSVP once your site is published.", colorOf(theme, "muted")) : null}
    </form>
  );
}

const FormCtx = createContext<ReturnType<typeof useRsvpForm> | null>(null);

function FieldLayer({ layer }: { layer: FieldLayerSpec }) {
  const theme = useSpecTheme();
  const form = useContext(FormCtx);
  const css: CSSProperties = {
    ...boxStyle(layer),
    boxSizing: "border-box",
    background: "transparent",
    border: "none",
    outline: "none",
    borderRadius: `${layer.radius}cqw`,
    padding: layer.multiline ? `${layer.inset}cqw` : `0 ${layer.inset}cqw`,
    fontFamily: theme.fonts[layer.font] ?? theme.bodyFont,
    // 16px on phones keeps iOS from zooming into the field.
    fontSize: `max(${layer.size.toFixed(3)}cqw, 16px)`,
    // The design's colour is for its placeholder; what guests type reads in ink.
    color: colorOf(theme, "ink"),
    resize: "none",
  };
  const common = {
    name: layer.key,
    "aria-label": layer.placeholder || layer.key,
    placeholder: layer.placeholder,
    value: form?.values[layer.key] ?? "",
    className: "rs-drawn-field",
    style: { ...css, "--ph": colorOf(theme, layer.color) } as CSSProperties,
  };
  const change = (v: string) => form?.set(layer.key, v);
  return layer.multiline ? (
    <textarea {...common} onChange={(e) => change(e.target.value)} />
  ) : (
    <input
      {...common}
      type={layer.key === "email" ? "email" : layer.key === "guests" ? "number" : "text"}
      required={layer.key === "name" || layer.key === "email"}
      min={layer.key === "guests" ? 1 : undefined}
      max={layer.key === "guests" ? 20 : undefined}
      onChange={(e) => change(e.target.value)}
    />
  );
}

/** The first VISIBLE element matching (two-version designs have one per screen). */
function visibleTarget(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => el.getClientRects().length > 0) ?? null;
}

function LinkLayer({ layer, content }: { layer: LinkLayerSpec; content: EventContent }) {
  const form = useContext(FormCtx);
  const css: CSSProperties = { ...boxStyle(layer), display: "block", background: "transparent", border: "none", padding: 0, cursor: "pointer", borderRadius: `${layer.radius}cqw` };
  if (layer.action === "submit") {
    return <button type="submit" aria-label={layer.label || "Send RSVP"} disabled={form?.state === "submitting"} style={css} />;
  }
  if (layer.action === "map") {
    const loc = content.primaryLocation;
    const href = loc?.mapUrl || (loc && (loc.name || loc.addressLine) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.name, loc.addressLine].filter(Boolean).join(", "))}` : undefined);
    if (!href) return null;
    return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={layer.label || "Open the map"} style={css} />;
  }
  return (
    <a
      href="#rsvp"
      aria-label={layer.label || "RSVP"}
      onClick={(e) => {
        const target = visibleTarget("[data-rsvp], #rsvp");
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      style={css}
    />
  );
}

function boxStyle(layer: LayerSpec): CSSProperties {
  return {
    position: "absolute",
    left: `${layer.box.x * 100}%`,
    top: `${layer.box.y * 100}%`,
    width: `${layer.box.w * 100}%`,
    height: `${layer.box.h * 100}%`,
    zIndex: layer.z,
    transform: layer.rotate ? `rotate(${layer.rotate}deg)` : undefined,
  };
}

function Layer({ layer, spec, content, editorPreview }: { layer: LayerSpec; spec: TemplateSpec; content: EventContent; editorPreview?: boolean }) {
  const theme = useSpecTheme();
  switch (layer.type) {
    case "text":
      return <TextLayer layer={layer} content={content} editorPreview={editorPreview} />;
    case "image": {
      const asset = spec.assets[layer.assetId];
      return <img src={asset.url} alt="" aria-hidden style={{ ...boxStyle(layer), objectFit: "contain", opacity: layer.opacity }} />;
    }
    case "photo": {
      const items = content.galleries.flatMap((g) => g.items).sort((a, b) => a.order - b.order);
      const item = items[layer.slot];
      const frame = layer.frameAssetId ? spec.assets[layer.frameAssetId] : undefined;
      if (!item && !editorPreview) return null;
      return (
        <div style={{ ...boxStyle(layer), borderRadius: layer.shape === "oval" ? "50%" : `${layer.radius}cqw`, overflow: "hidden" }}>
          {item ? (
            <img
              src={item.image.masterUrl}
              alt={item.image.alt}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: `${item.image.focalPoint.x * 100}% ${item.image.focalPoint.y * 100}%`,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "grid",
                placeItems: "center",
                border: `2px dashed ${colorOf(theme, "muted")}`,
                color: colorOf(theme, "muted"),
                fontFamily: theme.bodyFont,
                fontSize: "2.4cqw",
                textAlign: "center",
                background: `${colorOf(theme, "bg")}cc`,
              }}
            >
              {layer.editorHint ?? `Photo ${layer.slot + 1}`}
            </div>
          )}
          {frame ? <img src={frame.url} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
        </div>
      );
    }
    case "field":
      return <FieldLayer layer={layer} />;
    case "link":
      return <LinkLayer layer={layer} content={content} />;
    case "rsvpButton":
      return (
        <a
          href="#rsvp"
          style={{
            ...boxStyle(layer),
            display: "grid",
            placeItems: "center",
            borderRadius: theme.radius.control,
            background: colorOf(theme, layer.fill),
            color: colorOf(theme, layer.color),
            fontFamily: theme.bodyFont,
            fontSize: `${layer.size}cqw`,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          {layer.label}
        </a>
      );
  }
}

/** Smallest on-screen text size. Canvas text scales with the card, which on
 *  a phone can push small lines (venue, date) under legibility; past this
 *  floor the text stops shrinking and wraps instead. */
const MIN_PX = 11;
const sizeCss = (cqw: number) => `max(${cqw.toFixed(3)}cqw, ${MIN_PX}px)`;

/**
 * A text box in the design. Bound text (names, date, venue) shrinks toward
 * `minSize` when a real value doesn't fit — long Filipino names and venue
 * names are the normal case, not the exception.
 */
function TextLayer({ layer, content, editorPreview }: { layer: TextLayerSpec; content: EventContent; editorPreview?: boolean }) {
  const theme = useSpecTheme();
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const bound = layer.bind ? boundText(content, layer.bind) : "";
  const isHint = Boolean(layer.bind && !bound && editorPreview);
  const value = layer.bind
    ? bound || (editorPreview ? layer.editorHint ?? bindingSample(layer.bind.field, layer.bind.format) : layer.text ?? "")
    : layer.text ?? "";

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    const min = Math.min(layer.minSize ?? layer.size * 0.6, layer.size);
    const fit = () => {
      let size = layer.size;
      text.style.fontSize = sizeCss(size);
      while (size > min && (text.offsetHeight > box.clientHeight + 1 || text.scrollWidth > box.clientWidth + 1)) {
        size = Math.max(min, size * 0.94);
        text.style.fontSize = sizeCss(size);
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    // Web fonts arrive after first paint and change the text's size: refit.
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    document.fonts?.addEventListener?.("loadingdone", fit);
    return () => {
      live = false;
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [value, layer.size, layer.minSize]);

  if (!value || (layer.hideWhenEmpty && layer.bind && !bound && !editorPreview)) return null;

  return (
    <div
      ref={boxRef}
      data-layer-id={layer.id}
      style={{
        ...boxStyle(layer),
        display: "flex",
        flexDirection: "column",
        justifyContent: layer.valign === "top" ? "flex-start" : layer.valign === "bottom" ? "flex-end" : "center",
        textAlign: layer.align,
      }}
    >
      <span
        ref={textRef}
        style={{
          display: "block",
          fontFamily: theme.fonts[layer.font] ?? theme.bodyFont,
          fontSize: sizeCss(layer.size),
          color: colorOf(theme, layer.color),
          fontWeight: layer.weight,
          fontStyle: layer.italic || isHint ? "italic" : "normal",
          textTransform: layer.uppercase ? "uppercase" : "none",
          letterSpacing: `${layer.letterSpacing}em`,
          lineHeight: layer.lineHeight,
          opacity: isHint ? layer.opacity * 0.55 : layer.opacity,
          whiteSpace: "pre-line",
          overflowWrap: "normal",
          textShadow: layer.shadow ? `${layer.shadow.x}cqw ${layer.shadow.y}cqw ${layer.shadow.blur}cqw ${layer.shadow.color}` : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
