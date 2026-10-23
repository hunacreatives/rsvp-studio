import { useEffect, useId, useRef, useState } from "react";
import { inputStyle } from "./FormField";

// The venue name box searches Google as you type (Places autocomplete, the same suggestions
// Google Maps shows). Picking one fills the name and address and links "Open in Maps" to that
// exact place. Without VITE_GOOGLE_MAPS_KEY it's a plain text box.

const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
/** Google search is available (the key is set). */
export const MAPS_ON = !!KEY;

export interface PickedVenue {
  name: string;
  address: string;
  mapUrl?: string;
}

let loading: Promise<any> | null = null;
/** Loads the Maps JavaScript API once and returns its places library. */
function places(): Promise<any> {
  if (!KEY) return Promise.reject(new Error("no key"));
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const w = window as any;
      if (w.google?.maps?.importLibrary) return resolve();
      w.__rsMapsReady = () => resolve();
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(KEY)}&v=weekly&loading=async&callback=__rsMapsReady`;
      s.async = true;
      s.onerror = () => {
        loading = null;
        reject(new Error("maps failed to load"));
      };
      document.head.appendChild(s);
    }).then(() => (window as any).google.maps.importLibrary("places"));
  }
  return loading;
}

type Suggestion = { main: string; rest: string; prediction: any };

/**
 * With `value`/`onType` it's the venue name box that also searches. Without them it's a
 * search bar of its own: its text is just the search, cleared once a place is picked.
 */
export function VenueSearch({ value, onType, onPick, placeholder }: { value?: string; onType?: (name: string) => void; onPick: (v: PickedVenue) => void; placeholder?: string }) {
  const [own, setOwn] = useState("");
  const standalone = value === undefined;
  const text = standalone ? own : value;
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const token = useRef<any>(null);
  const timer = useRef(0);
  const seq = useRef(0);
  const listId = useId();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const search = (q: string) => {
    window.clearTimeout(timer.current);
    if (!KEY || q.trim().length < 2) {
      setItems([]);
      return;
    }
    const n = ++seq.current;
    timer.current = window.setTimeout(async () => {
      try {
        const lib = await places();
        token.current ??= new lib.AutocompleteSessionToken();
        const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: q, sessionToken: token.current, region: "ph" });
        if (n !== seq.current) return; // a newer search is on its way
        setItems(
          (suggestions ?? [])
            .map((s: any) => s.placePrediction)
            .filter(Boolean)
            .slice(0, 5)
            .map((p: any) => ({ main: p.mainText?.text ?? p.text?.text ?? "", rest: p.secondaryText?.text ?? "", prediction: p })),
        );
        setActive(-1);
        setOpen(true);
      } catch {
        setItems([]);
      }
    }, 220);
  };

  const pick = async (s: Suggestion) => {
    setOpen(false);
    setItems([]);
    if (standalone) setOwn("");
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "googleMapsURI"] });
      token.current = null; // the pick ends this search session
      onPick({ name: place.displayName || s.main, address: place.formattedAddress || s.rest, mapUrl: place.googleMapsURI || undefined });
    } catch {
      onPick({ name: s.main, address: s.rest });
    }
  };

  const showing = open && items.length > 0;
  return (
    <div style={{ position: "relative" }}>
      {KEY ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ position: "absolute", left: 12, top: "50%", translate: "0 -50%", pointerEvents: "none" }}>
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      ) : null}
      <input
        style={{ ...inputStyle, paddingLeft: KEY ? 36 : undefined }}
        value={text}
        role={KEY ? "combobox" : undefined}
        aria-expanded={KEY ? showing : undefined}
        aria-controls={KEY ? listId : undefined}
        aria-autocomplete={KEY ? "list" : undefined}
        aria-activedescendant={showing && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder ?? (KEY ? "Search for the venue" : undefined)}
        onChange={(e) => {
          if (standalone) setOwn(e.target.value);
          else onType?.(e.target.value);
          search(e.target.value);
        }}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showing) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const d = e.key === "ArrowDown" ? 1 : -1;
            setActive((a) => (a + d + items.length) % items.length);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            void pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showing ? (
        <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 12px 32px -12px rgba(0,7,39,.25)", overflow: "hidden" }}>
          <ul id={listId} role="listbox" style={{ margin: 0, padding: 4, listStyle: "none" }}>
            {items.map((s, i) => (
              <li
                key={i}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => void pick(s)}
                style={{ display: "grid", gap: 2, padding: "9px 10px", borderRadius: 7, cursor: "pointer", background: i === active ? "var(--mist, #f3f2ee)" : "transparent" }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.main}</span>
                {s.rest ? <span style={{ fontSize: 12.5, color: "var(--slate)" }}>{s.rest}</span> : null}
              </li>
            ))}
          </ul>
          <p style={{ margin: 0, padding: "6px 12px 8px", fontSize: 11, color: "var(--slate)", textAlign: "right" }}>Powered by Google</p>
        </div>
      ) : null}
    </div>
  );
}

/** A link from picking a Google place (vs one the host pasted). */
export const isPickedMapUrl = (url?: string) => !!url && /^https:\/\/maps\.google\.com\/\?cid=/.test(url);
