import type { ReactNode } from "react";

export const INPUT =
  "w-full rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--slate)] focus:border-[var(--acc-blue)]";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">
        {label}
      </label>
      {hint && <p className="mb-2 text-xs text-[var(--slate)]">{hint}</p>}
      {children}
    </div>
  );
}

export function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs transition-colors ${
        active
          ? "border-[var(--ink)] bg-[var(--ink)] text-white"
          : "border-[var(--line)] text-[var(--slate)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
  );
}

/** A labelled group of pills. `multi` toggles between single-select and multi-select. */
export function PillGroup({
  label,
  hint,
  options,
  value,
  onChange,
  multi = false,
}: {
  label: string;
  hint?: string;
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const isActive = (o: string) =>
    multi ? (value as string[]).includes(o) : value === o;
  const toggle = (o: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    } else {
      onChange(value === o ? "" : o);
    }
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill key={o} label={o} active={isActive(o)} onClick={() => toggle(o)} />
        ))}
      </div>
    </Field>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-6 border-b border-[var(--line)] pb-3 font-display text-xl font-semibold text-[var(--ink)]">
      {children}
    </h3>
  );
}

export function SuccessCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] py-24 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--acc-blue)]">
        <i className="ri-check-line text-xl" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-semibold text-[var(--ink)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--slate)]">{message}</p>
    </div>
  );
}
