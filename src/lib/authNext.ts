// Google sign-in always comes back to /account (the only return address Supabase
// allows), so the page they were headed to is noted here first and picked up by
// the dashboard once they're back. Same tab only, and only for 15 minutes.

const KEY = "rsvp-auth-next";

export function rememberAuthNext(path: string | null) {
  try {
    if (path) sessionStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export function takeAuthNext(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const v = raw ? (JSON.parse(raw) as { path?: string; at?: number }) : null;
    const path = v?.path;
    if (!path || Date.now() - (v.at ?? 0) > 15 * 60 * 1000) return null;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : null;
  } catch {
    return null;
  }
}
