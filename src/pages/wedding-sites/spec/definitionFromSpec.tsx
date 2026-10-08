import type { EventContent } from "../content/types";
import type { TemplateDefinition, TemplateProps } from "../engine/registry";
import { defaultSectionVisibility, type BaseTemplateSettings } from "../presentation/types";
import type { TemplateSpec } from "./schema";
import SpecTemplate from "./runtime/SpecTemplate";

/**
 * Turn an uploaded template (a validated spec) into the same
 * TemplateDefinition shape the hand-coded templates use, so the gallery,
 * builder preview and public page treat both identically.
 */
export function definitionFromSpec(input: {
  id: string;
  label: string;
  tier: "free" | "premium";
  spec: TemplateSpec;
  thumbnailUrl?: string;
  demoContent?: EventContent;
}): TemplateDefinition<BaseTemplateSettings> {
  const { spec } = input;
  const Component = (props: TemplateProps<BaseTemplateSettings>) => <SpecTemplate spec={spec} {...props} />;
  Component.displayName = `SpecTemplate(${input.id})`;
  return {
    id: input.id,
    label: input.label,
    archetype: "uploaded",
    previewThumbnailUrl: input.thumbnailUrl ?? "",
    component: Component,
    defaultSettings: {
      paletteId: spec.tokens.defaultPaletteId,
      fontPairingId: "",
      sectionVisibility: { ...defaultSectionVisibility },
    },
    tier: input.tier,
    demoContent: input.demoContent,
  };
}
