import { useEffect, useState } from "react";
import { bannerTextColor, setBannerCache } from "@/pages/home/components/AnnouncementBar";
import { ErrorText, Input, PillButton, Toggle } from "@/pages/account/portal/ui";
import * as studio from "./studioApi";

// Studio → Overview → Website banner: the strip across the top of every marketing
// page. Saving changes it for visitors straight away — no deploy.

const MAX = 140;
const SWATCHES = [
  { name: "Sky", hex: "#3fb6dc" },
  { name: "Blue", hex: "#2f61d5" },
  { name: "Purple", hex: "#7540ee" },
  { name: "Coral", hex: "#ff7052" },
  { name: "Yellow", hex: "#ffc800" },
  { name: "Green", hex: "#2dc76d" },
  { name: "Navy", hex: "#000727" },
];
const TEXT_COLORS = [
  { name: "White", hex: "#ffffff" },
  { name: "Navy", hex: "#000727" },
];

export default function BannerCard() {
  const [b, setB] = useState<studio.BannerRow | null | undefined>(undefined);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    studio.loadSiteBanner().then(setB);
  }, []);
  if (!b) return null; // loading, or site-banner.sql not run yet

  const set = (patch: Partial<studio.BannerRow>) => (setB({ ...b, ...patch }), setState("idle"));
  const save = async () => {
    setError(null);
    const text = b.text.trim();
    const link = b.link?.trim() || null;
    if (b.enabled && !text) return setError("Write the banner text, or switch the banner off.");
    if (link && !/^(\/|https:\/\/)/.test(link)) return setError("Link must start with / (a page on this site) or https://.");
    setState("saving");
    try {
      const next = { enabled: b.enabled, text, link, color: b.color.toLowerCase(), text_color: b.text_color.toLowerCase() };
      await studio.saveSiteBanner(next);
      setBannerCache(next);
      setB(next);
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
      setState("idle");
    }
  };

  return (
    <section className="mt-8 rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Website banner</h2>
          <p className="text-[13px] text-[var(--slate)]">The strip across the top of every page on thersvpstudio.com. Changes show as soon as you save.</p>
        </div>
        <Toggle checked={b.enabled} onChange={(v) => set({ enabled: v })} label="Show the banner" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
          Message
          {/* Shown in the banner's own colours, so it doubles as the preview. */}
          <textarea
            value={b.text}
            maxLength={MAX}
            rows={2}
            placeholder="Banner text"
            // One line of text on the site: Enter doesn't add a line break.
            onChange={(e) => set({ text: e.target.value.replace(/\s*\n\s*/g, " ") })}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            className="mt-1 block w-full resize-none rounded-xl px-4 py-2.5 text-center text-[16px] leading-snug tracking-wide outline-none ring-[var(--ink)] [field-sizing:content] focus-visible:ring-2 md:text-[13px]"
            style={{ background: b.color, color: b.text_color }}
          />
          <span className="mt-1 block text-[12px] text-[var(--slate)]">
            {b.text.length}/{MAX}
          </span>
        </label>
        <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
          Link (optional)
          <Input
            value={b.link ?? ""}
            placeholder="/build or https://…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => set({ link: e.target.value })}
            className="mt-1 w-full"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Banner colour">
          <span className="mr-1.5 text-[14px] text-[var(--ink)] md:text-[13px]">Colour</span>
          {SWATCHES.map((c) => (
            <button
              key={c.hex}
              role="radio"
              aria-checked={b.color.toLowerCase() === c.hex}
              aria-label={c.name}
              title={c.name}
              onClick={() => set({ color: c.hex, text_color: bannerTextColor(c.hex) })}
              className="grid h-11 w-11 place-items-center rounded-full md:h-9 md:w-9"
            >
              <span
                className="h-7 w-7 rounded-full border border-black/10"
                style={{ background: c.hex, boxShadow: b.color.toLowerCase() === c.hex ? "0 0 0 2px #fff, 0 0 0 4px var(--ink)" : undefined }}
              />
            </button>
          ))}
          <label className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-full md:h-9 md:w-9" title="Custom colour">
            <span
              className="grid h-7 w-7 place-items-center rounded-full border border-black/10 text-[14px]"
              style={
                SWATCHES.some((c) => c.hex === b.color.toLowerCase())
                  ? { background: "conic-gradient(#ff7052, #ffc800, #2dc76d, #3fb6dc, #7540ee, #ff7052)" }
                  : { background: b.color, boxShadow: "0 0 0 2px #fff, 0 0 0 4px var(--ink)" }
              }
            />
            <input
              type="color"
              aria-label="Custom colour"
              value={b.color}
              onChange={(e) => set({ color: e.target.value, text_color: bannerTextColor(e.target.value) })}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Text colour">
          <span className="text-[14px] text-[var(--ink)] md:text-[13px]">Text colour</span>
          <span className="inline-flex rounded-full border border-[var(--line)] p-0.5">
            {TEXT_COLORS.map((t) => (
              <button
                key={t.hex}
                role="radio"
                aria-checked={b.text_color.toLowerCase() === t.hex}
                onClick={() => set({ text_color: t.hex })}
                className={`min-h-[40px] rounded-full px-3.5 text-[14px] md:min-h-0 md:py-1 md:text-[13px] ${b.text_color.toLowerCase() === t.hex ? "bg-[var(--ink)] text-white" : "text-[var(--ink)]"}`}
              >
                {t.name}
              </button>
            ))}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <PillButton tone="dark" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save"}
        </PillButton>
      </div>
      <ErrorText>{error}</ErrorText>
    </section>
  );
}
