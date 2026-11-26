import { useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import { photoFit } from "../shared/photoFit";
import type { ImageAsset } from "../../content/types";

// Love Letter's own pieces: the open envelope holding a photo in an oval mat, a
// striped name card and a scalloped date card, the ivory wax seal; a leaf sprig
// ornament; and the countdown.
//
// The paper pieces and the seal are Cycles renders (~/rsvp-teaser/loveletter:
// ll_render.py → post.py → /public/event-templates/love-letter). The envelope and
// cards render in neutral grey (flat paper = 50%) and are tinted here with the
// palette colour (hard-light), so every palette still works; the mat and the seal
// are always ivory, so they're full colour. Text (names, date, monogram) stays live.

/** A small olive sprig, used between sections. */
export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg className={`ll-sprig ${className}`} viewBox="0 0 120 28" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M14 14 H106" strokeOpacity=".35" />
        <path d="M60 22 C60 16 60 11 60 5" />
        <path d="M60 12 C55 11 52 8 52 4 C56 4 59 7 60 12 Z M60 17 C65 16 68 13 68 9 C64 9 61 12 60 17 Z" fill="currentColor" fillOpacity=".35" />
      </g>
    </svg>
  );
}

export const ART = "/event-templates/love-letter/";
/** Every rendered file, seal first (the intro shows it); preloaded while the intro is up. */
export const ART_FILES = ["seal_sprig", "pocket", "back", "namecard", "datecard", "mat", "seal_plain"].map((f) => `${ART}${f}.webp`);

/**
 * Keeps the names inside the square card: if they overflow (long names wrap onto more lines,
 * or one long word is wider than the card), shrink the type (--fit, 0.4–1) until they fit.
 */
function useFitText(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // names are centred (their boxes shrink to the text), so measure them against the card's
    // inner width, not their own box
    const fits = () => {
      const cs = getComputedStyle(el);
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return (
        el.scrollHeight <= el.clientHeight + 1 &&
        [...el.querySelectorAll<HTMLElement>(".ll-namecard__name")].every((n) => n.scrollWidth <= room + 1)
      );
    };
    const run = () => {
      el.style.setProperty("--fit", "1");
      if (fits()) return;
      let lo = 0.4, hi = 1;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        el.style.setProperty("--fit", String(mid));
        if (fits()) lo = mid;
        else hi = mid;
      }
      el.style.setProperty("--fit", String(lo));
    };
    run();
    // the script face may arrive after the first layout; type in cqw scales with the card, so
    // only content and font changes need a re-fit
    let live = true;
    document.fonts?.ready.then(() => live && run());
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/**
 * A rendered paper piece in the palette's colour: the render's alpha cuts the shape, its grey
 * shading (paper grain, bevelled edges, shadows) lights whatever is drawn inside it.
 */
function Lit({ map, className = "", children, boxRef }: { map: string; className?: string; children?: ReactNode; boxRef?: Ref<HTMLDivElement> }) {
  const url = `url("${ART}${map}.webp")`;
  return (
    <div ref={boxRef} className={`ll-lit ${className}`} style={{ WebkitMaskImage: url, maskImage: url }}>
      {children}
      <img className="ll-lit__map" src={`${ART}${map}.webp`} alt="" aria-hidden draggable={false} />
    </div>
  );
}

/** The ivory wax seal (rendered), with the couple's monogram pressed into its open field. */
export function LLSeal({ text, sprig = false, className = "" }: { text: string; sprig?: boolean; className?: string }) {
  const n = text.replace(/\s+/g, "").length;
  return (
    <span className={`ll-seal${sprig ? " ll-seal--sprig" : ""} ${className}`} aria-hidden>
      <img src={`${ART}seal_${sprig ? "sprig" : "plain"}.webp`} alt="" draggable={false} />
      {text ? (
        <span className="ll-seal__mono" style={{ fontSize: `${(n <= 2 ? 19 : n <= 3 ? 16 : n <= 4 ? 13 : 10) * (sprig ? 0.74 : 1)}cqw` }}>
          {text}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The photo in a bevelled oval mat (or the monogram, when there's no photo). The photo is a real
 * <img> under the mat (not an SVG <image>): it crops at the host's exact focal point and zoom via
 * photoFit, and the builder's on-page Adjust/Replace tools, which look for <img>, can find it.
 */
function OvalMat({ photo, mono }: { photo?: Pick<ImageAsset, "masterUrl" | "focalPoint" | "zoom" | "alt">; mono: string }) {
  return (
    <div className="ll-oval">
      {photo ? (
        <div className="ll-oval__photo">
          <img src={photo.masterUrl} alt={photo.alt ?? ""} draggable={false} style={photoFit(photo)} />
        </div>
      ) : (
        <div className="ll-oval__photo ll-oval__photo--mono">
          <span style={{ fontSize: mono.length > 3 ? "17cqw" : "25cqw" }}>{mono}</span>
        </div>
      )}
      <img className="ll-oval__mat" src={`${ART}mat.webp`} alt="" aria-hidden draggable={false} />
    </div>
  );
}

/**
 * The open envelope with the invitation pieces tucked inside: the photo in its
 * oval mat (left), the striped name card (back right), the scalloped date card
 * (front left), the pocket, and the wax seal on the pocket's point.
 */
export function EnvelopeStack({ names, date, mono, photo, editorHint }: { names: string[]; date: string | null; mono: string; photo?: ImageAsset; editorHint?: boolean }) {
  const cardRef = useFitText([names.join("|"), editorHint]);
  return (
    <div className="ll-stack" aria-label={names.join(" & ")}>
      <div className="ll-stack__env ll-stack__env--back">
        <Lit map="back" className="ll-env" />
      </div>
      <div className="ll-stack__namecard">
        <Lit map="namecard" className="ll-namecard" boxRef={cardRef}>
          <p className="ll-namecard__kicker">Save the date</p>
          {names.length ? (
            names.map((n, i) => (
              <span key={i}>
                {i ? <span className="ll-namecard__amp">&amp;</span> : null}
                <span className="ll-namecard__name">{n}</span>
              </span>
            ))
          ) : (
            <span className="ll-namecard__name ll-hint">{editorHint ? "Your names" : ""}</span>
          )}
        </Lit>
      </div>
      <div className="ll-stack__oval">
        <OvalMat photo={photo} mono={mono} />
      </div>
      {date ? (
        <div className="ll-stack__date">
          <Lit map="datecard" className="ll-datecard">
            <span className="ll-datecard__text">{date}</span>
          </Lit>
        </div>
      ) : null}
      <div className="ll-stack__env ll-stack__env--front">
        <Lit map="pocket" className="ll-env" />
      </div>
      <div className="ll-stack__seal">
        <LLSeal text={mono} />
      </div>
    </div>
  );
}

