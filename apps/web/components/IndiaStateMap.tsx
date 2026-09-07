'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Schematic marker positions (percent of a 100x100 box), hand-placed to
 * roughly match each state/UT's real relative position on the map of India.
 * Deliberately NOT a traced national/state border outline — political
 * boundaries in this region are disputed in places, and a bubble layout
 * carries none of that risk while still reading as "India" at a glance.
 */
const STATE_POSITION: Record<string, { x: number; y: number }> = {
  'jammu-and-kashmir': { x: 30, y: 6 }, ladakh: { x: 40, y: 5 },
  'himachal-pradesh': { x: 35, y: 15 }, punjab: { x: 26, y: 18 }, chandigarh: { x: 29, y: 19 },
  uttarakhand: { x: 41, y: 18 }, haryana: { x: 31, y: 22 }, delhi: { x: 33, y: 24 },
  rajasthan: { x: 21, y: 31 }, 'uttar-pradesh': { x: 46, y: 27 }, bihar: { x: 59, y: 29 },
  sikkim: { x: 66, y: 21 }, 'west-bengal': { x: 65, y: 35 }, assam: { x: 76, y: 27 },
  'arunachal-pradesh': { x: 83, y: 19 }, nagaland: { x: 86, y: 29 }, manipur: { x: 85, y: 34 },
  mizoram: { x: 81, y: 39 }, tripura: { x: 77, y: 37 }, meghalaya: { x: 75, y: 32 },
  jharkhand: { x: 58, y: 38 }, chhattisgarh: { x: 52, y: 42 }, 'madhya-pradesh': { x: 41, y: 39 },
  gujarat: { x: 17, y: 42 }, 'dadra-and-nagar-haveli-and-daman-and-diu': { x: 20, y: 48 },
  maharashtra: { x: 34, y: 50 }, odisha: { x: 58, y: 47 }, telangana: { x: 45, y: 57 },
  'andhra-pradesh': { x: 48, y: 64 }, karnataka: { x: 34, y: 64 }, goa: { x: 27, y: 59 },
  'tamil-nadu': { x: 41, y: 79 }, kerala: { x: 31, y: 77 }, puducherry: { x: 43, y: 76 },
  'andaman-and-nicobar-islands': { x: 71, y: 73 }, lakshadweep: { x: 17, y: 71 },
};

export interface StateMapEntry { name: string; slug: string; professionalCount: number }

export function IndiaStateMap({ states }: { states: StateMapEntry[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const activeSlug = params.get('location');
  const [hover, setHover] = useState<string | null>(null);

  const withState = states
    .map((s) => ({ ...s, pos: STATE_POSITION[s.slug] }))
    .filter((s): s is StateMapEntry & { pos: { x: number; y: number } } => Boolean(s.pos) && s.professionalCount > 0);

  const max = Math.max(1, ...withState.map((s) => s.professionalCount));
  const radiusFor = (n: number) => 2.6 + (Math.sqrt(n / max) * 5.2);

  function goToState(slug: string) {
    const next = new URLSearchParams(params.toString());
    if (activeSlug === slug) next.delete('location'); else next.set('location', slug);
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `/search?${qs}` : '/search');
  }

  const hovered = withState.find((s) => s.slug === hover);

  return (
    <div className="state-map-card">
      <div className="state-map-head">
        <span className="t-label-mono ink-variant">Where listings are</span>
        <span className="t-caption">{hovered ? `${hovered.name} · ${hovered.professionalCount.toLocaleString()}` : 'Click a state to filter'}</span>
      </div>
      <svg viewBox="0 0 100 100" className="state-map-svg" role="img" aria-label="Listings by state, click to filter">
        {withState.map((s) => {
          const isActive = s.slug === activeSlug;
          const isHover = s.slug === hover;
          return (
            <g key={s.slug} transform={`translate(${s.pos.x} ${s.pos.y})`}>
              <circle
                r={radiusFor(s.professionalCount)}
                className={`state-map-dot${isActive ? ' is-active' : ''}${isHover ? ' is-hover' : ''}`}
                onMouseEnter={() => setHover(s.slug)}
                onMouseLeave={() => setHover((h) => (h === s.slug ? null : h))}
                onClick={() => goToState(s.slug)}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${s.name}, ${s.professionalCount} listed`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToState(s.slug); } }}
              />
            </g>
          );
        })}
      </svg>
      <p className="t-caption state-map-note">
        Sized by professionals listed per state — not individual addresses, which most unclaimed listings don&rsquo;t have on file.
      </p>
    </div>
  );
}
