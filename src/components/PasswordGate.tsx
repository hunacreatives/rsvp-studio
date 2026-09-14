import { useEffect, useState } from "react";

const PASSWORD = "rsvp2026";
const SESSION_KEY = "rsvp_studio_auth";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div
      className="grid min-h-screen place-items-center px-6"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-10">
        <img
          src="/brand/logotype-dark.png"
          alt="The RSVP Studio"
          className="h-10 w-auto select-none object-contain"
          draggable={false}
        />

        <form
          onSubmit={handleSubmit}
          className={`flex w-full flex-col gap-6 ${shake ? "animate-shake" : ""}`}
        >
          <div className="flex flex-col gap-2">
            <label className="eyebrow" style={{ color: "var(--ink)" }}>
              Password
            </label>
            <div className="border-b pb-2" style={{ borderColor: "var(--line)" }}>
              <input
                type="password"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(false);
                }}
                autoFocus
                className="w-full bg-transparent text-base tracking-[0.5px] outline-none"
                style={{ color: "var(--ink)" }}
                placeholder="Enter password"
              />
            </div>
            {error && (
              <p className="text-xs tracking-wide text-[var(--acc-coral)]">
                Incorrect password.
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary self-end">
            Enter
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.45s ease-in-out; }
      `}</style>
    </div>
  );
}
