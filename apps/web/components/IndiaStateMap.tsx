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

export interface StateMapEntry { name: string; slug: string; professionalCount: number }

export function IndiaStateMap({ states }: { states: StateMapEntry[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const activeSlug = params.get('location');

  const withCoords = states
    .map((s) => ({ ...s, latlng: STATE_LATLNG[s.slug] }))
    .filter((s): s is StateMapEntry & { latlng: [number, number] } => Boolean(s.latlng) && s.professionalCount > 0);

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
          const next = new URLSearchParams(params.toString());
          if (activeSlug === s.slug) next.delete('location'); else next.set('location', s.slug);
          next.delete('page');
          const qs = next.toString();
          router.push(qs ? `/search?${qs}` : '/search');
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
        <span className="t-caption">Click a marker to filter</span>
      </div>
      <div ref={containerRef} className="state-map-leaflet" />
      <p className="t-caption state-map-note">
        One marker per state — not individual addresses, which most unclaimed listings don&rsquo;t have on file.
      </p>
    </div>
  );
}
