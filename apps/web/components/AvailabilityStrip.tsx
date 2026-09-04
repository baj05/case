'use client';

import Link from 'next/link';

export interface AvailabilityDay { date: string; count: number; hasVideo: boolean }

const DAY_LABEL = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
const DATE_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * Next-available strip: real bookable slots from `generateSlots`, bucketed
 * per day server-side (see `nextAvailabilityDays` in packages/db/repositories/
 * fees.ts) — never a placeholder calendar. A day with zero slots is shown
 * greyed-out rather than omitted, so "nothing soon" is a visible fact, not a
 * gap the viewer has to guess at.
 *
 * Shared between the Advo AI shortlist card and the advocate profile
 * sidebar, so both surfaces show availability the same way.
 */
export function AvailabilityStrip({ days, slug, max = 6 }: { days: AvailabilityDay[]; slug: string; max?: number }) {
  if (days.length === 0) return null;
  return (
    <div className="row gap-1" style={{ overflowX: 'auto', paddingBottom: 2 }}>
      {days.slice(0, max).map((d) => {
        const cellStyle = {
          flex: '0 0 auto', minWidth: 64, textAlign: 'center' as const, padding: '6px 8px',
          borderRadius: 'var(--r-sm)', textDecoration: 'none',
          background: d.count > 0 ? 'var(--electric-lime)' : 'var(--surface-container)',
          color: d.count > 0 ? 'var(--on-lime)' : 'var(--on-surface-variant)',
        };
        const label = DAY_LABEL.format(new Date(`${d.date}T00:00:00Z`));
        const date = DATE_LABEL.format(new Date(`${d.date}T00:00:00Z`));
        const countLabel = d.count > 0 ? `${d.count} slot${d.count === 1 ? '' : 's'}` : 'No slots';
        if (d.count === 0) {
          return (
            <div key={d.date} className="stack gap-0" style={cellStyle} aria-label={`${label} ${date}: no slots`}>
              <span className="t-caption" style={{ fontWeight: 600 }}>{label}</span>
              <span className="t-caption">{date}</span>
              <span className="t-caption">{countLabel}</span>
            </div>
          );
        }
        return (
          <Link key={d.date} href={`/advocates/${slug}/book`} className="stack gap-0" style={cellStyle}>
            <span className="t-caption" style={{ fontWeight: 600 }}>{label}</span>
            <span className="t-caption">{date}</span>
            <span className="t-caption">{countLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}
