import type { Metadata } from 'next';
import {
  databaseReady, getAllMarketplaceListings, getMarketplaceCities, MARKETPLACE_CATEGORIES,
} from '@/lib/data';
import { Notice } from '@/components/States';
import { MarketplaceApp } from '@/components/MarketplaceApp';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace — book a specific legal service',
  description:
    'Browse discrete legal services by category, price and distance — a document drafted, a notarisation, '
    + 'an urgent consultation — rather than searching for an advocate first.',
  alternates: { canonical: '/marketplace' },
};

export default async function MarketplacePage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const listings = getAllMarketplaceListings();
  const cities = getMarketplaceCities();

  return (
    <div className="stack gap-6">
      <div className="container" style={{ paddingTop: 20 }}>
        <Notice tone="legal" title="This is a feature preview, not a live marketplace">
          Every listing below is seeded demonstration data with a fictional provider name — never a real
          registered advocate&rsquo;s name or photo, the same reason the homepage&rsquo;s illustrative booking cards do
          not use real ones either. &ldquo;Find a real advocate for this&rdquo; on each card routes to the actual,
          verified directory. No payment or booking is processed here.
        </Notice>
      </div>
      <MarketplaceApp listings={listings} categories={MARKETPLACE_CATEGORIES} cities={cities} />
    </div>
  );
}
