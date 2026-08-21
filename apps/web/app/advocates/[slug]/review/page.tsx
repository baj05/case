import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getProfessional, getFlags, getEligibleExperiences } from '@/lib/data';
import { requireUser } from '@/lib/auth';
import { Notice } from '@/components/States';
import { ReviewForm } from '@/components/ReviewForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Write a review', robots: { index: false, follow: false } };

export default async function WriteReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const flags = getFlags();
  if (!flags.FEATURE_REVIEWS) redirect(`/advocates/${slug}`);

  const p = getProfessional(slug);
  if (!p) notFound();

  const user = await requireUser(undefined, `/advocates/${slug}/review`);
  const experiences = getEligibleExperiences(user.id, p.id).map((e) => ({
    id: e.id, reference: e.reference, occurredAt: e.occurredAt, kind: e.kind as 'booking' | 'consultation',
  }));

  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 640 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">{p.displayName}</p>
        <h1 className="t-headline-lg">Write a review</h1>
      </div>

      {experiences.length === 0 ? (
        <Notice tone="info" title="No verified experience found yet">
          We could not find a completed booking or consultation between your account and{' '}
          {p.displayName}. A review must be tied to a real, completed interaction.
          {' '}<Link href={`/advocates/${slug}`} style={{ textDecoration: 'underline' }}>Back to the profile</Link>.
        </Notice>
      ) : (
        <ReviewForm slug={slug} experiences={experiences} />
      )}
    </div>
  );
}
