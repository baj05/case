import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { databaseReady, getResourceKit, getStates } from '@/lib/data';
import { Notice } from '@/components/States';
import { ResourceCard } from '@/components/ResourceCard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!databaseReady()) return { title: 'Resource kit' };
  const kit = getResourceKit(slug);
  if (!kit) return { title: 'Kit not found' };
  return {
    title: `${kit.title} — the documents this actually needs`,
    description: kit.description,
    alternates: { canonical: `/resources/kits/${kit.slug}` },
  };
}

export default async function KitPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const state = typeof query.state === 'string' ? query.state : undefined;
  const kit = getResourceKit(slug, state);
  if (!kit) notFound();

  const states = getStates();

  return (
    <div className="container section-tight stack gap-6">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/resources">Resource library</Link> / Kits / {kit.title}
      </nav>

      <header className="stack gap-3">
        <p className="t-label-mono ink-variant">{kit.intentPhrase ? `“${kit.intentPhrase}”` : 'Resource kit'}</p>
        <h1 className="t-headline-lg">{kit.title}</h1>
        <p className="t-body-lg ink-variant measure">{kit.description}</p>
      </header>

      {/* A bundle looks complete. Say that it is not, at the top, not the bottom. */}
      {kit.disclaimer && (
        <Notice tone="legal">
          <span><strong>Read this before you start.</strong> {kit.disclaimer}</span>
        </Notice>
      )}

      {/* ---- state selection, where it changes the answer -------------- */}
      {kit.stateAware && (
        <section className="card stack gap-3" style={{ padding: 20 }}>
          <div className="stack gap-1">
            <h2 className="t-title">Which state?</h2>
            <p className="t-body-sm ink-variant measure">
              This is not a formality. For this kit the state decides which authority hears your matter, which
              rules apply, and in some cases whether your document has to be registered at all. Choose one and
              the kit changes.
            </p>
          </div>
          <div className="row wrap gap-1">
            {states.map((s) => (
              <Link
                key={s.slug}
                href={`/resources/kits/${kit.slug}?state=${encodeURIComponent(s.name)}`}
                className="chip chip-button chip-outline"
                aria-current={state === s.name ? 'true' : undefined}
                style={state === s.name
                  ? { background: 'var(--trust-navy)', color: 'var(--surface-lowest)', borderColor: 'transparent' }
                  : undefined}
              >
                {s.name}
              </Link>
            ))}
          </div>
          {state && (
            <div className="row wrap gap-2">
              <span className="chip chip-lime">Showing {state}</span>
              <Link href={`/resources/kits/${kit.slug}`} className="btn btn-ghost btn-sm">Clear</Link>
            </div>
          )}
        </section>
      )}

      {kit.stateAware && state && (
        kit.stateItems.length > 0 ? (
          <section className="stack gap-3">
            <div className="stack gap-1">
              <h2 className="t-title-lg">For {state} specifically</h2>
              <p className="t-body-sm ink-variant measure">
                The authorities and documents that actually apply where you are.
              </p>
            </div>
            {kit.stateItems.map((card) => <ResourceCard key={card.id} card={card} />)}
          </section>
        ) : (
          <Notice tone="warn">
            <span>
              <strong>We hold nothing specific to {state} for this kit yet.</strong> Rather than substitute
              another state’s authority — which would be worse than showing none — the kit falls back to the
              documents below, which apply generally. If your matter turns on a state rule, check your own
              state’s authority before relying on them.
            </span>
          </Notice>
        )
      )}

      <section className="stack gap-3">
        <div className="stack gap-1">
          <h2 className="t-title-lg">The documents, in the order they matter</h2>
          <p className="t-body-sm ink-variant measure">
            Not alphabetical and not by category — this is the sequence a person actually needs them in.
          </p>
        </div>
        {kit.items.map((item, index) => (
          <div key={item.id} className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <span
              className="mono"
              aria-hidden="true"
              style={{
                flex: 'none', width: 30, height: 30, borderRadius: '50%',
                background: 'var(--trust-navy)', color: 'var(--surface-lowest)',
                display: 'grid', placeItems: 'center', fontSize: '0.8125rem', marginTop: 6,
              }}
            >
              {index + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ResourceCard card={item} note={item.note} />
            </div>
          </div>
        ))}
      </section>

      <section className="card stack gap-3" style={{ padding: 20 }}>
        <h2 className="t-title-lg">What this kit does not do</h2>
        <ul className="stack gap-2 list-plain">
          <li className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span aria-hidden="true" className="ink-accent">—</span>
            <span className="t-body">It does not tell you which of these apply to your facts. That depends on things a web page cannot know.</span>
          </li>
          <li className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span aria-hidden="true" className="ink-accent">—</span>
            <span className="t-body">It does not make you compliant. A bundle of documents is not a compliance position.</span>
          </li>
          <li className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span aria-hidden="true" className="ink-accent">—</span>
            <span className="t-body">It does not replace advice where the amount at stake, or the deadline, makes advice worth having.</span>
          </li>
        </ul>
        <div className="row wrap gap-2">
          <Link href="/search" className="btn btn-primary">Find an advocate</Link>
          <Link href="/resources/kits/i-need-a-free-lawyer" className="btn btn-secondary">Free legal aid</Link>
          <Link href="/resources" className="btn btn-ghost">Back to the library</Link>
        </div>
      </section>
    </div>
  );
}
