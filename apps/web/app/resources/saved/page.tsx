import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { databaseReady, listBookmarks } from '@/lib/data';
import { Notice, EmptyState } from '@/components/States';
import { ResourceCard } from '@/components/ResourceCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Saved resources',
  description: 'The resources you have saved on this device.',
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const jar = await cookies();
  const ref = jar.get('lx_ref')?.value;
  const saved = ref ? listBookmarks(ref) : [];

  return (
    <div className="container section-tight stack gap-6">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/resources">Resource library</Link> / Saved
      </nav>

      <header className="stack gap-2">
        <h1 className="t-headline-lg">Saved on this device</h1>
        <p className="t-body ink-variant measure">
          {saved.length === 0
            ? 'Nothing saved yet.'
            : `${saved.length} resource${saved.length === 1 ? '' : 's'}.`}
        </p>
      </header>

      <Notice tone="info">
        <span>
          <strong>This list lives in a cookie, not an account.</strong> There is no authentication in this
          build, so the list is tied to this browser and will not follow you to another device — and clearing
          your cookies clears it. We store the reference and the resource, and nothing else: not who you are,
          not what you searched for.
        </span>
      </Notice>

      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Save a resource from its page and it will appear here, on this device."
          actions={[
            { label: 'Browse the library', href: '/resources' },
            { label: 'Search for a document', href: '/resources/search' },
          ]}
        />
      ) : (
        <div className="stack gap-3">
          {saved.map((card) => <ResourceCard key={card.id} card={card} />)}
        </div>
      )}
    </div>
  );
}
