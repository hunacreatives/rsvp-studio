import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { bindingSample, boundText } from "../bindings";
import type { LayoutButtonNode, LayoutFormNode, LayoutNode, LayoutSectionSpec, LayoutTextNode, TemplateSpec } from "../schema";
import { colorOf, useSpecTheme, type SpecTheme } from "./theme";
import { useRsvpForm } from "./useRsvpForm";

// A website section rebuilt from a design: real rows and stacks of text,
// photos, buttons and a working RSVP form. Every node carries its measured
// box in design px; --u converts design px to screen px, so at the design's
// width the section matches the design exactly and narrower desktops scale
// it down. Phones (container ≤ 640px) stack rows into one readable column.
// Container units only — no viewport units or position:fixed (both break in
// the builder's scaled preview; see docs/template-builder-decisions.md).

const CSS = `
.rs-ls{container:rsls/inline-size;position:relative;overflow:hidden}
.rs-frame{--u:calc(min(100cqw,var(--dw)*1.25px)/var(--dw));position:relative;width:calc(var(--dw)*var(--u));margin:0 auto;min-height:calc(var(--sh)*var(--u))}
.rs-n{box-sizing:border-box;flex:none;margin-left:calc(var(--ml)*var(--u));margin-top:calc(var(--mt)*var(--u))}
.rs-stack{display:flex;flex-direction:column;align-items:flex-start;width:calc(var(--w)*var(--u))}
.rs-row{display:flex;flex-direction:row;align-items:flex-start;width:calc(var(--w)*var(--u))}
.rs-text{width:calc(var(--w)*var(--u));min-height:calc(var(--h)*var(--u));display:flex;flex-direction:column;justify-content:center;font-size:calc(var(--fs)*var(--u)*var(--fit,1));margin-right:0;margin-bottom:0;overflow-wrap:break-word;white-space:pre-line}
.rs-photo{width:calc(var(--w)*var(--u));aspect-ratio:var(--ar);overflow:hidden;position:relative}
.rs-photo img,.rs-image img{width:100%;height:100%;object-fit:cover;display:block}
.rs-image{width:calc(var(--w)*var(--u));aspect-ratio:var(--ar)}
.rs-btn{width:calc(var(--w)*var(--u));height:calc(var(--h)*var(--u));display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:calc(var(--fs)*var(--u));box-sizing:border-box}
.rs-form{width:calc(var(--w)*var(--u));box-sizing:border-box;display:flex;flex-direction:column}
.rs-form label{display:block}
.rs-form input,.rs-form textarea,.rs-form select{width:100%;box-sizing:border-box;font:inherit;outline:none}
.rs-in{height:calc(var(--fh)*var(--u));font-size:calc(var(--fs)*var(--u))}
textarea.rs-in{height:calc(var(--fh)*var(--u))}
.rs-pair{display:grid;grid-template-columns:1fr 1fr;column-gap:calc(16*var(--u))}
.rs-divider{width:calc(var(--w)*var(--u));height:max(1px,calc(var(--h)*var(--u)))}
@container rsls (max-width:640px){
  .rs-frame{width:100%;min-height:0;padding:28px 20px;box-sizing:border-box}
  .rs-n{margin-left:0;margin-top:clamp(0px,calc(var(--mt)*var(--u)*1.6),28px)}
  .rs-row[data-phone="stack"]{flex-direction:column;align-items:stretch;width:100%}
  .rs-row[data-phone="2up"]{flex-wrap:wrap;gap:8px;width:100%}
  .rs-row[data-phone="2up"]>.rs-n{width:calc(50% - 4px)}
  .rs-stack{width:100%;align-items:stretch}
  .rs-text{width:100%;min-height:0;font-size:max(calc(var(--fs)*var(--u)*1.8),var(--floor))}
  .rs-photo,.rs-image,.rs-form{width:100%}
  .rs-btn{width:auto;min-width:min(100%,calc(var(--w)*var(--u)*1.8));height:auto;padding:12px 20px;font-size:max(calc(var(--fs)*var(--u)*1.8),min(var(--fs)*1px,14px));align-self:flex-start}
  .rs-divider{width:100%}
  .rs-in{height:auto;min-height:44px;font-size:16px}
  .rs-form label{font-size:max(14px,calc(var(--ls)*var(--u)))!important}
  .rs-form .rs-note{font-size:12px!important}
  textarea.rs-in{min-height:96px}
  .rs-pair{grid-template-columns:1fr}
}
`;

type Ctx = { spec: TemplateSpec; content: EventContent; editorPreview?: boolean; theme: SpecTheme; sectionId: string; designWidth: number };

let injected = false;
function useLayoutCss() {
  if (typeof document !== "undefined" && !injected) {
    const el = document.createElement("style");
    el.dataset.rsLayout = "";
    el.textContent = CSS;
    document.head.appendChild(el);
    injected = true;
  }
}

export default function LayoutSection({ section, spec, content, editorPreview }: { section: LayoutSectionSpec; spec: TemplateSpec; content: EventContent; editorPreview?: boolean }) {
  useLayoutCss();
  const theme = useSpecTheme();
  const bg = section.bgAssetId ? spec.assets[section.bgAssetId] : undefined;
  const ctx: Ctx = { spec, content, editorPreview, theme, sectionId: section.id, designWidth: section.designWidth };
  return (
    <section id={section.id} className="rs-ls" style={{ background: colorOf(theme, section.bg) }}>
      <div className="rs-frame" style={{ "--dw": section.designWidth, "--sh": section.height } as CSSProperties}>
        {bg ? <img src={bg.url} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
        <div style={{ position: "relative" }}>
          <Node node={section.root} parent={null} prev={null} ctx={ctx} />
        </div>
      </div>
    </section>
  );
}

/** Offsets from the parent (row: from the previous sibling's right edge; stack: from its bottom). */
function offsets(node: LayoutNode, parent: LayoutNode | null, prev: LayoutNode | null) {
  if (!parent) return { ml: 0, mt: 0 };
  if (parent.t === "row") return { ml: node.box.x - (prev ? prev.box.x + prev.box.w : parent.box.x), mt: node.box.y - parent.box.y };
  return { ml: node.box.x - parent.box.x, mt: node.box.y - (prev ? prev.box.y + prev.box.h : parent.box.y) };
}

function Node({ node, parent, prev, ctx }: { node: LayoutNode; parent: LayoutNode | null; prev: LayoutNode | null; ctx: Ctx }) {
  const { ml, mt } = offsets(node, parent, prev);
  const vars = { "--ml": ml, "--mt": mt, "--w": node.box.w, "--h": node.box.h } as CSSProperties;
  switch (node.t) {
    case "stack":
    case "row":
      return (
        <div className={`rs-n ${node.t === "row" ? "rs-row" : "rs-stack"}`} data-phone={node.t === "row" ? node.phone : undefined} style={vars}>
          {node.children.map((c, i) => (
            <Node key={i} node={c} parent={node} prev={i ? node.children[i - 1] : null} ctx={ctx} />
          ))}
        </div>
      );
    case "text":
      return <TextNode node={node} vars={vars} ctx={ctx} />;
    case "photo":
      return <PhotoNode node={node} vars={vars} ctx={ctx} />;
    case "image": {
      const asset = ctx.spec.assets[node.assetId];
      return (
        <div className="rs-n rs-image" style={{ ...vars, "--ar": `${node.box.w} / ${node.box.h}`, opacity: node.opacity } as CSSProperties}>
          {asset ? <img src={asset.url} alt="" aria-hidden style={{ objectFit: "contain" }} /> : null}
        </div>
      );
    }
    case "button":
      return <ButtonNode node={node} vars={vars} ctx={ctx} />;
    case "form":
      return <FormNode node={node} vars={vars} ctx={ctx} />;
    case "divider":
      return <div className="rs-n rs-divider" style={{ ...vars, background: node.color }} />;
  }
}

function TextNode({ node, vars, ctx }: { node: LayoutTextNode; vars: CSSProperties; ctx: Ctx }) {
  const { theme, content, editorPreview } = ctx;
  const bound = node.bind ? boundText(content, node.bind) : "";
  const isHint = Boolean(node.bind && !bound && editorPreview);
  const value = node.bind ? bound || (editorPreview ? node.editorHint ?? bindingSample(node.bind.field, node.bind.format) : node.text ?? "") : node.text ?? "";
  const ref = useRef<HTMLElement>(null);
  // Desktop: shrink text that outgrows its measured box (a stand-in font
  // runs wider, or a customer's text is longer). Phones flow freely.
  useLayoutEffect(() => {
    const el = ref.current;
    const frame = el?.closest(".rs-frame") as HTMLElement | null;
    if (!el || !frame) return;
    const fit = () => {
      el.style.setProperty("--fit", "1");
      const fw = frame.clientWidth;
      if (fw <= 640) return;
      const limit = node.box.h * (fw / ctx.designWidth) * 1.15 + 2;
      // Keeping the design's layout beats keeping the size: a stand-in script
      // font can run much wider, so allow down to 60% even past minSize.
      const min = Math.min(0.6, node.minSize ? node.minSize / node.size : 0.6);
      let f = 1;
      while (el.scrollHeight > limit && f > min) {
        f *= 0.94;
        el.style.setProperty("--fit", String(f));
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    document.fonts?.addEventListener?.("loadingdone", fit);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [value, node.box.h, node.size, node.minSize, ctx.designWidth]);
  if (!value || (node.hideWhenEmpty && node.bind && !bound && !editorPreview)) return null;
  const Tag = node.tag;
  // Readable floor on phones: body text ≥ 14px, big display text ≥ 22px.
  const floor = node.size >= 28 ? 22 : 14;
  return (
    <Tag
      ref={ref as never}
      className="rs-n rs-text"
      data-layer-id={node.id}
      style={
        {
          ...vars,
          "--w": node.room,
          "--fs": node.size,
          "--floor": `${floor}px`,
          fontFamily: theme.fonts[node.font] ?? theme.bodyFont,
          color: colorOf(theme, node.color),
          fontWeight: node.weight,
          fontStyle: node.italic || isHint ? "italic" : "normal",
          textTransform: node.uppercase ? "uppercase" : "none",
          letterSpacing: `${node.letterSpacing}em`,
          lineHeight: node.lineHeight,
          textAlign: node.align,
          opacity: isHint ? node.opacity * 0.55 : node.opacity,
          textShadow: node.shadow ? `${node.shadow.x}px ${node.shadow.y}px ${node.shadow.blur}px ${node.shadow.color}` : undefined,
        } as CSSProperties
      }
    >
      {value}
    </Tag>
  );
}

function PhotoNode({ node, vars, ctx }: { node: { box: { w: number; h: number }; slot: number; rotate: number; radius: number; focal?: { x: number; y: number }; editorHint?: string }; vars: CSSProperties; ctx: Ctx }) {
  const items = ctx.content.galleries.flatMap((g) => g.items).sort((a, b) => a.order - b.order);
  const item = items[node.slot];
  const focal = node.focal ?? item?.image.focalPoint ?? { x: 0.5, y: 0.5 };
  return (
    <div
      className="rs-n rs-photo"
      style={{ ...vars, "--ar": `${node.box.w} / ${node.box.h}`, borderRadius: `calc(${node.radius} * var(--u))`, transform: node.rotate ? `rotate(${node.rotate}deg)` : undefined } as CSSProperties}
    >
      {item ? (
        <img src={item.image.masterUrl} alt={item.image.alt || ""} loading="lazy" style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }} />
      ) : ctx.editorPreview ? (
        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", border: `2px dashed ${colorOf(ctx.theme, "muted")}`, color: colorOf(ctx.theme, "muted"), fontFamily: ctx.theme.bodyFont, fontSize: 13, boxSizing: "border-box", textAlign: "center", padding: 8 }}>
          {node.editorHint ?? `Photo ${node.slot + 1}`}
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", background: `${colorOf(ctx.theme, "muted")}22` }} />
      )}
    </div>
  );
}

function btnCss(style: LayoutButtonNode["style"], theme: SpecTheme): CSSProperties {
  return {
    background: style.fill ?? "transparent",
    border: style.stroke ? `max(1px, calc(${style.strokeW} * var(--u))) solid ${style.stroke}` : "none",
    borderRadius: `calc(${style.radius} * var(--u))`,
    color: colorOf(theme, style.color),
    fontFamily: theme.fonts[style.font] ?? theme.bodyFont,
    fontWeight: style.weight,
    textTransform: style.uppercase ? "uppercase" : "none",
    letterSpacing: `${style.letterSpacing}em`,
    cursor: "pointer",
  };
}

function ButtonNode({ node, vars, ctx }: { node: LayoutButtonNode; vars: CSSProperties; ctx: Ctx }) {
  return (
    <a className="rs-n rs-btn" href={node.href} style={{ ...vars, "--fs": node.style.size, ...btnCss(node.style, ctx.theme) } as CSSProperties}>
      {node.label}
    </a>
  );
}

/** An email field the design didn't have sits beside the name on desktop, so the form keeps its height. */
function pairFields(fields: LayoutFormNode["fields"]) {
  const out: LayoutFormNode["fields"][] = [];
  for (const f of fields) {
    const prev = out[out.length - 1];
    if (f.key === "email" && f.added && prev?.length === 1 && prev[0].key === "name") prev.push(f);
    else out.push([f]);
  }
  return out;
}

/** The design's own RSVP form, made real: same fields, labels and styling, posting to /api/wedding-rsvp. */
function FormNode({ node, vars, ctx }: { node: LayoutFormNode; vars: CSSProperties; ctx: Ctx }) {
  const { theme, content, editorPreview } = ctx;
  const { values, set, state, error, website, setWebsite, attending, submit, emailed } = useRsvpForm(content, editorPreview, { asksAttending: node.fields.some((f) => f.key === "attending") });

  const u = (px: number) => `calc(${px} * var(--u))`;
  const label = { fontFamily: theme.fonts[node.labelStyle.font] ?? theme.bodyFont, fontSize: u(node.labelStyle.size), lineHeight: 1, color: colorOf(theme, node.labelStyle.color), fontWeight: node.labelStyle.weight, marginBottom: u(6) };
  const input: CSSProperties = {
    border: node.input.stroke ? `max(1px, ${u(node.input.strokeW)}) solid ${node.input.stroke}` : "none",
    borderRadius: u(node.input.radius),
    background: node.input.fill ?? "transparent",
    fontFamily: theme.bodyFont,
    padding: `0 ${u(12)}`,
    color: colorOf(theme, "ink"),
  };
  const panel = node.panel;
  const wrap: ReactNode = (
    <>
      {pairFields(node.fields).map((pair, pi) => (
        <div key={pair.map((f) => f.key).join("+")} className={pair.length > 1 ? "rs-pair" : undefined} style={{ marginTop: pi ? u(pair[0].top ?? node.gap) : 0 }}>
          {pair.map((f) => (
            <div key={f.key}>
              <label style={{ ...label, "--ls": node.labelStyle.size, marginBottom: u(f.labelGap ?? 6) } as CSSProperties} htmlFor={`${ctx.sectionId}-${f.key}`}>
                {f.label}
              </label>
              {f.kind === "choice" ? (
                <div style={{ display: "grid", gap: u(f.optGap ?? 7) }}>
                  {(f.options ?? ["Joyfully accepts", "Regretfully declines"]).map((opt, i) => {
                    const v = i === 0 ? "yes" : "no";
                    const on = values[f.key] === v;
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={on}
                        className="rs-in"
                        onClick={() => set(f.key, v)}
                        style={{
                          ...input,
                          "--fh": f.h,
                          "--fs": node.input.size,
                          border: on ? `max(1px, ${u(1.5)}) solid ${colorOf(theme, "ink")}` : "none",
                          background: node.option?.fill ?? "#00000014",
                          borderRadius: u(node.option?.radius ?? node.input.radius),
                          textAlign: "left",
                          cursor: "pointer",
                        } as CSSProperties}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : f.kind === "textarea" ? (
                <textarea id={`${ctx.sectionId}-${f.key}`} className="rs-in" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} style={{ ...input, "--fh": f.h, "--fs": node.input.size, padding: u(10), resize: "vertical" } as CSSProperties} />
              ) : (
                <input
                  id={`${ctx.sectionId}-${f.key}`}
                  className="rs-in"
                  type={f.kind === "email" ? "email" : f.kind === "number" ? "number" : "text"}
                  required={f.key === "name" || f.key === "email"}
                  min={f.kind === "number" ? 1 : undefined}
                  max={f.kind === "number" ? 10 : undefined}
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  style={{ ...input, "--fh": f.h, "--fs": node.input.size } as CSSProperties}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <input tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
      <button
        type="submit"
        disabled={state === "submitting" || editorPreview}
        className="rs-in"
        style={{ ...btnCss(node.button, theme), "--fh": node.button.h, "--fs": node.button.size, width: "100%", marginTop: u(node.button.top ?? node.gap), opacity: state === "submitting" || editorPreview ? 0.65 : 1 } as CSSProperties}
      >
        {state === "submitting" ? "Sending…" : node.button.label}
      </button>
      {editorPreview ? <p style={{ ...label, marginTop: u(8), textAlign: "center" }}>Guests can RSVP once your site is published.</p> : null}
      {error ? <p style={{ ...label, marginTop: u(8), color: "#c2412d", textAlign: "center" }}>{error}</p> : null}
      {node.note ? <p className="rs-note" style={{ ...label, fontSize: u(node.labelStyle.size * 0.75), lineHeight: 1.2, marginTop: u(node.noteGap ?? 8), marginBottom: 0, textAlign: "center", opacity: 0.8 }}>{node.note}</p> : null}
    </>
  );
  return (
    <form
      id="rsvp"
      className="rs-n rs-form"
      onSubmit={submit}
      style={{
        ...vars,
        background: panel?.fill,
        border: panel?.stroke ? `max(1px, ${u(panel.strokeW)}) solid ${panel.stroke}` : undefined,
        borderRadius: panel ? u(panel.radius) : undefined,
        padding: panel ? u(panel.pad) : undefined,
      }}
    >
      {state === "success" ? (
        <p style={{ ...label, fontSize: `max(16px, ${u(node.labelStyle.size * 1.2)})` }}>
          {attending === "no" ? "Thank you — we’ll miss you. Your reply has been sent." : `Thank you — your RSVP is in.${emailed ? " A confirmation is on its way to your inbox." : ""}`}
        </p>
      ) : (
        wrap
      )}
    </form>
  );
}
