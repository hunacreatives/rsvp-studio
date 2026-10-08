import type { TemplateProps } from "../../engine/registry";
import type { BaseTemplateSettings } from "../../presentation/types";
import type { TemplateSpec } from "../schema";
import { Block } from "./blocks";
import CanvasSection from "./CanvasSection";
import { resolveSpecTheme, SpecThemeContext, useSpecFonts } from "./theme";

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

  return (
    <SpecThemeContext.Provider value={theme}>
      <div
        data-spec-root
        style={{
          containerType: "inline-size",
          background: theme.colors.bg,
          color: theme.colors.ink,
          fontFamily: theme.bodyFont,
          minHeight: "100%",
          overflowX: "clip",
        }}
      >
        {spec.sections.map((section) => {
          if (section.visibilityKey && visibility[section.visibilityKey] === false) return null;
          return section.kind === "canvas" ? (
            <CanvasSection key={section.id} section={section} spec={spec} content={content} editorPreview={editorPreview} />
          ) : (
            <Block key={section.id} section={section} content={content} visibility={visibility} editorPreview={editorPreview} />
          );
        })}
      </div>
    </SpecThemeContext.Provider>
  );
}
