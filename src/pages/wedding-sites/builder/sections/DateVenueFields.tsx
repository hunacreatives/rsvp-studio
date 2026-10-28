import type { EventContent } from "../../content/types";
import { FormField, inputStyle } from "../components/FormField";
import { mapHref } from "../../templates/shared/VenueLinks";
import { useState } from "react";
import { MAPS_ON, VenueSearch, isPickedMapUrl } from "../components/VenueSearch";
import { manilaToday } from "../../content/rsvpDeadline";

interface DateVenueFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function DateVenueFields({ content, onChange }: DateVenueFieldsProps) {
  const map = mapHref(content);
  const where = content.primaryLocation.name || content.primaryLocation.addressLine;
  const [editing, setEditing] = useState(false);
  // Picked from Google: editing the name or address by hand drops that place's link.
  const picked = isPickedMapUrl(content.primaryLocation.mapUrl);
  // the date can't move into the past (a past date already saved stays until it's changed)
  const today = manilaToday();
  const [pastTried, setPastTried] = useState(false);
  return (
    <div>
      <div className="rb-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Event date" hint={pastTried ? "Pick today or a later date." : undefined}>
          <input
            type="date"
            style={inputStyle}
            min={today}
            value={content.eventDate.slice(0, 10)}
            onChange={(e) => {
              const v = e.target.value;
              if (v && v < today && v !== content.eventDate.slice(0, 10)) return setPastTried(true);
              setPastTried(false);
              onChange({ ...content, eventDate: v + (content.eventDate.length > 10 ? content.eventDate.slice(10) : "") });
            }}
          />
        </FormField>
        <FormField label="Start time (optional)">
          <input
            type="time"
            style={inputStyle}
            value={content.eventDate.length > 10 ? content.eventDate.slice(11, 16) : ""}
            disabled={!content.eventDate}
            onChange={(e) => onChange({ ...content, eventDate: content.eventDate.slice(0, 10) + (e.target.value ? `T${e.target.value}` : "") })}
          />
        </FormField>
      </div>
      {/* With Google (VITE_GOOGLE_MAPS_KEY): one search bar, the picked venue as a card with
          "Edit details" for the wording. Without it: the name and address boxes. The boxes
          stay mounted either way: editing the venue on the page writes through them. */}
      {MAPS_ON ? (
        <>
          <FormField label="Venue">
            <VenueSearch
              placeholder={where ? "Search for a different venue" : "Search Google Maps for your venue"}
              onPick={(v) => {
                onChange({ ...content, primaryLocation: { ...content.primaryLocation, name: v.name, addressLine: v.address, mapUrl: v.mapUrl } });
                setEditing(false);
              }}
            />
          </FormField>
          {where && !editing ? (
            <div style={{ margin: "-4px 0 16px", padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{content.primaryLocation.name || content.primaryLocation.addressLine}</p>
              {content.primaryLocation.name && content.primaryLocation.addressLine ? <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.45, color: "var(--slate)" }}>{content.primaryLocation.addressLine}</p> : null}
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13 }}>
                {map ? (
                  <a href={map} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    View on Google Maps ↗
                  </a>
                ) : null}
                <button type="button" onClick={() => setEditing(true)} style={{ padding: 0, border: 0, background: "none", color: "var(--slate)", fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                  Edit details
                </button>
              </div>
            </div>
          ) : !where && !editing ? (
            <button type="button" onClick={() => setEditing(true)} style={{ margin: "-6px 0 16px", padding: 0, border: 0, background: "none", color: "var(--slate)", fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
              Not on Google Maps? Type it in
            </button>
          ) : null}
        </>
      ) : null}
      <div hidden={MAPS_ON && !editing}>
        <FormField label="Venue name">
          <input
            style={inputStyle}
            value={content.primaryLocation.name}
            onChange={(e) => onChange({ ...content, primaryLocation: { ...content.primaryLocation, name: e.target.value, mapUrl: picked ? undefined : content.primaryLocation.mapUrl } })}
          />
        </FormField>
        <FormField label="Venue address">
          <input
            style={inputStyle}
            value={content.primaryLocation.addressLine}
            onChange={(e) => onChange({ ...content, primaryLocation: { ...content.primaryLocation, addressLine: e.target.value, mapUrl: picked ? undefined : content.primaryLocation.mapUrl } })}
          />
        </FormField>
      </div>
      {/* Guests' "Open in Maps" is a Google Maps search for the name and address; a link of
          their own is the exception, so it sits behind a toggle. */}
      <div style={{ marginBottom: 16 }}>
        {!MAPS_ON || editing ? (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--slate)" }}>
            {map ? (
              <>
                {picked ? "“Open in Maps” goes to this place on Google Maps." : content.primaryLocation.mapUrl ? "“Open in Maps” uses your link." : "“Open in Maps” searches Google Maps for the name and address."}{" "}
                <a href={map} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  Check it on Google Maps ↗
                </a>
              </>
            ) : (
              "Add the venue’s name and address and guests get a Google Maps search for it."
            )}
          </p>
        ) : null}
        <details open={!!content.primaryLocation.mapUrl && !picked} style={{ marginTop: 8 }}>
          <summary className="dp-text-btn" style={{ listStyle: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Use your own map link
          </summary>
          <div style={{ marginTop: 8 }}>
            <FormField label="" hint="For a place Google can’t find by its name, like a private home: open it in Google Maps, tap Share, and paste the link here.">
              <input
                style={inputStyle}
                value={picked ? "" : content.primaryLocation.mapUrl ?? ""}
                placeholder="https://maps.app.goo.gl/…"
                aria-label="Your own map link"
                onChange={(e) =>
                  onChange({
                    ...content,
                    primaryLocation: { ...content.primaryLocation, mapUrl: e.target.value.trim() || undefined },
                  })
                }
              />
            </FormField>
          </div>
        </details>
      </div>
    </div>
  );
}
