import Link from 'next/link';
import type { Metadata } from 'next';
import { listSources, getCorpus, databaseReady } from '@/lib/data';
import { formatNumber, relativeDate } from '@/lib/format';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Where our data comes from',
  description: 'The public registers we ingest, how we crawl them, what we publish, and what we deliberately withhold.',
};

export default function DataSourcesPage() {
  const ready = databaseReady();
  const sources = ready ? listSources() : [];
  const corpus = ready ? getCorpus() : null;

  return (
    <div className="container section-tight stack gap-8" style={{ maxWidth: 860 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Provenance</p>
        <h1 className="t-headline-lg">Where our data comes from</h1>
        <p className="t-body-lg ink-variant measure">
          Every listed fact traces to a named source, a URL and a capture date. If we cannot attribute
          it, we do not publish it.
        </p>
      </div>

      {sources.length > 0 && (
        <section className="stack gap-3">
          <h2 className="t-headline-md">Registered sources</h2>
          {sources.map((s) => (
            <article key={String(s.id)} className="card stack gap-3" style={{ padding: 20 }}>
              <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                <h3 className="t-title">{String(s.name)}</h3>
                <span className="chip chip-lime">{String(s.authority).replace(/_/g, ' ')}</span>
              </div>
              <p className="t-body-sm">{String(s.coverageNote)}</p>
              <dl className="fact-grid">
                <div><dt>Publisher</dt><dd>{String(s.publisher)}</dd></div>
                <div><dt>Records</dt><dd>{formatNumber(Number(s.recordCount))}</dd></div>
                <div><dt>robots.txt</dt><dd>{s.robotsAllows === 1 ? 'Read and permitted' : 'Not readable'}</dd></div>
                <div><dt>Last run</dt><dd>{relativeDate(s.lastRunAt as string | null)}</dd></div>
              </dl>
              {s.termsReviewNote && (
                <div className="notice notice-legal">
                  <span className="notice-icon" aria-hidden="true">ⓘ</span>
                  <span className="t-body-sm">{String(s.termsReviewNote)}</span>
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <section className="stack gap-3">
        <h2 className="t-headline-md">An important limitation, stated plainly</h2>
        <Notice tone="warn" title="This is not a directory of every advocate in India">
          It is often assumed that the Bar Council of India publishes the roll of all enrolled
          advocates. It does not. Its site publishes the {corpus ? corpus.bodies : 24} State Bar
          Councils and each council&apos;s <strong>elected office-bearers</strong> — roughly 20 to 25
          people per council. The complete rolls, which run to well over a million advocates, are
          published separately by each State Bar Council in its own format, and several sit behind
          search forms or bot protection.
        </Notice>
        <p className="t-body">
          So the {corpus ? formatNumber(corpus.professionals) : 'current'} records here are a genuine,
          verifiable seed corpus of senior office-holders — not national coverage. Extending it means
          writing one ingestion adapter per State Bar Council against each council&apos;s own site,
          which is planned work, not a switch to flip.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What we withhold</h2>
        <p className="t-body">
          The register publishes residential addresses, personal mobile numbers and personal email
          addresses. We ingest those into a private store, because they are the strongest signal for
          verifying that a person claiming a profile really is that person. We do not publish them.
        </p>
        <p className="t-body">
          Chamber and office addresses are professional information, and those we do show. The
          distinction is deliberate: the source being public does not make republishing every field
          proportionate.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">How we crawl</h2>
        <ul className="stack gap-2">
          {[
            'robots.txt is fetched, parsed and obeyed before any request. A disallow is a stop, not an obstacle.',
            'One request at a time per host, with a minimum delay between them and exponential backoff on failure.',
            'An identifying User-Agent with a contact address, so anyone can find out who we are.',
            'A 403 or a block is respected. We do not evade bot protection or probe internal APIs.',
            'Every raw response is stored with a content hash, so we re-publish only what actually changed.',
            'Portraits are copied to our own origin rather than hotlinked, so visitors’ IP addresses are never disclosed to the source.',
          ].map((line) => (
            <li key={line} className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <span aria-hidden="true" className="ink-primary" style={{ fontWeight: 700, flex: 'none' }}>✓</span>
              <span className="t-body">{line}</span>
            </li>
          ))}
        </ul>
        <Link href="/bot" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>About our crawler</Link>
      </section>
    </div>
  );
}
