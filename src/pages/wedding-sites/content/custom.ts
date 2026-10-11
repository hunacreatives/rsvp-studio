import type { EventContent } from "./types";

/** A template-only answer (TemplateDefinition.customFields), trimmed — "" when empty. */
export const customValue = (content: EventContent, key: string) => (content.custom?.[key] ?? "").trim();
