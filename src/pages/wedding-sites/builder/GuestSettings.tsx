import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FormField, inputStyle } from "./components/FormField";

// Builder → "Privacy & guests" (supabase/guest-features.sql). These are site settings,
// not content: they save on their own and apply to the live site straight away.
//   Password — every site. Guests type it once to open the invitation.
//   Guest reminders — Premium: guests who said yes get a reminder 2 days before.
//   Photo sharing — Premium: a page where guests add their photos (+ a QR code for tables).

type Row = { site_password: string | null; guest_reminders: boolean; photo_sharing: boolean };

export default function GuestSettings({ eventId, slug, premium, onUpgrade }: { eventId: string | undefined; slug: string; premium: boolean; onUpgrade?: () => void }) {
  const [row, setRow] = useState<Row | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const photosUrl = `https://thersvpstudio.com/invite/${slug}/photos`;

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from("wedding_sites")
      .select("site_password, guest_reminders, photo_sharing")
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

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void, disabled = false) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, fontSize: 15, color: "var(--ink)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20 }} />
      {label}
    </label>
  );
  const premiumNote = (
    <p style={{ margin: "2px 0 0 30px", fontSize: 13, color: "var(--slate)" }}>
      Premium.{" "}
      {onUpgrade ? (
        <button type="button" onClick={onUpgrade} style={{ padding: 0, border: "none", background: "none", color: "#2f61d5", textDecoration: "underline", textUnderlineOffset: 3, fontSize: 13, cursor: "pointer" }}>
          Upgrade this site
        </button>
      ) : null}
    </p>
  );

  return (
    <details style={{ borderBottom: "1px solid var(--line)", marginTop: 8 }}>
      <summary style={{ padding: "14px 4px", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Privacy &amp; guests</summary>
      <div style={{ padding: "4px 4px 20px", display: "grid", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--slate)" }}>These save on their own and apply to your live website right away.</p>

        <div>
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
                  style={{ minHeight: 44, padding: "0 16px", borderRadius: 999, border: "1px solid var(--line)", background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Save
                </button>
              </div>
              {cleanPass && cleanPass.length < 4 ? <p style={{ margin: "6px 0 0", fontSize: 13, color: "#c2412d" }}>At least 4 characters.</p> : null}
              {!row.site_password ? <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--slate)" }}>Not on yet. Your site opens without a password until you save one.</p> : null}
            </FormField>
          ) : null}
        </div>

        <div>
          {toggle("Remind guests 2 days before", premium && row.guest_reminders, (v) => save({ guest_reminders: v }), !premium)}
          {premium ? (
            <p style={{ margin: "2px 0 0 30px", fontSize: 13, color: "var(--slate)" }}>Guests who said yes get an email with the time, venue and map, sent in your names.</p>
          ) : (
            premiumNote
          )}
        </div>

        <div>
          {toggle("Let guests share their photos", premium && row.photo_sharing, (v) => save({ photo_sharing: v }), !premium)}
          {!premium ? (
            premiumNote
          ) : row.photo_sharing ? (
            <div style={{ margin: "6px 0 0 30px", fontSize: 13, color: "var(--slate)" }}>
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
            </div>
          ) : (
            <p style={{ margin: "2px 0 0 30px", fontSize: 13, color: "var(--slate)" }}>A page where guests add the photos they took. You can remove any of them.</p>
          )}
        </div>

        {state === "saving" ? <p style={{ margin: 0, fontSize: 13, color: "var(--slate)" }}>Saving…</p> : null}
        {state === "saved" ? <p style={{ margin: 0, fontSize: 13, color: "#3d7a12" }}>Saved.</p> : null}
        {state === "error" ? <p style={{ margin: 0, fontSize: 13, color: "#c2412d" }}>Couldn’t save. Check your connection and try again.</p> : null}
      </div>
    </details>
  );
}
