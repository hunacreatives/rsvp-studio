import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { FormField, inputStyle } from "./components/FormField";
import { PREMIUM_FEATURES } from "./SitePlan";

// Builder → "Privacy & guests" (supabase/guest-features.sql). These are site settings,
// not content: they save on their own and apply to the live site straight away.
//   Password — every site. Guests type it once to open the invitation.
//   Guest reminders — Premium: guests who said yes get a reminder 2 days before.
//   Photo sharing — Premium: a page where guests add their photos (+ a QR code for tables).

// invite_only / table_finder: supabase/guest-links.sql (missing until it runs: those switches hide).
type Row = { site_password: string | null; guest_reminders: boolean; photo_sharing: boolean; invite_only?: boolean; table_finder?: boolean };

export default function GuestSettings({ eventId, slug, premium, onUpgrade, price }: { eventId: string | undefined; slug: string; premium: boolean; onUpgrade?: () => void; /** The upgrade price, e.g. "₱449". */ price?: string }) {
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const photosUrl = `https://thersvpstudio.com/invite/${slug}/photos`;

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from("wedding_sites")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle()
      .then(({ data, error }) => {
        // No row yet (never saved) or guest-features.sql not run: hide the panel.
        setRow(error || !data ? null : (data as Row));
        setPassword((data as Row | null)?.site_password ?? "");
      });
  }, [eventId]);

  // The QR code for the photo page, drawn only when it's switched on.
  useEffect(() => {
    if (!row?.photo_sharing || !premium || !slug) return setQr(null);
    let live = true;
    import("qrcode").then((QR) => QR.toDataURL(photosUrl, { width: 640, margin: 2 })).then((url) => live && setQr(url));
    return () => {
      live = false;
    };
  }, [row?.photo_sharing, premium, slug, photosUrl]);

  if (!row) return null;

  const save = async (patch: Partial<Row>) => {
    if (!eventId) return;
    setState("saving");
    const { error } = await supabase.from("wedding_sites").update(patch).eq("event_id", eventId);
    if (error) return setState("error");
    setRow({ ...row, ...patch });
    setState("saved");
  };
  const passwordOn = row.site_password !== null;
  const cleanPass = password.trim();

  const lock = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none" }}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
  /** A switch row. Locked (free plan): what it does, and a tap opens the upgrade. */
  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void, locked = false, detail?: string) =>
    locked ? (
      <button type="button" onClick={onUpgrade} disabled={!onUpgrade} className="dp-row" style={{ display: "flex", alignItems: "center", gap: 12, width: "calc(100% + 20px)", minHeight: 52, margin: "0 -10px", padding: "6px 10px", border: 0, borderRadius: 8, background: "transparent", textAlign: "left", cursor: onUpgrade ? "pointer" : "default", fontFamily: "inherit" }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>{label}</span>
          {detail ? <span style={{ display: "block", marginTop: 2, fontSize: 12.5, lineHeight: 1.45, color: "var(--slate)" }}>{detail}</span> : null}
        </span>
        {lock}
      </button>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
        <span style={{ flex: 1, fontSize: 14, color: "var(--ink)" }}>{label}</span>
        <Switch on={checked} onChange={onChange} label={label} />
      </div>
    );
  const detailOf = (title: string) => PREMIUM_FEATURES.find((f) => f.title === title)?.detail;
  const note = (text: ReactNode) => <div style={{ margin: "-4px 0 6px", fontSize: 13, lineHeight: 1.5, color: "var(--slate)" }}>{text}</div>;

  return (
    <div style={{ display: "grid", gap: 4 }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.5, color: "var(--slate)" }}>These apply to your live site right away.</p>

      {toggle("Ask guests for a password", passwordOn, (v) => {
        // On: show the field (nothing changes until they save a password). Off: remove it.
        if (v) return setRow({ ...row, site_password: row.site_password ?? "" });
        setPassword("");
        save({ site_password: null });
      })}
      {passwordOn ? (
        <FormField label="Password" hint="Share it with your guests along with the link. Capital letters don’t matter.">
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} value={password} maxLength={40} onChange={(e) => (setPassword(e.target.value), setState("idle"))} placeholder="e.g. mateo2027" />
            <button
              type="button"
              disabled={cleanPass.length < 4 || cleanPass === row.site_password}
              onClick={() => save({ site_password: cleanPass })}
              style={{ minHeight: 40, padding: "0 16px", borderRadius: 8, border: "1px solid var(--line-strong)", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Save
            </button>
          </div>
          {cleanPass && cleanPass.length < 4 ? <p style={{ margin: "6px 0 0", fontSize: 13, color: "#c2412d" }}>At least 4 characters.</p> : null}
          {!row.site_password ? <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--slate)" }}>Not on yet. Your site opens without a password until you save one.</p> : null}
        </FormField>
      ) : null}

      {/* Premium: one card that says what it adds and what it costs; the locked switches say
          what each does and open the upgrade. Once paid, the card says so and they switch on. */}
      {premium ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 4px", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
          <span style={{ width: 20, height: 20, flex: "none", display: "grid", placeItems: "center", borderRadius: 999, background: "var(--ink)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 12.5 4 4 8-9" />
            </svg>
          </span>
          <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink)" }}>
            <b style={{ fontWeight: 600 }}>Premium is on.</b> Switch on whatever you’d like guests to have.
          </span>
        </div>
      ) : onUpgrade ? (
        <div style={{ margin: "18px 0 6px", padding: 16, border: "1px solid var(--line)", borderRadius: 12, background: "#fff" }}>
          <p style={{ margin: 0, fontFamily: "Lora, Georgia, serif", fontSize: 18, fontWeight: 500, color: "var(--ink)" }}>Hear every yes as it happens</p>
          <p style={{ margin: "6px 0 14px", fontSize: 13, lineHeight: 1.5, color: "var(--slate)" }}>
            Premium sends the reminders, gathers the photos and shows guests to their seats, so you don’t have to.
          </p>
          <button type="button" onClick={onUpgrade} style={{ minHeight: 36, padding: "0 16px", border: 0, borderRadius: 8, background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Go Premium{price ? ` · ${price}, one time` : ""}
          </button>
        </div>
      ) : (
        <p style={{ margin: "18px 0 0", fontSize: 12, fontWeight: 500, color: "var(--slate)" }}>Premium</p>
      )}

      {toggle("Remind guests 2 days before", premium && row.guest_reminders, (v) => save({ guest_reminders: v }), !premium, detailOf("A reminder two days before"))}
      {premium ? note("Guests who said yes get an email with the time, venue and map, sent in your names.") : null}

      {toggle("Let guests share their photos", premium && row.photo_sharing, (v) => save({ photo_sharing: v }), !premium, detailOf("Everyone’s photos in one place"))}
      {premium && row.photo_sharing
        ? note(
            <>
              <p style={{ margin: 0 }}>
                Guests add photos at{" "}
                <a href={photosUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2f61d5", wordBreak: "break-all" }}>
                  {photosUrl.replace("https://", "")}
                </a>
                . It’s linked at the bottom of your website. Print the QR code for your tables.
              </p>
              {qr ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                  <img src={qr} alt="QR code for the photo page" width={96} height={96} style={{ borderRadius: 8, border: "1px solid var(--line)" }} />
                  <a href={qr} download={`${slug}-photos-qr.png`} style={{ color: "#2f61d5", fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                    Download QR code
                  </a>
                </div>
              ) : null}
              <p style={{ margin: "8px 0 0" }}>See and remove photos under your project’s Guests tab.</p>
            </>,
          )
        : premium
          ? note("A page where guests add the photos they took. You can remove any of them.")
          : null}

      {row.invite_only !== undefined ? (
        <>
          {toggle("Only guests with a personal link can RSVP", premium && !!row.invite_only, (v) => save({ invite_only: v }), !premium, detailOf("Invited guests only"))}
          {premium ? note("Anyone can still see your website. Send links from your invite list (Guests tab): each guest’s seats are the most they can bring.") : null}
        </>
      ) : null}

      {row.table_finder !== undefined ? (
        <>
          {toggle("Let guests find their table", premium && !!row.table_finder, (v) => save({ table_finder: v }), !premium, detailOf("Find your table"))}
          {premium ? note("Guests type their name and see their table. Assign tables in your invite list. It’s linked at the bottom of your website.") : null}
        </>
      ) : null}

      <p aria-live="polite" style={{ margin: "8px 0 0", minHeight: 18, fontSize: 13, color: state === "error" ? "#c2412d" : state === "saved" ? "#3d7a12" : "var(--slate)" }}>
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved." : state === "error" ? "Couldn’t save. Check your connection and try again." : ""}
      </p>
    </div>
  );
}

/** An on/off switch (the panel's, everywhere). */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ width: 36, height: 22, padding: 2, border: 0, borderRadius: 999, background: on ? "var(--ink)" : "var(--line-strong)", cursor: "pointer", flex: "none", transition: "background .15s" }}>
      <span style={{ display: "block", width: 18, height: 18, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,7,39,.2)", transform: on ? "translateX(14px)" : "none", transition: "transform .15s" }} />
    </button>
  );
}
