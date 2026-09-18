import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AccountOnboarding() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      setError("You've been signed out — please sign in again.");
      return;
    }

    const res = await fetch("/api/link-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, accessToken: session.access_token }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error || "Something went wrong");
      return;
    }
    navigate("/account");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--warm-white)" }}>
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
          Link your event
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "var(--slate)" }}>
          Enter the invite code we gave you at handoff to connect your account to your event's RSVPs.
        </p>

        <form className="mt-8 space-y-3" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Invite code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-[15px] outline-none tracking-widest uppercase"
            style={{ background: "#fff", border: "1px solid var(--line)" }}
          />

          {error && (
            <p className="text-[13px]" style={{ color: "var(--acc-coral)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full !mt-5 disabled:opacity-60">
            {loading ? "Checking…" : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}
