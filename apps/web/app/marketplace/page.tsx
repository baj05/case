import Link from 'next/link';
import type { Metadata } from 'next';
import { formatMinor } from '@lexhall/db';
import {
  databaseReady, getMarketplaceListings, getMarketplaceCategoryCounts, getMarketplaceCities,
  MARKETPLACE_CATEGORIES,
} from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { Notice } from '@/components/States';
import { Avatar } from '@/components/Avatar';
import {
  PinIcon, ClockIcon, RupeeIcon, ShieldCheckIcon, BriefcaseIcon, GavelIcon, DocumentIcon,
} from '@/components/Icons';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace — book a specific legal service',
  description:
    'Browse discrete legal services by category, price and distance — a document drafted, a notarisation, '
    + 'an urgent consultation — rather than searching for an advocate first.',
  alternates: { canonical: '/marketplace' },
};

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  criminal_defense: <GavelIcon size={14} />,
  urgent_consultation: <ClockIcon size={14} />,
  document_drafting: <DocumentIcon size={14} />,
  notary: <ShieldCheckIcon size={14} />,
  property_management: <PinIcon size={14} />,
  contract_review: <BriefcaseIcon size={14} />,
  family_paperwork: <BriefcaseIcon size={14} />,
  ip_filing: <DocumentIcon size={14} />,
};

const RADII = [5, 10, 25, 50, 100];
const PRICE_CAPS: Array<[string, string]> = [
  ['Any', ''], ['Under ₹1,000', '100000'], ['Under ₹5,000', '500000'],
  ['Under ₹15,000', '1500000'], ['Under ₹40,000', '4000000'],
];

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const sp = await searchParams;
  const q = one(sp.q) ?? '';
  const category = one(sp.category) ?? '';
  const cityName = one(sp.city) ?? '';
  const radiusKm = one(sp.radius) ? Number(one(sp.radius)) : undefined;
  const maxPriceMinor = one(sp.maxprice) ? Number(one(sp.maxprice)) : undefined;
  const page = Math.max(1, Number(one(sp.page) ?? '1') || 1);
  const perPage = 24;

  const cities = getMarketplaceCities();
  const city = cities.find((c) => c.name === cityName);
  const categoryCounts = new Map(getMarketplaceCategoryCounts().map((c) => [c.category, c.count]));

  const result = getMarketplaceListings({
    q: q || undefined,
    category: category || undefined,
    maxPriceMinor,
    lat: city?.lat, lng: city?.lng, radiusKm: city ? radiusKm : undefined,
    limit: perPage, offset: (page - 1) * perPage,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / perPage));

  const pageHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { q, category, city: cityName, radius: radiusKm ? String(radiusKm) : '', maxprice: maxPriceMinor ? String(maxPriceMinor) : '', ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/marketplace?${qs}` : '/marketplace';
  };

  return (
    <div className="stack gap-8">
      <section className="hero textured">
        <div className="container stack gap-4" style={{ maxWidth: '68ch' }}>
          <p className="t-label-mono ink-variant">Marketplace · preview</p>
          <h1 className="t-display-lg">Book one specific thing, not a whole engagement.</h1>
          <p className="t-body-lg ink-variant">
            A document drafted, a notarisation, an urgent 20-minute call — browse legal services the way you&rsquo;d
            browse a marketplace listing, by category, price and distance, instead of searching for an advocate first.
          </p>
          <form action="/marketplace" className="row wrap gap-2">
            <label htmlFor="mp-q" className="sr-only">Search services</label>
            <input id="mp-q" name="q" defaultValue={q} className="input" placeholder="What do you need? e.g. &ldquo;notary&rdquo;, &ldquo;rent agreement&rdquo;" style={{ flex: '1 1 260px', minWidth: 200 }} />
            <select name="city" defaultValue={cityName} className="select" style={{ width: 'auto' }} aria-label="Near this city">
              <option value="">Any city</option>
              {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>
      </section>

      <div className="container stack gap-6" style={{ paddingBottom: 'clamp(48px, 8vw, 96px)' }}>
        <Notice tone="legal" title="This is a feature preview, not a live marketplace">
          Every listing below is seeded demonstration data with a fictional provider name — never a real
          registered advocate&rsquo;s name or photo, the same reason the homepage&rsquo;s illustrative booking cards do
          not use real ones either. &ldquo;Find a real advocate for this&rdquo; on each card routes to the actual,
          verified directory. No payment or booking is processed here.
        </Notice>

        <div className="quick-filter-bar">
          <Link href={pageHref({ category: '' })} className="pill-filter" aria-pressed={!category}>
            All services <span className="pill-filter-count">{formatNumber([...categoryCounts.values()].reduce((a, b) => a + b, 0))}</span>
          </Link>
          {MARKETPLACE_CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={pageHref({ category: category === c.key ? '' : c.key })}
              className="pill-filter"
              aria-pressed={category === c.key}
            >
              <span className="row gap-1" style={{ alignItems: 'center', display: 'inline-flex' }}>
                {CATEGORY_ICON[c.key]}{c.label}
              </span>
              <span className="pill-filter-count">{categoryCounts.get(c.key) ?? 0}</span>
            </Link>
          ))}
        </div>

        <div className="search-layout">
          {/* No mobile drawer here (unlike FilterPanel on /search) — this is
              a smaller, two-filter panel, so showing it inline and letting
              .search-layout's own single-column collapse stack it above the
              grid is enough; it would be worth a real drawer only once this
              page's filter set grows to match /search's. */}
          <aside className="card" style={{ padding: '4px 18px 18px', position: 'sticky', top: 84, alignSelf: 'start' }} aria-label="Filters">
            <div className="filter-group row" style={{ justifyContent: 'space-between' }}>
              <span className="t-title">Filters</span>
            </div>
            <div className="filter-group stack gap-2">
              <span className="filter-summary row gap-2" style={{ cursor: 'default', alignItems: 'center', display: 'inline-flex' }}>
                <span className="filter-icon" aria-hidden="true"><PinIcon size={14} /></span>Geofence radius
              </span>
              <p className="t-caption">{city ? `From ${city.name}` : 'Pick a city above to enable a radius filter.'}</p>
              <div className="row wrap gap-1">
                {RADII.map((r) => (
                  <Link
                    key={r}
                    href={city ? pageHref({ radius: radiusKm === r ? '' : String(r) }) : pageHref({})}
                    className={`chip chip-button ${radiusKm === r ? 'chip-primary' : 'chip-outline'}`}
                    aria-pressed={radiusKm === r}
                    aria-disabled={!city}
                    style={!city ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                  >
                    {r} km
                  </Link>
                ))}
              </div>
            </div>
            <div className="filter-group stack gap-2">
              <span className="filter-summary row gap-2" style={{ cursor: 'default', alignItems: 'center', display: 'inline-flex' }}>
                <span className="filter-icon" aria-hidden="true"><RupeeIcon size={14} /></span>Maximum price
              </span>
              <div className="row wrap gap-1">
                {PRICE_CAPS.map(([label, v]) => (
                  <Link
                    key={label}
                    href={pageHref({ maxprice: v || '' })}
                    className={`chip chip-button ${(maxPriceMinor ? String(maxPriceMinor) : '') === v ? 'chip-primary' : 'chip-outline'}`}
                    aria-pressed={(maxPriceMinor ? String(maxPriceMinor) : '') === v}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            {(category || city || maxPriceMinor || q) && (
              <div style={{ paddingTop: 14 }}>
                <Link href="/marketplace" className="btn btn-ghost btn-sm btn-block">Clear filters</Link>
              </div>
            )}
          </aside>

          <div className="stack gap-4" style={{ minWidth: 0 }}>
            <p className="t-body-sm ink-variant" role="status">
              {result.total === 0 ? 'No matching listings' : `${formatNumber(result.total)} listing${result.total === 1 ? '' : 's'}`}
              {city ? ` near ${city.name}${radiusKm ? ` (within ${radiusKm} km)` : ''}` : ''}
            </p>

            {result.hits.length === 0 ? (
              <Notice tone="info" title="Nothing matches that combination">
                Try clearing the price cap, widening the radius, or dropping the city filter.
              </Notice>
            ) : (
              <div className="grid-auto-lg">
                {result.hits.map((listing) => (
                  <article key={listing.id} className="card lift stack gap-3" style={{ padding: 18 }}>
                    <div className="row gap-3" style={{ alignItems: 'center' }}>
                      <Avatar name={listing.providerName} size={44} />
                      <div className="stack gap-0" style={{ minWidth: 0 }}>
                        <span className="t-title-sm truncate">{listing.title}</span>
                        <span className="t-caption ink-variant truncate">{listing.providerName}</span>
                      </div>
                    </div>
                    <p className="t-body-sm ink-variant clamp-2">{listing.description}</p>
                    <div className="row wrap gap-1">
                      <span className="chip chip-outline" style={{ fontSize: '0.6875rem' }}>
                        <PinIcon size={12} /> {listing.locationName} · {listing.geofenceRadiusKm} km radius
                      </span>
                      <span className="chip chip-lime" style={{ fontSize: '0.6875rem' }}>
                        <ClockIcon size={12} /> {listing.availabilityLabel}
                      </span>
                    </div>
                    <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span className="t-title" style={{ color: 'var(--primary)' }}>
                        {listing.priceBasis === 'hourly' ? `${formatMinor(listing.priceMinor, listing.currencyCode)}/hr`
                          : listing.priceBasis === 'starting_at' ? `From ${formatMinor(listing.priceMinor, listing.currencyCode)}`
                            : formatMinor(listing.priceMinor, listing.currencyCode)}
                      </span>
                      <Link
                        href={listing.practiceAreaSlug ? `/search?practice=${listing.practiceAreaSlug}` : '/search'}
                        className="btn btn-primary btn-sm"
                      >
                        Find a real advocate
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav className="row wrap gap-2" aria-label="Pagination" style={{ justifyContent: 'center', paddingTop: 8 }}>
                {page > 1 && <Link href={pageHref({ page: String(page - 1) })} className="btn btn-secondary btn-sm">Previous</Link>}
                <span className="t-body-sm ink-variant" style={{ alignSelf: 'center' }}>Page {page} of {totalPages}</span>
                {page < totalPages && <Link href={pageHref({ page: String(page + 1) })} className="btn btn-secondary btn-sm">Next</Link>}
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
