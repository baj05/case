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
export function AvailabilityStrip({ days, slug, max = 6, columns, onSelectDay }: {
  days: AvailabilityDay[]; slug: string; max?: number;
  /** Force an exact N-column grid (e.g. 7, for a Mon–Sun week row) instead
   * of the default auto-fill wrap. Only worth setting where the container
   * width is known and wide enough — the search card's widened availability
   * column is; a narrower sidebar is better served letting cells wrap. */
  columns?: number;
  /** When given, a day with slots calls this instead of navigating to the
   * booking page — e.g. the search results list opens a booking drawer
   * in place rather than leaving the list. Days with zero slots are never
   * clickable either way; there is nothing to book that day. */
  onSelectDay?: (date: string) => void;
}) {
  if (days.length === 0) return null;
  const shown = days.slice(0, max);
  const hiddenCount = days.length - shown.length;

  return (
    <div className={`avail-grid${columns ? ' avail-grid-week' : ''}`}>
      {shown.map((d) => {
        const label = DAY_LABEL.format(new Date(`${d.date}T00:00:00Z`));
        const date = DATE_LABEL.format(new Date(`${d.date}T00:00:00Z`));
        const countLabel = d.count > 0 ? `${d.count} appt${d.count === 1 ? '' : 's'}` : 'No appts';
        const cellClass = `avail-cell${d.count > 0 ? ' is-open' : ' is-closed'}`;
        const inner = (
          <>
            <span className="avail-cell-day">{label}</span>
            <span className="avail-cell-date">{date}</span>
            <span className="avail-cell-count">{countLabel}</span>
          </>
        );
        if (d.count === 0) {
          return <div key={d.date} className={cellClass} aria-label={`${label} ${date}: no appointments`}>{inner}</div>;
        }
        if (onSelectDay) {
          return <button key={d.date} type="button" className={cellClass} onClick={() => onSelectDay(d.date)}>{inner}</button>;
        }
        return <Link key={d.date} href={`/advocates/${slug}/book`} className={cellClass}>{inner}</Link>;
      })}
      {hiddenCount > 0 && (
        <Link href={`/advocates/${slug}/book`} className="avail-cell avail-cell-more">
          <span>+{hiddenCount}</span>
          <span className="avail-cell-count">More</span>
        </Link>
      )}
    </div>
  );
}
