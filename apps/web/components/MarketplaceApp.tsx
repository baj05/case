'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatMinor } from '@/lib/format';
import {
  PinIcon, ClockIcon, ShieldCheckIcon, BriefcaseIcon, GavelIcon, DocumentIcon,
  StarIcon, SearchIcon,
} from './Icons';

export interface MarketplaceListingVM {
  id: number; category: string; title: string; description: string; providerName: string;
  practiceAreaSlug: string | null;
  priceMinor: number; currencyCode: string; priceBasis: string;
  locationName: string; latitude: number; longitude: number; geofenceRadiusKm: number;
  availabilityLabel: string; responseMinutes: number | null;
  ratingX10: number; reviewCount: number;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  criminal_defense: <GavelIcon size={22} />,
  urgent_consultation: <ClockIcon size={22} />,
  document_drafting: <DocumentIcon size={22} />,
  notary: <ShieldCheckIcon size={22} />,
  property_management: <PinIcon size={22} />,
  contract_review: <BriefcaseIcon size={22} />,
  family_paperwork: <BriefcaseIcon size={22} />,
  ip_filing: <DocumentIcon size={22} />,
};

/** The reference template bucketed availability into three windows
 * (ASAP / Today / Scheduled). The real seeded labels are freer text than
 * that, so this maps them into the same three buckets rather than adding a
 * fourth option nothing in the data actually distinguishes. */
function availabilityBucket(label: string): 'asap' | 'today' | 'scheduled' {
  if (label === 'Available now' || label === 'Responds within the hour') return 'asap';
  if (label === 'Available today') return 'today';
  return 'scheduled';
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function MarketplaceApp({
  listings, categories, cities,
}: {
  listings: MarketplaceListingVM[];
  categories: Array<{ key: string; label: string }>;
  cities: Array<{ name: string; lat: number; lng: number }>;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [center, setCenter] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [availability, setAvailability] = useState<'all' | 'asap' | 'today' | 'scheduled'>('all');
  const [sort, setSort] = useState<'relevance' | 'priceLow' | 'priceHigh' | 'urgent'>('relevance');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCity, setModalCity] = useState(cities[0]?.name ?? '');
  const [modalRadius, setModalRadius] = useState('25');

  const withDistance = useMemo(() => listings.map((l) => ({
    ...l,
    distanceKm: center ? haversineKm(center.lat, center.lng, l.latitude, l.longitude) : null,
  })), [listings, center]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = parseFloat(minPrice) || 0;
    const max = parseFloat(maxPrice) || Infinity;
    let out = withDistance.filter((l) => {
      const matchesCategory = !category || l.category === category;
      const matchesQuery = !q || l.title.toLowerCase().includes(q)
        || l.providerName.toLowerCase().includes(q) || l.locationName.toLowerCase().includes(q);
      const priceRupees = l.priceMinor / 100;
      const matchesPrice = priceRupees >= min && priceRupees <= max;
      const matchesRadius = l.distanceKm === null || l.distanceKm <= radiusKm;
      const matchesAvailability = availability === 'all' || availabilityBucket(l.availabilityLabel) === availability;
      return matchesCategory && matchesQuery && matchesPrice && matchesRadius && matchesAvailability;
    });
    if (sort === 'priceLow') out = [...out].sort((a, b) => a.priceMinor - b.priceMinor);
    else if (sort === 'priceHigh') out = [...out].sort((a, b) => b.priceMinor - a.priceMinor);
    else if (sort === 'urgent') out = [...out].sort((a, b) => (availabilityBucket(a.availabilityLabel) === 'asap' ? -1 : 1) - (availabilityBucket(b.availabilityLabel) === 'asap' ? -1 : 1));
    return out;
  }, [withDistance, query, category, minPrice, maxPrice, radiusKm, availability, sort]);

  function resetFilters() {
    setQuery(''); setCategory(null); setMinPrice(''); setMaxPrice('');
    setCenter(null); setRadiusKm(25); setAvailability('all'); setSort('relevance');
  }

  return (
    <>
      <div className="mp-header">
        <div className="container mp-header-inner">
          <Link href="/" className="mp-brand">
            <span className="mp-brand-mark" aria-hidden="true"><GavelIcon size={18} /></span>
            <span className="mp-brand-word">CaseADVO</span>
          </Link>
          <div className="mp-search-wrap">
            <span className="mp-search-icon" aria-hidden="true"><SearchIcon size={16} /></span>
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search advocates, legal paperwork, notary, criminal lawyers…"
              aria-label="Search marketplace listings"
            />
          </div>
          <div className="mp-header-actions">
            <button type="button" className="mp-location-btn" onClick={() => setModalOpen(true)}>
              <PinIcon size={14} />
              {center ? `${center.name} (${radiusKm} km)` : 'Set location'}
            </button>
            <Link href="/for-professionals" className="btn btn-primary btn-sm hide-mobile">+ Post a listing</Link>
          </div>
        </div>
      </div>

      <div className="container section-tight">
        <div className="mp-layout">
          <aside className="card mp-sidebar" style={{ padding: '16px 18px' }} aria-label="Filters">
            <div className="mp-sidebar-section">
              <span className="mp-sidebar-heading">Categories</span>
              <button type="button" className="mp-category-btn" aria-pressed={!category} onClick={() => setCategory(null)}>
                All legal services <span className="filter-count">{listings.length}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.key} type="button" className="mp-category-btn"
                  aria-pressed={category === c.key} onClick={() => setCategory(c.key)}
                >
                  <span className="row gap-2" style={{ alignItems: 'center', display: 'inline-flex' }}>
                    <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center' }}>{CATEGORY_ICON[c.key]}</span>
                    {c.label}
                  </span>
                  <span className="filter-count">{listings.filter((l) => l.category === c.key).length}</span>
                </button>
              ))}
            </div>

            <div className="mp-sidebar-section">
              <span className="mp-sidebar-heading">Price range (₹)</span>
              <div className="mp-price-row">
                <input type="number" className="input" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                <span>–</span>
                <input type="number" className="input" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>

            <div className="mp-sidebar-section">
              <span className="mp-sidebar-heading">Geofence radius</span>
              <p className="t-caption ink-variant" style={{ marginBottom: 6 }}>
                {center ? `From ${center.name}` : 'Set a location above to enable this'}
              </p>
              <input
                type="range" min={5} max={100} value={radiusKm} className="mp-range"
                disabled={!center}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                aria-label="Geofence radius in kilometres"
              />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-caption">5 km</span>
                <span className="mp-radius-value t-caption">{radiusKm} km</span>
                <span className="t-caption">100 km</span>
              </div>
            </div>

            <div className="mp-sidebar-section">
              <span className="mp-sidebar-heading">Availability window</span>
              <select className="select" value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)}>
                <option value="all">Anytime</option>
                <option value="asap">Immediate / ASAP</option>
                <option value="today">Available today</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={resetFilters} style={{ marginTop: 4 }}>
              Reset all filters
            </button>
          </aside>

          <main>
            <div className="card mp-main-head">
              <div>
                <h1 className="t-title-lg">{category ? categories.find((c) => c.key === category)?.label : 'All legal services'}</h1>
                <p className="t-caption ink-variant">
                  {filtered.length} listing{filtered.length === 1 ? '' : 's'}{center ? ` within ${radiusKm} km of ${center.name}` : ''}
                </p>
              </div>
              <label className="row gap-2" style={{ alignItems: 'center' }}>
                <span className="t-caption">Sort by</span>
                <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option value="relevance">Relevance</option>
                  <option value="priceLow">Price: low to high</option>
                  <option value="priceHigh">Price: high to low</option>
                  <option value="urgent">Urgent first</option>
                </select>
              </label>
            </div>

            {filtered.length === 0 ? (
              <div className="card stack gap-2" style={{ padding: 32, textAlign: 'center' }}>
                <p className="t-body ink-variant">No legal services match your criteria.</p>
                <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'center' }} onClick={resetFilters}>Reset filters</button>
              </div>
            ) : (
              <div className="mp-grid">
                {filtered.map((l) => (
                  <article key={l.id} className="card lift mp-card">
                    <div className="mp-card-media">
                      {CATEGORY_ICON[l.category]}
                      <span className="mp-card-badge">
                        {availabilityBucket(l.availabilityLabel) === 'asap' ? `⚡ ${l.availabilityLabel}` : l.availabilityLabel}
                      </span>
                    </div>
                    <div className="mp-card-body">
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span className="mp-card-category">{categories.find((c) => c.key === l.category)?.label}</span>
                        <span className="row gap-1 t-caption" style={{ alignItems: 'center' }}>
                          <StarIcon size={12} /> {(l.ratingX10 / 10).toFixed(1)} ({l.reviewCount})
                        </span>
                      </div>
                      <h3 className="t-title-sm clamp-2">{l.title}</h3>
                      <p className="t-body-sm ink-variant">{l.providerName}</p>
                      <p className="t-caption ink-variant">
                        <PinIcon size={11} /> {l.locationName}
                        {l.distanceKm !== null ? ` (${l.distanceKm.toFixed(0)} km away)` : ''}
                      </p>
                    </div>
                    <div className="mp-card-footer">
                      <div className="stack" style={{ gap: 0 }}>
                        <span className="t-caption ink-variant">Service fee</span>
                        <span className="t-title-sm" style={{ color: 'var(--primary)', fontWeight: 800 }}>
                          {formatMinor(l.priceMinor, l.currencyCode)}
                        </span>
                      </div>
                      <Link href={l.practiceAreaSlug ? `/search?practice=${l.practiceAreaSlug}` : '/search'} className="btn btn-primary btn-sm">
                        Find a real advocate
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {modalOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setModalOpen(false)} aria-hidden="true" />
          <div className="mp-modal" role="dialog" aria-modal="true" aria-label="Set location geofence">
            <h3 className="t-title-lg" style={{ marginBottom: 16 }}>Set location geofence</h3>
            <div className="stack gap-1" style={{ marginBottom: 12 }}>
              <label className="label" htmlFor="mp-modal-city">Target city</label>
              <select id="mp-modal-city" className="select" value={modalCity} onChange={(e) => setModalCity(e.target.value)}>
                {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="stack gap-1" style={{ marginBottom: 20 }}>
              <label className="label" htmlFor="mp-modal-radius">Geofence radius (km)</label>
              <input id="mp-modal-radius" type="number" className="input" min={5} max={100} value={modalRadius} onChange={(e) => setModalRadius(e.target.value)} />
            </div>
            <div className="row gap-2" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                type="button" className="btn btn-primary btn-sm"
                onClick={() => {
                  const c = cities.find((x) => x.name === modalCity);
                  if (c) setCenter(c);
                  setRadiusKm(Math.min(100, Math.max(5, Number(modalRadius) || 25)));
                  setModalOpen(false);
                }}
              >
                Apply geofence
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
