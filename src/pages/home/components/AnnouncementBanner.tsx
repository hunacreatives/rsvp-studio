import { useState } from "react";

const FONT_SECONDARY = "'Jost', sans-serif";

export default function AnnouncementBanner({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center"
      style={{
        background: "#4D403A",
        minHeight: "40px",
        padding: "8px 48px",
      }}
    >
      <p
        className="text-center whitespace-nowrap"
        style={{
          fontFamily: FONT_SECONDARY,
          fontSize: "11px",
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.85)",
          textTransform: "uppercase",
        }}
      >
        Fully Booked until{" "}
        <span style={{ color: "#D4C5B8", fontWeight: 600 }}>September 2025</span>
        {" "}— Enquiries for later dates are welcome.
      </p>
      <button
        onClick={onClose}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: "#FFFFFF" }}
        aria-label="Dismiss"
      >
        <i className="ri-close-line text-sm" />
      </button>
    </div>
  );
}
