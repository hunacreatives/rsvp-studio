import type { CSSProperties, ReactNode } from "react";
import "../builder.css";

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
      {label ? (
      <label
          htmlFor={htmlFor}
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ink)",
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      ) : null}
      {children}
      {hint ? (
        <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 4 }}>{hint}</p>
      ) : null}
    </div>
  );
}

export const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--line-strong, #d6d6ce)",
  // 14px on desktop, 16px on phones so iOS doesn't zoom in (builder.css).
  fontSize: "var(--rb-field-font, 14px)",
  fontFamily: "inherit",
  background: "#fff",
  color: "var(--ink)",
};

export const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 88,
};
