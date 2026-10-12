import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compressImage";
import NotFound from "../../NotFound";
import { normalizeEventContent } from "../content/normalize";
import PasswordGate from "./PasswordGate";
import SiteLoading from "./SiteLoading";
import { getSitePassword, setSitePassword } from "./sitePassword";

// /invite/:slug/photos — Premium guest photo sharing. Guests add photos from their
// phones (shrunk to ≤2000px JPEGs first, which also drops the GPS location) and see
// everyone's. Uploads: api/_lib/guest-photos.ts. Neutral styling, like the password
// screen: this is the hosts' page, not ours.

type Photo = { id: string; url: string; uploader_name: string | null; created_at: string };
type Load =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "locked"; wrong: boolean }
  | { status: "off"; names: string }
  | { status: "ready"; names: string; photos: Photo[] };

const NAME_KEY = "rs-photo-name";
const INK = "#1f1d1a";
const MUTED = "#6b655b";

async function post<T>(op: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/wedding-rsvp?op=${op}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return json;
}

export default function GuestPhotosPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const password = getSitePassword(slug);
    const { data, error } = await supabase.rpc("get_public_site", password ? { p_slug: slug, p_password: password } : { p_slug: slug });
    const row = ((data as { published_content: unknown; state?: string; locked?: boolean; photos_on?: boolean }[] | null) ?? [])[0];
    if (error || !row || row.state === "deleted") return setLoad({ status: "missing" });
    if (row.locked) return setLoad({ status: "locked", wrong: !!password });
    const content = normalizeEventContent(row.published_content);
    const names = content.hosts.map((h) => h.name).filter(Boolean).join(" & ");
    if (!row.photos_on || row.state === "ended") return setLoad({ status: "off", names });
    const { data: photos } = await supabase.rpc("get_guest_photos", password ? { p_slug: slug, p_password: password } : { p_slug: slug });
    setLoad({ status: "ready", names, photos: (photos ?? []) as Photo[] });
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh, attempt]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      /* fine */
    }
    const list = Array.from(files).slice(0, 20);
    setMessage(null);
    setProgress({ done: 0, total: list.length });
    let failed = 0;
    let lastError = "";
    for (const [i, original] of list.entries()) {
      try {
        const file = await compressImage(original, { maxEdge: 2000, quality: 0.85, stripLocation: true });
        const { uploadUrl, headers, token } = await post<{ uploadUrl: string; headers: Record<string, string>; token: string }>("photo-url", {
          slug,
          password: getSitePassword(slug),
          contentType: file.type,
          size: file.size,
        });
        const put = await fetch(uploadUrl, { method: "PUT", headers, body: file });
        if (!put.ok) throw new Error("The upload didn’t finish. Check your connection and try again.");
        await post("photo-done", { token, name: name.trim() });
      } catch (e) {
        failed++;
        lastError = e instanceof Error ? e.message : "Something went wrong.";
        // The album is full or closed: no point trying the rest.
        if (/full|closed|switched on|private/.test(lastError)) break;
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
    const sent = list.length - failed;
    setMessage(
      failed
        ? { tone: "error", text: sent ? `${sent} added, ${failed} didn’t upload. ${lastError}` : lastError }
        : { tone: "ok", text: `Thank you${name.trim() ? `, ${name.trim().split(" ")[0]}` : ""}. ${sent === 1 ? "Your photo is" : `All ${sent} photos are`} in the album.` },
    );
    refresh();
  };

  if (load.status === "loading") return <SiteLoading />;
  if (load.status === "missing") return <NotFound />;
  if (load.status === "locked")
    return (
      <PasswordGate
        wrong={load.wrong}
        onSubmit={async (password) => {
          setSitePassword(slug, password);
          setAttempt((n) => n + 1);
        }}
      />
    );

  const back = (
    <Link to={`/invite/${slug}`} style={{ color: MUTED, fontSize: 15, textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44 }}>
      ← Back to the invitation
    </Link>
  );

  return (
    <main style={{ minHeight: "100svh", background: "#f7f5f0", color: INK, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 60px" }}>
        {back}
        <header style={{ textAlign: "center", padding: "18px 0 28px" }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED }}>Shared photos</p>
          <h1 style={{ margin: "12px 0 0", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: "clamp(28px, 6vw, 40px)", lineHeight: 1.15, textWrap: "balance" }}>
            {load.names || "Our celebration"}
          </h1>
        </header>

        {load.status === "off" ? (
          <p style={{ textAlign: "center", fontSize: 16, color: MUTED }}>Photo sharing isn’t open for this event.</p>
        ) : (
          <>
            <section style={{ maxWidth: 440, margin: "0 auto 32px", background: "#fff", borderRadius: 20, padding: 20, border: "1px solid #e6e0d4" }}>
              <p style={{ margin: "0 0 12px", fontSize: 16, lineHeight: 1.5 }}>Took photos? Add them here for the hosts and everyone else.</p>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }} htmlFor="photo-name">
                Your name (optional)
              </label>
              <input
                id="photo-name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                autoComplete="name"
                style={{ width: "100%", boxSizing: "border-box", fontSize: 16, padding: "12px 16px", borderRadius: 12, border: "1px solid #d8d2c6", outline: "none" }}
              />
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
              <button
                type="button"
                disabled={!!progress}
                onClick={() => fileRef.current?.click()}
                style={{ marginTop: 14, width: "100%", minHeight: 50, borderRadius: 999, border: "none", background: INK, color: "#fff", fontSize: 16, cursor: "pointer", opacity: progress ? 0.75 : 1 }}
              >
                {progress ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : "Add photos"}
              </button>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: MUTED }}>Up to 20 at a time. The hosts can remove any photo.</p>
              {message ? (
                <p role="status" style={{ margin: "12px 0 0", fontSize: 14, color: message.tone === "ok" ? "#3d7a12" : "#c2412d" }}>
                  {message.text}
                </p>
              ) : null}
            </section>

            {load.photos.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                {load.photos.map((p) => (
                  <li key={p.id} style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 12, background: "#ebe6dc" }}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={p.uploader_name ? `Photo from ${p.uploader_name}` : "Open photo"}>
                      <img src={p.url} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </a>
                    {p.uploader_name ? (
                      <span style={{ position: "absolute", left: 6, bottom: 6, maxWidth: "calc(100% - 12px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, padding: "3px 8px", borderRadius: 999, background: "rgba(0,0,0,0.55)", color: "#fff" }}>
                        {p.uploader_name}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ textAlign: "center", fontSize: 16, color: MUTED }}>No photos yet. Be the first to add one.</p>
            )}
          </>
        )}

        <p style={{ marginTop: 48, textAlign: "center", fontSize: 13, color: MUTED }}>
          Made with love by{" "}
          <a href="https://thersvpstudio.com/build" style={{ color: MUTED }}>
            The RSVP Studio
          </a>
        </p>
      </div>
    </main>
  );
}
