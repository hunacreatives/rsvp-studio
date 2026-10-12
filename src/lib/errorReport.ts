// Error alerts: crashes in visitors' browsers go to Sentry, which emails us.
// No Sentry SDK (it would add ~70 KB to every page): this posts the same "envelope"
// the SDK sends, straight to Sentry's ingest URL. Off unless VITE_SENTRY_DSN is set.
//   - uncaught errors and unhandled promise rejections (initErrorReporting, main.tsx)
//   - a page crash caught by ErrorBoundary (reportError)
// Noise is dropped (browser extensions, flaky networks, ResizeObserver warnings), and
// one page load sends at most 8 reports, each distinct error once.

type Dsn = { url: string; dsn: string };

function parseDsn(raw: string | undefined): Dsn | null {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec((raw ?? "").trim());
  if (!m) return null;
  const [, key, host, project] = m;
  return { dsn: raw!.trim(), url: `https://${host}/api/${project}/envelope/?sentry_version=7&sentry_key=${key}&sentry_client=rsvp-studio%2F1` };
}

const DSN = parseDsn(import.meta.env.VITE_SENTRY_DSN as string | undefined);
const MAX_PER_PAGE = 8;
const seen = new Set<string>();

const NOISE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i, // another site's script: no details to act on
  /Failed to fetch|NetworkError|Load failed|network connection was lost/i,
  /AbortError|The operation was aborted/i,
  /Non-Error promise rejection captured/i,
  /dynamically imported module|Importing a module script failed|Loading chunk/i, // an old tab after a deploy: it reloads itself
];

/** Chrome / Firefox / Safari stack lines → Sentry frames (oldest call first). */
function frames(stack: string | undefined) {
  if (!stack) return undefined;
  const out: { function?: string; filename: string; lineno?: number; colno?: number; in_app: boolean }[] = [];
  for (const line of stack.split("\n").slice(0, 40)) {
    const m = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line) || /^\s*(.*?)@(.+?):(\d+):(\d+)$/.exec(line);
    if (!m) continue;
    out.push({ function: m[1] || undefined, filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), in_app: m[2].startsWith(window.location.origin) });
  }
  return out.length ? { frames: out.reverse() } : undefined;
}

export function reportError(error: unknown, context: Record<string, string> = {}) {
  if (!DSN) return;
  try {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error));
    const message = `${err.name}: ${err.message}`;
    if (NOISE.some((r) => r.test(err.message))) return;
    if (/chrome-extension:|moz-extension:|safari-web-extension:/.test(err.stack ?? "")) return;
    if (seen.has(message) || seen.size >= MAX_PER_PAGE) return;
    seen.add(message);

    // Older Safari has no randomUUID: any 32 hex characters will do.
    const eventId = typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "") : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const now = new Date().toISOString();
    const event = {
      event_id: eventId,
      timestamp: now,
      platform: "javascript",
      level: "error",
      environment: /^(localhost|127\.)/.test(window.location.hostname) ? "development" : "production",
      release: __RELEASE__ || undefined,
      request: { url: window.location.href.split("?")[0], headers: { "User-Agent": navigator.userAgent } },
      tags: { side: "browser", ...context },
      exception: { values: [{ type: err.name || "Error", value: err.message, stacktrace: frames(err.stack) }] },
    };
    const body = `${JSON.stringify({ event_id: eventId, sent_at: now, dsn: DSN.dsn })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
    // text/plain keeps it a "simple" request (no CORS preflight), like the Sentry SDK.
    void fetch(DSN.url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(() => {});
  } catch {
    /* reporting must never break the page */
  }
}

export function initErrorReporting() {
  if (!DSN) return;
  window.addEventListener("error", (e) => reportError(e.error ?? e.message, { via: "window.onerror" }));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason, { via: "unhandledrejection" }));
}
