import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * We ask other crawlers to respect the same boundaries we respect ourselves:
 * no admin, no saved lists, no download endpoints, and no search result pages —
 * those are views of the library, not documents.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/resources/saved', '/resources/search', '/search?', '/dashboard'],
    }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
