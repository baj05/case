import Link from 'next/link';
import { getFlags, getOrgReviewSummary, getOrgReviews } from '@/lib/data';
import { currentUser } from '@/lib/auth';
import { Notice } from '@/components/States';
import { ReviewSection } from '@/components/ReviewSection';
import { LEGAL_COPY } from '@/lib/brand';
import type { ReviewFilter, ReviewSort } from '@lexhall/db';

const KIND_LABEL: Record<string, string> = { law_firm: 'Law firm', chamber: 'Chamber', lpo: 'Legal process outsourcing (LPO) provider' };

export async function OrganisationProfile({
  org, basePath, reviewFilter, reviewSort,
}: {
  org: { id: number; kind: string; name: string; slug: string; verificationLevel: number };
  basePath: '/firms' | '/lpo'; reviewFilter: ReviewFilter; reviewSort: ReviewSort;
}) {
  const flags = getFlags();
  const user = await currentUser();

  return (
    <div className="container section-tight stack gap-8">
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">{KIND_LABEL[org.kind] ?? 'Organisation'}</p>
        <h1 className="t-headline-lg">{org.name}</h1>
        {org.verificationLevel > 0 && <span className="chip chip-lime" style={{ alignSelf: 'flex-start' }}>Verified organisation</span>}
        <p className="t-caption">
          Listed as a demo/illustrative record for the review system — see{' '}
          <Link href="/how-it-works#reviews" style={{ textDecoration: 'underline' }}>how this works</Link>.
        </p>
      </div>

      <section className="stack gap-3">
        {flags.FEATURE_REVIEWS ? (
          <ReviewSection
            basePath={basePath} slug={org.slug}
            summary={getOrgReviewSummary(org.id)} reviews={getOrgReviews(org.id, { filter: reviewFilter, sort: reviewSort, limit: 20 })}
            currentUserId={user?.id} isAdmin={user?.platformRole === 'platform_admin'}
            filter={reviewFilter} sort={reviewSort}
          />
        ) : (
          <>
            <h2 className="t-headline-md">Reviews</h2>
            <Notice tone="legal" title="Reviews are not published yet">
              {LEGAL_COPY.reviewsGated} The review system is built and schema-complete, but stays
              switched off until a professional-conduct and data-protection review is signed off.
            </Notice>
          </>
        )}
      </section>
    </div>
  );
}
