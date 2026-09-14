import { Reveal } from "@/lib/Reveal";
import { IG_PROFILE, IG_POSTS } from "./instagram-data";

export default function InstagramStrip() {
  const posts = IG_POSTS.slice(0, 6);

  return (
    <section className="py-20 md:py-24" style={{ background: "var(--warm-white)" }}>
      <div className="container-x text-center">
        <Reveal as="p" className="eyebrow flex items-center justify-center gap-2">
          <i className="ri-instagram-line text-base" />
          Follow Along on Instagram
        </Reveal>
        <Reveal delay={0.05}>
          <a
            href={IG_PROFILE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-display text-2xl md:text-3xl font-semibold tracking-[-0.01em] text-[var(--ink)] hover:text-[var(--acc-blue)] transition-colors"
          >
            @{IG_PROFILE.handle}
          </a>
        </Reveal>
      </div>

      <div className="container-x mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {posts.map((post, i) => (
          <Reveal key={post.url} delay={i * 0.05}>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-xl aspect-[4/5]"
              aria-label={post.caption}
            >
              <img
                src={post.img}
                alt={post.caption}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 grid place-items-center bg-[rgba(0,7,39,0.35)] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <i className="ri-instagram-line text-2xl" />
              </span>
            </a>
          </Reveal>
        ))}
      </div>

      <div className="container-x mt-10 text-center">
        <a
          href={IG_PROFILE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
        >
          View Profile
        </a>
      </div>
    </section>
  );
}
