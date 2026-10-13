import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import NotFound from "../../NotFound";
import { normalizeEventContent } from "../content/normalize";
import PasswordGate from "./PasswordGate";
import SiteLoading from "./SiteLoading";
import { getSitePassword, setSitePassword } from "./sitePassword";

// /invite/:slug/table — guests type their name and see their table (Premium, the hosts
// switch it on; supabase/guest-links.sql → find_table). Only close name matches answer,
// so the page never lists the guest list. Neutral styling, like the photo page.

type Load = { status: "loading" } | { status: "missing" } | { status: "locked"; wrong: boolean } | { status: "off"; names: string } | { status: "ready"; names: string };
const INK = "#1f1d1a";
const MUTED = "#6b655b";

export default function FindTablePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ name: string; table_label: string }[] | null>(null);

  useEffect(() => {
    (async () => {
      const password = getSitePassword(slug);
      const { data, error } = await supabase.rpc("get_public_site", password ? { p_slug: slug, p_password: password } : { p_slug: slug });
      const row = ((data as { published_content: unknown; state?: string; locked?: boolean; tables_on?: boolean }[] | null) ?? [])[0];
      if (error || !row || row.state === "deleted") return setLoad({ status: "missing" });
      if (row.locked) return setLoad({ status: "locked", wrong: !!password });
      const names = normalizeEventContent(row.published_content).hosts.map((h) => h.name).filter(Boolean).join(" & ");
      setLoad(row.tables_on ? { status: "ready", names } : { status: "off", names });
    })();
  }, [slug, attempt]);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) return;
    setBusy(true);
    const password = getSitePassword(slug);
    const { data } = await supabase.rpc("find_table", { p_slug: slug, p_name: name.trim(), p_password: password || null });
    setResult((data ?? []) as { name: string; table_label: string }[]);
    setBusy(false);
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

  return (
    <main style={{ minHeight: "100svh", background: "#f7f5f0", color: INK, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 60px" }}>
        <Link to={`/invite/${slug}`} style={{ color: MUTED, fontSize: 15, textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44 }}>
          ← Back to the invitation
        </Link>
        <header style={{ textAlign: "center", padding: "24px 0 28px" }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED }}>Find your table</p>
          <h1 style={{ margin: "12px 0 0", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: "clamp(28px, 7vw, 38px)", lineHeight: 1.15 }}>{load.names || "Welcome"}</h1>
        </header>
        {load.status === "off" ? (
          <p style={{ textAlign: "center", fontSize: 16, color: MUTED }}>Table assignments aren’t open yet.</p>
        ) : (
          <>
            <form onSubmit={search} style={{ background: "#fff", borderRadius: 20, padding: 20, border: "1px solid #e6e0d4" }}>
              <label htmlFor="table-name" style={{ display: "block", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Your full name
              </label>
              <input
                id="table-name"
                value={name}
                onChange={(e) => (setName(e.target.value), setResult(null))}
                autoComplete="name"
                autoCapitalize="words"
                placeholder="e.g. Maria Santos"
                style={{ width: "100%", boxSizing: "border-box", fontSize: 16, padding: "14px 16px", borderRadius: 12, border: "1px solid #d8d2c6", outline: "none" }}
              />
              <button type="submit" disabled={busy || name.trim().length < 3} style={{ marginTop: 12, width: "100%", minHeight: 50, borderRadius: 999, border: "none", background: INK, color: "#fff", fontSize: 16, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
                {busy ? "Looking…" : "Find my table"}
              </button>
            </form>
            {result ? (
              <div role="status" style={{ marginTop: 20, textAlign: "center" }}>
                {result.length ? (
                  result.map((r) => (
                    <div key={r.name} style={{ background: "#fff", borderRadius: 20, padding: "22px 20px", border: "1px solid #e6e0d4", marginBottom: 10 }}>
                      <p style={{ margin: 0, fontSize: 15, color: MUTED }}>{r.name}</p>
                      <p style={{ margin: "6px 0 0", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 40, lineHeight: 1.1 }}>Table {r.table_label.replace(/^table\s*/i, "")}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6 }}>We couldn’t find that name. Try your full name as it’s written on your invitation, or ask the hosts.</p>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
