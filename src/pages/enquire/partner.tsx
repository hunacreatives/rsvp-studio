import { Link, useLocation, useNavigate } from "react-router-dom";
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

// /partners: who it's for and what they get, with one thing to do.
//   Planners & coordinators: sign up as a coordinator (free, instant: Home becomes their
//   clients), and here are the perks. Earning as a partner is one of them, applied for from
//   inside their account (/account/partner), so Studio → Leads always sees a real account.
//   Creators (?type=creator): the partner program on its own; sign up, then apply.
// Vendors and collaborations write in through /contact.

const COORDINATOR_PATH = "/account?as=coordinator";
const APPLY_PATH = "/account/partner?type=creator";

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
  const { search } = useLocation();
  const forCreators = new URLSearchParams(search).get("type") === "creator";
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
  // Creators: applying happens in their account.
  const applyLabel = visitor?.partner
    ? "Open your partner dashboard"
    : visitor
      ? "Apply"
      : "Sign up to apply";
  const startApply = async () => {
    trackEvent("partner_apply_start", { type: "creator" });
    const { data } = await supabase.auth.getSession();
    navigate(
      data.session
        ? APPLY_PATH
        : `/?auth=signup&next=${encodeURIComponent(APPLY_PATH)}`,
    );
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />

      <main style={{ background: "var(--warm-white)" }}>
        <section className="pb-4 pt-16 text-center md:pt-28">
          <div className="container-x mx-auto max-w-3xl">
            {forCreators ? <p className="eyebrow">Earn with us</p> : null}
            <h1
              className={`${forCreators ? "mt-4 " : ""}font-display font-semibold tracking-[-0.02em] text-[var(--ink)] text-balance`}
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {forCreators
                ? "Share your code. Earn up to 20%."
                : "For coordinators"}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-[var(--slate)] md:text-[17px]">
              {forCreators
                ? `For creators, venues and vendors who send couples our way. The people you send get 10% off their event website or package, and you earn ${RATES}.`
                : (
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
                onClick={forCreators ? startApply : startCoordinator}
                className="btn btn-primary"
              >
                {forCreators ? applyLabel : coordinatorLabel}
              </button>
            </div>
            <p className="mt-4 text-[14px] text-[var(--slate)]">
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
                  Creator, venue or vendor? Earn with us
                </Link>
              )}
            </p>
            {forCreators ? (
              <CharacterTrio className="mx-auto mt-8 w-[200px] md:w-[240px]" />
            ) : null}
          </div>
        </section>

        {forCreators ? (
          <section className="pb-24 pt-12">
            <div className="container-x mx-auto max-w-5xl">
              <TierCards />
              <p className="mt-6 text-center text-[14px] text-[var(--slate)]">
                Sign up, then apply from your account. We’ll set up a
                short&nbsp;call.
              </p>
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
                      Earn with us
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
