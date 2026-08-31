import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { getBooking, formatMinor } from '@lexhall/db';
import { databaseReady } from '@/lib/data';
import { formatDate } from '@/lib/format';
import { currentUser } from '@/lib/auth';
import { sessionOwnsBooking } from '@/lib/booking-entitlement';
import { RevealBookingDetails, CancelBookingForm } from '@/components/BookingActions';
import { MEETING_MODE_LABEL, meetingKindMeta } from '@lexhall/core';
import type { MeetingMode } from '@lexhall/core';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your booking', robots: { index: false, follow: false } };

const STATUS_COPY: Record<string, { tone: 'ok' | 'info' | 'warn' | 'error'; title: string; body: string }> = {
  pending: { tone: 'info', title: 'Waiting for the advocate to confirm', body: 'The slot is held for you. You will hear back by email. If they decline, the slot is released and nothing is owed.' },
  confirmed: { tone: 'ok', title: 'Confirmed', body: 'The advocate has accepted. Keep this reference for any correspondence.' },
  declined: { tone: 'warn', title: 'Declined', body: 'The advocate could not take this matter. Nothing is owed. Common reasons include a conflict of interest or the matter falling outside their practice.' },
  cancelled_by_client: { tone: 'info', title: 'Cancelled by you', body: 'The slot has been released.' },
  cancelled_by_professional: { tone: 'warn', title: 'Cancelled by the advocate', body: 'The slot has been released and nothing is owed.' },
  rescheduled: { tone: 'info', title: 'Rescheduled', body: 'A new time has been arranged.' },
  completed: { tone: 'ok', title: 'Completed', body: 'This consultation has taken place.' },
  no_show: { tone: 'warn', title: 'Recorded as a no-show', body: 'If this is wrong, reply to your confirmation email.' },
  expired: { tone: 'warn', title: 'Expired', body: 'The slot passed without being confirmed. Nothing is owed. You can book another time.' },
};

const TERMINAL = new Set(['completed', 'cancelled_by_client', 'cancelled_by_professional', 'declined', 'expired']);

export default async function BookingPage({ params }: { params: Promise<{ reference: string }> }) {
  if (!databaseReady()) notFound();
  const { reference } = await params;
  const b = getBooking(decodeURIComponent(reference));
  if (!b) notFound();

  const user = await currentUser();
  // The reference alone is not treated as proof of ownership — see
  // lib/booking-entitlement.ts. A session that owns this booking sees the
  // confidential fields directly; anyone else sees a reveal form asking to
  // confirm the email it was made with, so brief text and a home or office
  // address are not readable by anyone who merely has (or guesses) the URL.
  const entitled = sessionOwnsBooking(b, user);

  const copy = STATUS_COPY[b.status] ?? STATUS_COPY.pending!;

  // client_timezone is stored from a form field and was never validated
  // against a real IANA zone; an invalid value used to throw inside
  // toLocaleString and 500 this page permanently for that one booking.
  let when: string;
  try {
    when = new Date(b.starts_at_utc).toLocaleString('en-IN', {
      timeZone: b.client_timezone, weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    when = `${new Date(b.starts_at_utc).toLocaleString('en-IN', {
      timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: true,
    })} UTC`;
  }

  return (
    <div className="container section" style={{ maxWidth: 780 }}>
      <div className="stack gap-5">
        <div className="stack gap-2">
          <p className="t-label-mono ink-variant">Booking {b.reference}</p>
          <h1 className="t-headline-lg">{copy.title}</h1>
        </div>

        <Notice tone={copy.tone}>{copy.body}</Notice>

        <div className="card stack gap-3" style={{ padding: 20 }}>
          <h2 className="t-title">Appointment</h2>
          <dl className="fact-grid">
            <div><dt>Professional</dt><dd>
              <Link href={`/advocates/${b.professionalSlug}`} className="link">{b.professionalName}</Link>
            </dd></div>
            <div><dt>When</dt><dd>{when}</dd></div>
            <div><dt>Timezone</dt><dd>{b.client_timezone}</dd></div>
            <div><dt>Format</dt><dd>{MEETING_MODE_LABEL[b.mode as MeetingMode] ?? String(b.mode).replace(/_/g, ' ')}</dd></div>
            {b.meeting_kind && (
              <div>
                <dt>Where</dt>
                <dd style={{ whiteSpace: 'pre-line' }}>
                  {meetingKindMeta(b.meeting_kind)?.label ?? b.meeting_kind}
                  {entitled && b.meeting_address ? `\n${b.meeting_address}` : ''}
                  {entitled && b.meeting_kind === 'chamber' && !b.meeting_address
                    ? '\nThe advocate will confirm the address.'
                    : ''}
                  {!entitled && (b.meeting_address || b.meeting_kind === 'chamber')
                    ? '\nConfirm your email below to see this.'
                    : ''}
                </dd>
              </div>
            )}
            {b.practiceAreaName && <div><dt>Area</dt><dd>{b.practiceAreaName}</dd></div>}
            <div><dt>Urgency</dt><dd style={{ textTransform: 'capitalize' }}>{b.urgency}</dd></div>
            <div><dt>Requested</dt><dd>{formatDate(b.created_at)}</dd></div>
          </dl>

          <hr className="divider" />

          <div className="stack gap-2">
            <span className="t-label-mono ink-variant">Fees</span>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="t-body-sm">Professional&apos;s fee</span>
              <strong className="mono">{formatMinor(b.quoted_fee_minor, b.currency_code)}</strong>
            </div>
            {b.statutory_charges_minor > 0 && (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-body-sm">Court / statutory charges</span>
                <strong className="mono">{formatMinor(b.statutory_charges_minor, b.currency_code)}</strong>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--outline-variant)', paddingTop: 8 }}>
              <strong>Total quoted</strong>
              <strong className="mono">{formatMinor(b.total_minor, b.currency_code)}</strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="t-body-sm">Platform charge</span>
              <strong className="mono">Nil</strong>
            </div>
            <p className="t-caption">
              Collected by the advocate directly ({String(b.settlement_mode).replace(/_/g, ' ')}). Payment
              status: {String(b.payment_status).replace(/_/g, ' ')}.
            </p>
          </div>

          <hr className="divider" />

          {/* CONFIDENTIAL — see lib/booking-entitlement.ts. Never rendered
              server-side for a request this page could not attribute to a
              session; RevealBookingDetails asks the visitor to confirm the
              booking email before it appears at all. */}
          {entitled ? (
            <div className="stack gap-1">
              <span className="t-label-mono ink-variant">What you told them</span>
              <p className="t-body-sm" style={{ whiteSpace: 'pre-wrap' }}>{b.brief}</p>
            </div>
          ) : (
            <RevealBookingDetails reference={b.reference} />
          )}
        </div>

        {!TERMINAL.has(b.status) && (
          <div className="card stack gap-2" style={{ padding: 20 }}>
            <h2 className="t-title">Manage this booking</h2>
            <CancelBookingForm reference={b.reference} />
          </div>
        )}

        {/* Activity timeline — spec §67. */}
        <div className="card stack gap-3" style={{ padding: 20 }}>
          <h2 className="t-title">History</h2>
          {b.events.length === 0 ? (
            <p className="t-body-sm ink-variant">Nothing recorded yet.</p>
          ) : (
            <ol className="stack gap-3">
              {b.events.map((e, i) => {
                const kindLabel = e.kind.replace(/_/g, ' ');
                // `kind` is often the booking's own status string, and several
                // of those already end in "by client"/"by professional" (e.g.
                // cancelled_by_client) — appending "by {actor}" unconditionally
                // read as "Cancelled by client by client".
                const kindNamesActor = kindLabel.toLowerCase().endsWith(`by ${e.actor.toLowerCase()}`);
                return (
                  <li key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                    <span aria-hidden="true" className="ink-primary" style={{ fontWeight: 700, flex: 'none' }}>◆</span>
                    <span className="stack gap-1">
                      <span className="t-body-sm" style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {kindLabel}
                        {!kindNamesActor && <span className="t-caption" style={{ fontWeight: 400 }}> by {e.actor}</span>}
                      </span>
                      <span className="t-caption">{e.detail}</span>
                      <span className="t-caption mono">{formatDate(e.occurredAt)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="row wrap gap-2">
          <Link href={`/advocates/${b.professionalSlug}`} className="btn btn-secondary">View the profile</Link>
          <Link href="/search" className="btn btn-ghost">Find someone else</Link>
        </div>
      </div>
    </div>
  );
}
