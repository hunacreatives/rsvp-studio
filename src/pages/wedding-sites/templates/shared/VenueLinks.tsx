import type { CSSProperties } from "react";
import type { EventContent } from "../../content/types";
import { calendarUrl } from "../../content/calendar";

// "Open in Maps" + "Add to calendar" under the venue — the two things a guest
// on a phone actually does with the address. Each template passes its own
// font/colour so the links read as part of its design.

/** The host's map link, or a Maps search for the venue name + address. */
export function mapHref(content: EventContent): string | null {
  const loc = content.primaryLocation;
  if (loc.mapUrl) return loc.mapUrl;
  const query = [loc.name, loc.addressLine].map((s) => s?.trim()).filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

export default function VenueLinks({
  content,
  font,
  color,
  align = "center",
  size = 14,
  style,
}: {
  content: EventContent;
  font: string;
  color: string;
  align?: "center" | "left";
  size?: number;
  style?: CSSProperties;
}) {
  const map = mapHref(content);
  const cal = calendarUrl(content);
  if (!map && !cal) return null;
  const link: CSSProperties = {
    fontFamily: font,
    fontSize: size,
    fontWeight: 600,
    color,
    display: "inline-flex",
    alignItems: "center",
    minHeight: 44,
    textDecoration: "underline",
    textUnderlineOffset: 4,
    textDecorationThickness: 1,
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: 20, justifyContent: align === "center" ? "center" : "flex-start", ...style }}>
      {map ? (
        <a href={map} target="_blank" rel="noopener noreferrer" style={link}>
          Open in Maps
        </a>
      ) : null}
      {cal ? (
        <a href={cal} target="_blank" rel="noopener noreferrer" style={link}>
          Add to calendar
        </a>
      ) : null}
    </div>
  );
}
