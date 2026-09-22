import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/pages/home/components/Navbar";
import AuthModal from "@/pages/home/components/AuthModal";
import CreateEventModal from "@/pages/account/components/CreateEventModal";
import FloatingTemplateSamples from "./components/FloatingTemplateSamples";

// The stable, ALWAYS-the-same landing page for the main nav's "Build
// Your Website" — never a conditional redirect. It always shows the same
// "what do you want to build today?" starting point; it does not try to
// guess whether to skip you straight into an existing draft or a picker.
// If you already have events in progress, that's a short pointer here,
// not a full chooser — continuing/managing an existing draft happens in
// the account profile's Website tab (see WebsiteSection), not on this
// page. See docs/template-builder-decisions.md.
export default function BuildLandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSignedIn(Boolean(session));
      if (!session) return;

      const [ownEvents, memberEvents] = await Promise.all([
        supabase.from("events").select("id").eq("owner_id", session.user.id),
        supabase.from("event_members").select("events(id)").eq("profile_id", session.user.id),
      ]);
      setEventCount(
        (ownEvents.data ?? []).length + (memberEvents.data ?? []).filter((r) => r.events).length
      );
    })();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <div className="container-x py-24 flex flex-col items-center text-center">
        <p className="eyebrow mb-3">Build Your Website</p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold" style={{ color: "var(--ink)" }}>
          What do you want to build today?
        </h1>
        <p className="mt-3 max-w-md mx-auto" style={{ color: "var(--slate)" }}>
          A wedding, a birthday, an anniversary, or any celebration — start with a design and make
          it your own.
        </p>

        {signedIn === false ? (
          <button onClick={() => setAuthOpen(true)} className="btn btn-primary mt-8">
            Sign In to Get Started
          </button>
        ) : (
          <button
            onClick={() => setCreatingEvent(true)}
            className="mt-8 px-8 py-3.5 rounded-full text-[15px] font-semibold"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            + Create a New Event
          </button>
        )}

        {signedIn && eventCount > 0 ? (
          <p className="mt-6 text-[13px]" style={{ color: "var(--slate)" }}>
            Continuing something you already started?{" "}
            <Link
              to="/account"
              state={{ section: "website" }}
              className="font-medium underline"
              style={{ color: "var(--ink)" }}
            >
              Go to your profile &rarr;
            </Link>
          </p>
        ) : null}
      </div>

      {/* Floating samples live in their own section below the hero
          content, not overlapping the text — plenty of room here, and
          nothing to fight for z-index/readability against. */}
      <div className="relative overflow-hidden" style={{ height: 320 }}>
        <FloatingTemplateSamples />
      </div>

      {authOpen ? <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} /> : null}
      {creatingEvent ? (
        <CreateEventModal
          onClose={() => setCreatingEvent(false)}
        />
      ) : null}
    </div>
  );
}
