import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

// 16px on phones: iOS Safari zooms the page in when a field under 16px is tapped.
export const INPUT =
  "w-full min-h-[48px] rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-base md:text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--slate)] focus:border-[var(--acc-blue)]";

/** Date fields: iOS draws an empty date input shorter and centred unless told otherwise. */
export const DATE_INPUT = `${INPUT} appearance-none text-left [&::-webkit-date-and-time-value]:text-left`;

/** Field labels: 12px on phones (readable), the original 11px from md up. */
export const LABEL =
  "mb-2 block text-xs md:text-[11px] font-semibold uppercase tracking-[0.12em] md:tracking-[0.14em] text-[var(--slate)]";

/** Spam trap: hidden from people (and screen readers); bots that fill every field get dropped. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  name,
  required,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  /** Marks the wrapper (`data-field`) so a form can scroll to the first field with a problem. */
  name?: string;
  required?: boolean;
  error?: string | null;
}) {
  // Tie the label to a single input/select/textarea so screen readers announce it.
  const id = useId();
  const errId = `${id}-err`;
  const single = isValidElement<{ id?: string }>(children) && typeof children.type === "string" && ["input", "select", "textarea"].includes(children.type);
  const inputId = single ? ((children as ReactElement<{ id?: string }>).props.id ?? id) : undefined;
  const field = single
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: inputId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errId : undefined,
      })
    : children;
  const labelText = (
    <>
      {label}
      {required ? (
        <>
          <span aria-hidden className="ml-0.5 text-[var(--acc-coral)]">*</span>
          <span className="sr-only"> (required)</span>
        </>
      ) : null}
    </>
  );
  return (
    <div data-field={name}>
      {single ? (
        <label htmlFor={inputId} className={LABEL}>
          {labelText}
        </label>
      ) : (
        <p id={`${id}-label`} className={LABEL}>
          {labelText}
        </p>
      )}
      {hint && <p className="mb-2 text-xs text-[var(--slate)]">{hint}</p>}
      {single ? field : <div role="group" aria-labelledby={`${id}-label`} aria-describedby={error ? errId : undefined}>{field}</div>}
      {error ? (
        <p id={errId} role="alert" className="mt-2 text-[13px] text-[#c2410c]">
          {error}
        </p>
      ) : null}
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
      aria-pressed={active}
      className={`min-h-[44px] max-w-full rounded-full border px-4 py-2 text-left text-sm leading-snug transition-colors md:min-h-0 md:text-xs ${
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
    <h3 tabIndex={-1} className="mb-6 border-b border-[var(--line)] pb-3 font-display text-xl font-semibold text-[var(--ink)] outline-none">
      {children}
    </h3>
  );
}

export function SuccessCard({
  title,
  message,
  note,
}: {
  title: string;
  message: string;
  /** An extra line under the message (e.g. files that couldn't be attached). */
  note?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-6 py-16 text-center md:py-24">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--acc-blue)]">
        <i className="ri-check-line text-xl" />
      </span>
      <h2 className="mt-5 font-display text-2xl font-semibold text-[var(--ink)]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-[var(--slate)]">{message}</p>
      {note ? <p className="mx-auto mt-4 max-w-md text-sm text-[var(--ink)]">{note}</p> : null}
    </div>
  );
}
