import Link from 'next/link';
import type { Metadata } from 'next';
import { getFlags, getRecentReviewFeed } from '@/lib/data';
import { Notice } from '@/components/States';
import { ReviewCard } from '@/components/ReviewCard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Reviews — real experiences with advocates, firms and LPO providers',
  description: 'Read real, verified and anonymous experiences before you decide who to contact.',
};

/** An organisation can be a firm, a chamber or an LPO — each lives under a
 * different route, so 'organisation' alone was never enough to build a link. */
function subjectBasePath(kind: string): string {
  return kind === 'lpo' ? '/lpo' : kind === 'law_firm' || kind === 'chamber' ? '/firms' : '/advocates';
}

const CATEGORIES = [
  { href: '/search', label: 'Advocate reviews', description: 'Individual advocates, by practice area, court or city.' },
  { href: '/firms', label: 'Law firm reviews', description: 'Team-level client experience across a firm or chamber.' },
  { href: '/lpo', label: 'LPO reviews', description: 'PF, ESI, labour compliance and other legal process outsourcing.' },
];

export default function ReviewsHubPage() {
  const flags = getFlags();
  const feed = flags.FEATURE_REVIEWS ? getRecentReviewFeed(12) : [];

  return (
    <div className="stack gap-8">
      <section className="hero textured">
        <div className="container stack gap-4" style={{ maxWidth: '54ch' }}>
          <p className="t-label-mono ink-variant">Reviews</p>
          <h1 className="t-display-lg">Real experiences. Better legal decisions.</h1>
          <p className="t-body-lg ink-variant">
            Read real experiences from clients, businesses and legal professionals — verified
            where the platform can confirm a real interaction, anonymous where the reviewer
            chose it, always clearly labelled as one or the other.
          </p>
          <form action="/search" className="row gap-2 wrap">
            <label htmlFor="reviews-hub-search" className="sr-only">Search advocates, law firms or legal services</label>
            <input id="reviews-hub-search" name="q" className="input" placeholder="Search advocates, law firms or legal services…" autoComplete="off" style={{ flex: 1, minWidth: 240 }} />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
          <div className="row wrap gap-2">
            <Link href="/search" className="btn btn-secondary">Find a professional to review</Link>
            <Link href="/rate-us" className="btn btn-ghost">Rate CaseADVO instead</Link>
          </div>
        </div>
      </section>

      <div className="container stack gap-8" style={{ paddingBottom: 'clamp(48px, 8vw, 96px)' }}>
        {!flags.FEATURE_REVIEWS && (
          <Notice tone="legal" title="Reviews are not published in production yet">
            The review system is built and schema-complete, but stays switched off until a
            professional-conduct and data-protection review is signed off.{' '}
            <Link href="/how-it-works#reviews" style={{ textDecoration: 'underline' }}>Why</Link>.
          </Notice>
        )}

        <section className="stack gap-4">
          <h2 className="t-headline-md">Browse by category</h2>
          <div className="grid-auto">
            {CATEGORIES.map((c) => (
              <Link key={c.href} href={c.href} className="card lift stack gap-2" style={{ padding: 18, textDecoration: 'none' }}>
                <span className="t-title-sm" style={{ fontWeight: 700 }}>{c.label}</span>
                <span className="t-body-sm ink-variant">{c.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="stack gap-3">
          <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="t-headline-md">Recent experiences</h2>
            <Link href="/search" className="t-caption" style={{ textDecoration: 'underline' }}>Find someone to review</Link>
          </div>
          {feed.length === 0 ? (
            <p className="t-body ink-variant">No published experiences yet.</p>
          ) : (
            <div className="grid-auto-lg">
              {feed.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  subject={{ name: r.subjectName, href: `${subjectBasePath(r.subjectKind)}/${r.subjectSlug}#reviews` }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="card stack gap-3" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
          <h2 className="t-title-lg">Had an experience with a professional here?</h2>
          <p className="t-body ink-variant measure">
            Find their profile and use "Write a review" there. A review must be tied to a real
            completed booking or consultation (or, for a firm/LPO, an account whose email domain
            matches theirs) — this is not an open comment box.
          </p>
          <div className="row wrap gap-2">
            <Link href="/search" className="btn btn-primary">Find a professional</Link>
            <Link href="/rate-us" className="btn btn-secondary">Rate CaseADVO instead</Link>
            <Link href="/trust/reviews" className="btn btn-ghost">How reviews work</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
