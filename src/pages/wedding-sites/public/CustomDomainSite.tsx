import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import NotFound from "../../NotFound";
import PublicEventSitePage from "./PublicEventSitePage";
import SiteLoading from "./SiteLoading";

// A customer's own domain (e.g. gelat30.net, bought through api/_lib/domains.ts)
// shows their event site on every path. vercel.json sends unknown hosts here.

export { isCustomDomain } from "./customDomain";

export default function CustomDomainSite() {
  const [slug, setSlug] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    supabase.rpc("get_site_by_domain", { p_host: window.location.hostname }).then(({ data }) => setSlug((data as string | null) ?? null));
  }, []);
  if (slug === undefined) return <SiteLoading />;
  return slug ? <PublicEventSitePage slugOverride={slug} /> : <NotFound />;
}
