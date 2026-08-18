import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Avatar } from '@/components/Avatar';
import { Notice } from '@/components/States';
import { ClaimForm } from '@/components/ClaimForm';
import { getProfessional, databaseReady } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Claim this profile', robots: { index: false, follow: false } };

export default async function ClaimPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!databaseReady()) notFound();
  const { slug } = await params;
  const sp = await searchParams;
  const p = getProfessional(slug);
  if (!p) notFound();

  const submitted = sp.submitted === '1';
  const score = Number(Array.isArray(sp.score) ? sp.score[0] : sp.score) || 0;
  const status = Array.isArray(sp.status) ? sp.status[0] : sp.status;

  if (submitted) {
    return (
      <div className="container section" style={{ maxWidth: 720 }}>
        <div className="stack gap-4">
          <h1 className="t-headline-lg">Claim submitted</h1>
          <Notice tone="ok" title="We have your claim">
            Your claim for <strong>{p.displayName}</strong> is recorded and queued for review.
            {status === 'under_review' && ' Someone else has also claimed this profile, so it goes to manual review — we never transfer ownership automatically.'}
          </Notice>

          <div className="card stack gap-3" style={{ padding: 20 }}>
            <h2 className="t-title">What happens next</h2>
            <ol className="stack gap-2" style={{ listStyle: 'decimal', paddingLeft: 20 }}>
              <li className="t-body-sm">We check your details against the contact information the Bar Council published for this person.</li>
              <li className="t-body-sm">If the automatic signals are inconclusive, we ask you for documentary evidence.</li>
              <li className="t-body-sm">A reviewer decides. Approving a claim is recorded in the audit log with the evidence relied on.</li>
              <li className="t-body-sm">Once approved you can set practice areas, courts, languages and whether you accept consultation requests.</li>
            </ol>
            <hr className="divider" />
            <div className="stack gap-1">
              <span className="t-label-mono ink-variant">Automatic match signal</span>
              <span className="t-body">
                {score >= 55 ? 'Strong — your contact details match the published record.'
                  : score >= 20 ? 'Partial — some details resemble the published record.'
                  : 'None — we will need documentary evidence.'}
                <span className="mono ink-variant"> ({score}/100)</span>
              </span>
            </div>
          </div>

          <div className="row wrap gap-2">
            <Link href={`/advocates/${p.slug}`} className="btn btn-secondary">Back to the profile</Link>
            <Link href="/for-professionals" className="btn btn-ghost">How verification works</Link>
          </div>
        </div>
      </div>
    );
  }

  if (p.claimStatus === 'claimed') {
    return (
      <div className="container section" style={{ maxWidth: 720 }}>
        <div className="stack gap-4">
          <h1 className="t-headline-lg">This profile is already claimed</h1>
          <Notice tone="info">
            {p.displayName} is managed by a verified account. If you believe this is wrong — for
            example someone else has claimed your identity — tell us and we will investigate.
          </Notice>
          <div className="row wrap gap-2">
            <Link href={`/legal/data-request?profile=${p.slug}`} className="btn btn-primary">Report an ownership problem</Link>
            <Link href={`/advocates/${p.slug}`} className="btn btn-secondary">Back to the profile</Link>
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
            <Link href={`/advocates/${p.slug}`}>{p.displayName}</Link> <span aria-hidden="true">/</span>{' '}
            <span aria-current="page">Claim this profile</span>
          </nav>

          <div className="stack gap-2">
            <h1 className="t-headline-lg">Is this you?</h1>
            <p className="t-body ink-variant measure">
              This profile was compiled from the {p.professionalBodyName ?? 'Bar Council'} register.
              Claiming it lets you confirm the facts, add your practice areas and courts, and decide
              whether you take consultation requests. It is free, and it does not affect your ranking.
            </p>
          </div>

          <Notice tone="info" title="We do not hand over profiles automatically">
            A claim is a request, not a switch. We verify it against the register and, where needed,
            against documents you provide. Two competing claims go to a human reviewer.
          </Notice>

          <ClaimForm slug={p.slug} />
        </div>

        <aside className="card stack gap-3" style={{ padding: 18, alignSelf: 'start' }}>
          <p className="t-label-mono ink-variant">Claiming</p>
          <div className="row gap-3">
            <Avatar name={p.displayName} src={p.photoUrl} size={56} />
            <div className="stack gap-1" style={{ minWidth: 0 }}>
              <strong>{p.displayName}</strong>
              {p.bodyRole && <span className="t-caption clamp-2">{p.bodyRole}</span>}
            </div>
          </div>
          <hr className="divider" />
          <div className="stack gap-2">
            <span className="t-label-mono ink-variant">Not you?</span>
            <p className="t-body-sm">
              If this profile should not exist, or names you but is wrong, you can ask us to correct
              or remove it.
            </p>
            <Link href={`/legal/data-request?profile=${p.slug}`} className="btn btn-secondary btn-sm btn-block">
              Correction or removal
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
