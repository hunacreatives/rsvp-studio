import { useState, type FormEvent } from "react";

// A password-protected event site: a calm, neutral screen (guests never see our
// studio branding here beyond the small credit). The hosts share the password.

export default function PasswordGate({ onSubmit, wrong }: { onSubmit: (password: string) => Promise<void>; wrong: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    await onSubmit(value.trim());
    setBusy(false);
  };
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, background: "#f7f5f0", fontFamily: "Georgia, 'Times New Roman', serif", color: "#1f1d1a" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8a8378", fontFamily: "Inter, system-ui, sans-serif" }}>You’re invited</p>
        <h1 style={{ margin: "14px 0 8px", fontSize: 30, fontWeight: 400, lineHeight: 1.2 }}>This invitation is private</h1>
        <p style={{ margin: "0 0 26px", fontSize: 16, lineHeight: 1.6, color: "#5c574f", fontFamily: "Inter, system-ui, sans-serif" }}>Enter the password from the hosts to open it.</p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          autoComplete="off"
          autoCapitalize="none"
          autoFocus
          style={{ width: "100%", boxSizing: "border-box", fontSize: 16, padding: "14px 18px", borderRadius: 999, border: `1px solid ${wrong ? "#c2412d" : "#d8d2c6"}`, background: "#fff", outline: "none", textAlign: "center", fontFamily: "Inter, system-ui, sans-serif" }}
        />
        {wrong ? <p role="alert" style={{ margin: "10px 0 0", fontSize: 14, color: "#c2412d", fontFamily: "Inter, system-ui, sans-serif" }}>That password didn’t work. Check with the hosts and try again.</p> : null}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          style={{ marginTop: 16, width: "100%", minHeight: 48, borderRadius: 999, border: "none", background: "#1f1d1a", color: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "Inter, system-ui, sans-serif", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Opening…" : "Open invitation"}
        </button>
      </form>
    </main>
  );
}
