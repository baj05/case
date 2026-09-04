'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { BookingFlow, type SlotDTO, type FeeDTO, type AreaDTO } from './BookingFlow';

/**
 * The real booking flow (BookingFlow — six real steps, real fees, real
 * submitBooking server action) opened in a side drawer instead of a full
 * page navigation, using the same `.drawer`/`.drawer-sheet` shell already
 * established by FilterPanel and AdvoLauncher. No booking logic lives
 * here — this is only the shell, so the drawer and the full `/book` page
 * can never drift into two different booking experiences.
 *
 * Rendered via a portal into `document.body` — DELIBERATELY, not
 * incidentally. `.drawer-backdrop`/`.drawer-sheet` are `position: fixed`,
 * which is relative to the viewport ONLY as long as no ancestor creates a
 * new containing block (a `transform`, `filter`, or `will-change:
 * transform` anywhere between this component and <body>). This component
 * is mounted from a search result card, and `.result-card.lift` sets
 * `will-change: transform` for its hover animation — without the portal,
 * that traps the "full-screen" backdrop and the drawer panel inside the
 * card's own small box instead of the viewport (confirmed: backdrop
 * rendered at ~890x332px instead of covering the screen). The portal
 * moves the drawer's DOM position to a sibling of <body>, escaping any
 * such ancestor regardless of which card, page, or future component ends
 * up mounting this — the general fix, not a one-off patch for `.lift`.
 */
export function BookingDrawer({
  open, onClose, slug, professionalName, slots, fees, areas, chamberAddress = null, initialDate = null,
}: {
  open: boolean; onClose: () => void;
  slug: string; professionalName: string;
  slots: SlotDTO[]; fees: FeeDTO[]; areas: AreaDTO[];
  chamberAddress?: string | null;
  initialDate?: string | null;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer drawer-sheet" role="dialog" aria-modal="true" aria-label={`Book with ${professionalName}`}>
        <div className="drawer-head">
          <span className="stack" style={{ gap: 0 }}>
            <strong>Book a consultation</strong>
            <span className="t-caption">with {professionalName}</span>
          </span>
          <span className="row gap-2">
            <Link href={`/advocates/${slug}/book`} className="btn btn-ghost btn-sm hide-mobile">Open full page</Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          </span>
        </div>
        <div className="drawer-body">
          <BookingFlow
            slug={slug} professionalName={professionalName}
            slots={slots} fees={fees} areas={areas}
            chamberAddress={chamberAddress} initialDate={initialDate}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
