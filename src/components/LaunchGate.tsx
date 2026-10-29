import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CharacterTrio } from "@/components/CharacterLoader";

/**
 * Before launch: the studio's own pages ask for a password, with a countdown to the launch.
 * Guests are never stopped: published event sites (/invite/…), their photo and table pages, the
 * seating chart's view and day-of links, and customers' own domains (handled before this) open
 * as normal. Once the password is entered it's remembered on that browser.
 *
 * This is a soft gate to keep the site private until launch (the check runs in the browser), not
 * security. To open the site to everyone, set LAUNCH_GATE to false.
 */
export const LAUNCH_GATE = true;
const LAUNCH_AT = new Date("2026-11-02T00:00:00+08:00"); // Monday, 2 November 2026, Manila
const PASS_SHA256 = "41885a91374fbd4df15e04f827c4c093a021d7e4be364cb292f3805a6a9eef94";
const KEY = "rsvp-launch-pass";
const OPEN = /^\/(invite\/|tools\/seating-chart-maker\/(view|day)\/|internal\/)/;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const remembered = () => {
  try {
    return localStorage.getItem(KEY) === PASS_SHA256;
  } catch {
    return false;
  }
};

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, LAUNCH_AT.getTime() - now);
  const s = Math.floor(left / 1000);
  return { done: left === 0, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export default function LaunchGate({ pathname, children }: { pathname: string; children: ReactNode }) {
  const [ok, setOk] = useState(() => !LAUNCH_GATE || remembered());
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  const [checking, setChecking] = useState(false);
  const left = useCountdown();
  if (ok || OPEN.test(pathname)) return <>{children}</>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || checking) return;
    setChecking(true);
    const hash = await sha256(value.trim());
    setChecking(false);
    if (hash === PASS_SHA256) {
      try {
        localStorage.setItem(KEY, hash);
      } catch {
        /* private browsing: open for this visit */
      }
      setOk(true);
    } else {
      setWrong(true);
      setValue("");
    }
  };
  const cell = (n: number, label: string) => (
    <div className="flex min-w-[64px] flex-col items-center md:min-w-[84px]">
      <span className="font-display text-[34px] font-semibold leading-none tabular-nums text-[var(--ink)] md:text-[46px]">{String(n).padStart(2, "0")}</span>
      <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--slate)]">{label}</span>
    </div>
  );

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12 text-center" style={{ background: "var(--warm-white)" }}>
      <img src="/brand/logotype-dark.png" alt="The RSVP Studio" className="h-11 w-auto md:h-12" />
      <CharacterTrio className="mt-10 w-[min(300px,72vw)]" />
      <h1 className="mt-8 font-display text-[30px] font-semibold leading-tight text-[var(--ink)] text-balance md:text-[40px]">
        {left.done ? "We’re opening the doors" : (
          <>
            Launching <span className="whitespace-nowrap">Monday, November 2</span>
          </>
        )}
      </h1>
      {left.done ? null : (
        <div className="mt-7 flex items-start justify-center gap-2 md:gap-4" aria-label="Time until launch">
          {cell(left.d, "Days")}
          {cell(left.h, "Hours")}
          {cell(left.m, "Minutes")}
          {cell(left.s, "Seconds")}
        </div>
      )}
      <form onSubmit={submit} className="mt-10 flex w-full max-w-[360px] flex-col gap-3">
        <label htmlFor="launch-pass" className="text-[14px] text-[var(--slate)]">
          Have the password? Come in early.
        </label>
        <div className="flex gap-2">
          <input
            id="launch-pass"
            type="password"
            autoComplete="current-password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setWrong(false); }}
            className="min-h-12 flex-1 rounded-full border border-[var(--line)] bg-white px-5 text-[16px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            placeholder="Password"
            aria-invalid={wrong || undefined}
          />
          <button type="submit" className="btn btn-primary min-h-12 !px-6" disabled={checking}>
            Enter
          </button>
        </div>
        <p className="min-h-[1.4em] text-[14px] text-[#c2412d]" role="status">
          {wrong ? "That’s not it. Try again." : ""}
        </p>
      </form>
    </main>
  );
}
