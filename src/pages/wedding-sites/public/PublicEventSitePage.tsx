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
import SiteLoading from "./SiteLoading";
import PasswordGate from "./PasswordGate";
import { getSitePassword, setSitePassword } from "./sitePassword";
import { InviteeProvider, inviteeToken, type Invitee } from "../engine/invitee";

// The live, public event site: /invite/:slug. Reads ONLY the published_*
// columns (never draft_*) — see the RLS note in
// supabase/wedding-sites-schema.sql and Decision 6 in the decision log.

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "gone"; state: "ended" | "deleted"; rawContent: unknown }
  | { status: "locked"; wrong: boolean }
  | { status: "ready"; presentation: PresentationState; rawContent: unknown; photosOn: boolean; tablesOn: boolean; premium: boolean; invitee: Invitee | null };

/** `slugOverride`: on a custom domain (gelat30.net) the site comes from the host, not the URL. */
export default function PublicEventSitePage({ slugOverride }: { slugOverride?: string } = {}) {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride ?? params.slug;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Bumped when a guest enters a password, to load again with it.
  const [attempt, setAttempt] = useState(0);

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
      type Row = { published_content: unknown; published_presentation: unknown; template_spec?: unknown; state?: "live" | "ended" | "deleted"; locked?: boolean; photos_on?: boolean; tables_on?: boolean; is_premium?: boolean };
      let data: Row | null = null;
      let error: { code?: string } | null = null;
      const password = getSitePassword(slug);
      const rpc = await supabase.rpc("get_public_site", password ? { p_slug: slug, p_password: password } : { p_slug: slug });
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
      // Password-protected (supabase/guest-features.sql): ask for it.
      if (!error && data?.locked) {
        setState({ status: "locked", wrong: !!password });
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

      // A personal link (?g=…): who this guest is, their seats and table.
      let invitee: Invitee | null = null;
      const token = inviteeToken(slug);
      if (token) {
        const inv = await supabase.rpc("get_invitee", { p_slug: slug, p_token: token, p_password: password || null });
        const row = ((inv.data as { name: string; party_size: number | null; table_label: string | null; replied: boolean }[] | null) ?? [])[0];
        if (row) invitee = { token, name: row.name, seats: row.party_size, table: row.table_label, replied: row.replied, seatLimit: data.is_premium === true };
      }
      if (cancelled) return;

      setState({
        status: "ready",
        rawContent: data.published_content,
        presentation: (data.published_presentation as PresentationState) ?? {
          activeTemplateId: "",
          byTemplate: {},
        },
        photosOn: data.photos_on === true,
        tablesOn: data.tables_on === true,
        premium: data.is_premium === true,
        invitee,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  if (state.status === "loading") {
    return <SiteLoading />;
  }
  if (state.status === "locked") {
    return (
      <PasswordGate
        wrong={state.wrong}
        onSubmit={async (password) => {
          setSitePassword(slug ?? "", password);
          setAttempt((n) => n + 1);
        }}
      />
    );
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
        <div style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
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
      {/* Every site carries the credit, Premium included. The photo page always lives on
          thersvpstudio.com (photo uploads are only allowed from there), custom domains too. */}
      <SiteCreditProvider
        value={{
          show: true,
          slug,
          photosUrl: state.photosOn ? `${slugOverride ? "https://thersvpstudio.com" : ""}/invite/${slug}/photos` : undefined,
          tablesUrl: state.tablesOn ? `${slugOverride ? "https://thersvpstudio.com" : ""}/invite/${slug}/table` : undefined,
        }}
      >
        <InviteeProvider value={state.invitee}>
        {state.invitee ? <InviteeGreeting invitee={state.invitee} /> : null}
        <resolved.definition.component content={content} settings={resolved.settings} live />
      </InviteeProvider>
      </SiteCreditProvider>
    </ErrorBoundary>
  );
}

/** A personal link: a slim welcome above the site. */
function InviteeGreeting({ invitee }: { invitee: Invitee }) {
  const first = invitee.name.trim().split(/\s+/)[0];
  const line = invitee.replied
    ? "thank you for your RSVP."
    : invitee.seats && invitee.seats > 1
      ? `we’ve saved ${invitee.seats} seats for you.`
      : invitee.seats === 1
        ? "we’ve saved a seat for you."
        : "you’re invited.";
  return (
    <div style={{ position: "relative", zIndex: 40, padding: "10px 16px", textAlign: "center", background: "#1f1d1a", color: "#fff", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14, lineHeight: 1.5 }}>
      Hi {first}, {line}
      {invitee.table ? <> · <strong>Table {invitee.table.replace(/^table\s*/i, "")}</strong></> : null}
      {!invitee.replied ? (
        <>
          {" "}
          <a href="#rsvp" style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: 3, fontWeight: 600 }}>
            RSVP
          </a>
        </>
      ) : null}
    </div>
  );
}
