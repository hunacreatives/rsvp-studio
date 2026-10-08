import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { EventContent } from "../../content/types";
import { bindingSample, resolveBinding } from "../bindings";
import type { CanvasSectionSpec, LayerSpec, TemplateSpec, TextLayerSpec } from "../schema";
import { colorOf, useSpecTheme } from "./theme";

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

  return (
    <section style={{ background: colorOf(theme, section.band), padding: "clamp(24px, 6cqw, 64px) clamp(12px, 3cqw, 24px)" }}>
      <div
        style={{
          position: "relative",
          width: `min(${section.maxWidth}px, 100%)`,
          margin: "0 auto",
          aspectRatio: `${w} / ${h}`,
          containerType: "inline-size",
        }}
      >
        {bg ? (
          <img src={bg.url} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
        {section.layers.filter(visible).map((layer) => (
          <Layer key={layer.id} layer={layer} spec={spec} content={content} editorPreview={editorPreview} />
        ))}
      </div>
    </section>
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
        <div style={{ ...boxStyle(layer), borderRadius: `${layer.radius}cqw`, overflow: "hidden" }}>
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

  const bound = layer.bind ? resolveBinding(content, layer.bind.field, layer.bind.format, layer.bind.joiner) : "";
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
    return () => ro.disconnect();
  }, [value, layer.size, layer.minSize]);

  if (!value || (layer.hideWhenEmpty && layer.bind && !bound && !editorPreview)) return null;

  return (
    <div
      ref={boxRef}
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
          fontFamily: layer.font === "display" ? theme.displayFont : theme.bodyFont,
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
        }}
      >
        {value}
      </span>
    </div>
  );
}
