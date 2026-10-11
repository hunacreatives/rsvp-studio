import { supabase } from "@/lib/supabase";

// Which free site sent a new customer: the "Make your own" links on free
// sites and in their guest emails go to /build?ref=<slug>&via=site|email.
// The click is remembered in this browser; once they're signed in, it's saved
// on their profile (record_signup_ref only credits a NEW account, made after
// the click, and never overwrites). Studio → Overview counts them.

const KEY = "rsvp_signup_ref";

export function rememberSignupRef(search: string) {
  const q = new URLSearchParams(search);
  const ref = (q.get("ref") ?? "").toLowerCase();
  const via = q.get("via") === "email" ? "email" : "site";
  if (!/^[a-z0-9-]{1,80}$/.test(ref)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ref, via, at: new Date().toISOString() }));
  } catch {
    /* private mode — not counted */
  }
}

export async function claimSignupRef() {
  let saved: { ref: string; via: string; at: string } | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return;
  }
  if (!saved?.ref) return;
  const { error } = await supabase.rpc("record_signup_ref", { p_slug: saved.ref, p_via: saved.via, p_clicked_at: saved.at });
  if (!error)
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
}
