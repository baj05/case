import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getOrganisation } from '@/lib/data';
import { OrganisationProfile } from '@/components/OrganisationProfile';
import type { ReviewFilter, ReviewSort } from '@lexhall/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const org = getOrganisation(slug);
  return { title: org ? org.name : 'Provider unavailable' };
}

export default async function LpoProfilePage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ reviewFilter?: string; reviewSort?: string }> }) {
  const { slug } = await params;
  const { reviewFilter: rf, reviewSort: rs } = await searchParams;
  const org = getOrganisation(slug);
  if (!org || org.kind !== 'lpo') notFound();

  return (
    <OrganisationProfile
      org={org} basePath="/lpo"
      reviewFilter={(['all', 'verified', 'anonymous'].includes(rf ?? '') ? rf : 'all') as ReviewFilter}
      reviewSort={(['recent', 'helpful', 'highest', 'lowest'].includes(rs ?? '') ? rs : 'recent') as ReviewSort}
    />
  );
}
