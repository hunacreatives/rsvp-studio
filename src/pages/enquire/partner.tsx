import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { scrollToTopNow } from "@/lib/lenis";
import { supabase } from "@/lib/supabase";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import { CharacterTrio } from "@/components/CharacterLoader";
import { PARTNER_TIERS } from "@/pages/partners/tiers";
import { trackEvent } from "@/lib/analytics";
import { useVisitor } from "@/pages/partners/visitor";
import TierCards from "@/pages/partners/TierCards";
import { ApplyForm } from "@/pages/partners/apply";

// /partners: who it's for and what they get, with one thing to do.
//   Planners & coordinators: sign up as a coordinator (free, instant: Home becomes their
//   clients), and here are the perks. Earning as a partner is one of them, applied for from
//   inside their account (/account/partner), so Studio → Leads always sees a real account.
//   Creators (?type=creator): the partner program on its own; sign up, then apply.
//   /creators: the same, as an invitation to share (?to=Name greets them by name; the link's
//   preview is set by api/invite-page.ts, which uses the same name rule).
// Vendors and collaborations write in through /contact.

const COORDINATOR_PATH = "/account?as=coordinator";

/** The name from an invite link (?to=Maria): letters, spaces and . ' - only, at most 40. */
export const inviteName = (search: string) =>
  (new URLSearchParams(search).get("to") ?? "").replace(/[^\p{L}\p{M}\s.'’-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);

// "10% from your first paying client, 15% after 5, 20% after 15"
const RATES = PARTNER_TIERS.map((t) =>
  t.at
    ? `${t.rate}% after ${t.at}`
    : `${t.rate}% from your first paying client`,
).join(", ");

const PERKS = [
  {
    icon: "ri-team-line",
    title: "Every client in one place",
    desc: "Who’s replied, what isn’t live yet and what’s next, with this week’s events first.",
  },
  {
    icon: "ri-key-2-line",
    title: "Set it up, then hand it over",
    desc: "Build their website and guest list. When it’s ready, send it to your client. They pay, and you stay on as their coordinator.",
  },
  {
    icon: "ri-gift-line",
    title: "Free for coordinators",
    desc: "Up to 10 clients at a time before you hand them over.",
  },
];

export default function PartnerInquiry() {
  const { search, pathname } = useLocation();
  const invite = pathname.replace(/\/$/, "") === "/creators";
  const forCreators = invite || new URLSearchParams(search).get("type") === "creator";
  const to = invite ? inviteName(search) : "";
  // Coordinators ↔ creators is the same page with ?type=creator, so ScrollToTop (pathname
  // only) doesn't fire: start the other version at the top.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    scrollToTopNow();
  }, [forCreators]);
  const navigate = useNavigate();
  const { visitor } = useVisitor();

  // The one button, for where they are. New → sign up, then "Add a client" opens. Signed in →
  // "Add a client" (no mode to turn on: having a client puts them on Home). Already has clients →
  // their dashboard.
  const coordinatorLabel = visitor?.coordinator
    ? "Go to your dashboard"
    : visitor
      ? "Add a client"
      : "Sign up as a coordinator";
  const startCoordinator = async () => {
    trackEvent("coordinator_signup_start", {});
    if (visitor?.coordinator) return navigate("/account");
    const { data } = await supabase.auth.getSession();
    navigate(
      data.session
        ? "/account?new=client"
        : `/?auth=signup&next=${encodeURIComponent(COORDINATOR_PATH)}`,
    );
  };
  // Creators: the short form is right here (no account needed; approval makes their account).
  const [sentTo, setSentTo] = useState<string | null>(null);
  const toForm = () => {
    trackEvent("partner_apply_start", { type: "creator" });
    document
      .getElementById("apply")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const applyLabel = visitor?.partner ? "Open your partner dashboard" : "Apply";

  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main style={{ background: "var(--warm-white)" }}>
        <section className="pb-4 pt-16 text-center md:pt-28">
          <div className="container-x mx-auto max-w-3xl">
            {forCreators ? <p className="eyebrow">{invite ? (to ? `${to}, you’re invited` : "You’re invited") : "Creator program"}</p> : null}
            <h1
              className={`${forCreators ? "mt-4 " : ""}font-display font-semibold tracking-[-0.02em] text-[var(--ink)] text-balance`}
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {invite
                ? "Be one of our first creators."
                : forCreators
                  ? "Share your code. Earn up to 20%."
                  : "For coordinators"}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-[var(--slate)] md:text-[17px]">
              {forCreators ? (
                `For creators, venues and vendors who send couples our way. The people you send get 10% off their event website or package, and you earn ${RATES}.`
              ) : (
                <>
                  Run every client’s event from one free dashboard,{" "}
                  <br className="hidden sm:inline" />
                  and earn up to 20% from the clients you&nbsp;bring.
                </>
              )}
            </p>
            <div className="mt-7">
              <button
                type="button"
                onClick={
                  forCreators
                    ? visitor?.partner
                      ? () => navigate("/account/partner")
                      : toForm
                    : startCoordinator
                }
                className="btn btn-primary"
              >
                {forCreators ? applyLabel : coordinatorLabel}
              </button>
            </div>
            {/* (the invitation keeps to the one thing: applying) */}
            {invite ? null : <p className="mt-4 text-[14px] text-[var(--slate)]">
              {forCreators ? (
                <Link
                  to="/partners"
                  className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-[var(--ink)]"
                >
                  Coordinator? See what you get
                </Link>
              ) : (
                <Link
                  to="/partners?type=creator"
                  className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-[var(--ink)]"
                >
                  Creator or influencer? See the creator program
                </Link>
              )}
            </p>}
            {forCreators ? (
              <CharacterTrio className="mx-auto mt-8 w-[200px] md:w-[240px]" />
            ) : null}
          </div>
        </section>

        {forCreators ? (
          <section className="pb-24 pt-12">
            <div className="container-x mx-auto max-w-5xl">
              <TierCards />
              {/* The application, right on the page we advertise. */}
              <div
                id="apply"
                className="mx-auto mt-14 max-w-xl scroll-mt-24 rounded-[22px] border border-[var(--line)] bg-white p-6 md:p-8"
              >
                {visitor?.partner ? (
                  <div className="text-center">
                    <h2 className="font-display text-[1.5rem] font-semibold text-[var(--ink)]">
                      You’re a partner
                    </h2>
                    <p className="mt-2 text-[15px] text-[var(--slate)]">
                      Your code is {visitor.partner.code}. Your visits, sign-ups
                      and earnings are on your partner&nbsp;dashboard.
                    </p>
                    <Link
                      to="/account/partner"
                      className="btn btn-primary mt-6 inline-flex"
                    >
                      Open your partner dashboard
                    </Link>
                  </div>
                ) : sentTo || visitor?.applied ? (
                  <div className="text-center">
                    <h2 className="font-display text-[1.5rem] font-semibold text-[var(--ink)]">
                      Your application is in
                    </h2>
                    <p className="mt-2 text-[15px] text-[var(--slate)]">
                      We’ll set up a short call. Once you’re approved, we’ll
                      email {sentTo ?? visitor?.email ?? "you"} your code and a
                      link to set up your partner&nbsp;account.
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-[1.5rem] font-semibold text-[var(--ink)]">
                      Apply
                    </h2>
                    <p className="mb-6 mt-1 text-[15px] text-[var(--slate)]">
                      It takes a minute. We’ll set up a short call before
                      you&nbsp;start.
                    </p>
                    <ApplyForm
                      kinds={["creator", "vendor"]}
                      initialKind="creator"
                      account={
                        visitor
                          ? {
                              name: visitor.name || visitor.email.split("@")[0],
                              email: visitor.email,
                            }
                          : null
                      }
                      onSent={(email) => setSentTo(email)}
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* Desktop: what they get on the left, the real dashboard on the right, centred on the list.
                Phones: the dashboard first, then what they get. */}
            <section className="pb-16 pt-14">
              <div className="container-x mx-auto grid max-w-6xl gap-x-14 gap-y-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <h2 className="font-display text-[1.6rem] font-semibold text-[var(--ink)] md:text-[1.9rem] lg:col-start-1 lg:row-start-1">
                  What you get
                </h2>
                <ul className="divide-y divide-[var(--line)] lg:col-start-1 lg:row-start-2">
                  {PERKS.map((p) => (
                    <li key={p.title} className="flex gap-4 py-5">
                      <i
                        className={`${p.icon} mt-0.5 shrink-0 text-[24px] text-[var(--acc-blue)]`}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--ink)]">
                          {p.title}
                        </p>
                        <p className="mt-1 text-balance text-[15px] leading-relaxed text-[var(--slate)]">
                          {p.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Reveal className="order-first mb-4 lg:order-none lg:col-start-2 lg:row-start-2 lg:mb-0 lg:self-center">
                  {/* A real capture of the coordinator dashboard (sample clients), not a mock-up. */}
                  <img
                    src="/partners/desk.webp"
                    alt="The coordinator dashboard: every client, this week’s first, with replies and what’s next for each"
                    width={2264}
                    height={1402}
                    loading="lazy"
                    className="w-full rounded-[22px] border border-[rgba(0,7,39,0.1)] bg-white shadow-[0_18px_50px_-30px_rgba(0,7,39,0.35)]"
                  />
                </Reveal>
              </div>
            </section>

            {/* Earning is one of the perks: what it pays. Applying happens in their dashboard, not here. */}
            <section className="pb-24 pt-4">
              <div className="container-x mx-auto max-w-5xl">
                <div className="mx-auto max-w-2xl text-center">
                  <h2 className="font-display text-[1.9rem] font-semibold text-[var(--ink)] md:text-[2.4rem]">
                    Earn up to 20% as a partner
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--slate)] md:text-[16px]">
                    Your clients get 10% off with your code, and your share
                    grows as more of them book. Apply from your dashboard once
                    you’re set&nbsp;up.
                  </p>
                </div>
                <div className="mt-8">
                  <TierCards />
                </div>
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={startCoordinator}
                    className="btn btn-primary"
                  >
                    {coordinatorLabel}
                  </button>
                  <p className="mt-5 text-[14px] text-[var(--slate)]">
                    Venue or vendor?{" "}
                    <Link
                      to="/partners?type=creator"
                      className="underline underline-offset-4 hover:text-[var(--ink)]"
                    >
                      See the creator program
                    </Link>
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <FooterSection />
    </>
  );
}
