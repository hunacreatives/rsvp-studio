import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";

// "How did we do?" — opened from the buttons in a support request's resolved email.
// The rating from the link is only pre-selected: nothing is saved until Submit is
// pressed, because email security scanners open every link in an email.

type Rating = "great" | "okay" | "not_good";
const OPTIONS: { value: Rating; emoji: string; label: string }[] = [
  { value: "great", emoji: "😊", label: "Great" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "not_good", emoji: "🙁", label: "Not good" },
];
const isRating = (r: string | null): r is Rating => OPTIONS.some((o) => o.value === r);

export default function RatePage() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const [info, setInfo] = useState<{ ticket: string; topic: string; rating: Rating | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<Rating | null>(isRating(params.get("r")) ? (params.get("r") as Rating) : null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  useEffect(() => {
    if (!token) return setError("This rating link is incomplete.");
    fetch(`/api/support-rating?t=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "This rating link isn’t working.");
        setInfo(j);
        if (j.comment) setComment(j.comment);
        setRating((cur) => cur ?? (isRating(j.rating) ? j.rating : null));
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const submit = async () => {
    if (!rating) return;
    setState("saving");
    const r = await fetch("/api/support-rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, rating, comment }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setState("idle");
      return setError(j.error || "Couldn’t save your rating — please try again.");
    }
    setError(null);
    setState("done");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <main className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20">
        <div className="w-full max-w-md rounded-[20px] bg-white p-7 text-center shadow-[0_10px_40px_rgba(0,7,39,0.06)] md:p-9">
          <p className="eyebrow">{info ? info.ticket : "Support"}</p>
          {state === "done" ? (
            <>
              <h1 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight text-[var(--ink)]">Thank you</h1>
              <p className="mt-3 text-[15px] text-[var(--slate)]">
                {rating === "not_good"
                  ? "We’re sorry it wasn’t better. Someone from the studio will look at this personally."
                  : "Your feedback helps us look after every couple and family we work with."}
              </p>
              <p className="mt-2 text-[13px] text-[var(--slate)]">Changed your mind? You can change your answer for 2 weeks.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn btn-ghost" onClick={() => setState("idle")}>Change rating</button>
                <Link to="/account/help" className="btn btn-primary">Go to Help</Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-3 font-display text-[1.9rem] font-semibold leading-tight text-[var(--ink)]">How did we do?</h1>
              <p className="mt-2 text-[15px] text-[var(--slate)]">
                {info ? `Your request about ${info.topic}` : error ? "" : "Loading your request…"}
              </p>
              {error && !info ? (
                <>
                  <p className="mt-4 text-[15px] text-[var(--ink)]">{error}</p>
                  <Link to="/account/help" className="btn btn-primary mt-6 inline-flex">Go to Help</Link>
                </>
              ) : (
                <>
                  <div className="mt-6 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Your rating">
                    {OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={rating === o.value}
                        onClick={() => setRating(o.value)}
                        className={`rounded-2xl border px-2 py-4 text-[14px] transition ${
                          rating === o.value ? "border-[#1862DD] bg-[#1862DD]/[0.06] text-[var(--ink)]" : "border-black/10 text-[var(--slate)] hover:border-black/25"
                        }`}
                      >
                        <span className="block text-[28px] leading-none">{o.emoji}</span>
                        <span className="mt-2 block font-medium">{o.label}</span>
                      </button>
                    ))}
                  </div>
                  <label className="mt-5 block text-left text-[13px] font-medium text-[var(--ink)]">
                    Anything you’d like to add? <span className="font-normal text-[var(--slate)]">(optional)</span>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2 text-[14px] font-normal outline-none focus:border-[#1862DD]"
                    />
                  </label>
                  {error ? <p className="mt-3 text-[13px] text-red-600">{error}</p> : null}
                  <button type="button" className="btn btn-primary mt-5 w-full justify-center" disabled={!rating || state === "saving"} onClick={submit}>
                    {state === "saving" ? "Sending…" : "Submit"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
