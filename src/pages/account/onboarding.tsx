import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/pages/home/components/Navbar";
import CreateEventModal from "./components/CreateEventModal";

export default function AccountOnboarding() {
  // The invite email links here with ?code=… already filled in.
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const navigate = useNavigate();
  // Signed out (e.g. tapped the invite email on a new phone): log in first,
  // then come straight back here with the code still filled in.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);
  const logInFirst = () => {
    const here = `/account/onboarding${code.trim() ? `?code=${encodeURIComponent(code.trim())}` : ""}`;
    navigate(`/?auth=signin&next=${encodeURIComponent(here)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      setSignedIn(false);
      return logInFirst();
    }

    const res = await fetch("/api/link-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, accessToken: session.access_token }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(body.error || "That didn’t work. Check the code, or message us at hello@thersvpstudio.com.");
      return;
    }
    navigate("/account");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
          Link your event
        </h1>
        <p className="mt-3 text-[16px] md:text-[15px]" style={{ color: "var(--slate)" }}>
          Enter the code we sent you to see your event here.
        </p>
        {signedIn === false ? (
          <p className="mt-3 text-[15px]" style={{ color: "var(--ink)" }}>
            You&rsquo;ll log in (or create your account) first, then come right back here.
          </p>
        ) : null}

        <form className="mt-8 space-y-3" onSubmit={handleSubmit}>
          <label htmlFor="invite-code" className="block text-[14px] font-medium" style={{ color: "var(--ink)" }}>
            Invite code
          </label>
          <input
            id="invite-code"
            type="text"
            required
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            value={code}
            onChange={(e) => (setCode(e.target.value), setError(null))}
            className="w-full rounded-xl px-4 py-3.5 text-[16px] outline-none tracking-widest uppercase"
            style={{ background: "#fff", border: "1px solid var(--line)" }}
          />

          {error && (
            <p role="alert" className="text-[14px]" style={{ color: "var(--acc-coral)" }}>
              {error}
            </p>
          )}

          {signedIn === false ? (
            <button type="button" onClick={logInFirst} className="btn btn-primary w-full !mt-5">
              Log in to add my event
            </button>
          ) : (
            <button type="submit" disabled={loading} className="btn btn-primary w-full !mt-5 disabled:opacity-60">
              {loading ? "Checking…" : "Add my event"}
            </button>
          )}
        </form>

        <div className="mt-8 pt-8 text-center" style={{ borderTop: "1px solid var(--line)" }}>
          <p className="text-[14px] mb-3" style={{ color: "var(--slate)" }}>
            Planning your own wedding, birthday, or celebration?
          </p>
          <button
            onClick={() => (signedIn === false ? logInFirst() : setCreatingEvent(true))}
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-[15px] font-medium"
            style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
          >
            Create a New Event
          </button>
        </div>
      </div>
      </div>
      {creatingEvent ? <CreateEventModal onClose={() => setCreatingEvent(false)} /> : null}
    </div>
  );
}
