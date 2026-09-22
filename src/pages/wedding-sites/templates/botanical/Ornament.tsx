// Small inline SVG flourishes shared across this template's OWN sections
// only — not a cross-template shared component (see
// docs/template-builder-decisions.md on templates owning their visuals).
// Local reuse within one template's files is just avoiding copy-pasted
// SVG markup eight times, not the "generic reskin" pattern that was
// explicitly rejected.

interface LeafDividerProps {
  color: string;
}

// A single centered sprig between an accent line — stands in for the
// floral motifs in the reference design without needing a raster asset.
export function LeafDivider({ color }: LeafDividerProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "20px 0" }}>
      <span style={{ width: 40, height: 1, background: color, opacity: 0.4 }} />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.7 }}>
        <path
          d="M12 2C12 2 6 7 6 13a6 6 0 0 0 12 0c0-6-6-11-6-11Z"
          stroke={color}
          strokeWidth="1.3"
        />
        <path d="M12 6v15" stroke={color} strokeWidth="1.3" />
      </svg>
      <span style={{ width: 40, height: 1, background: color, opacity: 0.4 }} />
    </div>
  );
}
