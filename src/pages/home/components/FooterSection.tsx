import { Link, useNavigate } from "react-router-dom";
import { goTo } from "@/lib/goTo";
import { FACEBOOK_URL, INSTAGRAM_URL, MESSENGER_URL } from "@/lib/social";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Services",
    links: [
      { label: "Milestone Events Website", to: "/services/milestone" },
      { label: "Monogram Design", to: "/services/monogram" },
      { label: "Digital Save the Date", to: "/services/save-the-date" },
      { label: "Stationery Design", to: "/services/stationery" },
      { label: "RSVP Management", to: "/services/rsvp" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Collections", to: "/collections" },
      { label: "Our work", to: "/portfolio" },
      { label: "FAQ", to: "/faqs" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    title: "Studio",
    links: [
      { label: "Start a Project", to: "/enquire#start" },
      { label: "Contact us", to: "/contact" },
      { label: "Build your own website", to: "/build" },
      { label: "Mesa: free seating charts", to: "/tools/seating-chart-maker" },
      { label: "For coordinators", to: "/partners" },
      { label: "For creators", to: "/partners?type=creator" },
    ],
  },
];

export default function FooterSection() {
  const navigate = useNavigate();
  return (
    <footer style={{ background: "var(--ink)" }} className="text-white/80">
      <div className="container-x pt-12 pb-6 md:pt-20 md:pb-10">
        <div className="grid gap-8 md:gap-12 md:grid-cols-[1.2fr_2fr]">
          <div>
            <img
              src="/brand/logotype-white.png"
              alt="The RSVP Studio"
              className="h-10 w-auto md:h-12"
            />
            <p className="mt-4 max-w-xs font-display text-[17px] italic leading-snug text-white/90 md:mt-5">
              Your celebration is our celebration, too.
            </p>
            {/* on a phone the email and the icons share a row */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 md:block">
            <a
              href="mailto:hello@thersvpstudio.com"
              className="inline-block py-2 text-[15px] md:mt-3 md:text-sm text-white/80 underline underline-offset-4 [overflow-wrap:anywhere] hover:text-white"
            >
              hello@thersvpstudio.com
            </a>
            <div className="-mr-2.5 flex gap-1 text-xl md:mt-4 md:-ml-2.5 md:mr-0">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center hover:text-white">
                <i className="ri-instagram-line" />
              </a>
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-11 w-11 place-items-center hover:text-white">
                <i className="ri-facebook-circle-line" />
              </a>
              <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" aria-label="Message us on Messenger" className="grid h-11 w-11 place-items-center hover:text-white">
                <i className="ri-messenger-line" />
              </a>
            </div>
            </div>
          </div>

          {/* a phone: each list folds into a row that opens on tap */}
          <div className="md:hidden">
            {COLUMNS.map((col) => (
              <details key={col.title} className="group border-t border-white/10 last:border-b">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70 [&::-webkit-details-marker]:hidden">
                  {col.title}
                  <i className="ri-arrow-down-s-line text-xl transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="pb-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button onClick={() => goTo(navigate, l.to)} className="block w-full py-2.5 text-left text-[15px] text-white/75 hover:text-white">
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-3 md:gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => goTo(navigate, l.to)}
                        className="inline text-left text-sm text-white/70 transition-colors hover:text-white"
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-1 text-[13px] text-white/60 md:mt-12 md:border-t md:border-white/10 md:pt-6 md:text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0 sm:gap-4">
            <span>© 2026 The RSVP Studio</span>
            <span className="flex gap-4">
              <Link to="/privacy" className="inline-block py-2.5 underline underline-offset-4 hover:text-white sm:py-0">
                Privacy Policy
              </Link>
              <Link to="/terms" className="inline-block py-2.5 underline underline-offset-4 hover:text-white sm:py-0">
                Terms of Service
              </Link>
            </span>
          </div>
          <p>
            Made with love by{" "}
            <a
              href="https://hunacreatives.com"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 underline underline-offset-4 hover:text-white"
            >
              Huna Creatives
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
