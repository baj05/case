'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import 'leaflet/dist/leaflet.css';

/**
 * Real, publicly documented state/UT centroid coordinates (the same figures
 * an atlas or Wikipedia infobox would give). Used because it is the coarsest
 * level of location this database actually holds for most listings — most
 * unclaimed professionals have no street address on file, and this codebase
 * already refuses to invent one (see chamberAddress()). A marker per state,
 * not per advocate, is the honest resolution for what we know.
 */
const STATE_LATLNG: Record<string, [number, number]> = {
  'andaman-and-nicobar-islands': [11.7401, 92.6586], 'andhra-pradesh': [15.9129, 79.74],
  'arunachal-pradesh': [28.218, 94.7278], assam: [26.2006, 92.9376], bihar: [25.0961, 85.3131],
  chandigarh: [30.7333, 76.7794], chhattisgarh: [21.2787, 81.8661],
  'dadra-and-nagar-haveli-and-daman-and-diu': [20.1809, 73.0169], delhi: [28.7041, 77.1025],
  goa: [15.2993, 74.124], gujarat: [22.2587, 71.1924], haryana: [29.0588, 76.0856],
  'himachal-pradesh': [31.1048, 77.1734], 'jammu-and-kashmir': [33.7782, 76.5762],
  jharkhand: [23.6102, 85.2799], karnataka: [15.3173, 75.7139], kerala: [10.8505, 76.2711],
  ladakh: [34.1526, 77.5771], lakshadweep: [10.5667, 72.6417], 'madhya-pradesh': [22.9734, 78.6569],
  maharashtra: [19.7515, 75.7139], manipur: [24.6637, 93.9063], meghalaya: [25.467, 91.3662],
  mizoram: [23.1645, 92.9376], nagaland: [26.1584, 94.5624], odisha: [20.9517, 85.0985],
  puducherry: [11.9416, 79.8083], punjab: [31.1471, 75.3412], rajasthan: [27.0238, 74.2179],
  sikkim: [27.533, 88.5122], 'tamil-nadu': [11.1271, 78.6569], telangana: [18.1124, 79.0193],
  tripura: [23.9408, 91.9882], 'uttar-pradesh': [26.8467, 80.9462], uttarakhand: [30.0668, 79.0193],
  'west-bengal': [22.9868, 87.855],
};

/**
 * Real, publicly documented coordinates for each court's recorded seat (the
 * city or, for Delhi's district court complexes, the specific court complex
 * — Tis Hazari and Saket are several kilometres apart and collapsing them to
 * one "Delhi" point would misplace both). `court.seat` already carries this
 * name from ingestion; a court with no recorded seat (a handful of tribunals
 * and the "State/District Consumer Commission" categories, which are not
 * one physical place) gets no marker rather than a guessed one.
 */
const SEAT_LATLNG: Record<string, [number, number]> = {
  'agartala': [23.8315, 91.2868], 'ahmedabad': [23.0225, 72.5714], 'amaravati': [16.5195, 80.4856],
  'aurangabad': [19.8762, 75.3433], 'bengaluru': [12.9716, 77.5946], 'bilaspur': [22.0797, 82.1409],
  'chandigarh': [30.7333, 76.7794], 'chennai': [13.0827, 80.2707], 'cuttack': [20.4625, 85.8828],
  'dharwad': [15.4589, 75.0078], 'dwarka': [28.5845, 77.0492], 'ernakulam': [9.9816, 76.2999],
  'gangtok': [27.3389, 88.6065], 'guwahati': [26.1445, 91.7362], 'gwalior': [26.2183, 78.1828],
  'hyderabad': [17.385, 78.4867], 'imphal': [24.817, 93.9368], 'indore': [22.7196, 75.8577],
  'jabalpur': [23.1815, 79.9864], 'jaipur': [26.9124, 75.7873], 'jalpaiguri': [26.5416, 88.7196],
  'jodhpur': [26.2389, 73.0243], 'kalaburagi': [17.3139, 76.7974], 'karkardooma': [28.6537, 77.2958],
  'kolkata': [22.5726, 88.3639], 'lucknow': [26.8467, 80.9462], 'madurai': [9.9252, 78.1198],
  'mumbai': [18.922, 72.8347], 'nagpur': [21.1458, 79.0882], 'nainital': [29.3919, 79.4542],
  'new delhi': [28.6219, 77.2419], 'panaji': [15.4989, 73.8278], 'patiala house': [28.6155, 77.2348],
  'patna': [25.6127, 85.1401], 'prayagraj': [25.4358, 81.8463], 'ranchi': [23.3441, 85.3096],
  'rohini': [28.7383, 77.0822], 'saket': [28.5549, 77.1919], 'shillong': [25.5788, 91.8933],
  'shimla': [31.1048, 77.1734], 'srinagar': [34.0837, 74.7973], 'tis hazari': [28.6656, 77.2168],
};

/** Court `tier` (1-7 in the schema) collapsed to the four labels a visitor
 * actually recognises — matches what's really in this register (see
 * `packages/db/sql/001_core.sql`'s CHECK and the seeded court list): one
 * Supreme Court, the High Courts and their benches, six Delhi district-court
 * complexes, and a set of national tribunals and arbitration centres. There
 * is no per-district-court coverage nationwide, so this never claims more
 * granularity than the register actually holds. */
const TIER_LABEL: Record<number, string> = {
  1: 'Supreme Court', 2: 'High Court', 3: 'District Court', 4: 'Tribunal', 7: 'Arbitration Centre',
};

export interface StateMapEntry { name: string; slug: string; professionalCount: number }
export interface CourtMapEntry { name: string; slug: string; tier: number; seat: string | null; professionalCount: number }

export function IndiaStateMap({ states, courts = [] }: { states: StateMapEntry[]; courts?: CourtMapEntry[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const activeSlug = params.get('location');

  const withCoords = states
    .map((s) => ({ ...s, latlng: STATE_LATLNG[s.slug] }))
    .filter((s): s is StateMapEntry & { latlng: [number, number] } => Boolean(s.latlng) && s.professionalCount > 0);

  const activeCourtSlug = params.get('court');
  const withCourtCoords = courts
    .map((c) => ({ ...c, latlng: c.seat ? SEAT_LATLNG[c.seat.toLowerCase()] : undefined }))
    .filter((c): c is CourtMapEntry & { latlng: [number, number] } => Boolean(c.latlng));
  // A handful of courts share one seat (several Delhi tribunals sit at the
  // same "New Delhi" point as the Supreme Court) — left stacked, only the
  // topmost would ever be clickable. Spread duplicates in a small circle
  // around their real point instead; harmless at country zoom and exactly
  // what the zoom-in effect below is for.
  const seatCounts = new Map<string, number>();
  const courtPositions = withCourtCoords.map((c) => {
    const key = `${c.latlng[0]},${c.latlng[1]}`;
    const i = seatCounts.get(key) ?? 0;
    seatCounts.set(key, i + 1);
    if (i === 0) return c;
    const angle = (i / 6) * 2 * Math.PI;
    const r = 0.045;
    return { ...c, latlng: [c.latlng[0] + r * Math.sin(angle), c.latlng[1] + r * Math.cos(angle)] as [number, number] };
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [22.9734, 78.6569], // India's rough centroid
        zoom: 4.4,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      // Free, keyless OpenStreetMap tiles — no API key, no vendor account,
      // consistent with this project running entirely from the local folder.
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 12,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const max = Math.max(1, ...withCoords.map((s) => s.professionalCount));
      const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

      // A marker click should be seen to land, not just jump straight to a
      // new page — flies the camera in first and only navigates once the
      // animation actually finishes (a `moveend` fallback timeout covers the
      // case where the map was already there and no `moveend` would fire).
      function flyThenGo(latlng: [number, number], zoom: number, go: () => void) {
        let done = false;
        const finish = () => { if (done) return; done = true; go(); };
        map.once('moveend', finish);
        map.flyTo(latlng, zoom, { duration: 0.85 });
        setTimeout(finish, 1100);
      }

      for (const s of withCoords) {
        const isActive = s.slug === activeSlug;
        const size = 22 + Math.round(Math.sqrt(s.professionalCount / max) * 22);
        const fontSize = Math.max(10, Math.round(size * 0.36));
        const icon = L.divIcon({
          className: '',
          html: `<div class="map-marker${isActive ? ' is-active' : ''}" style="width:${size}px;height:${size}px;font-size:${fontSize}px">${compact.format(s.professionalCount)}</div>`,
          iconSize: [size, size],
        });
        const marker = L.marker(s.latlng, { icon }).addTo(map);
        marker.bindTooltip(`${s.name} · ${s.professionalCount.toLocaleString()} listed`, { direction: 'top', offset: [0, -size / 2] });
        marker.on('click', () => {
          const willActivate = activeSlug !== s.slug;
          flyThenGo(s.latlng, willActivate ? 7 : 4.4, () => {
            const next = new URLSearchParams(params.toString());
            if (!willActivate) next.delete('location'); else next.set('location', s.slug);
            next.delete('page');
            const qs = next.toString();
            router.push(qs ? `/search?${qs}` : '/search');
          });
        });
      }

      // Courts: a small landmark pin, distinct in shape from the round state
      // bubbles above so the two never read as the same kind of thing. Tier
      // 1-2 (Supreme Court, High Courts) get the larger pin — the register
      // holds one of the former and rarely more than a bench or two of the
      // latter per state, so size alone signals "this is the big one."
      for (const c of courtPositions) {
        const isActive = c.slug === activeCourtSlug;
        const major = c.tier <= 2;
        const label = TIER_LABEL[c.tier] ?? 'Court';
        const icon = L.divIcon({
          className: '',
          html: `<div class="court-marker${major ? ' court-marker-major' : ''}${isActive ? ' is-active' : ''}" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3l7 4v2H5V7l7-4z" fill="currentColor"/>
              <path d="M6 10v7M10 10v7M14 10v7M18 10v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M4 20h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>`,
          iconSize: major ? [26, 26] : [20, 20],
          iconAnchor: major ? [13, 24] : [10, 18],
        });
        const marker = L.marker(c.latlng, { icon, zIndexOffset: major ? 500 : 0 }).addTo(map);
        marker.bindTooltip(
          `${c.name} · ${label}${c.professionalCount > 0 ? ` · ${c.professionalCount.toLocaleString()} advocates` : ''}`,
          { direction: 'top', offset: [0, major ? -24 : -18] },
        );
        marker.on('click', () => {
          const willActivate = activeCourtSlug !== c.slug;
          flyThenGo(c.latlng, willActivate ? 11 : 4.4, () => {
            const next = new URLSearchParams(params.toString());
            if (!willActivate) next.delete('court'); else next.set('court', c.slug);
            next.delete('page');
            const qs = next.toString();
            router.push(qs ? `/search?${qs}` : '/search');
          });
        });
      }

      // Leaflet sizes its tile grid once, at mount, from the container's
      // current pixel box — it has no built-in awareness that this card
      // goes from a fixed sticky column to full-width (or back) at the
      // 1240px breakpoint. Without this, a browser resized across that
      // breakpoint keeps rendering tiles at the stale width until the next
      // full reload, which the map's own `display:none` used to paper over
      // by never mounting it on the narrow side at all.
      const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
      ro.observe(containerRef.current!);
      resizeObserverRef.current = ro;
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Re-init on data/filter change is intentionally skipped after first mount —
    // Leaflet owns the DOM node from here; markers are cheap enough for this
    // corpus size that a full remount on navigation (component unmounts on
    // route change) is simpler than diffing marker state by hand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="state-map-card">
      <div className="state-map-head">
        <span className="t-label-mono ink-variant">Where listings are</span>
        <span className="t-caption">Click a marker to filter, or to fly in for a closer look</span>
      </div>
      <div ref={containerRef} className="state-map-leaflet" />
      {courtPositions.length > 0 && (
        <div className="row wrap gap-3 state-map-legend">
          <span className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="map-marker-legend-swatch" aria-hidden="true" />
            State total
          </span>
          <span className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="court-marker-legend-swatch" aria-hidden="true" />
            Supreme &amp; High Courts
          </span>
          <span className="row gap-1" style={{ alignItems: 'center' }}>
            <span className="court-marker-legend-swatch court-marker-legend-swatch-minor" aria-hidden="true" />
            District courts, tribunals &amp; arbitration centres
          </span>
        </div>
      )}
      <p className="t-caption state-map-note">
        One marker per state — not individual addresses, which most unclaimed listings don&rsquo;t have on file.
        Court markers are the register&rsquo;s {courtPositions.length} recorded seats — the Supreme Court, the High
        Courts and their benches, Delhi&rsquo;s district-court complexes, and national tribunals and arbitration
        centres — not full district-court coverage nationwide.
      </p>
    </div>
  );
}
