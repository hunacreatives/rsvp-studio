import { Fragment } from "react";
import type { TemplateProps } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import type { TemplateSpec } from "../schema";
import { Block } from "./blocks";
import CanvasSection from "./CanvasSection";
import LayoutSection from "./LayoutSection";
import { resolveSpecTheme, SpecThemeContext, useSpecFonts } from "./theme";

/** Below this template width the phone version of a two-version design shows. */
export const PHONE_BREAKPOINT = 820;
const SCREEN_CSS = `@container rsroot (max-width:${PHONE_BREAKPOINT - 0.02}px){.rs-scr-desktop{display:none!important}}@container rsroot (min-width:${PHONE_BREAKPOINT}px){.rs-scr-phone{display:none!important}}`;

/**
 * Renders ANY uploaded template from its spec. The root is a size
 * container (`container-type: inline-size`) so every size below is
 * relative to the template's own width — which is what makes it render
 * the same in the builder's scaled preview, the gallery card and a phone.
 */
export default function SpecTemplate({
  spec,
  content,
  settings,
  editorPreview,
}: TemplateProps<BaseTemplateSettings> & { spec: TemplateSpec }) {
  const theme = resolveSpecTheme(spec, settings);
  useSpecFonts(spec);
  const visibility = settings.sectionVisibility;
  const twoVersions = spec.sections.some((s) => s.screen);

  return (
    <SpecThemeContext.Provider value={theme}>
      <div
        data-spec-root
        style={{
          containerType: "inline-size",
          containerName: "rsroot",
          background: theme.colors.bg,
          color: theme.colors.ink,
          fontFamily: theme.bodyFont,
          minHeight: "100%",
          overflowX: "clip",
        }}
      >
        {twoVersions ? <style>{SCREEN_CSS}</style> : null}
        {spec.sections.map((section) => {
          if (section.visibilityKey && visibility[section.visibilityKey] === false) return null;
          const el =
            section.kind === "layout" ? (
              <LayoutSection section={section} spec={spec} content={content} editorPreview={editorPreview} />
            ) : section.kind === "canvas" ? (
              <CanvasSection section={section} spec={spec} content={content} editorPreview={editorPreview} />
            ) : (
              <Block section={section} content={content} visibility={visibility} editorPreview={editorPreview} />
            );
          // Two-version designs: each section shows on its own kind of screen.
          return section.screen ? (
            <div key={section.id} className={`rs-scr-${section.screen}`} style={{ display: "contents" }}>
              {el}
            </div>
          ) : (
            <Fragment key={section.id}>{el}</Fragment>
          );
        })}
      </div>
    </SpecThemeContext.Provider>
  );
}
