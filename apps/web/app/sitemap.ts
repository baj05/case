import type { MetadataRoute } from 'next';
import { databaseReady, publishedResourceSlugs, getResourceCategories, getResourceKits, getResourceCentres } from '@/lib/data';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Sitemap.
 *
 * Only genuinely public, genuinely populated pages are listed. In particular:
 * a resource is included only when it is published, a category only when it
 * holds something, and search result pages never — a filtered view of a library
 * is not the canonical home of any document, and listing thousands of them is
 * the thin-programmatic-SEO mistake the brief warns against (spec §60, §61).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const stat: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/resources`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/resources/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/matters`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/practice-areas`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE}/courts`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/forums`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/judges`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/bar-councils`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  if (!databaseReady()) return stat;

  const resources = publishedResourceSlugs().map((r) => ({
    url: `${BASE}/resources/${r.slug}`,
    lastModified: new Date(r.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const categories = getResourceCategories()
    .filter((c) => c.resourceCount > 0)
    .map((c) => ({
      url: `${BASE}/resources/category/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

  const kits = getResourceKits().map((k) => ({
    url: `${BASE}/resources/kits/${k.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const centres = getResourceCentres().map((c) => ({
    url: `${BASE}/resources/centres/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...stat, ...categories, ...kits, ...centres, ...resources];
}
