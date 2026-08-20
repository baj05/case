import Link from 'next/link';
import type { Metadata } from 'next';
import { Notice } from '@/components/States';
import { databaseReady, adminResourceDashboard, adminReviewQueue, getResourceCategories } from '@/lib/data';
import { formatNumber, relativeDate } from '@/lib/format';
import { LINK_OUTCOME_META, RESOURCE_STATUS_META } from '@lexhall/core';
import type { LinkOutcome, ResourceStatus } from '@lexhall/core';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Admin — resource library',
  robots: { index: false, follow: false },
};

/**
 * Resource library workbench.
 *
 * PROTOTYPE SCOPE: unauthenticated, like the rest of /admin, and listed as a
 * release blocker in docs/PROJECT_AUDIT.md. In production every panel here sits
 * behind platform_admin RBAC with an audit entry per action.
 *
 * This page is read-only on purpose. Publishing, unpublishing and withdrawing a
 * resource are consequential acts, and until there is an authenticated operator
 * to attribute them to, offering the buttons would produce an audit trail that
 * says "somebody". The operations exist as CLI commands, which at least records
 * that a person with shell access ran them.
 */
export default function AdminResourcesPage() {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice>
      </div>
    );
  }

  const dash = adminResourceDashboard();
  const queue = adminReviewQueue(60);
  const categories = getResourceCategories();

  const tiles = [
    { label: 'Total resources', value: formatNumber(dash.total), note: `${formatNumber(dash.published)} published` },
    { label: 'Awaiting review', value: formatNumber(dash.awaitingReview), note: 'not visible publicly', alert: dash.awaitingReview > 0 },
    { label: 'Review overdue', value: formatNumber(dash.reviewOverdue), note: 'published, past due date', alert: dash.reviewOverdue > 0 },
    { label: 'Broken sources', value: formatNumber(dash.broken), note: '404, 410 or 5xx', alert: dash.broken > 0 },
    { label: 'Blocked to checks', value: formatNumber(dash.blocked), note: 'needs a person, not a fix' },
    { label: 'Never checked', value: formatNumber(dash.neverChecked), note: 'has a URL, no check yet', alert: dash.neverChecked > 0 },
    { label: 'Rights unresolved', value: formatNumber(dash.rightsUnresolved), note: 'may not be hosted', alert: dash.rightsUnresolved > 0 },
    { label: 'Downloads', value: formatNumber(dash.downloads), note: `${formatNumber(dash.previews)} previews` },
    { label: 'Harvest targets', value: formatNumber(dash.harvestTargets), note: 'enabled' },
  ];

  return (
    <div className="container section-tight stack gap-6">
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/admin">Data workbench</Link> / Resource library
      </nav>

      <header className="stack gap-2">
        <h1 className="t-headline-lg">Resource library</h1>
        <p className="t-body ink-variant measure">
          Provenance, verification state and the review queue. Read-only: publication is a CLI operation so
          that it is attributable to somebody with shell access rather than to an unauthenticated browser.
        </p>
      </header>

      <Notice tone="warn">
        <span>
          <strong>This route is unauthenticated.</strong> It is a prototype affordance and a release blocker.
          In production it requires platform_admin and writes an audit entry per action.
        </span>
      </Notice>

      <section className="grid-auto">
        {tiles.map((tile) => (
          <div key={tile.label} className="card stack gap-1" style={{ padding: 16 }}>
            <span className="t-label-mono ink-variant">{tile.label}</span>
            <span className="t-headline-md" style={{ color: tile.alert ? 'var(--error)' : 'inherit' }}>{tile.value}</span>
            <span className="t-caption">{tile.note}</span>
          </div>
        ))}
      </section>

      {/* ---- lifecycle ------------------------------------------------- */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Lifecycle</h2>
        <div className="split-2">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <caption className="sr-only">Resources by workflow status</caption>
              <thead><tr><th scope="col">Status</th><th scope="col">Public</th><th scope="col" className="num">Count</th></tr></thead>
              <tbody>
                {dash.byStatus.map((row) => {
                  const meta = RESOURCE_STATUS_META[row.status as ResourceStatus];
                  return (
                    <tr key={row.status}>
                      <td>
                        <span className="stack gap-1">
                          <span style={{ fontWeight: 600 }}>{meta?.label ?? row.status}</span>
                          <span className="t-caption">{meta?.plain}</span>
                        </span>
                      </td>
                      <td>{meta?.publicVisible ? 'Yes' : 'No'}</td>
                      <td className="num">{formatNumber(row.n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <caption className="sr-only">Resources by last link-check outcome</caption>
              <thead><tr><th scope="col">Last check</th><th scope="col">Healthy</th><th scope="col" className="num">Count</th></tr></thead>
              <tbody>
                {dash.byLinkState.map((row) => {
                  const meta = LINK_OUTCOME_META[row.state as LinkOutcome];
                  return (
                    <tr key={row.state}>
                      <td>
                        <span className="stack gap-1">
                          <span style={{ fontWeight: 600 }}>{meta?.label ?? row.state}</span>
                          <span className="t-caption">{meta?.plain ?? 'No check has been run.'}</span>
                        </span>
                      </td>
                      <td>{meta ? (meta.healthy ? 'Yes' : 'No') : '—'}</td>
                      <td className="num">{formatNumber(row.n)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- who publishes what ---------------------------------------- */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">By publisher class</h2>
        <div className="row wrap gap-2">
          {dash.byOfficialStatus.map((row) => (
            <span key={row.status} className="chip">
              {row.status.replace(/_/g, ' ').toLowerCase()} <span className="mono" style={{ marginLeft: 6 }}>{row.n}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ---- harvest runs ---------------------------------------------- */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Harvest runs</h2>
        {dash.runs.length === 0 ? (
          <p className="t-body-sm ink-variant">
            No harvest has been run. <code className="mono">node packages/ingestion/cli.ts --harvest-resources</code>
          </p>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="table">
              <caption className="sr-only">Resource harvest runs</caption>
              <thead>
                <tr>
                  <th scope="col">Started</th><th scope="col" className="num">Targets</th>
                  <th scope="col" className="num">Found</th><th scope="col" className="num">Inserted</th>
                  <th scope="col" className="num">Dupes</th><th scope="col" className="num">Rejected</th>
                  <th scope="col" className="num">Errors</th><th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {dash.runs.map((run) => (
                  <tr key={String(run.id)}>
                    <td>{relativeDate(String(run.startedAt))}</td>
                    <td className="num">{String(run.targetsRun)}</td>
                    <td className="num">{String(run.discovered)}</td>
                    <td className="num">{String(run.inserted)}</td>
                    <td className="num">{String(run.duplicates)}</td>
                    <td className="num">{String(run.rejected)}</td>
                    <td className="num">{String(run.errors)}</td>
                    <td className="t-caption">{run.notes ? String(run.notes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- review queue ---------------------------------------------- */}
      <section className="stack gap-3">
        <div className="stack gap-1">
          <h2 className="t-headline-md">Review queue</h2>
          <p className="t-body-sm ink-variant measure">
            Nothing here is visible on the public site. Documents under review are published, but flagged
            because their source stopped answering.
          </p>
        </div>
        {queue.length === 0 ? (
          <Notice tone="ok">Nothing awaiting review.</Notice>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table className="table">
              <caption className="sr-only">Resources awaiting review</caption>
              <thead>
                <tr>
                  <th scope="col">Document</th><th scope="col">Status</th><th scope="col">Origin</th>
                  <th scope="col">Authority</th><th scope="col">State</th>
                  <th scope="col">Last check</th><th scope="col" className="num">Level</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((row) => (
                  <tr key={String(row.slug)}>
                    <td>
                      <span className="stack gap-1">
                        <span style={{ fontWeight: 600 }}>{String(row.title)}</span>
                        {row.sourceUrl && (
                          <a
                            href={String(row.sourceUrl)}
                            className="t-caption mono truncate"
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{ maxWidth: 380, display: 'block' }}
                          >
                            {String(row.sourceUrl)}
                          </a>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${row.status === 'UNDER_REVIEW' ? 'chip-warn' : 'chip-outline'}`}>
                        {RESOURCE_STATUS_META[String(row.status) as ResourceStatus]?.label ?? String(row.status)}
                      </span>
                    </td>
                    <td className="t-caption">{String(row.origin)}</td>
                    <td className="t-caption">{row.authorityName ? String(row.authorityName) : '—'}</td>
                    <td className="t-caption">{row.stateName ? String(row.stateName) : '—'}</td>
                    <td className="t-caption">
                      {row.lastCheckedAt ? relativeDate(String(row.lastCheckedAt)) : 'never'}
                      {row.linkState && <> · {String(row.linkState)}</>}
                    </td>
                    <td className="num">{String(row.trustLevel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="t-caption">
          To promote reviewed harvest rows:{' '}
          <code className="mono">node packages/ingestion/cli.ts --publish-reviewed</code>. It refuses anything
          whose classification was uncertain, whose last link check did not succeed, or whose rights basis is
          unresolved.
        </p>
      </section>

      {/* ---- duplicates ------------------------------------------------ */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Duplicate candidates</h2>
        {dash.duplicateCandidates.length === 0 ? (
          <Notice tone="ok">No two resources share a source URL.</Notice>
        ) : (
          <div className="card stack gap-2" style={{ padding: 16 }}>
            {dash.duplicateCandidates.map((d) => (
              <div key={d.url} className="row gap-2" style={{ justifyContent: 'space-between' }}>
                <span className="mono t-caption truncate">{d.url}</span>
                <span className="chip chip-warn">{d.n} rows</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- popular --------------------------------------------------- */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Most requested</h2>
        <p className="t-body-sm ink-variant measure">
          Aggregate counters only. Nothing records who requested what — the documents here disclose enough
          about a person's circumstances that keeping that would be a liability, not an asset.
        </p>
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="table">
            <caption className="sr-only">Most downloaded resources</caption>
            <thead><tr><th scope="col">Document</th><th scope="col" className="num">Downloads</th><th scope="col" className="num">Views</th></tr></thead>
            <tbody>
              {dash.popular.map((row) => (
                <tr key={row.slug}>
                  <td><Link href={`/resources/${row.slug}`}>{row.title}</Link></td>
                  <td className="num">{formatNumber(row.downloads)}</td>
                  <td className="num">{formatNumber(row.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- coverage -------------------------------------------------- */}
      <section className="stack gap-3">
        <h2 className="t-headline-md">Coverage by category</h2>
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="table">
            <caption className="sr-only">Resource count by category</caption>
            <thead><tr><th scope="col">Category</th><th scope="col" className="num">Published</th><th scope="col" className="num">Official</th></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.code}>
                  <td>
                    {c.resourceCount > 0
                      ? <Link href={`/resources/category/${c.slug}`}>{c.name}</Link>
                      : <span className="ink-variant">{c.name}</span>}
                  </td>
                  <td className="num">{formatNumber(c.resourceCount)}</td>
                  <td className="num">{formatNumber(c.officialCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
