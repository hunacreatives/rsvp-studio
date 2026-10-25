import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lenisRef } from "@/lib/lenis";
import { setRememberLogin, supabase } from "@/lib/supabase";
import { confirmRedirect, rememberAuthNext } from "@/lib/authNext";
import { GoogleButton } from "@/lib/googleSignIn";
import { BLUE_LAYOUT, BUBBLE_LAYOUT, CHARACTER_BLINK as BLINK, CHARACTER_EYES as EYES, CHARACTER_LAYOUT, CHARACTER_MOUTH as MOUTH } from "@/components/CharacterLoader";
import { trackEvent } from "@/lib/analytics";

/**
 * Where to go after logging in when a signed-out visitor was sent here from a
 * dashboard link (`/?auth=signin&next=/account/billing`). Same-site paths only.
 */
function nextPath(preferred?: string): string | null {
  const next = preferred ?? new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

/** Phones and desktops get different layouts; only the one that shows is mounted. */
const DESKTOP_QUERY = "(min-width: 768px)";
function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

/** Supabase's sign-in errors, in plain words. Unknown ones pass through. */
function friendlyAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "That email and password don’t match. Try again, or use “Forgot password”.";
  if (/user already registered|already been registered/i.test(message)) return "There’s already an account with this email — log in instead.";
  if (/rate limit|only request this after|too many requests/i.test(message)) return "Too many tries in a short time. Please wait a minute and try again.";
  if (/email not confirmed/i.test(message)) return "Please confirm your email first — check your inbox for our link.";
  if (/password should be at least/i.test(message)) return "Your password needs at least 6 characters.";
  if (/unable to validate email|invalid email/i.test(message)) return "That email address doesn’t look right.";
  if (/network|fetch/i.test(message)) return "We couldn’t connect. Check your internet and try again.";
  return message;
}

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
  next: nextProp,
}: {
  open: boolean;
  onClose: () => void;
  /** Opened from an email link: which form, and the address to fill in. */
  initialMode?: Mode;
  initialEmail?: string;
  /** Page to land on after logging in (default: `?next=` in the URL, else the dashboard). */
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  // Set once sign-up has sent a confirmation email: the whole modal then
  // becomes a "check your inbox" screen that a stray tap can't dismiss.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const navigate = useNavigate();
  const desktop = useIsDesktop();

  // Warm the illustration up before anyone clicks "Log in".
  useEffect(() => {
    if (!desktop || charactersReady) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = idle(() => void preloadCharacters());
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, [desktop]);

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // Keyboard users: focus moves into the dialog, Tab stays inside it, and
    // focus goes back to what opened it on close.
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter(
        // Skip the desktop form that's covered by the illustration (inert).
        (el) => el.offsetParent !== null && !el.closest("[inert]"),
      );
    // Touch screens: no autofocus — it pops the keyboard over half the form
    // before they've chosen email or Google. The dialog itself takes focus.
    if (window.matchMedia("(pointer: coarse)").matches) setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 50);
    else setTimeout(() => focusables().find((el) => el.tagName === "INPUT")?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
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
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const handleAuthed = async () => {
    onClose();
    rememberAuthNext(null); // a Google attempt they backed out of shouldn't redirect later
    // Sent here from a dashboard link while signed out: back to that page.
    const next = nextPath(nextProp);
    if (next) return navigate(next, { replace: true });
    // Studio team accounts go straight to the admin console.
    const { data } = await supabase.auth.getUser();
    const { data: profile } = data.user
      ? await supabase.from("profiles").select("is_staff").eq("id", data.user.id).maybeSingle()
      : { data: null };
    navigate(profile?.is_staff ? "/studio" : "/account");
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto overscroll-contain p-4 outline-none"
      tabIndex={-1}
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
          className="absolute top-3 right-3 z-30 grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: "var(--ink)" }}
        >
          <i className="ri-close-line text-2xl" />
        </button>

        {sentTo ? (
          <div className="bg-white">
            <CheckInbox email={sentTo} onBack={() => setSentTo(null)} next={nextPath(nextProp)} />
          </div>
        ) : !desktop ? (
          /* Phones: one form at a time, no room for the illustration (so its
             images and animations aren't even loaded) */
          <div className="rounded-[24px] bg-white">
            <AuthForm key={mode} mode={mode} initialEmail={initialEmail} onSwitch={() => setMode(mode === "signin" ? "signup" : "signin")} onAuthed={handleAuthed} onCheckEmail={setSentTo} next={nextPath(nextProp)} />
          </div>
        ) : (
          <>
            {/* Desktop: both forms stay put (sign-up left, log-in right); only the
                illustration panel slides across to cover one and reveal the other. */}
            <div className="relative h-[576px]">
              <div className="absolute inset-y-0 left-0 w-1/2 rounded-[24px] bg-white" aria-hidden={mode !== "signup"} inert={mode !== "signup" ? true : undefined}>
                <AuthForm mode="signup" initialEmail={initialEmail} onSwitch={() => setMode("signin")} onAuthed={handleAuthed} onCheckEmail={setSentTo} next={nextPath(nextProp)} />
              </div>
              <div className="absolute inset-y-0 right-0 w-1/2 rounded-[24px] bg-white" aria-hidden={mode !== "signin"} inert={mode !== "signin" ? true : undefined}>
                <AuthForm mode="signin" initialEmail={initialEmail} onSwitch={() => setMode("signup")} onAuthed={handleAuthed} onCheckEmail={setSentTo} next={nextPath(nextProp)} />
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

/** Each character's own gentle movement (positions are shared with CharacterLoader). */
const MOVE: Record<string, string> = {
  purple: "rs-sway 3.4s ease-in-out -0.6s infinite",
  pink: "rs-sway 3s ease-in-out -1.8s infinite",
  hexagon: "rs-hop 3.6s ease-in-out -1.2s infinite",
  orange: "rs-bob 2.8s ease-in-out -1.4s infinite",
  green: "rs-sway 2.6s ease-in-out -0.3s infinite",
};
const CHARACTERS = CHARACTER_LAYOUT.map((c) => ({ ...c, move: MOVE[c.name] }));

/**
 * Every image the illustration is built from. They're fetched and decoded
 * ahead of time (desktop, once the page is idle), and the illustration only
 * shows once they're all ready — otherwise the first frame paints the eyes
 * and mouths before the bodies arrive, and the group flickers in.
 */
const CHARACTER_FILES = [
  ...[...CHARACTER_LAYOUT.map((c) => c.name), "blue"].flatMap((n) => [`${n}.webp`, `${n}-mouth.webp`]),
  "bubble.webp",
].map((f) => `/account/characters/${f}`);
let charactersLoad: Promise<void> | null = null;
let charactersReady = false;
function preloadCharacters() {
  charactersLoad ??= Promise.all(
    CHARACTER_FILES.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined); // a missing piece shouldn't hide the rest
    }),
  ).then(() => {
    charactersReady = true;
  });
  return charactersLoad;
}
/** Where each character's speech bubble points up to (% across the illustration). */
// …in the speaker's own colour, so it's clear who's talking.
const SAY_AT: Record<string, { x: number; y: number; bg: string; ink: string }> = {
  purple: { x: 11, y: 66, bg: "#A371C6", ink: "#FFFFFF" },
  pink: { x: 26, y: 51, bg: "#F7ADD1", ink: "#0E0E2C" },
  hexagon: { x: 67, y: 46, bg: "#F66112", ink: "#FFFFFF" },
  orange: { x: 47, y: 69, bg: "#F4A230", ink: "#0E0E2C" },
  green: { x: 84, y: 74, bg: "#42A363", ink: "#FFFFFF" },
};

/** "Do it!": shown when someone hovers the Log in / Create account button. */
export const CHEER_EVENT = "rs-auth-cheer";
/** "Do it!": on hover just the shout; on click the whole group hops too. */
const cheer = (hop = true) => window.dispatchEvent(new CustomEvent(CHEER_EVENT, { detail: { hop } }));
const hoverCheer = () => cheer(false);

/**
 * A wrong password: one of the characters says something about it — a different
 * character and line each time; from the third try on, they suggest Forgot password.
 * (Phones don't show the characters, so the line becomes the error message there.)
 */
export const OOPS_EVENT = "rs-auth-oops";
type Speaker = "pink" | "hexagon" | "purple" | "orange" | "green";
const OOPS: { who: Speaker; text: string }[] = [
  { who: "hexagon", text: "Hmm, that password didn’t work." },
  { who: "pink", text: "So close. Try that password again?" },
  { who: "purple", text: "Typos happen. Give the password another go." },
  { who: "green", text: "Oops, not quite the right password." },
  { who: "orange", text: "Wrong password. Is Caps Lock on, maybe?" },
  { who: "pink", text: "Not that one. Take your time, we’ll wait." },
  { who: "hexagon", text: "That password and email don’t match." },
];
const OOPS_FORGOT: { who: Speaker; text: string }[] = [
  { who: "orange", text: "Maybe it’s time for “Forgot password?”" },
  { who: "green", text: "No worries. “Forgot password?” will sort it out." },
  { who: "purple", text: "Let’s reset it. Tap “Forgot password?” below." },
];
let oopsSeen: number[] = [];
function oopsLine(tries: number, lastWho: Speaker | null) {
  if (tries >= 3) return OOPS_FORGOT[(tries - 3) % OOPS_FORGOT.length];
  // A line not used yet, from a different character than last time.
  let pool = OOPS.map((_, i) => i).filter((i) => !oopsSeen.includes(i) && OOPS[i].who !== lastWho);
  if (!pool.length) {
    oopsSeen = [];
    pool = OOPS.map((_, i) => i).filter((i) => OOPS[i].who !== lastWho);
  }
  const i = pool[Math.floor(Math.random() * pool.length)];
  oopsSeen.push(i);
  return OOPS[i];
}

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
@keyframes rs-say { 0% { opacity: 0; transform: translate(-50%, -6%) scale(.5) } 8% { opacity: 1; transform: translate(-50%, 0) scale(1.06) } 13% { transform: translate(-50%, 0) scale(1) } 90% { opacity: 1; transform: translate(-50%, 0) } 100% { opacity: 0; transform: translate(-50%, 4%) } }
.rs-say { animation: rs-say 4.2s ease-out forwards; }
@keyframes rs-wince { 0%, 100% { transform: translateY(0) rotate(0) } 25% { transform: translateY(-1.5%) rotate(-4deg) } 50% { transform: translateY(0) rotate(3deg) } 75% { transform: rotate(-2deg) } }
.rs-wince { animation: rs-wince .6s ease-in-out !important; }
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
  const [ready, setReady] = useState(charactersReady);
  useEffect(() => {
    if (ready) return;
    let live = true;
    preloadCharacters().then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [ready]);
  const [shout, setShout] = useState(0);
  const [hop, setHop] = useState(0);
  const [say, setSay] = useState<{ n: number; who: Speaker; text: string } | null>(null);
  const sayingUntil = useRef(0);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ who: Speaker; text: string }>).detail;
      sayingUntil.current = Date.now() + 4200; // the bubble's on screen this long
      setShout(0);
      setSay((prev) => ({ n: (prev?.n ?? 0) + 1, who: d.who, text: d.text }));
    };
    window.addEventListener(OOPS_EVENT, on);
    return () => window.removeEventListener(OOPS_EVENT, on);
  }, []);
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
      // One voice at a time: no "Do it!" over a wrong-password line.
      if (Date.now() < sayingUntil.current) return;
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
    <div
      ref={root}
      className="relative w-full max-w-[340px] select-none transition-opacity duration-200"
      style={{ containerType: "inline-size", aspectRatio: "640 / 703", opacity: ready ? 1 : 0 }}
      aria-hidden
    >
      <style>{CHARACTER_CSS}</style>
      <div key={`hop-${hop}`} className={`absolute inset-0 ${hop ? "rs-hooray" : ""}`}>
        {CHARACTERS.map((c) => (
          <div key={c.name + (say?.who === c.name ? `-${say.n}` : "")} className={`rs-char ${say?.who === c.name ? "rs-wince" : ""}`} data-face={c.name} style={{ animation: c.move, transformOrigin: c.origin }}>
            {layer(c.name, c.x, c.y, c.w)}
            {face(c.name)}
          </div>
        ))}
        <div className="rs-char" data-face="blue" style={{ animation: "rs-bob 3.2s ease-in-out -0.8s infinite", transformOrigin: BLUE_LAYOUT.origin }}>
          {layer("blue", BLUE_LAYOUT.x, BLUE_LAYOUT.y, BLUE_LAYOUT.w)}
          {face("blue")}
          {layer("bubble", BUBBLE_LAYOUT.x, BUBBLE_LAYOUT.y, BUBBLE_LAYOUT.w)}
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
      {say ? (
        // Under the group (never over a face), its point aimed up at whoever's speaking.
        <div
          key={`say-${say.n}`}
          className="rs-say absolute rounded-[14px] px-[3.6cqw] py-[2cqw] text-center"
          style={{
            left: `${Math.min(70, Math.max(30, SAY_AT[say.who].x))}%`,
            top: "99%",
            width: "56cqw",
            background: SAY_AT[say.who].bg,
            color: SAY_AT[say.who].ink,
            fontWeight: 700,
            fontSize: "4.6cqw",
            lineHeight: 1.25,
            boxShadow: "0 10px 24px -12px rgba(0,7,39,.45)",
            zIndex: 5,
          }}
        >
          {say.text}
          <span
            className="absolute"
            style={{ left: `calc(50% + ${SAY_AT[say.who].x - Math.min(70, Math.max(30, SAY_AT[say.who].x))}cqw)`, top: "-1.5cqw", width: "3.4cqw", height: "3.4cqw", background: SAY_AT[say.who].bg, transform: "translateX(-50%) rotate(45deg)" }}
          />
        </div>
      ) : null}
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

const fieldClass = "w-full rounded-[14px] bg-white px-4 py-2.5 text-[16px] md:text-[14px] outline-none transition-shadow focus:shadow-[0_0_0_3px_rgba(29,117,227,0.18)]";
const fieldStyle = { border: `1px solid ${FIELD_BORDER}`, color: "var(--ink)" } as const;

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] md:text-[13px]" style={{ color: "var(--ink)" }}>
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
  next,
}: {
  mode: Mode;
  initialEmail?: string;
  onSwitch: () => void;
  onAuthed: () => void;
  onCheckEmail: (email: string) => void;
  /** Where to land after logging in (Google comes back via /account first). */
  next?: string | null;
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
  // Wrong-password tries in a row (the characters react; the third suggests Forgot password).
  const [wrongTries, setWrongTries] = useState(0);
  const lastSpeaker = useRef<Speaker | null>(null);
  const showsCharacters = useIsDesktop();
  const [resent, setResent] = useState<"idle" | "sending" | "sent">("idle");

  // Re-send the "confirm your email" message (Supabase rate-limits this).
  const resendConfirmation = async () => {
    setResent("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirect(next) },
    });
    if (error) {
      setResent("idle");
      return setError(friendlyAuthError(error.message));
    }
    setResent("sent");
  };
  const [resetSent, setResetSent] = useState(false);
  // "Forgot password?" problems show under the email field they're about.
  const [emailError, setEmailError] = useState<string | null>(null);
  // Two-factor: after a correct password, accounts with an authenticator
  // app enrolled must also enter a 6-digit code (Supabase AAL2).
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const handleForgot = async () => {
    setError(null);
    setEmailError(null);
    if (!email) return setEmailError("Enter your email above first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/settings?reset=1`,
    });
    if (error) return setEmailError(friendlyAuthError(error.message));
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
    rememberAuthNext(next ?? null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) {
      setLoading(false);
      setError(friendlyAuthError(error.message));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // No "Do it!" here: the answer (in, or a wrong-password line) is the reaction,
    // so the two never collide.
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
        if (/invalid login credentials/i.test(error.message)) {
          const tries = wrongTries + 1;
          setWrongTries(tries);
          const line = oopsLine(tries, lastSpeaker.current);
          lastSpeaker.current = line.who;
          window.dispatchEvent(new CustomEvent(OOPS_EVENT, { detail: line }));
          // Phones don't show the characters: the line is the message there.
          return setError(showsCharacters ? friendlyAuthError(error.message) : line.text);
        }
        return setError(friendlyAuthError(error.message));
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
          emailRedirectTo: confirmRedirect(next),
        },
      });
      setLoading(false);
      if (error) return setError(friendlyAuthError(error.message));
      if (data.user && (data.user.identities?.length ?? 0) > 0) trackEvent("sign_up", { method: "email" });
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
      <div className="flex h-full flex-col justify-center px-5 py-12 sm:px-7 md:px-9">
        <h2 className="text-center text-[22px] font-medium" style={{ color: "var(--ink)" }}>
          Enter your code
        </h2>
        <p className="mt-2 text-center text-[14px] leading-relaxed md:text-[13px]" style={{ color: "var(--slate)" }}>
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
            <p role="alert" className="text-[14px] md:text-[13px]" style={{ color: "var(--acc-coral)" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || mfaCode.length !== 6}
            className="min-h-[48px] w-full rounded-[14px] py-3 text-[16px] font-medium text-white transition-opacity md:min-h-0 md:text-[14px] hover:opacity-90 disabled:opacity-60"
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
    <div className="flex h-full flex-col justify-center px-5 pb-7 pt-14 sm:px-7 md:px-9 md:pt-11">
      <h2 className="text-center text-[21px] font-medium sm:text-[22px]" style={{ color: "var(--ink)" }}>
        {signin ? "Log in to your account" : "Create your account"}
      </h2>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        {!signin && (
          <div>
            <Label htmlFor={id("name")}>Full name</Label>
            <input id={id("name")} type="text" placeholder="Enter your full name" required autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={fullName} onChange={(e) => (setFullName(e.target.value), setError(null))} className={fieldClass} style={fieldStyle} />
          </div>
        )}
        <div>
          <Label htmlFor={id("email")}>Email</Label>
          <input
            id={id("email")}
            type="email"
            inputMode="email"
            placeholder="Enter your email"
            required
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? id("email-error") : undefined}
            value={email}
            onChange={(e) => (setEmail(e.target.value), setError(null), setEmailError(null))}
            className={fieldClass}
            style={fieldStyle}
          />
          {emailError ? (
            <p id={id("email-error")} role="alert" className="mt-1.5 text-[14px] md:text-[13px]" style={{ color: "var(--acc-coral)" }}>
              {emailError}
            </p>
          ) : null}
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
              enterKeyHint={signin ? "go" : "done"}
              onChange={(e) => (setPassword(e.target.value), setError(null))}
              className={`${fieldClass} pr-12`}
              style={fieldStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full transition-colors hover:bg-black/5 md:right-1.5 md:h-9 md:w-9"
              style={{ color: "#1E1E1E" }}
            >
              <i className={`${showPassword ? "ri-eye-off-line" : "ri-eye-line"} text-[18px]`} />
            </button>
          </div>
        </div>

        {signin ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[14px] md:min-h-0 md:gap-2 md:py-1 md:text-[12.5px]" style={{ color: "var(--ink)" }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-[#1862DD] md:h-3.5 md:w-3.5" />
                Remember me
              </label>
              {resetSent ? null : (
                <button
                  type="button"
                  onClick={handleForgot}
                  className={`-mr-1 inline-flex min-h-[44px] items-center rounded-full px-1 text-[14px] underline underline-offset-2 transition-colors md:min-h-0 md:py-1 md:text-[12.5px] ${wrongTries >= 3 ? "bg-[#fff3c4] px-2 font-semibold" : ""}`}
                  style={{ color: "#0835FF" }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            {resetSent ? (
              <p role="status" className="mt-1 text-[14px] md:text-[12.5px]" style={{ color: "var(--acc-green)" }}>
                Check your email for a reset link.
              </p>
            ) : null}
          </div>
        ) : null}

        {error && (
          <p role="alert" className="text-[14px] md:text-[13px]" style={{ color: "var(--acc-coral)" }}>
            {error}{" "}
            {unconfirmed ? (
              resent === "sent" ? (
                <span style={{ color: "var(--acc-green)" }}>Sent — check your inbox.</span>
              ) : (
                <button type="button" onClick={resendConfirmation} className="inline-flex min-h-[44px] items-center underline md:min-h-0" style={{ color: "var(--acc-blue)" }}>
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
          className="!mt-5 min-h-[48px] w-full rounded-[14px] py-2.5 text-[16px] font-medium text-white transition-opacity md:min-h-0 md:text-[14px] hover:opacity-90 disabled:opacity-60"
          style={{ background: BLUE, border: `1px solid ${FIELD_BORDER}` }}
        >
          {loading ? "Please wait…" : signin ? "Login" : "Create account"}
        </button>
      </form>

      <>
          <div className="mt-4 flex items-center gap-3 text-[13px] md:text-[12px]" style={{ color: "rgba(0,0,0,0.4)" }}>
            <span className="h-px flex-1" style={{ background: "rgba(0,0,0,0.15)" }} />
            {signin ? "Or sign in with" : "Or sign up with"}
            <span className="h-px flex-1" style={{ background: "rgba(0,0,0,0.15)" }} />
          </div>
          {/* Google's own button, opened from our site (src/lib/googleSignIn.tsx); the
              redirect version below is the fallback until the client id is set. */}
          <GoogleButton
            mode={signin ? "signin" : "signup"}
            onStart={() => {
              setError(null);
              setRememberLogin(true);
            }}
            onSignedIn={onAuthed}
            onError={setError}
            fallback={
              <button
                type="button"
                disabled={loading}
                onClick={() => continueWith("google")}
                className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-[14px] py-2.5 text-[16px] font-medium transition-colors md:min-h-0 md:text-[14px] hover:bg-[#e2e3e6] disabled:opacity-60"
                style={{ background: "#ECEDEF", border: `1px solid ${FIELD_BORDER}`, color: "var(--ink)" }}
              >
                <img src="/account/google-g.png" alt="" width={18} height={18} className="h-[18px] w-[18px]" />
                {signin ? "Sign in with Google" : "Sign up with Google"}
              </button>
            }
          />
      </>

      <p className="mt-3 text-center text-[14px] md:mt-5 md:text-[13px]" style={{ color: "var(--slate)" }}>
        {signin ? "New to The RSVP Studio? " : "Already have an account? "}
        <button type="button" onClick={onSwitch} className="inline-flex min-h-[44px] items-center px-1 font-medium underline underline-offset-2 md:min-h-0" style={{ color: BLUE }}>
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
function CheckInbox({ email, onBack, next }: { email: string; onBack: () => void; next?: string | null }) {
  const [resent, setResent] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const inbox = inboxLink(email);

  const resend = async () => {
    setResent("sending");
    setError(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirect(next) },
    });
    if (error) {
      setResent("idle");
      return setError(friendlyAuthError(error.message));
    }
    setResent("sent");
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center md:min-h-[520px] md:px-20" role="status" aria-live="polite">
      <img src="/email/confirm-spot.png" alt="" width={132} height={132} className="h-[132px] w-[132px]" />
      <h2 className="mt-6 font-display text-[2rem] font-semibold leading-tight md:text-[2.4rem]" style={{ color: "var(--ink)" }}>
        Check your inbox
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: "var(--slate)" }}>
        We sent a confirmation link to <strong className="break-all" style={{ color: "var(--ink)" }}>{email}</strong>. Open it to finish
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
      <p className="mt-6 text-[14px] md:text-[13px]" style={{ color: "var(--slate)" }}>
        Can&rsquo;t find it? Check your spam or promotions folder.{" "}
        <button type="button" onClick={onBack} className="inline-flex min-h-[44px] items-center underline md:min-h-0" style={{ color: "var(--acc-blue)" }}>
          Use a different email
        </button>
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-[14px] md:text-[13px]" style={{ color: "var(--acc-coral)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
