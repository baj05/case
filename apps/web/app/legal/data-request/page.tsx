import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { DataRequestForm } from '@/components/DataRequestForm';
import { getProfessional } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Correct or remove your listing',
  description: 'Ask us to correct, restrict or remove information about you, or raise a grievance.',
};

export default async function DataRequestPage({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const profileSlug = (Array.isArray(sp.profile) ? sp.profile[0] : sp.profile) ?? '';
  const profile = profileSlug ? getProfessional(profileSlug) : null;

  return (
    <div className="container section-tight" style={{ maxWidth: 760 }}>
      <div className="stack gap-5">
        <div className="stack gap-2">
          <p className="t-label-mono ink-variant">Your data</p>
          <h1 className="t-headline-lg">Correct or remove your listing</h1>
          <p className="t-body ink-variant measure">
            We compile listings from official public registers and public case records. If something
            is wrong, or you would rather not appear, tell us and we will act on it.
          </p>
        </div>

        {profile && (
          <Notice tone="info" title={`This request will be linked to ${profile.displayName}`}>
            <Link href={`/advocates/${profile.slug}`} style={{ textDecoration: 'underline' }}>View the profile</Link>
          </Notice>
        )}

        <Notice tone="legal" title="How we handle this">
          Every request is logged with a 30-day response clock. If you ask for removal, we withhold
          the listing from public pages while we verify — withholding is instant and reversible,
          deletion is not, so we do it in that order.
        </Notice>

        <DataRequestForm
          profileSlug={profileSlug}
          cancelHref={profile ? `/advocates/${profile.slug}` : '/'}
        />
      </div>
    </div>
  );
}
