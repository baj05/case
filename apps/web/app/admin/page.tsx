import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import {
  dataHealth, listSources, listRuns, listIssues, listClaims, listDataRequests,
  listFeatureFlags, zeroResultQueries, getCorpus, databaseReady,
} from '@/lib/data';
import { formatDate, relativeDate, formatNumber } from '@/lib/format';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin — data workbench', robots: { index: false, follow: false } };

/**
 * Admin control centre. Gated behind platform_admin (RT-011) — bootstrap the
 * first admin account with `npm run create-admin --workspace=@lexhall/db --
 * --email you@x.com --name "You" --password "..."`.
 */
export default async function AdminPage() {
  await requireUser('platform_admin', '/admin');
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">Run <code className="mono">npm run ingest</code> first.</Notice>
      </div>
    );
  }

  const health = dataHealth();
  const corpus = getCorpus();
  const sources = listSources();
  const runs = listRuns(6);
  const issues = listIssues('open', 12);
  const claims = listClaims();
  const requests = listDataRequests(8);
  const flags = listFeatureFlags();
  const zeros = zeroResultQueries(8);

  const tiles = [
    { label: 'Records', value: formatNumber(health.total), note: `${formatNumber(health.published)} published` },
    { label: 'Avg confidence', value: `${health.avgConfidence}`, note: 'out of 100' },
    { label: 'Open QC issues', value: formatNumber(health.openIssues), note: `${health.errorIssues} errors`, alert: health.errorIssues > 0 },
    { label: 'Unclaimed', value: formatNumber(health.unclaimed), note: `${formatNumber(corpus.claimed)} claimed` },
    { label: 'Missing court link', value: formatNumber(health.missingCourt), note: 'no chamber in source' },
    { label: 'Data requests', value: formatNumber(health.openDataRequests), note: 'open', alert: health.openDataRequests > 0 },
    { label: 'Opted out', value: formatNumber(health.optedOut), note: 'withheld from public' },
    { label: 'Stale > 90d', value: formatNumber(health.staleOver90d), note: 'need re-check' },
  ];

  return (
    <div className="container section-tight stack gap-6">
      <div className="row wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div className="stack gap-2">
          <p className="t-label-mono ink-variant">Platform administration</p>
          <h1 className="t-headline-lg">Data workbench</h1>
        </div>
        <Link href="/admin/resources" className="btn btn-secondary btn-sm">Resource library →</Link>
      </div>

      <Notice tone="warn" title="Prototype: this page is not access-controlled">
        In production every panel here requires the <code className="mono">platform_admin</code> role
        and writes an audit-log entry per action. Tracked as a release blocker in PROJECT_AUDIT.md.
      </Notice>

      {/* ------------------------------------------------------------- tiles */}
      <div className="grid-auto">
        {tiles.map((t) => (
          <div key={t.label} className="card stack gap-1" style={{ padding: 16 }}>
            <span className="t-label-mono ink-variant">{t.label}</span>
            <span className="t-headline-md" style={{ color: t.alert ? 'var(--error)' : 'inherit' }}>{t.value}</span>
            <span className="t-caption">{t.note}</span>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------ sources */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Sources</h2>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th scope="col">Source</th><th scope="col">Authority</th><th scope="col">robots</th>
                <th scope="col">Publish</th><th scope="col" style={{ textAlign: 'right' }}>Records</th><th scope="col">Last run</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={String(s.id)}>
                  <th scope="row" className="stack gap-1" style={{ fontWeight: 600 }}>
                    {String(s.name)}
                    <span className="t-caption" style={{ fontWeight: 400, maxWidth: '44ch', display: 'block' }}>{String(s.coverageNote)}</span>
                  </th>
                  <td><span className="chip chip-outline">{String(s.authority).replace(/_/g, ' ')}</span></td>
                  <td>{s.robotsAllows === 1 ? <span className="chip chip-lime">✓ permitted</span> : <span className="chip chip-warn">unread</span>}</td>
                  <td>{s.publishAllowed === 1 ? <span className="chip chip-teal">allowed</span> : <span className="chip chip-outline">withheld</span>}</td>
                  <td className="num">{formatNumber(Number(s.recordCount))}</td>
                  <td className="ink-variant">{relativeDate(s.lastRunAt as string | null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --------------------------------------------------------------- runs */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Ingestion runs</h2>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th scope="col">Started</th><th scope="col">Status</th><th scope="col" style={{ textAlign: 'right' }}>Pages</th>
                <th scope="col" style={{ textAlign: 'right' }}>Seen</th><th scope="col" style={{ textAlign: 'right' }}>New</th>
                <th scope="col" style={{ textAlign: 'right' }}>Updated</th><th scope="col" style={{ textAlign: 'right' }}>Failed</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={String(r.id)}>
                  <th scope="row" style={{ fontWeight: 500 }}>{formatDate(r.startedAt as string)}</th>
                  <td>
                    <span className={`chip ${r.status === 'succeeded' ? 'chip-lime' : r.status === 'failed' ? 'chip-error' : 'chip-warn'}`}>
                      {String(r.status)}
                    </span>
                  </td>
                  <td className="num">{formatNumber(Number(r.pagesFetched))}</td>
                  <td className="num">{formatNumber(Number(r.recordsSeen))}</td>
                  <td className="num">{formatNumber(Number(r.recordsCreated))}</td>
                  <td className="num">{formatNumber(Number(r.recordsUpdated))}</td>
                  <td className="num" style={{ color: Number(r.recordsFailed) > 0 ? 'var(--error)' : 'inherit' }}>{formatNumber(Number(r.recordsFailed))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------- issues */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Quality-control queue</h2>
        <p className="t-body-sm ink-variant">
          Automatically raised during ingestion. Nothing is hidden: a partially extracted record is
          flagged rather than silently published as complete.
        </p>
        {issues.length === 0 ? (
          <p className="t-body ink-variant">No open issues.</p>
        ) : (
          <div className="stack gap-2">
            {issues.map((i) => (
              <div key={String(i.id)} className="card row wrap gap-3" style={{ padding: 14, justifyContent: 'space-between' }}>
                <div className="stack gap-1" style={{ minWidth: 0, flex: '1 1 320px' }}>
                  <div className="row wrap gap-2">
                    <span className={`chip ${i.severity === 'error' ? 'chip-error' : 'chip-warn'}`}>{String(i.code).replace(/_/g, ' ')}</span>
                    {i.professionalSlug && (
                      <Link href={`/advocates/${i.professionalSlug}`} className="t-body-sm" style={{ textDecoration: 'underline' }}>
                        {String(i.professionalName)}
                      </Link>
                    )}
                  </div>
                  <p className="t-caption">{String(i.detail)}</p>
                </div>
                <span className="t-caption">{relativeDate(i.createdAt as string)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- claims */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Profile claims</h2>
        {claims.length === 0 ? (
          <p className="t-body ink-variant">No claims submitted yet. Claim a profile on the public site to see the review queue populate.</p>
        ) : (
          <div className="scroll-x">
            <table className="table" style={{ minWidth: 760 }}>
              <thead>
                <tr><th scope="col">Profile</th><th scope="col">Claimant</th><th scope="col" style={{ textAlign: 'right' }}>Signal</th><th scope="col">Status</th><th scope="col">Submitted</th></tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={String(c.id)}>
                    <th scope="row" style={{ fontWeight: 600 }}>
                      <Link href={`/advocates/${c.professionalSlug}`} style={{ textDecoration: 'underline' }}>{String(c.professionalName)}</Link>
                    </th>
                    <td className="mono t-caption">{String(c.contactEmail)}</td>
                    <td className="num">{Number(c.matchScore)}</td>
                    <td><span className="chip chip-outline">{String(c.status).replace(/_/g, ' ')}</span></td>
                    <td className="ink-variant">{relativeDate(c.createdAt as string)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- data requests */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Privacy and correction requests</h2>
        {requests.length === 0 ? (
          <p className="t-body ink-variant">No requests received.</p>
        ) : (
          <div className="scroll-x">
            <table className="table" style={{ minWidth: 720 }}>
              <thead><tr><th scope="col">Kind</th><th scope="col">Requester</th><th scope="col">Subject</th><th scope="col">Status</th><th scope="col">Due</th></tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={String(r.id)}>
                    <th scope="row"><span className="chip chip-outline">{String(r.kind).replace(/_/g, ' ')}</span></th>
                    <td className="mono t-caption">{String(r.requesterEmail)}</td>
                    <td>{r.professionalSlug ? <Link href={`/advocates/${r.professionalSlug}`} style={{ textDecoration: 'underline' }}>{String(r.professionalName)}</Link> : '—'}</td>
                    <td>{String(r.status)}</td>
                    <td className="ink-variant">{formatDate(r.dueAt as string)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --------------------------------------------------- zero-result search */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Searches that found nothing</h2>
        <p className="t-body-sm ink-variant">
          The growth signal (spec §112): each of these is either missing coverage or a gap in the
          synonym vocabulary. Queries only — never a matter description.
        </p>
        {zeros.length === 0 ? (
          <p className="t-body ink-variant">No zero-result searches recorded yet.</p>
        ) : (
          <div className="scroll-x">
            <table className="table" style={{ minWidth: 520 }}>
              <thead><tr><th scope="col">Query</th><th scope="col" style={{ textAlign: 'right' }}>Times</th><th scope="col">Last seen</th></tr></thead>
              <tbody>
                {zeros.map((z) => (
                  <tr key={z.rawQuery}>
                    <th scope="row" style={{ fontWeight: 500 }}>
                      <Link href={`/search?q=${encodeURIComponent(z.rawQuery)}`} style={{ textDecoration: 'underline' }}>{z.rawQuery}</Link>
                    </th>
                    <td className="num">{z.occurrences}</td>
                    <td className="ink-variant">{relativeDate(z.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* -------------------------------------------------------------- flags */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Feature flags and their legal gates</h2>
        <div className="stack gap-2">
          {flags.map((f) => (
            <div key={f.key} className="card stack gap-2" style={{ padding: 14 }}>
              <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                <span className="mono" style={{ fontWeight: 600 }}>{f.key}</span>
                <span className={`chip ${f.enabled === 1 ? 'chip-lime' : 'chip-outline'}`}>{f.enabled === 1 ? '✓ enabled' : 'off'}</span>
              </div>
              <p className="t-body-sm">{f.description}</p>
              <p className="t-caption"><strong>Gate:</strong> {f.gateNote}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
