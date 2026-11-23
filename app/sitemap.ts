import { MetadataRoute } from 'next';

/**
 * Dynamic sitemap generation for AudioBlocks (#629, #860).
 *
 * Includes public pages and dynamically generated routes for artists and songs.
 * Static pages are always included; dynamic content would require API integration.
 *
 * #860 — previously listed `/dashboard` and `/login`, which `robots.txt`
 * disallows and (for `/dashboard`) `middleware.ts` redirects guests away from;
 * submitting disallowed or auth-gated URLs just wastes crawl budget and shows
 * up as warnings in Search Console, so they're replaced with the site's
 * actual public, crawlable pages.
 *
 * #860 — `baseUrl` also used to strip the API suffix with a plain
 * `.replace('/api', '')`, which matches the *first* occurrence of that
 * substring. For an API host that itself starts with "api." (e.g.
 * `https://api.audioblocks.xyz/api`), that's the `/api` right after the
 * `https:/` prefix, not the trailing one — corrupting every URL in the
 * sitemap (`https:/.audioblocks.xyz/api/...`). Anchoring the pattern to the
 * end of the string fixes that.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || 'https://audioblocks.xyz';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/marketPlace`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/artist-hub`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/collective`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/quality-standards`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Note: For dynamic artist/song pages, you would fetch from your API:
  // const artists = await fetch(`${baseUrl}/api/artists`).then(r => r.json());
  // const artistPages = artists.map(artist => ({
  //   url: `${baseUrl}/artist/${artist.slug}`,
  //   lastModified: artist.updatedAt,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.7,
  // }));

  return [...staticPages];
}
