import type { CSSProperties, ReactNode } from "react";

// Shared, plain form-field wrapper for the content editor. Deliberately
// minimal (label + native input/textarea styling) — no rich-text editor,
// no drag-and-drop, matching the "start with high-value fields, avoid
// premature editor complexity" instruction in the decision log.

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}

export function FormField({ label, htmlFor, children, hint }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--slate)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 4 }}>{hint}</p>
      ) : null}
    </div>
  );
}

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  color: "var(--ink)",
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 88,
};
