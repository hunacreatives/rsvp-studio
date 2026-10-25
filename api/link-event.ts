import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Service-role key — server-side only, never exposed to the client bundle.
// Bypasses RLS, which is required here: redeeming a code has to look up
// and update rows the signed-in user has no policy-granted access to.
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Body = {
  code: string;
  accessToken: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { code, accessToken } = req.body as Body;
  if (!code || !accessToken) {
    res.status(400).json({ error: "Code and access token required" });
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }

  const normalizedCode = code.trim().toUpperCase();
  // Claim the code in one step, so two people can't both use it.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("invite_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", normalizedCode)
    .is("used_at", null)
    .select("code, event_id, role")
    .maybeSingle();
  if (claimError || !claimed) {
    const { data: seen } = await supabaseAdmin.from("invite_codes").select("used_at").eq("code", normalizedCode).maybeSingle();
    res.status(seen ? 409 : 404).json({ error: seen ? "That invite code has already been used" : "That invite code wasn't found" });
    return;
  }

  const { data: event } = await supabaseAdmin.from("events").select("id, owner_id").eq("id", claimed.event_id).maybeSingle();
  if (!event) {
    res.status(404).json({ error: "That event no longer exists" });
    return;
  }

  // The code says who it's for (coordinator-mode.sql): a coordinator never becomes the owner.
  // Without a role, as before: the first to use it owns the event, later people are cohosts.
  const role = (claimed as { role?: string | null }).role ?? null;
  if ((role === null || role === "owner") && !event.owner_id) {
    const { data: took } = await supabaseAdmin.from("events").update({ owner_id: user.id }).eq("id", event.id).is("owner_id", null).select("id").maybeSingle();
    if (!took) await supabaseAdmin.from("event_members").upsert({ event_id: event.id, profile_id: user.id, role: "cohost" });
  } else if (event.owner_id !== user.id) {
    const memberRole = role === "coordinator" || role === "viewer" ? role : "cohost";
    // Already on the event with more rights (a cohost using a coordinator's code): keep them.
    const rank: Record<string, number> = { viewer: 0, coordinator: 1, cohost: 2 };
    const { data: had } = await supabaseAdmin.from("event_members").select("role").eq("event_id", event.id).eq("profile_id", user.id).maybeSingle();
    if (!had || (rank[memberRole] ?? 0) > (rank[had.role as string] ?? 0)) {
      await supabaseAdmin.from("event_members").upsert({ event_id: event.id, profile_id: user.id, role: memberRole });
    }
  }

  res.status(200).json({ eventId: event.id });
}
