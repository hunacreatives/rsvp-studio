import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as api from "./api";
import { usePortal } from "./PortalContext";

// Where someone is with the partner program, for the menu and Home:
//   partner: approved (my_partner); applied: an application being looked at (partner-flow.sql);
//   intent: they came for it (signed up or pressed Apply from /partners?type=creator) but haven't
//   applied yet, kept in their auth metadata (partner_intent), so Home can say "finish your
//   application" until they do, and hosts who never came for it see nothing.

export type PartnerStatus = { partner: boolean; applied: boolean; intent: string | null };

export function usePartnerStatus(): PartnerStatus {
  const { demo } = usePortal();
  const [s, setS] = useState<PartnerStatus>({ partner: false, applied: false, intent: null });
  useEffect(() => {
    if (demo) return;
    let alive = true;
    Promise.all([api.myPartner(), api.myPartnerApplication(), supabase.auth.getUser()]).then(([p, applied, { data }]) => {
      const intent = (data.user?.user_metadata?.partner_intent as string | undefined) ?? null;
      if (alive) setS({ partner: !!p, applied: !!applied, intent });
    });
    return () => {
      alive = false;
    };
  }, [demo]);
  return s;
}

/** They came for the partner program (Partner page opened from /partners?type=…): remember it. */
export async function rememberPartnerIntent(type: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.user_metadata?.partner_intent === type) return;
  await supabase.auth.updateUser({ data: { partner_intent: type } }).catch(() => undefined);
}

/** "Not now" on Home's reminder. */
export async function forgetPartnerIntent() {
  await supabase.auth.updateUser({ data: { partner_intent: null } }).catch(() => undefined);
}
