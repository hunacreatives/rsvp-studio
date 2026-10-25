import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/pages/home/components/Navbar";
import { acceptEventInvite, type JoinProblem } from "./portal/api";
import type { EventAccess } from "./portal/types";

// /account/join?t=…&r=… — the "Accept the invite" button in an event invite email (api/notify.ts,
// kind event_invite; r is the role it's for, only to pick the words). Signed out: log in or create
// the account first, then back here. Signed in: join the event as the invite says, then open it.
// A coordinator, or a client taking over their event (coordinator-desk.sql), is welcomed first.

const WELCOME: Partial<Record<EventAccess, { title: string; invited: string; joined: string; open: string }>> = {
  coordinator: {
    title: "Welcome, coordinator",
    invited: "You’re invited to help with an event: its website, guests, seating and check-in on the day.",
    joined: "You can edit the website, guests and seating, and run check-in on the day. Billing stays with your client. Their event is under Clients.",
    open: "Open the event",
  },
  owner: {
    title: "Your event is ready",
    invited: "Your coordinator set it up for you. Take it over to own it and handle payments from here on.",
    joined: "It’s yours now, payments included. Your coordinator stays on to help with guests, seating and the\u00a0day.",
    open: "Open your event",
  },
};

const PROBLEM: Record<Exclude<JoinProblem, "SIGN_IN">, { title: string; body: string }> = {
  OTHER_EMAIL: { title: "This invite is for another email", body: "Log in with the email address the invite was sent to." },
  EXPIRED: { title: "This invite has expired", body: "Invites work for 14 days. Ask them to send you a new one." },
  USED: { title: "This invite was already used", body: "If that wasn’t you, ask them to send you a new one." },
  NOT_FOUND: { title: "This invite isn’t open anymore", body: "It may have been cancelled. Ask them to send you a new one." },
  ERROR: { title: "That didn’t work", body: "Please try again in a moment, or message us at hello@thersvpstudio.com." },
};

export default function AccountJoin() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const email = params.get("e") ?? "";
  const asked = WELCOME[params.get("r") as EventAccess];
  const [joined, setJoined] = useState<{ eventId: string; role: EventAccess } | null>(null);
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [problem, setProblem] = useState<Exclude<JoinProblem, "SIGN_IN"> | null>(token ? null : "NOT_FOUND");
  const tried = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMe(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setMe(session?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!me || !token || tried.current) return;
    tried.current = true;
    acceptEventInvite(token).then((r) => {
      if ("eventId" in r) {
        if (WELCOME[r.role]) setJoined(r);
        else navigate(`/account/projects/${r.eventId}`, { replace: true });
      }
      else if (r.problem === "SIGN_IN") setMe(null);
      else setProblem(r.problem);
    });
  }, [me, token, navigate]);

  const here = `/account/join?t=${encodeURIComponent(token)}${email ? `&e=${encodeURIComponent(email)}` : ""}${params.get("r") ? `&r=${encodeURIComponent(params.get("r")!)}` : ""}`;
  const auth = (mode: "signin" | "signup") => navigate(`/?auth=${mode}${email ? `&email=${encodeURIComponent(email)}` : ""}&next=${encodeURIComponent(here)}`);
  const switchAccount = async () => {
    await supabase.auth.signOut();
    tried.current = false;
    setProblem(null);
    auth("signin");
  };

  const p = problem ? PROBLEM[problem] : null;
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <div className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          {joined ? (
            <>
              <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
                {WELCOME[joined.role]!.title}
              </h1>
              <p className="mt-3 text-[16px] md:text-[15px]" style={{ color: "var(--slate)" }}>
                {WELCOME[joined.role]!.joined}
              </p>
              <button onClick={() => navigate(`/account/projects/${joined.eventId}`, { replace: true })} className="btn btn-primary mt-8 w-full">
                {WELCOME[joined.role]!.open}
              </button>
            </>
          ) : p ? (
            <>
              <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
                {p.title}
              </h1>
              <p className="mt-3 text-[16px] md:text-[15px]" style={{ color: "var(--slate)" }}>
                {p.body}
                {problem === "OTHER_EMAIL" && me ? ` You’re logged in as ${me}. Only one account? Ask whoever invited you to send it again to ${me}.` : ""}
              </p>
              <div className="mt-8 flex flex-col gap-3">
                {problem === "OTHER_EMAIL" ? (
                  <button onClick={switchAccount} className="btn btn-primary w-full">
                    Log in with another email
                  </button>
                ) : null}
                <button onClick={() => navigate("/account")} className="min-h-[44px] rounded-xl px-5 py-2.5 text-[15px] font-medium" style={{ border: "1px solid var(--line)", color: "var(--ink)" }}>
                  Go to my dashboard
                </button>
              </div>
            </>
          ) : me === null ? (
            <>
              <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
                {asked?.title ?? "You’re invited to an event"}
              </h1>
              {asked ? (
                <p className="mt-3 text-[16px] md:text-[15px]" style={{ color: "var(--ink)" }}>
                  {asked.invited}
                </p>
              ) : null}
              <p className="mt-3 text-[16px] md:text-[15px]" style={{ color: "var(--slate)" }}>
                Log in or create your account{email ? (
                  <>
                    {" "}with <strong style={{ color: "var(--ink)" }}>{email}</strong>
                  </>
                ) : null}
                , then you’ll come right back here.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <button onClick={() => auth("signup")} className="btn btn-primary w-full">
                  Create my account
                </button>
                <button onClick={() => auth("signin")} className="min-h-[44px] rounded-xl px-5 py-2.5 text-[15px] font-medium" style={{ border: "1px solid var(--line)", color: "var(--ink)" }}>
                  I already have an account
                </button>
              </div>
            </>
          ) : (
            <p className="text-[16px]" style={{ color: "var(--slate)" }}>
              Opening your invite…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
