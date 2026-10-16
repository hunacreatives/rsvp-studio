import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

// "Continue with Google" that opens from thersvpstudio.com (Google Identity Services)
// instead of bouncing through Supabase's address — so Google's window names our site,
// not <project>.supabase.co. Google returns an ID token here and Supabase signs in with
// it (signInWithIdToken), with a one-time nonce so the token can't be replayed.
// Needs VITE_GOOGLE_CLIENT_ID (the same OAuth client Supabase's Google provider uses,
// with this site under "Authorized JavaScript origins"). Without it: `fallback`.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

type GsiButtonOptions = { type: "standard"; theme: "outline" | "filled_blue"; size: "large"; shape: "pill" | "rectangular"; text: "signin_with" | "signup_with" | "continue_with"; width: number; logo_alignment: "center" | "left"; locale?: string };
type Gsi = {
  accounts: {
    id: {
      initialize(o: { client_id: string; callback: (r: { credential: string }) => void; nonce: string; ux_mode?: "popup"; itp_support?: boolean; use_fedcm_for_button?: boolean }): void;
      renderButton(el: HTMLElement, o: GsiButtonOptions): void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

let scriptLoad: Promise<Gsi> | null = null;
function loadGsi(): Promise<Gsi> {
  scriptLoad ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client?hl=en";
    s.async = true;
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error("gsi")));
    s.onerror = () => {
      scriptLoad = null;
      reject(new Error("gsi"));
    };
    document.head.appendChild(s);
  });
  return scriptLoad;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const googleOnSite = !!CLIENT_ID;

export function GoogleButton({
  mode,
  onStart,
  onSignedIn,
  onError,
  fallback,
}: {
  mode: "signin" | "signup";
  /** Right before Supabase signs them in (e.g. "remember me"). */
  onStart?: () => void;
  onSignedIn: () => void;
  onError: (message: string) => void;
  /** Shown when the site isn't set up for this (no client id) or Google's script can't load. */
  fallback: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!CLIENT_ID);
  const handlers = useRef({ onStart, onSignedIn, onError });
  handlers.current = { onStart, onSignedIn, onError };

  useEffect(() => {
    if (!CLIENT_ID) return;
    let live = true;
    (async () => {
      try {
        const google = await loadGsi();
        const raw = crypto.randomUUID() + crypto.randomUUID();
        const hashed = await sha256Hex(raw);
        if (!live || !box.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: hashed,
          ux_mode: "popup",
          itp_support: true,
          callback: async ({ credential }) => {
            handlers.current.onStart?.();
            const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
            if (error) handlers.current.onError("Google sign-in didn’t work — please try again, or use your email and password.");
            else handlers.current.onSignedIn();
          },
        });
        box.current.innerHTML = "";
        google.accounts.id.renderButton(box.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: mode === "signin" ? "signin_with" : "signup_with",
          width: Math.min(400, Math.max(200, Math.round(box.current.clientWidth))),
          logo_alignment: "center",
          locale: "en", // the site is in English; Google otherwise follows the browser's language
        });
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [mode]);

  if (failed) return <>{fallback}</>;
  // Google draws its own button inside this box (it's 40px tall; the box keeps the 44px tap row).
  // Fixed height, clipped: while it swaps its placeholder for the real button, Google
  // briefly has both in here (80px), which used to nudge the whole form for a frame.
  return <div ref={box} className="mt-3 flex h-[44px] w-full items-center justify-center overflow-hidden" />;
}
