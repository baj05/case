import Link from 'next/link';
import type { Metadata } from 'next';
import { databaseReady, getResourceStats, adminResourceDashboard } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { Notice } from '@/components/States';
import { TRUST_LEVELS, OFFICIAL_STATUS_META, RIGHTS_BASIS_META, LINK_OUTCOME_META } from '@lexhall/core';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'How the resource library works',
  description:
    'What is in the resource library, where each document comes from, how sources are verified, what we will '
    + 'not host and why, and the limits of what any of it can tell you.',
  alternates: { canonical: '/resources/about' },
};

export default function AboutResourcesPage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const stats = getResourceStats();
  const dash = adminResourceDashboard();

  return (
    <div className="container section-tight stack gap-8" style={{ maxWidth: 860 }}>
      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/resources">Resource library</Link> / How it works
      </nav>

      <header className="stack gap-3">
        <h1 className="t-headline-lg">How this library works</h1>
        <p className="t-body-lg ink-variant">
          A legal resource library can mislead in ways an ordinary content page cannot: a document that looks
          official but is not, a national template presented as valid in every state, a form that was withdrawn
          two years ago. This page states what we do about each of those, and what the library cannot do.
        </p>
      </header>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What is actually here</h2>
        <div className="stat-strip">
          <span className="stat"><span className="stat-num">{formatNumber(stats.published)}</span><span className="stat-label">Published</span></span>
          <span className="stat"><span className="stat-num">{formatNumber(stats.official)}</span><span className="stat-label">Official sources</span></span>
          <span className="stat"><span className="stat-num">{formatNumber(stats.templates)}</span><span className="stat-label">Lexhall templates</span></span>
          <span className="stat"><span className="stat-num">{formatNumber(stats.previewable)}</span><span className="stat-label">Readable here</span></span>
          <span className="stat"><span className="stat-num">{formatNumber(stats.awaitingReview)}</span><span className="stat-label">Awaiting review</span></span>
        </div>
        <p className="t-body ink-variant">
          The counts are computed from the database on every request, so they cannot drift from reality. The
          "awaiting review" figure is deliberately visible: those are documents the pipeline has discovered or
          catalogued but which are not published, and a library that hid that number would be flattering itself.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">The distinction that matters most</h2>
        <p className="t-body ink-variant">
          Every resource carries one of these four labels, on its card and on its page, and they are never
          styled to look alike.
        </p>
        <div className="stack gap-3">
          {Object.entries(OFFICIAL_STATUS_META).map(([code, meta]) => (
            <div key={code} className="card stack gap-2" style={{ padding: 16 }}>
              <span className={`chip ${meta.tone}`} style={{ alignSelf: 'flex-start' }}>{meta.label}</span>
              <p className="t-body-sm">{meta.plain}</p>
            </div>
          ))}
        </div>
        <Notice tone="legal">
          Nothing Lexhall wrote is ever labelled official, and the seeder throws an error rather than accept a
          document whose declared type and status contradict each other. That check runs before anything reaches
          the database, which is why it cannot be bypassed by an editorial mistake.
        </Notice>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Why we link instead of hosting</h2>
        <p className="t-body ink-variant">
          Every official document in this library opens at the publisher’s own site. We have not sought or
          obtained permission to rehost government documents, so we store the metadata and point at their
          copy. Two consequences, both of them in your favour:
        </p>
        <ul className="stack gap-2 list-plain">
          <li className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span aria-hidden="true" className="ink-accent">—</span>
            <span className="t-body">You always get the current version. A mirrored form is stale the moment the authority revises it, and there is no way for you to tell.</span>
          </li>
          <li className="row gap-2" style={{ alignItems: 'flex-start' }}>
            <span aria-hidden="true" className="ink-accent">—</span>
            <span className="t-body">The document’s provenance is visible in the address bar. A form served from our domain looks like ours, and for anything you are about to file that matters.</span>
          </li>
        </ul>
        <p className="t-body ink-variant">
          The cost is that we cannot show you a preview of an official form. We would rather admit that than
          fake it. The rights position we record for each resource:
        </p>
        <div className="row wrap gap-1">
          {Object.entries(RIGHTS_BASIS_META).map(([code, meta]) => (
            <span key={code} className={`chip ${meta.mayMirror ? 'chip-lime' : 'chip-outline'}`} title={meta.plain}>
              {meta.label}
            </span>
          ))}
        </div>
        <p className="t-caption">
          Anything marked “rights unresolved” is never offered as a download. Currently{' '}
          {formatNumber(dash.rightsUnresolved)} resource{dash.rightsUnresolved === 1 ? '' : 's'} in that state.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">How a source becomes published</h2>
        <ol className="stack gap-3">
          {[
            ['Discovered or catalogued', 'Either written into the catalogue by hand with a URL somebody opened, or found by the harvester reading a publisher’s own forms page.'],
            ['Classified', 'A deterministic classifier assigns the type, category and subject. It records its own confidence, and it rejects recruitment notices, tenders and internal administration rather than passing them off as legal forms.'],
            ['Link-checked', 'The URL is fetched. The outcome is classified rather than treated as pass or fail — see below.'],
            ['Published, or held', 'Only a successful fetch publishes anything. A resource whose URL nobody could open stays invisible to this site, however good it looks in a seed file.'],
            ['Re-checked on a schedule', 'Official forms every 90 days, portals every 60, templates annually. The date on a resource page is the last time the source actually answered, not the last time we edited the record.'],
          ].map(([title, body], i) => (
            <li key={title} className="row gap-3" style={{ alignItems: 'flex-start' }}>
              <span
                className="mono"
                aria-hidden="true"
                style={{
                  flex: 'none', width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--trust-navy)', color: 'var(--surface-lowest)',
                  display: 'grid', placeItems: 'center', fontSize: '0.75rem',
                }}
              >
                {i + 1}
              </span>
              <span className="stack gap-1">
                <span className="t-title-sm">{title}</span>
                <span className="t-body-sm ink-variant">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Why a 403 is not a broken link</h2>
        <p className="t-body ink-variant">
          A number of Indian government sites refuse automated requests outright. Treating that as “this
          document is gone” would empty the library of precisely the sources that matter most — the Supreme
          Court, the GST portal, the Ministry of Corporate Affairs. So the checker classifies rather than
          judging:
        </p>
        <div className="stack gap-2">
          {Object.entries(LINK_OUTCOME_META).map(([code, meta]) => (
            <div key={code} className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <span className={`chip ${meta.healthy ? 'chip-lime' : 'chip-warn'}`} style={{ flex: 'none', minWidth: 148 }}>
                {meta.label}
              </span>
              <span className="t-body-sm">
                {meta.plain}
                {meta.needsHuman && <span className="ink-variant"> Flagged for a person.</span>}
              </span>
            </div>
          ))}
        </div>
        <p className="t-caption">
          Current state of the library: {formatNumber(dash.byLinkState.find((s) => s.state === 'ok')?.n ?? 0)} reachable,{' '}
          {formatNumber(dash.blocked)} blocked to automated checks, {formatNumber(dash.broken)} failing,{' '}
          {formatNumber(dash.neverChecked)} never checked.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Source levels</h2>
        <p className="t-body ink-variant">
          Every resource records how close its publisher is to the authority that actually decides the matter.
          It feeds the provenance score, and it is shown on the resource page.
        </p>
        <div className="stack gap-2">
          {Object.entries(TRUST_LEVELS).map(([level, meta]) => (
            <div key={level} className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <span className="chip chip-outline mono" style={{ flex: 'none' }}>{level}</span>
              <span className="stack gap-1">
                <span className="t-body-sm" style={{ fontWeight: 600 }}>{meta.label.replace(/^Level \d+ — /, '')}</span>
                <span className="t-caption">{meta.plain}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">The provenance score is not a legal score</h2>
        <p className="t-body ink-variant">
          Each resource carries a number out of 100, and the breakdown is published on its page. It measures
          where a document came from, how complete its metadata is, and how recently the source answered.
          It says nothing whatsoever about whether the document is right for your case, whether a registrar
          will accept it, or whether it reflects an amendment made last month. A document can score 100 and
          still be the wrong document.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What this library will not do</h2>
        <ul className="stack gap-2 list-plain">
          {[
            'Present anything we wrote as a government or court form.',
            'Offer a national template as though it were valid in every state. Tenancy registration, stamp duty and the forum that hears a dispute are state subjects, and the state note comes before the document.',
            'Publish a scraped document without a successful fetch, and without a classification it can defend.',
            'Serve a copy of a document whose rights position is unresolved.',
            'Record who downloaded what. Counters are aggregate. A person reading an eviction notice or a domestic violence complaint form is not building a profile they will later regret.',
            'Bypass a robots.txt disallow, a CAPTCHA or an access control to obtain a document.',
            'Give legal advice, or tell you which of these documents applies to your facts.',
          ].map((line) => (
            <li key={line} className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <span aria-hidden="true" className="ink-accent">—</span>
              <span className="t-body">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Known gaps</h2>
        <p className="t-body ink-variant">
          Stated plainly, because a library that hides its gaps wastes your time:
        </p>
        <ul className="stack gap-2 list-plain">
          {[
            `${formatNumber(dash.blocked)} sources refuse our automated checks. They are almost certainly healthy in a browser, but we cannot confirm it from here, so their verification dates are older than we would like.`,
            'Several state authorities were unreachable from our network at authoring time. Those entries are seeded but held back rather than published on an unverified URL.',
            'Regional-language versions are not yet held. Where an authority publishes a Hindi or regional form, the library currently links to the page rather than the specific language version.',
            'Judgment and statute coverage is by link to the official search interfaces, not a local corpus. Full-text search across judgments is a separate piece of work.',
            'There is no authentication in this build, so saved lists are device-local and there are no user collections.',
          ].map((line) => (
            <li key={line} className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <span aria-hidden="true" className="ink-accent">—</span>
              <span className="t-body">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <Notice tone="legal">
        <span>
          Nothing in this library is legal advice, and using a document from it does not create any
          relationship between you and Lexhall or any advocate listed on this site. Requirements differ between
          states and change over time. If the amount at stake, or the deadline, makes advice worth having,{' '}
          <Link href="/search" style={{ textDecoration: 'underline' }}>find an advocate</Link> — or check
          whether you qualify for{' '}
          <Link href="/resources/kits/i-need-a-free-lawyer" style={{ textDecoration: 'underline' }}>free legal aid</Link>.
        </span>
      </Notice>
    </div>
  );
}
