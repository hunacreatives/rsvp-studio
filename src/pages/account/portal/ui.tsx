import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { defaultAvatar, initials } from "./format";

// Shared building blocks for the client dashboard + studio console.
// Visual language from the "Client Dashboard" design: soft paper panels,
// thin outlined cards, black-filled active filter pills, small outlined
// pill buttons, Lora headings over Inter body.

export const OUTLINE = "rgba(0,7,39,0.16)";

export function Panel({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-[22px] ${className}`} style={{ background: "var(--paper)", ...style }}>
      {children}
    </div>
  );
}

export function OutlineCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] bg-white ${className}`} style={{ border: `1px solid ${OUTLINE}` }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, sub }: { children: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[1.6rem] md:text-[1.9rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)]">
          {children}
        </h2>
        {sub ? <p className="mt-1 text-[15px] text-[var(--slate)]">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PillButton({
  children,
  tone = "outline",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "outline" | "primary" | "dark" | "danger" }) {
  const tones: Record<string, string> = {
    outline: "bg-white text-[var(--ink)] border border-[var(--ink)] hover:bg-[var(--ink)] hover:text-white",
    primary: "bg-[var(--acc-blue)] text-white border border-[var(--acc-blue)] hover:bg-[#2453bd]",
    dark: "bg-[var(--ink)] text-white border border-[var(--ink)] hover:opacity-90",
    danger: "bg-white text-[#c2412d] border border-[#e7b4a9] hover:bg-[#fff3f0]",
  };
  return (
    <button
      {...rest}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium transition-colors md:min-h-0 md:py-1.5 md:text-[13px] disabled:opacity-50 disabled:pointer-events-none ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--acc-blue)] px-7 py-3 text-[15px] font-medium text-white shadow-[0_12px_30px_-14px_rgba(47,97,213,0.7)] transition-colors hover:bg-[#2453bd] disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  fill = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Phones: equal-width tabs on one row (a segmented control) instead of wrapping pills. */
  fill?: boolean;
}) {
  return (
    <div
      className={fill ? "grid gap-2 sm:flex sm:flex-wrap" : "flex flex-wrap gap-2"}
      style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] rounded-full py-2 text-[14px] font-medium transition-colors md:min-h-0 md:py-1 ${fill ? "min-w-0 truncate px-2 sm:px-4" : "px-4"}`}
            style={{
              background: active ? "var(--ink)" : "#fff",
              color: active ? "#fff" : "var(--ink)",
              border: "1px solid var(--ink)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const PILL_TONES = {
  lavender: { bg: "#ebe4fb", fg: "#4a3a8c" },
  lime: { bg: "#ecfbcc", fg: "#3d5a12" },
  grey: { bg: "#ececec", fg: "#55556a" },
  coral: { bg: "#ffe6df", fg: "#b23b22" },
  gold: { bg: "#ffc800", fg: "#000727" },
};

export function StatusPill({ tone, children, size = "sm" }: { tone: keyof typeof PILL_TONES; children: ReactNode; size?: "sm" | "md" }) {
  const t = PILL_TONES[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold uppercase tracking-[0.06em] ${size === "sm" ? "px-3 py-1 text-[12px]" : "px-4 py-1.5 text-[13px]"}`}
      style={{ background: t.bg, color: t.fg }}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, url, size = 40, seed }: { name: string | null | undefined; url?: string | null; size?: number; tone?: string; seed?: string | null }) {
  // No photo → one of the illustrated default avatars, stable per person.
  return <img src={url || defaultAvatar(seed ?? name)} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
}

/** Project cover: real image if we have one, otherwise a soft branded block. */
export function Cover({ url, name, className = "", children }: { url?: string | null; name: string; className?: string; children?: ReactNode }) {
  // A photo that's gone (removed after a site ended) falls back to the initials.
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: "linear-gradient(135deg,#dfe4f2,#c9d2ea)" }}>
      {url && broken !== url ? (
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" onError={() => setBroken(url)} />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-display text-[2.2rem] italic text-white/80">{initials(name)}</span>
      )}
      {children}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-[5px] w-full rounded-full bg-[#e6e6ea]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-[var(--ink)] transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <Panel className="px-6 py-12 text-center">
      <i className={`${icon} text-3xl text-[var(--slate)]`} />
      <p className="mt-3 font-display text-xl font-semibold text-[var(--ink)]">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-md text-[14px] text-[var(--slate)]">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Panel>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // The page behind stays put while the dialog is open (phones scroll-chain otherwise).
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  // Rendered on <body>: a dialog opened from inside a table cell or card must not inherit
  // its alignment, clipping or stacking.
  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center p-4 text-left" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[rgba(0,7,39,0.45)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative max-h-[90vh] max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-[26px] bg-white p-5 shadow-2xl sm:p-6 md:p-8"
        style={{ maxWidth: width }}
        data-lenis-prevent
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-[var(--ink)] hover:bg-black/5"
        >
          <i className="ri-close-line text-xl" />
        </button>
        <h3 className="pr-12 font-display text-2xl font-semibold text-[var(--ink)]">{title}</h3>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

const FIELD = "w-full rounded-xl border bg-white px-4 py-2.5 text-[16px] md:text-[15px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--acc-blue)]";
const FIELD_STYLE = { borderColor: OUTLINE };

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-[var(--ink)]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-[var(--slate)]">{hint}</span> : null}
    </label>
  );
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${FIELD} ${p.className ?? ""}`} style={FIELD_STYLE} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`${FIELD} min-h-[120px] resize-y ${p.className ?? ""}`} style={FIELD_STYLE} />
);
export function Select({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...p} className={`${FIELD} appearance-none pr-10 ${p.className ?? ""}`} style={FIELD_STYLE}>
        {children}
      </select>
      <i className="ri-arrow-down-s-line pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xl text-[var(--ink)]" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      // The ::before pad grows the tap area to ~44px without changing the look.
      className="relative h-8 w-[60px] shrink-0 rounded-full transition-colors before:absolute before:-inset-x-1 before:-inset-y-1.5 before:content-['']"
      style={{ background: checked ? "var(--acc-blue)" : "#d6d6dc" }}
    >
      <span
        className="absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200"
        style={{ left: checked ? 32 : 4 }}
      />
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="mt-3 text-[13px] text-[#c2412d]">{children}</p> : null;
}
