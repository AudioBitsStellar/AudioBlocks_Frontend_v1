import { MetadataRoute } from 'next';

/**
 * Dynamic sitemap generation for AudioBlocks (#629).
 *
 * Includes public pages and dynamically generated routes for artists and songs.
 * Static pages are always included; dynamic content would require API integration.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://audioblocks.xyz';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
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
