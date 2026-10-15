import { useState } from "react";
import type { EventContent } from "../content/types";
import { resolveTemplate } from "../engine/render";
import type { PresentationState } from "../presentation/types";
import ContentEditor from "../builder/ContentEditor";
import LookAndFeel from "../builder/LookAndFeel";

// Dev harness (&panel=1): the real builder panels (content editor + Look & Feel)
// beside the template, on local state — to try a template's fields and section
// switches without a signed-in account or a draft row. Nothing is saved.
export default function HarnessEditor({ initial, templateId }: { initial: EventContent; templateId: string }) {
  const [content, setContent] = useState(initial);
  const [presentation, setPresentation] = useState<PresentationState>({ activeTemplateId: templateId, byTemplate: {} });
  const resolved = resolveTemplate(presentation);
  if (!resolved) return null;
  const Template = resolved.definition.component;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", alignItems: "start", minHeight: "100vh" }}>
      <aside data-harness-panel style={{ position: "sticky", top: 44, maxHeight: "calc(100vh - 44px)", overflowY: "auto", padding: "8px 16px 40px", background: "#fffff9", borderRight: "1px solid #e5e5ea" }}>
        <details>
          <summary style={{ padding: "14px 4px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Look &amp; feel</summary>
          <LookAndFeel presentation={presentation} onChange={setPresentation} eventId={undefined} loadFontPreviews={false} />
        </details>
        <ContentEditor
          content={content}
          onChange={setContent}
          eventId={undefined}
          template={resolved.definition}
          visibility={resolved.settings.sectionVisibility}
          onShowSection={(key, on) =>
            setPresentation((p) => ({
              ...p,
              byTemplate: { ...p.byTemplate, [resolved.definition.id]: { ...resolved.settings, sectionVisibility: { ...resolved.settings.sectionVisibility, [key]: on } } },
            }))
          }
        />
      </aside>
      <div data-harness-preview>
        <Template content={content} settings={resolved.settings} editorPreview />
      </div>
    </div>
  );
}
