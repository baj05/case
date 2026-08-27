import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrganisation, getFlags } from '@/lib/data';
import { requireUser } from '@/lib/auth';
import { OrgReviewForm } from '@/components/OrgReviewForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Write a review', robots: { index: false, follow: false } };

export default async function WriteFirmReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const flags = getFlags();
  if (!flags.FEATURE_REVIEWS) redirect(`/firms/${slug}`);
  const org = getOrganisation(slug, ['law_firm', 'chamber']);
  if (!org || (org.kind !== 'law_firm' && org.kind !== 'chamber')) notFound();
  await requireUser(undefined, `/firms/${slug}/review`);

  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 640 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">{org.name}</p>
        <h1 className="t-headline-lg">Write a review</h1>
      </div>
      <OrgReviewForm slug={slug} basePath="/firms" kind={org.kind} />
    </div>
  );
}
