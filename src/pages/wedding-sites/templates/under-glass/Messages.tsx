import { useEffect, useState, type CSSProperties } from "react";
import type { EventContent } from "../../content/types";
import { supabase } from "../../../../lib/supabase";
import { getSitePassword } from "../../public/sitePassword";

// The message wall: what family and friends wrote when they replied and chose "Show my message
// on the website", as letters on whatever paper came to hand: airmail from abroad, a ruled
// pad, a folded card. First names only (supabase/under-glass.sql under_glass_messages(), which
// answers only for a published site whose host left the wall on). The sample, the builder and
// the gallery card show sample letters.

type Letter = { first_name: string; message: string };

const SAMPLE: Letter[] = [
  { first_name: "Carmela", message: "Happy 80th, Ma! Thank you for every Sunday lunch, every prayer, and every time you waited up for us. We love you more than adobo." },
  { first_name: "Paolo", message: "Lola, I’ll be watching from Dubai and singing along. Save me a slice of the cake. Mahal na mahal ka namin." },
  { first_name: "Bea", message: "To the best lola in the world: thank you for teaching me to cook, to pray, and to always bring a jacket." },
  { first_name: "Tito Ben", message: "Ising, sixty years since we met at your Tita’s house in Lipa. You still laugh the same. Maligayang kaarawan." },
  { first_name: "Miguel", message: "Happy birthday Lola! Thank you for the pan de sal every morning when I was little." },
  { first_name: "Ate Joy", message: "From all of us in Toronto: we wish we could hug you today. Next year, we’ll be there. Happy 80th!" },
];

function useWall(content: EventContent, live: boolean, on: boolean) {
  const [letters, setLetters] = useState<Letter[] | null>(live ? null : SAMPLE);
  useEffect(() => {
    if (!live || !on || !content.slug) return;
    let alive = true;
    supabase.rpc("under_glass_messages", { p_slug: content.slug, p_password: getSitePassword(content.slug) || null }).then(({ data, error }) => {
      if (alive) setLetters(error ? [] : ((data as Letter[] | null) ?? []).filter((l) => l.message?.trim()));
    });
    return () => {
      alive = false;
    };
  }, [live, on, content.slug]);
  return letters;
}

const PAPERS = ["airmail", "pad", "card", "pad", "airmail", "card"] as const;
const TILT = [-1.4, 1.1, -0.6, 1.6, -1.1, 0.7];
const SHOWN = 9;

export default function Messages({ content, live, editorPreview, honoree, onWrite }: { content: EventContent; live: boolean; editorPreview: boolean; honoree: string; onWrite: () => void }) {
  const letters = useWall(content, live, true);
  const [all, setAll] = useState(false);
  if (!letters) return null;
  const shown = all ? letters : letters.slice(0, SHOWN);
  return (
    <div className="ug-wall">
      {letters.length ? (
        <ul className="ug-letters">
          {shown.map((l, i) => (
            <li key={i} className={`ug-letter ug-letter--${PAPERS[i % PAPERS.length]}`} data-reveal style={{ ["--tilt" as string]: `${TILT[i % TILT.length]}deg`, ["--i" as string]: i % 3 } as CSSProperties}>
              <p className="ug-letter__text">{l.message}</p>
              <p className="ug-letter__from">{l.first_name}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ug-text ug-tag" style={{ textAlign: "center" }}>
          Be the first to write {honoree ? `to ${honoree}` : "a message"}.
        </p>
      )}
      {!all && letters.length > SHOWN ? (
        <p style={{ textAlign: "center", margin: "18px 0 0" }}>
          <button type="button" className="ug-btn ug-btn--paper" onClick={() => setAll(true)}>
            Read all {letters.length} messages
          </button>
        </p>
      ) : null}
      {editorPreview ? <p className="ug-small ug-tag" style={{ textAlign: "center" }}>Sample messages. Guests’ own appear here once they reply and choose to share them.</p> : null}
      <p style={{ textAlign: "center", margin: "26px 0 0" }}>
        <button type="button" className="ug-btn ug-btn--paper" onClick={onWrite}>
          {honoree ? `Write to ${honoree}` : "Leave a message"}
        </button>
      </p>
    </div>
  );
}
