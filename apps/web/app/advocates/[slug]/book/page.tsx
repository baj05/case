import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/Badges';
import { Notice } from '@/components/States';
import { BookingFlow } from '@/components/BookingFlow';
import { getProfessional, getPracticeAreas, databaseReady, getFlags } from '@/lib/data';
import { generateSlots, listFees } from '@lexhall/db';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Book a consultation', robots: { index: false, follow: false } };

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!databaseReady()) notFound();
  const { slug } = await params;
  const p = getProfessional(slug);
  if (!p) notFound();

  const flags = getFlags();

  if (!p.acceptsConsultations) {
    return (
      <div className="container section" style={{ maxWidth: 720 }}>
        <div className="stack gap-4">
          <h1 className="t-headline-lg">{p.displayName} is not taking bookings</h1>
          <Notice tone="info" title="Booking requires a claimed profile with published availability">
            We only show a booking option where the professional has confirmed their profile and
            published times. Offering a button that leads nowhere would waste your time.
          </Notice>
          <div className="row wrap gap-2">
            <Link href={`/advocates/${p.slug}`} className="btn btn-secondary">Back to profile</Link>
            <Link href="/search?accepting=1" className="btn btn-primary">Professionals taking bookings</Link>
          </div>
        </div>
      </div>
    );
  }

  const slots = generateSlots(p.id, new Date().toISOString(), 14);
  const fees = listFees(p.id);
  const areas = getPracticeAreas();

  return (
    <div className="container section-tight">
      <div className="consult-layout">
        <div className="stack gap-5" style={{ minWidth: 0 }}>
          <nav aria-label="Breadcrumb" className="t-caption">
            <Link href="/search">Professionals</Link> <span aria-hidden="true">/</span>{' '}
            <Link href={`/advocates/${p.slug}`}>{p.displayName}</Link> <span aria-hidden="true">/</span>{' '}
            <span aria-current="page">Book</span>
          </nav>

          <div className="stack gap-2">
            <h1 className="t-headline-lg">Book with {p.displayName}</h1>
            <p className="t-body ink-variant measure">
              Pick a service and a time. You will see the fee before you confirm, and the professional
              collects it directly.
            </p>
          </div>

          {flags.DEMO_DATA_SEEDED && (
            <Notice tone="warn" title="Demo fees on a real profile">
              This advocate is a genuine Bar Council record, but the fees and availability shown are
              seeded illustrations so the booking flow can be tried — they are not this
              professional&apos;s own figures. Clear them with{' '}
              <code className="mono">npm run db:demo -- --clear</code>.
            </Notice>
          )}

          <BookingFlow
            slug={p.slug}
            professionalName={p.displayName}
            slots={slots}
            fees={fees.map((f) => ({
              id: f.id, kind: f.kind, label: f.label, mode: f.mode,
              durationMinutes: f.durationMinutes, currencyCode: f.currencyCode,
              amountMinor: f.amountMinor, basis: f.basis, includes: f.includes,
              excludes: f.excludes, isStatutoryPassthrough: f.isStatutoryPassthrough,
              taxNote: f.taxNote,
            }))}
            areas={areas.map((a) => ({ id: a.id, name: a.name, parentName: a.parentName }))}
          />
        </div>

        <aside className="card stack gap-3" style={{ padding: 18, alignSelf: 'start' }}>
          <p className="t-label-mono ink-variant">Booking with</p>
          <div className="row gap-3">
            <Avatar name={p.displayName} src={p.photoUrl} size={56} />
            <div className="stack gap-1" style={{ minWidth: 0 }}>
              <strong>{p.displayName}</strong>
              {p.bodyRole && <span className="t-caption clamp-2">{p.bodyRole}</span>}
            </div>
          </div>
          <VerificationBadge level={p.verificationLevel} />
          {p.locationName && <p className="t-body-sm ink-variant">{p.locationName}</p>}
          <hr className="divider" />
          <div className="stack gap-2">
            <span className="t-label-mono ink-variant">Full fee schedule</span>
            {fees.map((f) => (
              <div key={f.id} className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-caption" style={{ minWidth: 0 }}>{f.label}</span>
                <span className="mono t-caption" style={{ whiteSpace: 'nowrap' }}>
                  {f.basis === 'on_request' ? 'On request' : `${f.basis === 'from' ? 'from ' : ''}₹${(f.amountMinor / 100).toLocaleString('en-IN')}`}
                </span>
              </div>
            ))}
            <p className="t-caption" style={{ marginTop: 4 }}>
              Fees are declared by the professional. Court and statutory charges are additional and
              shown separately.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
