import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const TRANSITION_MS = 600;
const EASE = "cubic-bezier(0.42, 0, 0.58, 1)";

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // The two forms are permanently mounted, one fixed to each half of the
  // card — they never move. `covering` is the only state: it says which of
  // the two forms the navy panel currently sits on top of (hides).
  const [covering, setCovering] = useState<"signin" | "signup">("signup");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setCovering("signup");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // The message shown inside the panel always invites the user into the
  // form the panel is currently hiding.
  const visibleForm = covering === "signup" ? "signin" : "signup";

  const handleAuthed = () => {
    onClose();
    navigate("/account");
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,7,39,0.55)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-[880px] overflow-hidden rounded-[28px] shadow-2xl"
        style={{ background: "#fff" }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 grid place-items-center w-9 h-9 rounded-full transition-colors hover:bg-black/5"
          style={{ color: "var(--ink)" }}
        >
          <i className="ri-close-line text-xl" />
        </button>

        {/* Mobile: no room for the two-panel mask, so a simple tab switch */}
        <div className="md:hidden flex border-b border-[var(--line)]">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setCovering(m === "signin" ? "signup" : "signin")}
              className="flex-1 py-4 text-[13px] tracking-wide uppercase font-medium transition-colors"
              style={{
                color: visibleForm === m ? "var(--acc-blue)" : "var(--slate)",
                borderBottom: visibleForm === m ? "2px solid var(--acc-blue)" : "2px solid transparent",
              }}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>
        <div className="md:hidden">
          <AuthForm
            mode={visibleForm}
            onSwitch={() => setCovering(visibleForm)}
            onAuthed={handleAuthed}
          />
        </div>

        {/* Desktop: both forms fixed and stationary; only the navy panel moves */}
        <div className="hidden md:block relative min-h-[560px] overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 w-1/2">
            <AuthForm mode="signin" onSwitch={() => setCovering("signup")} onAuthed={handleAuthed} />
          </div>
          <div className="absolute top-0 bottom-0 right-0 w-1/2">
            <AuthForm mode="signup" onSwitch={() => setCovering("signin")} onAuthed={handleAuthed} />
          </div>

          {/* Moving navy panel — transform only, nothing else about it changes */}
          <div
            className="absolute top-0 bottom-0 w-1/2 z-20 overflow-hidden"
            style={{
              transitionProperty: "transform",
              transitionDuration: `${TRANSITION_MS}ms`,
              transitionTimingFunction: EASE,
              transform: covering === "signin" ? "translateX(0%)" : "translateX(100%)",
              background:
                "linear-gradient(135deg, var(--ink) 0%, var(--indigo) 60%, var(--acc-blue) 130%)",
            }}
          >
            {/* Message viewport — the panel's own overflow-hidden is the mask */}
            <div
              className="flex h-full"
              style={{
                width: "200%",
                transitionProperty: "transform",
                transitionDuration: `${TRANSITION_MS}ms`,
                transitionTimingFunction: EASE,
                transform: covering === "signup" ? "translateX(0%)" : "translateX(-50%)",
              }}
            >
              <MessagePanel
                headline="Hello, Friend!"
                body="Sign up now and start building beautiful digital invites."
                cta="Sign Up"
                onClick={() => setCovering("signin")}
              />
              <MessagePanel
                headline="Welcome Back!"
                body="Already have an account? Sign in to pick up where you left off."
                cta="Sign In"
                onClick={() => setCovering("signup")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagePanel({
  headline,
  body,
  cta,
  onClick,
}: {
  headline: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="w-1/2 h-full flex-shrink-0 flex flex-col items-center justify-center text-center px-10">
      <h3 className="font-display text-3xl font-semibold text-white">{headline}</h3>
      <p className="mt-4 text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
        {body}
      </p>
      <button
        onClick={onClick}
        className="btn btn-outline-blue !border-white !text-white hover:!bg-white hover:!text-[var(--ink)] mt-8"
      >
        {cta}
      </button>
    </div>
  );
}

function AuthForm({
  mode,
  onSwitch,
  onAuthed,
}: {
  mode: "signin" | "signup";
  onSwitch: () => void;
  onAuthed: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      onAuthed();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        fetch("/api/send-welcome-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, fullName }),
        }).catch(() => {
          // Non-fatal — the account still works without the welcome email.
        });
        onAuthed();
      } else {
        // Email confirmation is required before a session exists.
        setCheckEmail(true);
      }
    }
  };

  if (checkEmail) {
    return (
      <div className="w-full h-full px-8 py-10 md:px-12 flex flex-col justify-center">
        <h2 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
          Check your email
        </h2>
        <p className="mt-4 text-[14px] leading-relaxed" style={{ color: "var(--slate)" }}>
          We sent a confirmation link to <strong style={{ color: "var(--ink)" }}>{email}</strong>.
          Click it to finish setting up your account.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full px-8 py-10 md:px-12 flex flex-col justify-center overflow-y-auto">
      <h2 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
        {mode === "signin" ? "Sign In" : "Sign Up"}
      </h2>

      <div className="flex gap-3 mt-6">
        {["ri-google-fill", "ri-facebook-fill"].map((icon) => (
          <button
            key={icon}
            type="button"
            disabled
            title="Coming soon"
            className="w-11 h-11 grid place-items-center rounded-xl border transition-colors opacity-40 cursor-not-allowed"
            style={{ borderColor: "var(--line)", color: "var(--ink)" }}
          >
            <i className={`${icon} text-lg`} />
          </button>
        ))}
      </div>

      <p className="eyebrow mt-6 mb-3">
        {mode === "signin" ? "Sign in with email & password" : "Sign up with email & password"}
      </p>

      <form className="space-y-3" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-[15px] outline-none transition-colors"
            style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
          />
        )}
        <input
          type="email"
          placeholder="Enter e-mail"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl px-4 py-3.5 text-[15px] outline-none transition-colors"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
        <input
          type="password"
          placeholder="Enter password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl px-4 py-3.5 text-[15px] outline-none transition-colors"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />

        {mode === "signin" ? (
          <div className="flex justify-end">
            <button type="button" className="text-[13px]" style={{ color: "var(--slate)" }}>
              Forgot password?
            </button>
          </div>
        ) : (
          <div className="h-1" />
        )}

        {error && (
          <p className="text-[13px]" style={{ color: "var(--acc-coral)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full !mt-5 disabled:opacity-60">
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <button
        onClick={onSwitch}
        className="md:hidden mt-6 text-[13px] w-full text-center"
        style={{ color: "var(--acc-blue)" }}
      >
        {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
