import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/Badges';
import { Notice } from '@/components/States';
import { ConsultForm } from '@/components/ConsultForm';
import { getProfessional, getPracticeAreas, databaseReady } from '@/lib/data';
import { LEGAL_COPY } from '@/lib/brand';
import { CONSULTATION_MODES } from '@lexhall/core';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Request a consultation', robots: { index: false, follow: false } };

export default async function ConsultPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!databaseReady()) notFound();
  const { slug } = await params;
  const p = getProfessional(slug);
  if (!p) notFound();

  const areas = getPracticeAreas();

  if (!p.acceptsConsultations) {
    return (
      <div className="container section" style={{ maxWidth: 720 }}>
        <div className="stack gap-4">
          <h1 className="t-headline-lg">{p.displayName} is not accepting requests</h1>
          <Notice tone="info" title="Consultation requests are switched on by the professional">
            This profile has not yet been claimed and configured, so we have no confirmed way to pass
            a request on. Sending an enquiry into the void would waste your time.
          </Notice>
          <div className="row wrap gap-2">
            <Link href={`/advocates/${p.slug}`} className="btn btn-secondary">Back to profile</Link>
            <Link href="/search?accepting=1" className="btn btn-primary">Find professionals accepting requests</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container section-tight">
      <div className="consult-layout">
        <div className="stack gap-5" style={{ minWidth: 0 }}>
          <nav aria-label="Breadcrumb" className="t-caption">
            <Link href="/search">Professionals</Link> <span aria-hidden="true">/</span>{' '}
            <Link href={`/advocates/${p.slug}`}>{p.displayName}</Link> <span aria-hidden="true">/</span>{' '}
            <span aria-current="page">Request a consultation</span>
          </nav>

          <div className="stack gap-2">
            <h1 className="t-headline-lg">Tell {p.displayName.split(' ')[0]} what you need</h1>
            <p className="t-body ink-variant measure">
              This is an enquiry, not a booking. The professional decides whether to accept, and sets
              their own fee directly with you.
            </p>
          </div>

          <Notice tone="warn" title="Please do not share confidential details here">
            {LEGAL_COPY.confidentiality}
          </Notice>

          <ConsultForm
            slug={p.slug}
            areas={areas.map((a) => ({ id: a.id, name: a.name, parentName: a.parentName }))}
            modes={Object.entries(CONSULTATION_MODES)}
          />
        </div>

        {/* recipient summary, so the user always knows who this is going to */}
        <aside className="card stack gap-3" style={{ padding: 18, alignSelf: 'start' }}>
          <p className="t-label-mono ink-variant">Sending to</p>
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
          <Notice tone="legal">{LEGAL_COPY.feesGated}</Notice>
        </aside>
      </div>
    </div>
  );
}
