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
 * Shared between the Advo AI shortlist card, the advocate profile sidebar,
 * and the search results list, so every surface shows availability the
 * same way.
 */
export function AvailabilityStrip({ days, slug, max = 6, onSelectDay }: {
  days: AvailabilityDay[]; slug: string; max?: number;
  /** When given, a day with slots calls this instead of navigating to the
   * booking page — e.g. the search results list opens a booking drawer
   * in place rather than leaving the list. Days with zero slots are never
   * clickable either way; there is nothing to book that day. */
  onSelectDay?: (date: string) => void;
}) {
  if (days.length === 0) return null;
  return (
    <div className="row gap-1" style={{ overflowX: 'auto', paddingBottom: 2 }}>
      {days.slice(0, max).map((d) => {
        const cellStyle = {
          flex: '0 0 auto', minWidth: 64, textAlign: 'center' as const, padding: '6px 8px',
          borderRadius: 'var(--r-sm)', textDecoration: 'none',
          background: d.count > 0 ? 'var(--electric-lime)' : 'var(--surface-container)',
          color: d.count > 0 ? 'var(--on-lime)' : 'var(--on-surface-variant)',
          border: 'none', font: 'inherit', cursor: d.count > 0 ? 'pointer' : 'default',
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
        if (onSelectDay) {
          return (
            <button key={d.date} type="button" className="stack gap-0" style={cellStyle} onClick={() => onSelectDay(d.date)}>
              <span className="t-caption" style={{ fontWeight: 600 }}>{label}</span>
              <span className="t-caption">{date}</span>
              <span className="t-caption">{countLabel}</span>
            </button>
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
