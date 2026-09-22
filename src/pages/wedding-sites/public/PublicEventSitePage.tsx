import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { normalizeEventContent } from "../content/normalize";
import { resolveTemplate } from "../engine/render";
import type { PresentationState } from "../presentation/types";
import NotFound from "../../NotFound";

// The live, public event site: /invite/:slug. Reads ONLY the published_*
// columns (never draft_*) — see the RLS note in
// supabase/wedding-sites-schema.sql and Decision 6 in the decision log.

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "ready"; presentation: PresentationState; rawContent: unknown };

export default function PublicEventSitePage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) {
        setState({ status: "not-found" });
        return;
      }
      const { data, error } = await supabase
        .from("wedding_sites")
        .select("published_content, published_presentation")
        .eq("slug", slug)
        .not("published_at", "is", null)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data || !data.published_content) {
        setState({ status: "not-found" });
        return;
      }

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

  const content = normalizeEventContent(state.rawContent);
  const resolved = resolveTemplate(state.presentation);
  if (!resolved) {
    return <NotFound />;
  }

  return <resolved.definition.component content={content} settings={resolved.settings} />;
}
