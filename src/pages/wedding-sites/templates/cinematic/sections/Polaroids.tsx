import type { GalleryItem } from "../../../content/types";

// The two tilted polaroids with the party hat and heart stickers. The
// reference baked its photos into the frame images; here the frames are cut
// out (public/event-templates/cinematic/polaroid-*-frame.webp, Gel's photos
// removed) and the host's photo sits underneath, masked to the frame's own
// window (polaroid-*-window.png) and rotated to match its tilt. Black and
// white, like the reference.

const ASSET = "/event-templates/cinematic";

/** Where each frame's photo window is, in % of the (square) frame, and its tilt. */
const WINDOW = {
  left: { cx: 49.15, cy: 43.72, w: 73.5, h: 69.18, rotate: -4.75 },
  right: { cx: 51.37, cy: 45.77, w: 68.96, h: 67.83, rotate: 5.75 },
} as const;
// The photo overshoots the window a little; the window mask trims it exactly.
const BLEED = 2;

function Polaroid({ side, item, editorPreview }: { side: "left" | "right"; item?: GalleryItem; editorPreview: boolean }) {
  const win = WINDOW[side];
  const mask = `url(${ASSET}/polaroid-${side}-window.png)`;
  const img = item?.image;
  return (
    <div className={`cn-pol cn-pol--${side}`}>
      {side === "left" ? (
        <div className="cn-pol__hat" aria-hidden>
          <img src={`${ASSET}/party-hat.webp`} alt="" />
        </div>
      ) : null}
      <div className="cn-pol__window" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <div
          className="cn-pol__photo"
          style={{
            left: `${win.cx - (win.w + BLEED) / 2}%`,
            top: `${win.cy - (win.h + BLEED) / 2}%`,
            width: `${win.w + BLEED}%`,
            height: `${win.h + BLEED}%`,
            transform: `rotate(${win.rotate}deg)`,
          }}
        >
          {img?.masterUrl ? (
            <img
              src={img.masterUrl}
              alt={img.alt || item?.caption || ""}
              style={{ objectPosition: `${img.focalPoint.x * 100}% ${img.focalPoint.y * 100}%` }}
            />
          ) : editorPreview ? (
            <span className="cn-pol__empty">Add a photo</span>
          ) : null}
        </div>
      </div>
      <img className="cn-pol__frame" src={`${ASSET}/polaroid-${side}-frame.webp`} alt="" width={1000} height={1000} />
      {side === "right" ? (
        <div className="cn-pol__heart" aria-hidden>
          <img src={`${ASSET}/heart-sticker.webp`} alt="" />
        </div>
      ) : null}
    </div>
  );
}

/** First two gallery photos. One photo shows one polaroid; none hides the row (the builder shows empty frames). */
export default function Polaroids({ items, editorPreview }: { items: GalleryItem[]; editorPreview: boolean }) {
  const photos = items.filter((i) => i.image?.masterUrl).slice(0, 2);
  if (!photos.length && !editorPreview) return null;
  const count = editorPreview ? 2 : photos.length;
  return (
    <>
      <Polaroid side="left" item={photos[0]} editorPreview={editorPreview} />
      {count > 1 ? <Polaroid side="right" item={photos[1]} editorPreview={editorPreview} /> : null}
    </>
  );
}
