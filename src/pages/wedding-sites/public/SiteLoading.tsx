// What a guest sees while their invitation loads (often on slow mobile data):
// a quiet, brand-neutral pulse — no RSVP Studio artwork, since the page is
// the host's, not ours. It only appears after a short delay so fast loads
// don't flash it.

const CSS = `
.rs-site-loading{min-height:100vh;min-height:100svh;display:grid;place-items:center;background:#fdfcf9;}
.rs-site-loading span{width:10px;height:10px;border-radius:50%;background:#b9b4ab;opacity:0;
  animation:rs-site-loading-in .3s ease-out .4s forwards, rs-site-loading-pulse 1.4s ease-in-out .7s infinite;}
@keyframes rs-site-loading-in{to{opacity:.6}}
@keyframes rs-site-loading-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.6);opacity:.25}}
@media (prefers-reduced-motion:reduce){.rs-site-loading span{animation:rs-site-loading-in .3s ease-out .4s forwards;}}
`;

export default function SiteLoading() {
  return (
    <div className="rs-site-loading" role="status" aria-label="Loading the invitation">
      <style>{CSS}</style>
      <span />
    </div>
  );
}
