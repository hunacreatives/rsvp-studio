import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lenisRef } from "@/lib/lenis";
import { setRememberLogin, supabase } from "@/lib/supabase";

type Provider = "google" | "facebook";
type Mode = "signin" | "signup";

const BLUE = "#1862DD";
const SLIDE_MS = 600;
const SLIDE_EASE = "cubic-bezier(0.42, 0, 0.58, 1)";
const FIELD_BORDER = "#1D75E3";

/**
 * Which social sign-ins are switched on in Supabase. The buttons light up by
 * themselves once a provider is enabled there — no code change or deploy.
 */
let providersCache: Promise<Partial<Record<Provider, boolean>>> | null = null;
function useProviders() {
  const [providers, setProviders] = useState<Partial<Record<Provider, boolean>> | null>(null);
  useEffect(() => {
    providersCache ??= fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
      .then((r) => r.json())
      .then((d: { external?: Partial<Record<Provider, boolean>> }) => d.external ?? {})
      .catch(() => ({}));
    let live = true;
    providersCache.then((p) => live && setProviders(p));
    return () => {
      live = false;
    };
  }, []);
  return providers;
}

export default function AuthModal({
  open,
  onClose,
  initialMode = "signin",
  initialEmail = "",
}: {
  open: boolean;
  onClose: () => void;
  /** Opened from an email link: which form, and the address to fill in. */
  initialMode?: Mode;
  initialEmail?: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  // Set once sign-up has sent a confirmation email: the whole modal then
  // becomes a "check your inbox" screen that a stray tap can't dismiss.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const navigate = useNavigate();

  // Reset ONLY when the modal opens. This used to share an effect with the
  // Escape listener, which depends on `onClose` — a new function on every
  // parent render — so any re-render of the page behind the modal (e.g. the
  // navbar reacting to the auth event right after sign-up) snapped it back
  // to Sign In and hid the "check your email" message.
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSentTo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    // Freeze the page behind. Not via body overflow: that turns <body> into
    // the scroll container and the sticky top bar jumps off-screen, leaving an
    // unblurred strip where it was. Lenis (or the root element) keeps it in place.
    const lenis = lenisRef.current;
    if (lenis) lenis.stop();
    else document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      if (lenis) lenis.start();
      else document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  const handleAuthed = async () => {
    onClose();
    // Studio team accounts go straight to the admin console.
    const { data } = await supabase.auth.getUser();
    const { data: profile } = data.user
      ? await supabase.from("profiles").select("is_staff").eq("id", data.user.id).maybeSingle()
      : { data: null };
    navigate(profile?.is_staff ? "/studio" : "/account");
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto p-4"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={mode === "signin" ? "Log in" : "Create an account"}
    >
      {/* The whole page, top bar included, stays visible behind, softly blurred */}
      <div
        className="fixed inset-0"
        style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
        onClick={sentTo ? undefined : onClose}
      />

      <div
        className="relative mx-auto my-auto w-full max-w-[820px] shrink-0 overflow-hidden rounded-[24px]"
        style={{ background: "#F6F5F8", boxShadow: "0 18px 50px rgba(0,7,39,0.22), 0 2px 8px rgba(0,7,39,0.08)" }}
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: "var(--ink)" }}
        >
          <i className="ri-close-line text-2xl" />
        </button>

        {sentTo ? (
          <div className="bg-white">
            <CheckInbox email={sentTo} onBack={() => setSentTo(null)} />
          </div>
        ) : (
          <>
            {/* Phones: one form at a time, no room for the illustration */}
            <div className="rounded-[24px] bg-white md:hidden">
              <AuthForm key={mode} mode={mode} initialEmail={initialEmail} onSwitch={() => setMode(mode === "signin" ? "signup" : "signin")} onAuthed={handleAuthed} onCheckEmail={setSentTo} />
            </div>

            {/* Desktop: both forms stay put (sign-up left, log-in right); only the
                illustration panel slides across to cover one and reveal the other. */}
            <div className="relative hidden h-[576px] md:block">
              <div className="absolute inset-y-0 left-0 w-1/2 rounded-[24px] bg-white" aria-hidden={mode !== "signup"} inert={mode !== "signup" ? true : undefined}>
                <AuthForm mode="signup" initialEmail={initialEmail} onSwitch={() => setMode("signin")} onAuthed={handleAuthed} onCheckEmail={setSentTo} />
              </div>
              <div className="absolute inset-y-0 right-0 w-1/2 rounded-[24px] bg-white" aria-hidden={mode !== "signin"} inert={mode !== "signin" ? true : undefined}>
                <AuthForm mode="signin" initialEmail={initialEmail} onSwitch={() => setMode("signup")} onAuthed={handleAuthed} onCheckEmail={setSentTo} />
              </div>
              <div
                className="absolute inset-y-0 left-0 z-20 flex w-1/2 items-center justify-center px-10"
                style={{
                  background: "#F6F5F8",
                  transitionProperty: "transform",
                  transitionDuration: `${SLIDE_MS}ms`,
                  transitionTimingFunction: SLIDE_EASE,
                  transform: mode === "signin" ? "translateX(0%)" : "translateX(100%)",
                }}
              >
                <Characters mode={mode} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** What the characters' speech bubble says on each side of the slide. */
const BUBBLE: Record<Mode, string> = {
  signin: "10% off your\nfirst booking!",
  signup: "Welcome!\nLet\u2019s get started.",
};

/** Where each character sits in the illustration (% of its 640×703 canvas). */
const CHARACTERS = [
  { name: "purple", x: 0, y: 68.14, w: 21.88, move: "rs-sway 3.4s ease-in-out -0.6s infinite", origin: "11% 100%" },
  { name: "pink", x: 7.5, y: 52.77, w: 43.59, move: "rs-sway 3s ease-in-out -1.8s infinite", origin: "29% 78%" },
  { name: "hexagon", x: 52.81, y: 47.8, w: 29.22, move: "rs-hop 3.6s ease-in-out -1.2s infinite", origin: "67% 77%" },
  { name: "orange", x: 28.12, y: 70.55, w: 38.59, move: "rs-bob 2.8s ease-in-out -1.4s infinite", origin: "47% 98%" },
  { name: "green", x: 65.16, y: 75.39, w: 34.84, move: "rs-sway 2.6s ease-in-out -0.3s infinite", origin: "82% 98%" },
] as const;

/** Each character's eyes (% of the canvas; w/h as % of its width). Purple's are closed (dashes). */
const EYES: Record<string, { x: number; y: number; w: number; h: number }[]> = {
  blue: [{ x: 44.92, y: 36.21, w: 1.72, h: 1.72 }, { x: 48.52, y: 36.21, w: 1.72, h: 1.72 }],
  pink: [{ x: 27.42, y: 62.66, w: 1.72, h: 1.72 }, { x: 30.94, y: 62.66, w: 1.64, h: 1.72 }],
  hexagon: [{ x: 61.87, y: 59.46, w: 1.56, h: 1.56 }, { x: 74.06, y: 60.74, w: 1.56, h: 1.56 }],
  purple: [{ x: 7.73, y: 73.12, w: 2.34, h: 0.7 }, { x: 11.02, y: 72.69, w: 2.34, h: 0.7 }],
  orange: [{ x: 42.57, y: 83.49, w: 1.96, h: 1.88 }, { x: 54.68, y: 83.78, w: 1.88, h: 1.88 }],
  green: [{ x: 75.39, y: 83.85, w: 1.72, h: 1.72 }, { x: 84.3, y: 82.57, w: 1.72, h: 1.72 }],
};

/** Each character's mouth, a separate piece so it turns with the eyes (% of the canvas). */
const MOUTH: Record<string, { x: number; y: number; w: number }> = {
  blue: { x: 40.62, y: 34.99, w: 12.5 },
  pink: { x: 23.12, y: 61.59, w: 12.34 },
  hexagon: { x: 63.28, y: 59.89, w: 8.91 },
  purple: { x: 5.16, y: 73.54, w: 9.22 },
  orange: { x: 44.53, y: 83.21, w: 8.75 },
  green: { x: 75.16, y: 82.93, w: 11.25 },
};

/** How each character blinks: both eyes together, each at its own pace (some double-blink). */
const BLINK: Record<string, string> = {
  blue: "rs-blink 4.6s infinite -1.2s",
  pink: "rs-blink2 6.8s infinite -3.1s",
  hexagon: "rs-blink 5.7s infinite -0.4s",
  orange: "rs-blink 4.1s infinite -2.6s",
  green: "rs-blink2 7.4s infinite -5.2s",
};

/** Said (shown) when someone presses Log in / Create account or switches forms. */
export const CHEER_EVENT = "rs-auth-cheer";
/** "Do it!": on hover just the shout; on click the whole group hops too. */
const cheer = (hop = true) => window.dispatchEvent(new CustomEvent(CHEER_EVENT, { detail: { hop } }));
const hoverCheer = () => cheer(false);

const CHARACTER_CSS = `
@keyframes rs-bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2.2%) } }
@keyframes rs-sway { 0%, 100% { transform: rotate(-2.5deg) } 50% { transform: rotate(2.5deg) } }
@keyframes rs-hop { 0%, 100% { transform: translateY(0) rotate(0) } 40% { transform: translateY(-2.4%) rotate(-3deg) } 60% { transform: translateY(-2.4%) rotate(2deg) } }
.rs-char { position: absolute; inset: 0; will-change: transform; }
.rs-eye { position: absolute; transform: translate(-50%, -50%); }
.rs-eye > span { display: block; width: 100%; height: 100%; background: #0B0B12; border-radius: 999px; transition: transform .12s ease-out; }
.rs-mouth { position: absolute; transition: transform .14s ease-out; }
.rs-eye > span > span { display: block; width: 100%; height: 100%; border-radius: inherit; background: inherit; transform-origin: 50% 50%; }
@keyframes rs-blink { 0%, 95%, 100% { transform: scaleY(1) } 97% { transform: scaleY(0.08) } }
@keyframes rs-blink2 { 0%, 90%, 94%, 100% { transform: scaleY(1) } 92%, 96% { transform: scaleY(0.08) } }
@keyframes rs-hooray { 0%, 100% { transform: translateY(0) } 30% { transform: translateY(-4%) } 55% { transform: translateY(0) } 75% { transform: translateY(-1.5%) } }
.rs-hooray { animation: rs-hooray .7s ease-out; }
@keyframes rs-pop { 0% { opacity: 0; transform: translate(0, 10%) scale(.4) rotate(-8deg) } 18% { opacity: 1; transform: translate(0, 0) scale(1.08) rotate(3deg) } 28% { transform: scale(1) rotate(0) } 82% { opacity: 1 } 100% { opacity: 0; transform: translate(0, -12%) scale(.96) } }
.rs-shout { animation: rs-pop 1.6s ease-out forwards; }
@media (prefers-reduced-motion: reduce) { .rs-char, .rs-hooray, .rs-eye > span > span { animation: none !important; } .rs-eye > span, .rs-mouth { transition: none; } }
`;

/**
 * The six characters, each on its own layer with its own gentle movement.
 * The blue one carries the speech bubble, whose words are live text that
 * crossfade with the slide.
 */
function Characters({ mode }: { mode: Mode }) {
  const root = useRef<HTMLDivElement>(null);
  const [shout, setShout] = useState(0);
  const [hop, setHop] = useState(0);
  const lastShout = useRef(0);

  // Eyes follow the pointer: each moves up to ~a third of its size toward it.
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    // The whole face turns toward the pointer: eyes and mouth shift the same
    // way (the mouth a little less), up to about half an eye's width.
    const look = () => {
      frame = 0;
      for (const face of el.querySelectorAll<HTMLElement>("[data-face]")) {
        const mouth = face.querySelector<HTMLElement>(".rs-mouth");
        const eyes = [...face.querySelectorAll<HTMLElement>(".rs-eye")];
        if (!mouth || !eyes.length) continue;
        let tx = 0;
        let ty = 0;
        if (pointer) {
          const m = mouth.getBoundingClientRect();
          const e = eyes[0].getBoundingClientRect();
          const dx = pointer.x - (m.left + m.width / 2);
          const dy = pointer.y - (m.top + m.height / 2);
          const d = Math.hypot(dx, dy) || 1;
          const reach = Math.min(1, d / 180) * Math.max(e.width, e.height) * 0.55;
          tx = (dx / d) * reach;
          ty = (dy / d) * reach;
        }
        for (const eye of eyes) (eye.firstElementChild as HTMLElement).style.transform = `translate(${tx}px, ${ty}px)`;
        mouth.style.transform = `translate(${tx * 0.8}px, ${ty * 0.8}px)`;
      }
    };
    const move = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      frame ||= requestAnimationFrame(look);
    };
    const leave = () => {
      pointer = null;
      frame ||= requestAnimationFrame(look);
    };
    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  // "Do it!" — the open-mouthed green one cheers when they press a button.
  useEffect(() => {
    const on = (e: Event) => {
      const clicked = (e as CustomEvent<{ hop?: boolean }>).detail?.hop !== false;
      // A hover doesn't restart a shout that's still on screen.
      if (!clicked && Date.now() - lastShout.current < 1500) return;
      lastShout.current = Date.now();
      setShout((n) => n + 1);
      if (clicked) setHop((n) => n + 1);
    };
    window.addEventListener(CHEER_EVENT, on);
    return () => window.removeEventListener(CHEER_EVENT, on);
  }, []);

  const layer = (name: string, x: number, y: number, w: number) => (
    <img src={`/account/characters/${name}.webp`} alt="" draggable={false} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: `${w}%` }} />
  );
  const face = (name: string) => [
    <img
      key="mouth"
      className="rs-mouth"
      src={`/account/characters/${name}-mouth.webp`}
      alt=""
      draggable={false}
      style={{ left: `${MOUTH[name].x}%`, top: `${MOUTH[name].y}%`, width: `${MOUTH[name].w}%` }}
    />,
    ...eyes(name),
  ];
  const eyes = (name: string) =>
    EYES[name].map((e, i) => (
      <span key={i} className="rs-eye" style={{ left: `${e.x}%`, top: `${e.y}%`, width: `${e.w}%`, aspectRatio: `${e.w} / ${e.h}`, rotate: name === "purple" ? "-8deg" : undefined }}>
        <span>{BLINK[name] ? <span style={{ animation: BLINK[name] }} /> : null}</span>
      </span>
    ));

  return (
    <div ref={root} className="relative w-full max-w-[340px] select-none" style={{ containerType: "inline-size", aspectRatio: "640 / 703" }} aria-hidden>
      <style>{CHARACTER_CSS}</style>
      <div key={`hop-${hop}`} className={`absolute inset-0 ${hop ? "rs-hooray" : ""}`}>
        {CHARACTERS.map((c) => (
          <div key={c.name} className="rs-char" data-face={c.name} style={{ animation: c.move, transformOrigin: c.origin }}>
            {layer(c.name, c.x, c.y, c.w)}
            {face(c.name)}
          </div>
        ))}
        <div className="rs-char" data-face="blue" style={{ animation: "rs-bob 3.2s ease-in-out -0.8s infinite", transformOrigin: "48% 54%" }}>
          {layer("blue", 31.25, 23.76, 33.91)}
          {face("blue")}
          {layer("bubble", 22.03, 0, 56.09)}
          <div
            className="absolute grid text-center"
            style={{ left: "50%", top: "11.7%", width: "52%", whiteSpace: "pre-line", transform: "translate(-50%, -50%)", color: "#0E0E2C", fontWeight: 800, fontSize: "5.8cqw", lineHeight: 1.12, letterSpacing: "-0.01em" }}
          >
            {(Object.keys(BUBBLE) as Mode[]).map((m) => (
              <p key={m} className="m-0" style={{ gridArea: "1 / 1", opacity: m === mode ? 1 : 0, transition: `opacity ${SLIDE_MS / 2}ms ease ${m === mode ? SLIDE_MS / 2 : 0}ms` }}>
                {BUBBLE[m]}
              </p>
            ))}
          </div>
        </div>
      </div>
      {shout ? (
        <div
          key={`shout-${shout}`}
          className="rs-shout absolute whitespace-nowrap rounded-[14px] px-[4cqw] py-[1.6cqw] text-center"
          style={{ left: "72%", top: "58%", background: "#F1D584", color: "#0E0E2C", fontWeight: 800, fontSize: "6.4cqw", transformOrigin: "20% 100%", boxShadow: "0 6px 14px -8px rgba(0,7,39,.35)" }}
        >
          Do it!
          <span className="absolute" style={{ left: "18%", bottom: "-1.6cqw", width: "3.4cqw", height: "3.4cqw", background: "#F1D584", transform: "rotate(45deg)" }} />
        </div>
      ) : null}
    </div>
  );
}

const fieldClass = "w-full rounded-[14px] bg-white px-4 py-2.5 text-[14px] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(29,117,227,0.18)]";
const fieldStyle = { border: `1px solid ${FIELD_BORDER}`, color: "var(--ink)" } as const;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px]" style={{ color: "var(--ink)" }}>
      {children}
    </label>
  );
}

function AuthForm({
  mode,
  initialEmail = "",
  onSwitch,
  onAuthed,
  onCheckEmail,
}: {
  mode: Mode;
  initialEmail?: string;
  onSwitch: () => void;
  onAuthed: () => void;
  onCheckEmail: (email: string) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providers = useProviders();
  // Known to be switched off in Supabase (staging): say so instead of failing at Google.
  const googleOff = providers !== null && providers.google !== true;
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState<"idle" | "sending" | "sent">("idle");

  // Re-send the "confirm your email" message (Supabase rate-limits this).
  const resendConfirmation = async () => {
    setResent("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/account?welcome=1` },
    });
    if (error) {
      setResent("idle");
      return setError(error.message);
    }
    setResent("sent");
  };
  const [resetSent, setResetSent] = useState(false);
  // Two-factor: after a correct password, accounts with an authenticator
  // app enrolled must also enter a 6-digit code (Supabase AAL2).
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const handleForgot = async () => {
    setError(null);
    if (!email) return setError("Enter your email above first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/settings?reset=1`,
    });
    if (error) return setError(error.message);
    setResetSent(true);
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode.trim() });
    setLoading(false);
    if (error) return setError("That code didn’t work — try the latest one from your app.");
    onAuthed();
  };

  // Google: Supabase sends them to Google and back to their dashboard
  // (staff are redirected to the Studio from there). Google sign-ins are remembered.
  const continueWith = async (provider: Provider) => {
    setError(null);
    if (provider === "google" && googleOff) return setError("Google sign-in isn’t available here yet — use your email and password.");
    setLoading(true);
    setRememberLogin(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setLoading(false);
      setError(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    cheer();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      setRememberLogin(remember);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        if (/email not confirmed/i.test(error.message)) {
          setUnconfirmed(true);
          return setError("Please confirm your email first — check your inbox for the link we sent.");
        }
        return setError(error.message);
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.[0];
        if (totp) {
          setLoading(false);
          setMfaFactorId(totp.id);
          return;
        }
      }
      setLoading(false);
      onAuthed();
    } else {
      setRememberLogin(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // welcomed:false → the welcome email goes out once they've verified
          // (see PortalContext). Accounts made before this flag never get it twice.
          data: { full_name: fullName, welcomed: false },
          // The confirmation link brings them back here, signed in.
          emailRedirectTo: `${window.location.origin}/account?welcome=1`,
        },
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        fetch("/api/send-welcome-email", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }).catch(() => {
          // Non-fatal — the account still works without the welcome email.
        });
        supabase.auth.updateUser({ data: { welcomed: true } });
        onAuthed();
      } else if (data.user && (data.user.identities?.length ?? 0) === 0) {
        // Supabase answers an already-registered email with a fake success
        // and no identities (so it doesn't leak who has an account).
        setError("An account with this email already exists. Log in instead, or use “Forgot password?”.");
      } else {
        // Email confirmation is required before a session exists.
        onCheckEmail(email);
      }
    }
  };

  if (mfaFactorId) {
    return (
      <div className="flex h-full flex-col justify-center px-7 py-12 md:px-9">
        <h2 className="text-center text-[22px] font-medium" style={{ color: "var(--ink)" }}>
          Enter your code
        </h2>
        <p className="mt-2 text-center text-[13px] leading-relaxed" style={{ color: "var(--slate)" }}>
          Open your authenticator app and enter the 6-digit code for The RSVP Studio.
        </p>
        <form className="mt-6 space-y-3" onSubmit={handleMfa}>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            aria-label="6-digit code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
            className={`${fieldClass} text-center text-[18px] tracking-[0.3em]`}
            style={fieldStyle}
            autoFocus
          />
          {error && (
            <p className="text-[13px]" style={{ color: "var(--acc-coral)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || mfaCode.length !== 6}
            className="w-full rounded-[14px] py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: BLUE }}
          >
            {loading ? "Checking…" : "Verify"}
          </button>
        </form>
      </div>
    );
  }

  const signin = mode === "signin";
  const id = (name: string) => `auth-${mode}-${name}`;

  return (
    <div className="flex h-full flex-col justify-center px-7 pb-7 pt-11 md:px-9">
      <h2 className="text-center text-[22px] font-medium" style={{ color: "var(--ink)" }}>
        {signin ? "Login to your account" : "Create your account"}
      </h2>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        {!signin && (
          <div>
            <Label htmlFor={id("name")}>Full name</Label>
            <input id={id("name")} type="text" placeholder="Enter your full name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} style={fieldStyle} />
          </div>
        )}
        <div>
          <Label htmlFor={id("email")}>Email</Label>
          <input id={id("email")} type="email" placeholder="Enter your email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} style={fieldStyle} />
        </div>
        <div>
          <Label htmlFor={id("password")}>Password</Label>
          <div className="relative">
            <input
              id={id("password")}
              type={showPassword ? "text" : "password"}
              placeholder={signin ? "Enter your password" : "At least 8 characters"}
              required
              minLength={signin ? undefined : 8}
              autoComplete={signin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${fieldClass} pr-12`}
              style={fieldStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full transition-colors hover:bg-black/5"
              style={{ color: "#1E1E1E" }}
            >
              <i className={`${showPassword ? "ri-eye-off-line" : "ri-eye-line"} text-[18px]`} />
            </button>
          </div>
        </div>

        {signin ? (
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px]" style={{ color: "var(--ink)" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-[#1862DD]" />
              Remember login
            </label>
            {resetSent ? (
              <p className="text-[12.5px]" style={{ color: "var(--acc-green)" }}>
                Check your email for a reset link.
              </p>
            ) : (
              <button type="button" onClick={handleForgot} className="text-[12.5px] underline underline-offset-2" style={{ color: "#0835FF" }}>
                Forgot Password?
              </button>
            )}
          </div>
        ) : null}

        {error && (
          <p className="text-[13px]" style={{ color: "var(--acc-coral)" }}>
            {error}{" "}
            {unconfirmed ? (
              resent === "sent" ? (
                <span style={{ color: "var(--acc-green)" }}>Sent — check your inbox.</span>
              ) : (
                <button type="button" onClick={resendConfirmation} className="underline" style={{ color: "var(--acc-blue)" }}>
                  Resend link
                </button>
              )
            ) : null}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          onPointerEnter={hoverCheer}
          className="!mt-5 w-full rounded-[14px] py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: BLUE, border: `1px solid ${FIELD_BORDER}` }}
        >
          {loading ? "Please wait…" : signin ? "Login" : "Create account"}
        </button>
      </form>

      <>
          <div className="mt-4 flex items-center gap-3 text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>
            <span className="h-px flex-1" style={{ background: "rgba(0,0,0,0.15)" }} />
            {signin ? "Or sign in with" : "Or sign up with"}
            <span className="h-px flex-1" style={{ background: "rgba(0,0,0,0.15)" }} />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => continueWith("google")}
            className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-[14px] py-2.5 text-[14px] font-medium transition-colors hover:bg-[#e2e3e6] disabled:opacity-60"
            style={{ background: "#ECEDEF", border: `1px solid ${FIELD_BORDER}`, color: "var(--ink)" }}
          >
            <img src="/account/google-g.png" alt="" width={18} height={18} className="h-[18px] w-[18px]" />
            {signin ? "Sign in with Google" : "Sign up with Google"}
          </button>
      </>

      <p className="mt-5 text-center text-[13px]" style={{ color: "var(--slate)" }}>
        {signin ? "New to The RSVP Studio? " : "Already have an account? "}
        <button type="button" onClick={onSwitch} className="font-medium underline underline-offset-2" style={{ color: BLUE }}>
          {signin ? "Create an account" : "Log in"}
        </button>
      </p>
    </div>
  );
}

/** Webmail shortcut for common providers (people forget to go check). */
function inboxLink(email: string): { label: string; url: string } | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (/^(gmail|googlemail)\.com$/.test(domain)) return { label: "Open Gmail", url: "https://mail.google.com/mail/u/0/#search/from%3Athersvpstudio.com" };
  if (/^(icloud|me|mac)\.com$/.test(domain)) return { label: "Open iCloud Mail", url: "https://www.icloud.com/mail" };
  if (/^(outlook|hotmail|live|msn)\.[a-z.]+$/.test(domain)) return { label: "Open Outlook", url: "https://outlook.live.com/mail" };
  if (/^(yahoo|ymail)\.[a-z.]+$/.test(domain)) return { label: "Open Yahoo Mail", url: "https://mail.yahoo.com" };
  return null;
}

/**
 * Shown across the whole modal once sign-up has sent the confirmation
 * email, so nobody can miss that the next step happens in their inbox.
 */
function CheckInbox({ email, onBack }: { email: string; onBack: () => void }) {
  const [resent, setResent] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const inbox = inboxLink(email);

  const resend = async () => {
    setResent("sending");
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/account?welcome=1` },
    });
    if (error) {
      setResent("idle");
      return setError(error.message);
    }
    setResent("sent");
  };

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-8 py-14 text-center md:px-20" role="status" aria-live="polite">
      <img src="/email/confirm-spot.png" alt="" width={132} height={132} className="h-[132px] w-[132px]" />
      <h2 className="mt-6 font-display text-[2rem] font-semibold leading-tight md:text-[2.4rem]" style={{ color: "var(--ink)" }}>
        Check your inbox
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: "var(--slate)" }}>
        We sent a confirmation link to <strong style={{ color: "var(--ink)" }}>{email}</strong>. Open it to finish
        creating your account, then you&rsquo;ll be signed in&nbsp;automatically.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {inbox ? (
          <a href={inbox.url} target="_blank" rel="noreferrer" className="btn btn-primary">
            {inbox.label}
          </a>
        ) : null}
        <button type="button" onClick={resend} disabled={resent !== "idle"} className="btn btn-ghost disabled:opacity-60">
          {resent === "sent" ? "Sent again" : resent === "sending" ? "Sending…" : "Resend email"}
        </button>
      </div>
      <p className="mt-6 text-[13px]" style={{ color: "var(--slate)" }}>
        Can&rsquo;t find it? Check your spam or promotions folder.{" "}
        <button type="button" onClick={onBack} className="underline" style={{ color: "var(--acc-blue)" }}>
          Use a different email
        </button>
      </p>
      {error ? (
        <p className="mt-3 text-[13px]" style={{ color: "var(--acc-coral)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
