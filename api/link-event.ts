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
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("invite_codes")
    .select("code, event_id, used_at")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (inviteError || !invite) {
    res.status(404).json({ error: "That invite code wasn't found" });
    return;
  }
  if (invite.used_at) {
    res.status(409).json({ error: "That invite code has already been used" });
    return;
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, owner_id")
    .eq("id", invite.event_id)
    .maybeSingle();

  if (!event) {
    res.status(404).json({ error: "That event no longer exists" });
    return;
  }

  if (!event.owner_id) {
    await supabaseAdmin.from("events").update({ owner_id: user.id }).eq("id", event.id);
  } else {
    await supabaseAdmin
      .from("event_members")
      .upsert({ event_id: event.id, profile_id: user.id, role: "viewer" });
  }

  await supabaseAdmin
    .from("invite_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", normalizedCode);

  res.status(200).json({ eventId: event.id });
}
