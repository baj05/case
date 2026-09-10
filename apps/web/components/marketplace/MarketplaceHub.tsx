'use client';

/**
 * The marketplace, as a classifieds board: filters down the side, a toolbar
 * across the top, and a full-bleed grid of listing cards that open a detail
 * view.
 *
 * Two modes share the surface — browse every service, or open one provider's
 * profile and read their feed. The provider rail switches between them, and
 * the composer is the advocate's own side of the same board.
 *
 * Filtering happens in the browser. All 100 listings ship once (see
 * `listAllMarketplaceListings`), so a filter change is a re-render rather
 * than a round trip.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  MarketplaceComment, MarketplaceListingFull, MarketplaceProviderStats,
} from '@lexhall/db';
import { formatMinor, formatNumber } from '@/lib/format';
import { availabilityBucket, haversineKm } from '@/lib/geo';
import {
  CloseIcon, LockIcon, PinIcon, PlusIcon, SearchIcon, ShieldCheckIcon, VerifiedIcon,
} from '@/components/Icons';
import { useModalDialog } from '@/lib/useModalDialog';
import { ServicePost } from './ServicePost';
import { ListingDetail } from './ListingDetail';
import { ProviderProfile } from './ProviderProfile';
import { Composer, type ComposerDraft } from './Composer';

type Intent = 'message' | 'book' | 'buy';
type Sort = 'recommended' | 'nearest' | 'priceLow' | 'priceHigh';

const INTENT_COPY: Record<Intent, { title: string; cta: string }> = {
  message: { title: 'Message the advocate', cta: 'Send message' },
  book: { title: 'Book this service', cta: 'Request booking' },
  buy: { title: 'Buy with escrow protection', cta: 'Pay into escrow' },
};

const DELIVERY_FILTERS = [
  { key: 'all', label: 'Any mode' },
  { key: 'doorstep', label: 'Doorstep' },
  { key: 'chambers', label: 'At chambers' },
  { key: 'virtual', label: 'Virtual' },
];

const AVAILABILITY_FILTERS = [
  { key: 'all', label: 'Anytime' },
  { key: 'asap', label: 'Immediate / ASAP' },
  { key: 'today', label: 'Available today' },
  { key: 'scheduled', label: 'Scheduled' },
];

interface City { name: string; lat: number; lng: number }

export function MarketplaceHub({
  providers, listings, listingsByProvider, commentsByProvider, categories, cities,
}: {
  providers: MarketplaceProviderStats[];
  listings: MarketplaceListingFull[];
  listingsByProvider: Record<string, MarketplaceListingFull[]>;
  commentsByProvider: Record<string, MarketplaceComment[]>;
  categories: Array<{ key: string; label: string }>;
  cities: City[];
}) {
  const [handle, setHandle] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [delivery, setDelivery] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [center, setCenter] = useState<City | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [sort, setSort] = useState<Sort>('recommended');

  const [composerOpen, setComposerOpen] = useState(false);
  const [posted, setPosted] = useState<ComposerDraft | null>(null);
  const [intent, setIntent] = useState<{ mode: Intent; listing: MarketplaceListingFull } | null>(null);
  const [detail, setDetail] = useState<MarketplaceListingFull | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);

  const provider = handle ? providers.find((p) => p.handle === handle) ?? null : null;
  const categoryLabel = (key: string) => categories.find((c) => c.key === key)?.label ?? key;

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    return counts;
  }, [listings]);

  /** Distance is only knowable once a centre is chosen, so it stays absent
   * rather than zero until then — a card showing "0.0 km away" by default
   * would be a lie the layout tells for free. */
  const withDistance = useMemo(() => (
    center
      ? listings.map((l) => ({ ...l, distanceKm: haversineKm(center.lat, center.lng, l.latitude, l.longitude) }))
      : listings
  ), [listings, center]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = Number(minPrice) || 0;
    const max = Number(maxPrice) || Infinity;

    const out = withDistance.filter((l) => {
      if (category && l.category !== category) return false;
      if (delivery !== 'all' && l.deliveryMode !== delivery) return false;
      if (availability !== 'all' && availabilityBucket(l.availabilityLabel) !== availability) return false;
      const rupees = l.priceMinor / 100;
      if (rupees < min || rupees > max) return false;
      if (center && typeof l.distanceKm === 'number' && l.distanceKm > radiusKm) return false;
      if (!q) return true;
      return l.title.toLowerCase().includes(q)
        || l.description.toLowerCase().includes(q)
        || l.providerName.toLowerCase().includes(q)
        || l.locationName.toLowerCase().includes(q);
    });

    // Sorted on a copy, and every comparator falls through to id so the order
    // is total. A comparator that returns 0 for ties leaves those rows in
    // whatever order the filter happened to produce, which reads as the grid
    // reshuffling itself for no reason.
    const byId = (a: MarketplaceListingFull, b: MarketplaceListingFull) => a.id - b.id;
    switch (sort) {
      case 'priceLow':
        return [...out].sort((a, b) => a.priceMinor - b.priceMinor || byId(a, b));
      case 'priceHigh':
        return [...out].sort((a, b) => b.priceMinor - a.priceMinor || byId(a, b));
      case 'nearest':
        return [...out].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || byId(a, b));
      case 'recommended':
      default:
        // Rating first, then how much evidence is behind it — a lone 5.0
        // should not outrank a 4.8 with sixty reviews.
        return [...out].sort((a, b) => b.ratingX10 - a.ratingX10 || b.reviewCount - a.reviewCount || byId(a, b));
    }
  }, [withDistance, query, category, delivery, availability, minPrice, maxPrice, center, radiusKm, sort]);

  const activeFilterCount = [
    category !== '',
    delivery !== 'all',
    availability !== 'all',
    minPrice !== '',
    maxPrice !== '',
    center !== null,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setQuery(''); setCategory(''); setDelivery('all'); setAvailability('all');
    setMinPrice(''); setMaxPrice(''); setCenter(null); setRadiusKm(25); setSort('recommended');
  };

  const openDetail = (listing: MarketplaceListingFull) => setDetail(listing);

  const filterPanel = (
    <FilterSet
      categories={categories}
      categoryCounts={categoryCounts}
      totalCount={listings.length}
      category={category} setCategory={setCategory}
      delivery={delivery} setDelivery={setDelivery}
      availability={availability} setAvailability={setAvailability}
      minPrice={minPrice} setMinPrice={setMinPrice}
      maxPrice={maxPrice} setMaxPrice={setMaxPrice}
      center={center} radiusKm={radiusKm} setRadiusKm={setRadiusKm}
      onOpenGeo={() => setGeoOpen(true)}
      onClearGeo={() => setCenter(null)}
      onReset={resetFilters}
      onPost={() => setComposerOpen(true)}
    />
  );

  return (
    <div className="stack gap-5">
      {/* --- provider rail ------------------------------------------------ */}
      <div className="stack gap-2">
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h3 className="t-title" style={{ margin: 0 }}>Advocates listing right now</h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setComposerOpen(true)}>
            <PlusIcon size={14} /> Post a service
          </button>
        </div>
        <div className="row gap-2 scroll-x" style={{ paddingBottom: 6 }}>
          <button
            type="button"
            className="chip chip-button"
            aria-pressed={handle === null}
            onClick={() => setHandle(null)}
            style={{ flex: 'none' }}
          >
            All services ({listings.length})
          </button>
          {providers.map((p) => (
            <button
              key={p.handle}
              type="button"
              className="chip chip-button"
              aria-pressed={handle === p.handle}
              onClick={() => setHandle(p.handle)}
              style={{ flex: 'none' }}
            >
              {p.badges.includes('bar') && <VerifiedIcon size={12} />}
              {' '}@{p.handle}
            </button>
          ))}
        </div>
      </div>

      {provider ? (
        <ProviderProfile
          provider={provider}
          listings={listingsByProvider[provider.handle] ?? []}
          comments={commentsByProvider[provider.handle] ?? []}
          categoryLabel={categoryLabel}
          onOpen={openDetail}
        />
      ) : (
        <div className="mkt-layout">
          <aside className="mkt-sidebar mkt-sidebar-desktop" aria-label="Filters">
            <div className="card" style={{ padding: '16px 18px' }}>{filterPanel}</div>
          </aside>

          <div style={{ minWidth: 0 }}>
            <div className="mkt-toolbar">
              <div className="stack gap-1" style={{ minWidth: 0 }}>
                <div className="row wrap gap-2" style={{ alignItems: 'center' }}>
                  <h3 className="t-title-lg" style={{ margin: 0 }}>
                    {category ? categoryLabel(category) : 'Today’s picks'}
                  </h3>
                  <span className="mkt-count">
                    {formatNumber(filtered.length)} listing{filtered.length === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="t-caption">
                  Priced legal services near you
                  {center ? ` — within ${radiusKm} km of ${center.name}` : ''}
                </span>
              </div>

              <div className="row wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mkt-filter-toggle"
                  onClick={() => setFiltersOpen(true)}
                >
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
                <label className="row gap-2" style={{ gap: 6 }}>
                  <span className="t-caption" style={{ whiteSpace: 'nowrap' }}>Sort by</span>
                  <select
                    className="select"
                    style={{ width: 'auto', minHeight: 36 }}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                  >
                    <option value="recommended">Recommended</option>
                    <option value="nearest" disabled={!center}>
                      {center ? 'Nearest first' : 'Nearest (set a location)'}
                    </option>
                    <option value="priceLow">Price: low to high</option>
                    <option value="priceHigh">Price: high to low</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="search-bar" style={{ marginBottom: 14 }}>
              <SearchIcon size={16} />
              <input
                className="search-input"
                placeholder="Search legal services, advocates or cities"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search services"
              />
              {query && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery('')} aria-label="Clear search">
                  <CloseIcon size={14} />
                </button>
              )}
            </div>

            {/* The sidebar is hidden below 900px, so the single most-used
                filter stays inline rather than behind the sheet. */}
            <div className="mkt-chips-mobile scroll-x">
              <button
                type="button"
                className="chip chip-button"
                aria-pressed={category === ''}
                onClick={() => setCategory('')}
                style={{ flex: 'none' }}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className="chip chip-button"
                  aria-pressed={category === c.key}
                  onClick={() => setCategory(c.key)}
                  style={{ flex: 'none' }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="card stack gap-2" style={{ padding: 32, textAlign: 'center' }}>
                <strong>No legal services match those filters.</strong>
                <span className="t-body-sm ink-variant">
                  Try a wider radius, a higher budget, or clear the category.
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'center' }}
                  onClick={resetFilters}
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className="svc-grid">
                {filtered.map((l) => (
                  <ServicePost
                    key={l.id}
                    listing={l}
                    categoryLabel={categoryLabel(l.category)}
                    onOpen={openDetail}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {filtersOpen && (
        <FilterSheet onClose={() => setFiltersOpen(false)}>{filterPanel}</FilterSheet>
      )}

      {geoOpen && (
        <GeoModal
          cities={cities}
          current={center}
          currentRadius={radiusKm}
          onClose={() => setGeoOpen(false)}
          onApply={(city, radius) => { setCenter(city); setRadiusKm(radius); setGeoOpen(false); }}
        />
      )}

      {detail && (
        <ListingDetail
          listing={detail}
          categoryLabel={categoryLabel(detail.category)}
          onClose={() => setDetail(null)}
          onAction={(mode, listing) => { setDetail(null); setIntent({ mode, listing }); }}
        />
      )}

      {composerOpen && (
        <Composer
          categories={categories}
          onClose={() => setComposerOpen(false)}
          onPublish={(draft) => { setPosted(draft); setComposerOpen(false); }}
        />
      )}

      {posted && (
        <div className="card stack gap-2" style={{ padding: 18, borderColor: 'var(--secondary)' }}>
          <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
            <strong className="row gap-2"><ShieldCheckIcon size={16} /> Your draft is ready</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPosted(null)} aria-label="Dismiss draft">
              <CloseIcon size={14} />
            </button>
          </div>
          <p className="t-body-sm" style={{ margin: 0 }}>{posted.pitch}</p>
          <span className="t-caption">
            {formatMinor(Number(posted.priceRupees) * 100)} · {posted.delivery} · {posted.radiusKm} km ·
            {' '}{posted.duration === 'permanent' ? 'no expiry' : `expires in ${posted.duration}`}
          </span>
          <p className="t-caption" style={{ margin: 0 }}>
            Publishing to the live marketplace opens once your Bar Council enrolment is verified.
            {' '}<Link href="/for-professionals#verification" style={{ textDecoration: 'underline' }}>
              How verification works
            </Link>.
          </p>
        </div>
      )}

      {intent && <IntentDrawer intent={intent.mode} listing={intent.listing} onClose={() => setIntent(null)} />}
    </div>
  );
}

/**
 * The filter set, rendered once and mounted twice — in the sticky sidebar
 * above 900px and inside the sheet below it. Sharing the markup is the point:
 * two hand-maintained copies of eight filters drift, and the mobile one is
 * always the copy that rots.
 */
function FilterSet({
  categories, categoryCounts, totalCount,
  category, setCategory, delivery, setDelivery, availability, setAvailability,
  minPrice, setMinPrice, maxPrice, setMaxPrice,
  center, radiusKm, setRadiusKm, onOpenGeo, onClearGeo, onReset, onPost,
}: {
  categories: Array<{ key: string; label: string }>;
  categoryCounts: Map<string, number>;
  totalCount: number;
  category: string; setCategory: (v: string) => void;
  delivery: string; setDelivery: (v: string) => void;
  availability: string; setAvailability: (v: string) => void;
  minPrice: string; setMinPrice: (v: string) => void;
  maxPrice: string; setMaxPrice: (v: string) => void;
  center: City | null; radiusKm: number; setRadiusKm: (v: number) => void;
  onOpenGeo: () => void; onClearGeo: () => void; onReset: () => void; onPost: () => void;
}) {
  return (
    <div className="stack gap-4">
      <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={onPost}>
        <PlusIcon size={14} /> Create a listing
      </button>

      <div className="mp-sidebar-section stack gap-2">
        <span className="mp-sidebar-heading">Location &amp; radius</span>
        <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
          <span className="t-body-sm row gap-1" style={{ fontWeight: 700 }}>
            <PinIcon size={13} /> {center ? center.name : 'Anywhere in India'}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onOpenGeo}>
            {center ? 'Change' : 'Set'}
          </button>
        </div>
        <span className="t-caption">
          {center ? `Within ${radiusKm} km` : 'Set a city to filter and sort by distance'}
        </span>
        <input
          type="range"
          className="mp-range"
          min={5}
          max={100}
          step={5}
          value={radiusKm}
          disabled={!center}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          aria-label="Search radius in kilometres"
        />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="t-caption">5 km</span>
          <span className="mp-radius-value">{radiusKm} km</span>
          <span className="t-caption">100 km</span>
        </div>
        {center && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClearGeo}>
            Clear location
          </button>
        )}
      </div>

      <div className="mp-sidebar-section stack gap-2">
        <span className="mp-sidebar-heading">Categories</span>
        <button
          type="button"
          className="mp-category-btn"
          aria-pressed={category === ''}
          onClick={() => setCategory('')}
        >
          <span>All legal services</span>
          <span className="filter-count">{totalCount}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c.key}
            type="button"
            className="mp-category-btn"
            aria-pressed={category === c.key}
            onClick={() => setCategory(c.key)}
          >
            <span>{c.label}</span>
            <span className="filter-count">{categoryCounts.get(c.key) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mp-sidebar-section stack gap-2">
        <span className="mp-sidebar-heading">How it reaches you</span>
        {DELIVERY_FILTERS.map((d) => (
          <label key={d.key} className="row gap-2" style={{ cursor: 'pointer', padding: '4px 2px' }}>
            <input
              type="radio"
              name="mkt-delivery"
              value={d.key}
              checked={delivery === d.key}
              onChange={() => setDelivery(d.key)}
            />
            <span className="t-body-sm">{d.label}</span>
          </label>
        ))}
      </div>

      <div className="mp-sidebar-section stack gap-2">
        <span className="mp-sidebar-heading">Budget (₹)</span>
        <div className="mp-price-row">
          <input
            className="input"
            inputMode="numeric"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ''))}
            aria-label="Minimum price in rupees"
          />
          <span className="ink-variant">–</span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ''))}
            aria-label="Maximum price in rupees"
          />
        </div>
      </div>

      <div className="mp-sidebar-section stack gap-2">
        <span className="mp-sidebar-heading">Availability</span>
        <select
          className="select"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          aria-label="Availability window"
        >
          {AVAILABILITY_FILTERS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
      </div>

      <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={onReset}>
        Reset all filters
      </button>
    </div>
  );
}

/** Below 900px the filter set moves into a sheet: a bottom sheet on phones,
 * a side panel above 768px, both already defined by `.drawer-sheet`. */
function FilterSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useModalDialog(sheetRef, onClose);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer drawer-sheet" role="dialog" aria-modal="true" aria-label="Filters" ref={sheetRef}>
        <header className="drawer-head">
          <strong>Filters</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close filters" ref={closeRef}>
            <CloseIcon size={16} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        <footer className="drawer-foot">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            Show results
          </button>
        </footer>
      </div>
    </>
  );
}

/** Picks the centre the radius filter measures from. Twelve fixed cities
 * rather than browser geolocation: a demo dataset scoped to twelve points
 * does not justify a permission prompt. */
function GeoModal({
  cities, current, currentRadius, onClose, onApply,
}: {
  cities: City[];
  current: City | null;
  currentRadius: number;
  onClose: () => void;
  onApply: (city: City, radius: number) => void;
}) {
  const [cityName, setCityName] = useState(current?.name ?? cities[0]?.name ?? '');
  const [radius, setRadius] = useState(String(currentRadius));
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog(dialogRef, onClose);

  const apply = () => {
    const city = cities.find((c) => c.name === cityName);
    if (!city) return;
    onApply(city, Math.min(100, Math.max(5, Number(radius) || 25)));
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="mp-modal stack gap-3" role="dialog" aria-modal="true" aria-label="Set location and radius" ref={dialogRef}>
        <h3 className="t-title" style={{ margin: 0 }}>Set location &amp; radius</h3>
        <div className="field">
          <label className="label" htmlFor="mkt-geo-city">City or jurisdiction</label>
          <select
            id="mkt-geo-city"
            className="select"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
          >
            {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="mkt-geo-radius">Radius (km)</label>
          <input
            id="mkt-geo-radius"
            className="input"
            inputMode="numeric"
            value={radius}
            onChange={(e) => setRadius(e.target.value.replace(/[^\d]/g, ''))}
          />
          <span className="hint">Between 5 and 100 km.</span>
        </div>
        <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={apply}>Apply</button>
        </div>
      </div>
    </>
  );
}

/**
 * What happens after Message / Book / Buy. The escrow flow is spelled out
 * end to end because that is the part a client most needs to understand
 * before parting with money — and the last panel says plainly that card
 * processing is not switched on yet, since that is the one moment where a
 * visitor could actually lose money by believing otherwise.
 */
function IntentDrawer({
  intent, listing, onClose,
}: { intent: Intent; listing: MarketplaceListingFull; onClose: () => void }) {
  const copy = INTENT_COPY[intent];
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog(dialogRef, onClose);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The primary action is disabled, so focus goes to the close button —
  // opening a dialog without moving focus into it leaves a keyboard user
  // stranded on the page behind.
  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <div className="composer-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="composer" role="dialog" aria-modal="true" aria-label={copy.title} ref={dialogRef}>
        <header className="composer-head">
          <strong>{copy.title}</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" ref={closeRef}>
            <CloseIcon size={16} />
          </button>
        </header>
        <div className="composer-body">
          <div className="stack gap-1">
            <strong>{listing.title}</strong>
            <span className="t-caption">{listing.providerName} · {listing.locationName}</span>
          </div>

          {intent === 'buy' ? (
            <>
              <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-body">Amount held in escrow</span>
                <strong className="t-headline-sm">{formatMinor(listing.priceMinor, listing.currencyCode)}</strong>
              </div>
              <div className="escrow-steps">
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">You pay in</strong>
                  <span className="t-caption">The money goes to a holding account, not to the advocate.</span>
                </div>
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">Work is delivered</strong>
                  <span className="t-caption">The advocate does the work and marks it complete.</span>
                </div>
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">You confirm</strong>
                  <span className="t-caption">You have 72 hours to accept or raise a dispute.</span>
                </div>
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">Funds release</strong>
                  <span className="t-caption">Only then does the advocate get paid.</span>
                </div>
              </div>
            </>
          ) : (
            <p className="t-body-sm ink-variant" style={{ margin: 0 }}>
              {intent === 'book'
                ? 'The advocate confirms a slot before anything is charged. You can cancel free of charge until they confirm.'
                : 'Ask anything you need to know before booking — what it covers, what it excludes, what you need to bring.'}
            </p>
          )}

          <div className="card stack gap-1" style={{ padding: 14, background: 'var(--surface-low)' }}>
            <strong className="row gap-2 t-body-sm"><LockIcon size={14} /> Not yet processing payments</strong>
            <span className="t-caption">
              This flow is complete but card and UPI processing is not switched on, so no money moves
              and nothing is charged. Arrange fees directly with the advocate for now.
            </span>
          </div>
        </div>
        <footer className="composer-foot">
          <span className="t-caption">No lawyer–client relationship is created by asking.</span>
          <button type="button" className="btn btn-primary" disabled>{copy.cta}</button>
        </footer>
      </div>
    </div>
  );
}
