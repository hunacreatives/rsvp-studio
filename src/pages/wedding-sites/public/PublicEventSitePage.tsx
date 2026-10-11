import ErrorBoundary from "@/components/ErrorBoundary";
import { loadPairingFonts } from "../presentation/loadFonts";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { normalizeEventContent } from "../content/normalize";
import { resolveTemplate } from "../engine/render";
import type { PresentationState } from "../presentation/types";
import NotFound from "../../NotFound";
import { getTemplateDefinition, registerTemplate } from "../engine/registry";
import { loadTemplateCatalog } from "../engine/catalog";
import { parseSpec } from "../spec/schema";
import { definitionFromSpec } from "../spec/definitionFromSpec";
import { SiteCreditProvider } from "../engine/siteCredit";
import SiteEndedPage from "./SiteEndedPage";

// The live, public event site: /invite/:slug. Reads ONLY the published_*
// columns (never draft_*) — see the RLS note in
// supabase/wedding-sites-schema.sql and Decision 6 in the decision log.

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "gone"; state: "ended" | "deleted"; rawContent: unknown }
  | { status: "ready"; presentation: PresentationState; rawContent: unknown };

/** `slugOverride`: on a custom domain (gelat30.net) the site comes from the host, not the URL. */
export default function PublicEventSitePage({ slugOverride }: { slugOverride?: string } = {}) {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride ?? params.slug;
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) {
        setState({ status: "not-found" });
        return;
      }
      // get_public_site() returns only the published columns for one slug
      // (supabase/site-security-fixes.sql). Until that SQL is applied, fall
      // back to the direct table read so live sites never go dark.
      type Row = { published_content: unknown; published_presentation: unknown; template_spec?: unknown; state?: "live" | "ended" | "deleted" };
      let data: Row | null = null;
      let error: { code?: string } | null = null;
      const rpc = await supabase.rpc("get_public_site", { p_slug: slug });
      if (rpc.error?.code === "PGRST202") {
        const direct = await supabase
          .from("wedding_sites")
          .select("published_content, published_presentation")
          .eq("slug", slug)
          .not("published_at", "is", null)
          .maybeSingle();
        data = direct.data as Row | null;
        error = direct.error;
      } else {
        data = ((rpc.data as Row[] | null) ?? [])[0] ?? null;
        error = rpc.error;
      }

      if (cancelled) return;
      // Past its event, or deleted by the host: a branded page instead of the site.
      if (!error && data && (data.state === "ended" || data.state === "deleted")) {
        setState({ status: "gone", state: data.state, rawContent: data.published_content });
        return;
      }
      if (error || !data || !data.published_content) {
        setState({ status: "not-found" });
        return;
      }

      // Uploaded template: render the exact version this site was published
      // with (pinned), not whatever the template looks like today.
      const presentation = (data.published_presentation as PresentationState) ?? { activeTemplateId: "", byTemplate: {} };
      if (data.template_spec && presentation.activeTemplateId) {
        const parsed = parseSpec(data.template_spec);
        if ("spec" in parsed) {
          registerTemplate(
            definitionFromSpec({ id: presentation.activeTemplateId, label: presentation.activeTemplateId, tier: "free", spec: parsed.spec }),
          );
        }
      } else if (presentation.activeTemplateId && !getTemplateDefinition(presentation.activeTemplateId)) {
        await loadTemplateCatalog();
      }
      if (cancelled) return;

      setState({
        status: "ready",
        rawContent: data.published_content,
        presentation: (data.published_presentation as PresentationState) ?? {
          activeTemplateId: "",
          byTemplate: {},
        },
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return <div style={{ minHeight: "100vh" }} />;
  }
  if (state.status === "not-found") {
    return <NotFound />;
  }
  if (state.status === "gone") {
    return <SiteEndedPage state={state.state} content={state.rawContent ? normalizeEventContent(state.rawContent) : null} slug={slug ?? ""} />;
  }

  // The RSVP form posts content.slug; older publishes saved it empty, so
  // the URL is the source of truth.
  const content = { ...normalizeEventContent(state.rawContent), slug: slug ?? "" };
  const resolved = resolveTemplate(state.presentation);
  if (!resolved) {
    return <NotFound />;
  }

  loadPairingFonts(resolved.settings.fontPairingId);
  return (
    <ErrorBoundary
      fallback={() => (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
          <div style={{ maxWidth: 380 }}>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#000727" }}>This invitation didn’t load properly</p>
            <p style={{ fontSize: 16, color: "#55556a", margin: "10px 0 20px" }}>Please refresh the page. If it still doesn’t work, let the host know.</p>
            <button onClick={() => window.location.reload()} style={{ fontSize: 16, padding: "12px 24px", borderRadius: 999, border: "none", background: "#000727", color: "#fff", cursor: "pointer" }}>
              Refresh
            </button>
          </div>
        </div>
      )}
    >
      {/* Every site carries the credit, Premium included. */}
      <SiteCreditProvider value={{ show: true, slug }}>
        <resolved.definition.component content={content} settings={resolved.settings} live />
      </SiteCreditProvider>
    </ErrorBoundary>
  );
}
