import { Link, Navigate, useParams } from "react-router-dom";
import { GUIDES } from "../help-data";

export default function GuidePage() {
  const { slug } = useParams();
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return <Navigate to="/account/help" replace />;
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <article className="max-w-3xl">
      <Link to="/account/help" className="mb-5 inline-flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
        <i className="ri-arrow-left-line" /> Help &amp; Support
      </Link>
      <p className="eyebrow">Guide</p>
      <h1 className="mt-2 font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--ink)] md:text-[3rem]">{guide.title}</h1>
      <p className="mt-3 text-[18px] text-[var(--slate)]">{guide.summary}</p>

      <div className="mt-10 space-y-8">
        {guide.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">{s.heading}</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-[var(--ink)]/80">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-14 border-t border-[var(--line)] pt-8">
        <p className="text-[14px] font-semibold uppercase tracking-[0.1em] text-[var(--slate)]">More guides</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {others.map((g) => (
            <Link key={g.slug} to={`/account/help/guides/${g.slug}`} className="rounded-full border border-[var(--ink)] px-4 py-1.5 text-[14px] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white">
              {g.title}
            </Link>
          ))}
          <Link to="/account/help/contact" className="rounded-full bg-[var(--acc-blue)] px-4 py-1.5 text-[14px] text-white">
            Still stuck? Contact support
          </Link>
        </div>
      </div>
    </article>
  );
}
