import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Who's looking at /partners, so the page can meet them where they are: a planner who already
// has a desk opens it, an approved partner sees their code, someone who's applied isn't asked
// again (supabase/partner-flow.sql), and the form starts with their account's name and email.

export type Visitor = {
  email: string;
  name: string;
  /** Has the Coordinator desk: said so, or has a client. */
  coordinator: boolean;
  partner: { code: string; active: boolean } | null;
  /** Their latest application, while it's still being looked at. */
  applied: { at: string } | null;
};

export function useVisitor(): { visitor: Visitor | null; ready: boolean } {
  const [state, setState] = useState<{ visitor: Visitor | null; ready: boolean }>({ visitor: null, ready: false });
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return alive && setState({ visitor: null, ready: true });
      const [profile, clients, partner, application] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        // Has clients: events they set up for one, or a couple's event they coordinate.
        Promise.all([
          supabase.from("events").select("id").eq("client_of", user.id).is("deleted_at", null).limit(1),
          supabase.from("event_members").select("event_id").eq("profile_id", user.id).eq("role", "coordinator").limit(1),
        ]).then(([a, b]) => ({ data: [...(a.data ?? []), ...(b.data ?? [])] })),
        supabase.rpc("my_partner"),
        supabase.rpc("my_partner_application"),
      ]);
      const p = profile.data as { full_name: string | null } | null;
      const pa = (Array.isArray(partner.data) ? partner.data[0] : partner.data) as { code: string; active: boolean } | null | undefined;
      const ap = (Array.isArray(application.data) ? application.data[0] : application.data) as { status: string; created_at: string } | null | undefined;
      if (!alive) return;
      setState({
        ready: true,
        visitor: {
          email: user.email ?? "",
          name: p?.full_name ?? "",
          coordinator: (clients.data?.length ?? 0) > 0,
          partner: pa ? { code: pa.code, active: !!pa.active } : null,
          // New or being talked to; a converted one is a partner by now, an archived one can apply again.
          applied: ap && (ap.status === "new" || ap.status === "contacted") ? { at: ap.created_at } : null,
        },
      });
    })();
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
