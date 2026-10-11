import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// The banner across the top of the marketing pages, edited in Studio → Overview
// (site_banner, supabase/site-banner.sql). The last version seen is kept in
// localStorage so it shows instantly; on a first-ever visit it appears once loaded,
// so nobody sees outdated text.

export type Banner = { enabled: boolean; text: string; link: string | null; color?: string | null; text_color?: string | null };

export const BANNER_DEFAULT_COLOR = "#3fb6dc";

/** White or navy, whichever reads better on `hex` (Studio suggests it when a colour is picked). */
export function bannerTextColor(hex: string) {
  const lum = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [1, 3, 5].map((i) => lum(parseInt(hex.slice(i, i + 2), 16) / 255));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const navy = 0.0024; // relative luminance of #000727
  return (1.05 / (L + 0.05) >= (L + 0.05) / (navy + 0.05) ? "#ffffff" : "#000727");
}

const KEY = "rsvp-banner";
let cached: Banner | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
})();
let request: Promise<Banner | null> | null = null;

function loadBanner() {
  request ??= Promise.resolve(supabase.from("site_banner").select("*").eq("id", 1).maybeSingle()).then(({ data }) => {
    if (!data) return cached; // table not there yet / offline — keep what we had
    cached = data as Banner;
    try {
      localStorage.setItem(KEY, JSON.stringify(cached));
    } catch {
      /* private mode */
    }
    return cached;
  });
  return request;
}

/** Studio calls this after saving so the change shows without a reload. */
export function setBannerCache(b: Banner) {
  cached = b;
  request = Promise.resolve(b);
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* private mode */
  }
}

export default function AnnouncementBar() {
  const [banner, setBanner] = useState<Banner | null>(cached);
  useEffect(() => {
    let live = true;
    loadBanner().then((b) => live && setBanner(b));
    return () => {
      live = false;
    };
  }, []);

  if (!banner?.enabled || !banner.text.trim()) return null;
  const className = "block w-full text-center text-[12px] sm:text-[13px] tracking-wide py-2.5 px-4 text-balance";
  const bg = /^#[0-9a-f]{6}$/i.test(banner.color ?? "") ? banner.color! : BANNER_DEFAULT_COLOR;
  const fg = /^#[0-9a-f]{6}$/i.test(banner.text_color ?? "") ? banner.text_color! : "#ffffff";
  const style = { background: bg, color: fg };
  const link = banner.link?.trim();
  if (link?.startsWith("/"))
    return (
      <Link to={link} className={`${className} underline-offset-4 hover:underline`} style={style}>
        {banner.text}
      </Link>
    );
  if (link?.startsWith("https://"))
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className={`${className} underline-offset-4 hover:underline`} style={style}>
        {banner.text}
      </a>
    );
  return (
    <div className={className} style={style}>
      {banner.text}
    </div>
  );
}
