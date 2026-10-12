// Error alerts from the API functions → Sentry (which emails us). No SDK, to keep
// cold starts fast: one POST of the same "envelope" the SDK sends. Off unless
// SENTRY_DSN is set in Vercel. Always awaited (a function is frozen once it
// responds) and capped at 2.5 s, so a slow Sentry never slows a request down much.

const DSN = (() => {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec((process.env.SENTRY_DSN ?? "").trim());
  return m ? { raw: process.env.SENTRY_DSN!.trim(), url: `https://${m[2]}/api/${m[3]}/envelope/?sentry_version=7&sentry_key=${m[1]}&sentry_client=rsvp-studio-api%2F1` } : null;
})();

function frames(stack: string | undefined) {
  if (!stack) return undefined;
  const out = stack
    .split("\n")
    .slice(1, 40)
    .map((line) => /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ function: m[1] || undefined, filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), in_app: !m[2].includes("node_modules") && !m[2].startsWith("node:") }));
  return out.length ? { frames: out.reverse() } : undefined;
}

/** Report a server error. `where` names the function/step (a tag in Sentry); never throws. */
export async function captureError(error: unknown, where: string, extra: Record<string, unknown> = {}) {
  if (!DSN) return;
  try {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error));
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const now = new Date().toISOString();
    const event = {
      event_id: eventId,
      timestamp: now,
      platform: "node",
      level: "error",
      server_name: "vercel",
      environment: process.env.VERCEL_ENV ?? "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
      tags: { side: "api", where },
      extra,
      exception: { values: [{ type: err.name || "Error", value: err.message, stacktrace: frames(err.stack) }] },
    };
    const body = `${JSON.stringify({ event_id: eventId, sent_at: now, dsn: DSN.raw })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
    await fetch(DSN.url, { method: "POST", body, headers: { "Content-Type": "application/x-sentry-envelope" }, signal: AbortSignal.timeout(2500) });
  } catch {
    /* reporting must never break the request */
  }
}
