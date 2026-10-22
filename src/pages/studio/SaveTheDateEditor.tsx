import { useEffect, useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import * as api from "@/pages/account/portal/api";
import type { Project } from "@/pages/account/portal/types";
import { ErrorText, Field, Input, Modal, OutlineCard, PillButton, Select, Toggle } from "@/pages/account/portal/ui";
import { emptyEventContent } from "@/pages/wedding-sites/builder/useEventSiteDraft";
import { uploadEventImage } from "@/pages/wedding-sites/content/uploadEventImage";
import { uploadEventVideo } from "@/pages/wedding-sites/content/uploadEventVideo";
import { slugify } from "@/pages/wedding-sites/content/slugify";
import type { SaveTheDate } from "@/pages/wedding-sites/content/saveTheDate";
import SaveTheDatePage from "@/pages/wedding-sites/public/SaveTheDatePage";
import * as studio from "./studioApi";

// Studio → project → Save the Date (supabase/save-the-date.sql). The studio uploads the card
// it designed (and the video, when it's animated), and the project's link shows it: names,
// date, countdown, Add to calendar and, if on, "Get the invitation when it's ready". The
// couple sees the link and numbers in their dashboard (Website tab).

const OCCASIONS: { value: SaveTheDate["occasion"]; label: string }[] = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "other", label: "Other celebration" },
];

const asOccasion = (t: string | null): SaveTheDate["occasion"] => (t === "wedding" || t === "birthday" || t === "anniversary" ? t : "other");
const splitNames = (s: string) => s.split(/\s*(?:&|,|\band\b)\s*/i).map((x) => x.trim()).filter(Boolean);

export default function SaveTheDateEditor({ project }: { project: Project }) {
  const { sites, refresh, demo } = usePortal();
  const site = sites[project.id];
  const saved = site?.std ?? null;

  const [names, setNames] = useState(saved ? saved.names.join(" & ") : project.name.replace(/\s+(wedding|birthday|debut|christening)$/i, ""));
  const [occasion, setOccasion] = useState<SaveTheDate["occasion"]>(saved?.occasion ?? asOccasion(project.event_type));
  const [date, setDate] = useState((saved?.eventDate ?? project.event_date ?? "").slice(0, 10));
  const [time, setTime] = useState(saved?.eventDate.includes("T") ? saved.eventDate.slice(11, 16) : "");
  const [venue, setVenue] = useState(saved?.venue ?? "");
  const [image, setImage] = useState<SaveTheDate["image"] | null>(saved?.image ?? null);
  const [video, setVideo] = useState<string | null>(saved?.video?.url ?? null);
  const [signup, setSignup] = useState(saved?.signup ?? true);
  const [busy, setBusy] = useState<null | "image" | "video" | "save">(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [stats, setStats] = useState<{ opens: number; signups: number } | null>(null);

  useEffect(() => {
    if (!saved || demo) return;
    api.saveTheDateStats(project.id).then(setStats);
  }, [project.id, saved, demo]);

  const std: SaveTheDate | null = image && date
    ? { names: splitNames(names), occasion, eventDate: time ? `${date}T${time}` : date, venue: venue.trim() || undefined, image, video: video ? { url: video } : null, signup }
    : null;
  const live = site?.stdLive === true;
  const url = site ? `${window.location.origin}/invite/${site.slug}` : null;

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setBusy("image");
    setError(null);
    try {
      const a = await uploadEventImage(file, project.id);
      setImage({ url: a.masterUrl, width: a.width, height: a.height });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t upload that image.");
    } finally {
      setBusy(null);
    }
  };
  const pickVideo = async (file: File | undefined) => {
    if (!file) return;
    setBusy("video");
    setError(null);
    try {
      setVideo(await uploadEventVideo(file, project.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t upload that video.");
    } finally {
      setBusy(null);
    }
  };

  const save = async (nextLive: boolean) => {
    if (demo) return setError("Read-only in demo mode.");
    if (!std) return setError("Add the card image and the date first.");
    if (!std.names.length) return setError("Add the names.");
    setBusy("save");
    setError(null);
    try {
      // A project without a site yet: the website draft starts with the same names and date.
      const draft = {
        ...emptyEventContent(project.table_name ?? ""),
        occasion,
        hosts: std.names.map((n, i) => ({ id: `host-${i + 1}`, name: n })),
        eventDate: std.eventDate,
        primaryLocation: { id: "location-main", name: venue.trim(), addressLine: "" },
      };
      await studio.saveSaveTheDate(project.id, std, nextLive, slugify(std.names.join(" and ") || project.name), draft);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the Save the Date.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <OutlineCard className="p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-[1.3rem] font-semibold text-[var(--ink)]">Save the Date</h3>
        {saved ? (
          <span className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] ${live ? "bg-[#ecfbcc] text-[#3d5a12]" : "bg-[#ececec] text-[#55556a]"}`}>
            {live ? "Live" : "Off"}
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-[14px] text-[var(--slate)]">
        The couple’s link shows the card, the date, a countdown and Add to calendar. Guests can ask for the invitation, and they go into the couple’s invite list.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Names">
          <Input value={names} onChange={(e) => setNames(e.target.value)} placeholder="Destiny & Austin" />
        </Field>
        <Field label="Occasion">
          <Select value={occasion} onChange={(e) => setOccasion(e.target.value as SaveTheDate["occasion"])}>
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time" hint="Optional">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Venue" hint="Optional. Leave it out if it isn’t final.">
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Villa Aurelia, Tagaytay" />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-5">
        {image ? <img src={image.url} alt="The card" className="h-32 w-auto rounded-lg shadow-[0_10px_24px_-14px_rgba(0,7,39,0.45)]" /> : null}
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[14px] font-medium text-[var(--ink)]">Card image</p>
            <label className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-[var(--ink)] bg-white px-4 py-2 text-[14px] font-medium text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white md:min-h-0 md:py-1.5 md:text-[13px] ${busy ? "pointer-events-none opacity-50" : ""}`}>
              <i className="ri-image-add-line" /> {busy === "image" ? "Uploading…" : image ? "Replace image" : "Upload image"}
              <input type="file" accept="image/*" className="sr-only" disabled={busy !== null} onChange={(e) => pickImage(e.target.files?.[0])} />
            </label>
            <p className="mt-1 text-[13px] text-[var(--slate)]">The same JPEG you send them.</p>
          </div>
          <div>
            <p className="mb-1.5 text-[14px] font-medium text-[var(--ink)]">Animated version</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-[var(--ink)] bg-white px-4 py-2 text-[14px] font-medium text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white md:min-h-0 md:py-1.5 md:text-[13px] ${busy ? "pointer-events-none opacity-50" : ""}`}>
                <i className="ri-film-line" /> {busy === "video" ? "Uploading…" : video ? "Replace video" : "Upload video"}
                <input type="file" accept="video/mp4" className="sr-only" disabled={busy !== null} onChange={(e) => pickVideo(e.target.files?.[0])} />
              </label>
              {video && busy !== "video" ? (
                <PillButton tone="danger" onClick={() => setVideo(null)}>
                  Remove
                </PillButton>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] text-[var(--slate)]">{video ? "It plays in place of the image." : "Optional. MP4, up to 50 MB."}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-[var(--paper)] px-4 py-3">
        <span className="text-[14px] text-[var(--ink)]">“Get the invitation when it’s ready” sign-up</span>
        <Toggle checked={signup} onChange={setSignup} label="Guests can ask for the invitation" />
      </div>

      {saved && url ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--paper)] px-4 py-3">
          <i className="ri-link text-[var(--slate)]" />
          <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-[14px] text-[var(--acc-blue)] hover:underline">
            {url}
          </a>
          <PillButton onClick={() => navigator.clipboard?.writeText(url)}>Copy link</PillButton>
        </div>
      ) : null}
      {stats ? (
        <p className="mt-3 text-[14px] text-[var(--slate)]">
          {stats.opens.toLocaleString("en-PH")} opens · {stats.signups.toLocaleString("en-PH")} asked for the invitation
        </p>
      ) : null}
      {site?.publishedAt && live ? (
        <p className="mt-3 text-[13px] text-[var(--slate)]">Their website is published too. Turn the Save the Date off to show the website on this link.</p>
      ) : null}

      <ErrorText>{error}</ErrorText>
      <div className="mt-5 flex flex-wrap gap-3">
        <PillButton tone="dark" disabled={busy !== null || !std} onClick={() => save(live)}>
          {busy === "save" ? "Saving…" : "Save"}
        </PillButton>
        <PillButton tone={live ? "danger" : "primary"} disabled={busy !== null || !std} onClick={() => save(!live)}>
          {live ? "Turn off" : "Save and go live"}
        </PillButton>
        <PillButton disabled={!std} onClick={() => setPreview(true)}>
          Preview
        </PillButton>
      </div>

      {std ? (
        <Modal open={preview} onClose={() => setPreview(false)} title="Preview" width={460}>
          <div className="-mx-5 -mb-5 max-h-[75vh] overflow-y-auto">
            <SaveTheDatePage std={std} slug={site?.slug ?? "preview"} preview />
          </div>
        </Modal>
      ) : null}
    </OutlineCard>
  );
}
