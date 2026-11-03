import { addCacheTag, dangerouslyDeleteByTag } from "@vercel/functions";

// A shared invitation's preview (title, date, cover photo) comes from /invite/<slug>
// (api/invite-page.ts), which Vercel's edge keeps for 5 minutes, and Facebook keeps its first
// look at a link for weeks (Messenger uses the same copy). A link shared before the site was
// live, or before a new cover, would keep showing the old preview. So after every publish
// (api/notify.ts, preview_refresh) the cached page is dropped and Facebook reads the link again
// (Graph API scrape with the app's token: FACEBOOK_APP_ID / FACEBOOK_APP_SECRET).

const tag = (slug: string) => `invite-${slug}`;

/** Marks the invite page's response so refreshPreview can drop it from Vercel's cache. */
export async function tagInvitePage(slug: string) {
  if (slug) await addCacheTag(tag(slug)).catch(() => undefined);
}

export async function refreshPreview(slug: string, urls: string[]) {
  await dangerouslyDeleteByTag(tag(slug)).catch(() => undefined);
  const id = process.env.FACEBOOK_APP_ID;
  const secret = process.env.FACEBOOK_APP_SECRET;
  if (!id || !secret) return { scraped: 0, errors: ["Facebook app not set up"] };
  const errors: string[] = [];
  let scraped = 0;
  await Promise.all(
    urls.map(async (url) => {
      const qs = new URLSearchParams({ id: url, scrape: "true", access_token: `${id}|${secret}` });
      const r = await fetch(`https://graph.facebook.com/?${qs}`, { method: "POST", signal: AbortSignal.timeout(8000) }).catch(() => null);
      if (r?.ok) return void scraped++;
      const why = r ? ((await r.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message : "no answer";
      errors.push(`${url}: ${why ?? r?.status}`);
    }),
  );
  return { scraped, errors };
}
