import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import {
  databaseReady, getResourceDetail, getRelatedResources, runSearch, bookmarkedSlugs,
} from '@/lib/data';
import { relativeDate, formatDate } from '@/lib/format';
import { Notice } from '@/components/States';
import { DocumentViewer } from '@/components/DocumentViewer';
import { ResourceActions } from '@/components/ResourceActions';
import { ResourceRow } from '@/components/ResourceCard';
import { ResultCard } from '@/components/ResultCard';
import { TRUST_LEVELS, OFFICIAL_STATUS_META } from '@lexhall/core';
import type { OfficialStatus } from '@lexhall/core';

export const dynamic = 'force-dynamic';

/** Route segments that are pages in their own right, not resource slugs. */
const RESERVED = new Set(['search', 'kits', 'centres', 'category', 'saved', 'about']);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!databaseReady() || RESERVED.has(slug)) return { title: 'Resource' };
  const resource = getResourceDetail(slug);
  if (!resource) return { title: 'Resource not found' };

  // Only append the jurisdiction when the title does not already carry it —
  // a state variant is titled after its state, and repeating it reads as a bug.
  const where = resource.stateName ?? (resource.isPanIndia ? 'India' : null);
  const suffix = where && !resource.title.toLowerCase().includes(where.toLowerCase())
    ? ` — ${where}`
    : '';
  return {
    title: `${resource.title}${suffix}`,
    description: resource.description.slice(0, 300),
    alternates: { canonical: `/resources/${resource.slug}` },
    openGraph: { title: resource.title, description: resource.description.slice(0, 300), type: 'article' },
    robots: { index: resource.status === 'PUBLISHED', follow: true },
  };
}

export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const resource = getResourceDetail(slug);
  if (!resource) notFound();

  // A resource that is not published is not shown, whatever the URL says.
  if (!['PUBLISHED', 'UNDER_REVIEW', 'SUPERSEDED', 'WITHDRAWN'].includes(resource.status)) notFound();

  const related = getRelatedResources(resource.id, 6);
  const statusMeta = OFFICIAL_STATUS_META[resource.officialStatus as OfficialStatus];
  const trust = TRUST_LEVELS[resource.trustLevel];

  const jar = await cookies();
  const sessionRef = jar.get('lx_ref')?.value ?? '';
  const saved = sessionRef ? bookmarkedSlugs(sessionRef).includes(resource.slug) : false;

  // Professionals who list the practice area this document belongs to. Nobody is
  // presented as a specialist in the document — the register does not record
  // specialisation, so we do not infer it.
  const professionals = resource.matterSlug
    ? runSearch({ legalMatter: resource.matterSlug, perPage: 2, sort: 'verification' })
    : { hits: [], total: 0 };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': resource.template ? 'DigitalDocument' : 'WebPage',
    name: resource.title,
    description: resource.description,
    inLanguage: resource.language === 'en' ? 'en-IN' : resource.language,
    isAccessibleForFree: true,
    dateModified: resource.lastVerifiedAt ?? undefined,
    version: resource.version,
    ...(resource.authorityName
      ? { publisher: { '@type': 'GovernmentOrganization', name: resource.authorityName } }
      : { publisher: { '@type': 'Organization', name: 'CaseADVO' } }),
    ...(resource.sourceUrl ? { sameAs: resource.sourceUrl } : {}),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Resource library', item: '/resources' },
        ...(resource.categorySlug
          ? [{ '@type': 'ListItem', position: 2, name: resource.categoryName, item: `/resources/category/${resource.categorySlug}` }]
          : []),
        { '@type': 'ListItem', position: resource.categorySlug ? 3 : 2, name: resource.title, item: `/resources/${resource.slug}` },
      ],
    },
  };

  return (
    <div className="container section-tight stack gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="t-label-mono ink-variant" aria-label="Breadcrumb">
        <Link href="/resources">Resource library</Link>
        {resource.categorySlug && (
          <> / <Link href={`/resources/category/${resource.categorySlug}`}>{resource.categoryName}</Link></>
        )}
        {resource.subcategory && <> / {resource.subcategory}</>}
      </nav>

      {resource.status === 'WITHDRAWN' && (
        <Notice tone="error">
          <strong>Withdrawn.</strong> The publisher has withdrawn this document. It is kept here as a record of
          what was published, not as something to use.
        </Notice>
      )}
      {resource.status === 'SUPERSEDED' && (
        <Notice tone="warn">
          <strong>Superseded.</strong> A newer version of this document exists. Do not file this one.
        </Notice>
      )}
      {resource.status === 'UNDER_REVIEW' && (
        <Notice tone="warn">
          <strong>Under review.</strong> Our last check on the source did not succeed
          {resource.linkStateLabel ? ` (${resource.linkStateLabel.toLowerCase()})` : ''}. The document may have
          moved. Treat it with caution and check the authority’s own site.
        </Notice>
      )}

      {/* ---- header ---------------------------------------------------- */}
      <header className="stack gap-3">
        <div className="row wrap gap-1">
          <span className={`chip ${resource.statusTone}`}>{statusMeta?.label ?? resource.officialStatus}</span>
          <span className={`chip ${resource.typeTone}`}>{resource.typeLabel}</span>
          {resource.stateName && <span className="chip chip-outline">{resource.stateName}</span>}
          {resource.isPanIndia && <span className="chip chip-outline">All of India</span>}
          <span className="chip chip-lime">Free</span>
        </div>

        <h1 className="t-headline-lg">{resource.title}</h1>
        <p className="t-body-lg ink-variant measure">{resource.description}</p>

        {/* The badge means something, so say what it means, here, not in a footer. */}
        <div className="notice notice-legal">
          <span className="notice-icon" aria-hidden="true">§</span>
          <span className="t-body-sm">{statusMeta?.plain}</span>
        </div>

        <ResourceActions
          slug={resource.slug}
          title={resource.title}
          hasPreview={Boolean(resource.template)}
          sourceUrl={resource.sourceUrl ?? resource.landingUrl}
          initiallySaved={saved}
        />
      </header>

      {/* ---- facts ----------------------------------------------------- */}
      <section className="card" style={{ padding: 20 }}>
        <h2 className="t-title" style={{ marginBottom: 14 }}>The facts about this document</h2>
        <dl className="fact-grid">
          <div>
            <dt>Type</dt>
            <dd>{resource.typeLabel}</dd>
          </div>
          <div>
            <dt>Published by</dt>
            <dd>{resource.authorityName ?? 'CaseADVO'}</dd>
          </div>
          <div>
            <dt>Source level</dt>
            <dd>{trust?.label ?? `Level ${resource.trustLevel}`}</dd>
          </div>
          <div>
            <dt>Applies to</dt>
            <dd>{resource.stateName ?? (resource.isPanIndia ? 'All of India' : 'Not stated')}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd className="mono">{resource.version}</dd>
          </div>
          <div>
            <dt>Last verified</dt>
            <dd>{resource.lastVerifiedAt ? formatDate(resource.lastVerifiedAt) : 'Never'}</dd>
          </div>
          <div>
            <dt>Last checked</dt>
            <dd>
              {resource.lastCheckedAt ? relativeDate(resource.lastCheckedAt) : 'Never'}
              {resource.linkStateLabel && <> · {resource.linkStateLabel}</>}
            </dd>
          </div>
          <div>
            <dt>Next review due</dt>
            <dd>{resource.reviewDueAt ? formatDate(resource.reviewDueAt) : 'Not scheduled'}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{resource.language === 'en' ? 'English' : resource.language.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Rights basis</dt>
            <dd>{resource.deliveryMode === 'link_only' ? 'Linked, not hosted' : 'CaseADVO-authored'}</dd>
          </div>
        </dl>
        <p className="t-caption" style={{ marginTop: 14 }}>{resource.rightsNote}</p>
      </section>

      {/* ---- usage notes ----------------------------------------------- */}
      {resource.usageNotes.length > 0 && (
        <section className="stack gap-3">
          <h2 className="t-title-lg">What this actually is, and when you need it</h2>
          <ul className="stack gap-2 list-plain">
            {resource.usageNotes.map((note, i) => (
              <li key={i} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                <span aria-hidden="true" className="ink-accent">—</span>
                <span className="t-body">{note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- preview or the honest alternative ------------------------- */}
      {resource.template ? (
        <section className="stack gap-3">
          <div className="stack gap-1">
            <h2 className="t-title-lg">Read it before you download it</h2>
            <p className="t-body-sm ink-variant">
              {resource.template.pageCount} page{resource.template.pageCount === 1 ? '' : 's'},{' '}
              {resource.template.wordCount.toLocaleString('en-IN')} words. Arrow keys turn pages; + and − zoom.
              The highlighted words are the blanks you fill in.
            </p>
          </div>
          <DocumentViewer
            body={resource.template.body}
            fields={resource.template.fields}
            title={resource.title}
          />
        </section>
      ) : (
        <section className="card stack gap-3" style={{ padding: 20 }}>
          <h2 className="t-title-lg">Why there is no preview here</h2>
          <p className="t-body ink-variant measure">
            This document belongs to {resource.authorityName ?? 'its publisher'}. We have not sought permission
            to host a copy, so the library records what it is and links to their own copy rather than
            reproducing it. That is also the only way to be sure you are getting the current version — a
            mirrored form is out of date the moment the authority revises it.
          </p>
          {(resource.sourceUrl || resource.landingUrl) && (
            <div className="row wrap gap-2">
              {resource.sourceUrl && (
                <a href={resource.sourceUrl} className="btn btn-primary" target="_blank" rel="noreferrer noopener">
                  Open at {new URL(resource.sourceUrl).hostname} ↗
                </a>
              )}
              {resource.landingUrl && resource.landingUrl !== resource.sourceUrl && (
                <a href={resource.landingUrl} className="btn btn-secondary" target="_blank" rel="noreferrer noopener">
                  The page it lives on ↗
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {/* ---- before you use it ----------------------------------------- */}
      {resource.template && resource.template.beforeYouUse.length > 0 && (
        <section className="card stack gap-3" style={{ padding: 20 }}>
          <h2 className="t-title-lg">Before you use it</h2>
          <ol className="stack gap-2">
            {resource.template.beforeYouUse.map((item, i) => (
              <li key={i} className="t-body" style={{ marginLeft: '1.2em' }}>{item}</li>
            ))}
          </ol>
        </section>
      )}

      {/* ---- jurisdiction notes: the whole point ----------------------- */}
      {resource.template && resource.template.jurisdictionNotes.length > 0 && (
        <section className="stack gap-3">
          <div className="stack gap-1">
            <h2 className="t-title-lg">What differs by state</h2>
            <p className="t-body-sm ink-variant measure">
              Registration, stamp duty, limitation and the forum that hears a dispute are state subjects. This
              is where a document that looks universal stops being universal.
            </p>
          </div>
          {resource.template.jurisdictionNotes.map((note, i) => (
            <details key={i} className="acc" open={i === 0}>
              <summary><span>{note.heading}</span></summary>
              <div className="acc-body">{note.body}</div>
            </details>
          ))}
        </section>
      )}

      {/* ---- attached official links ----------------------------------- */}
      {resource.links.length > 0 && (
        <section className="stack gap-3">
          <div className="stack gap-1">
            <h2 className="t-title-lg">The official forms and portals this relates to</h2>
            <p className="t-body-sm ink-variant measure">
              Where a prescribed form exists, use it. A covering document we wrote does not replace one.
            </p>
          </div>
          <div className="stack gap-2">
            {resource.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="card row gap-3"
                style={{ padding: 14, textDecoration: 'none', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span className="stack gap-1" style={{ minWidth: 0 }}>
                  <span className="t-body-sm" style={{ fontWeight: 600 }}>{link.label}</span>
                  {link.publisher && <span className="t-caption">{link.publisher}</span>}
                </span>
                <span className="chip chip-teal" style={{ flex: 'none' }}>Official ↗</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ---- provenance ------------------------------------------------ */}
      <section className="stack gap-3">
        <h2 className="t-title-lg">Provenance and verification</h2>
        <div className="split-2">
          <div className="card stack gap-3" style={{ padding: 18 }}>
            <h3 className="t-title-sm">How this scores on provenance</h3>
            <p className="t-caption">
              {resource.qualityScore} out of 100. This measures where the document came from and how recently
              we checked it. <strong>It is not a statement about legal validity</strong> — a perfectly scored
              document can still be the wrong document for your case.
            </p>
            {resource.qualityBreakdown.factors.map((factor) => (
              <div key={factor.key} className="stack gap-1">
                <div className="factor-row">
                  <span className="t-body-sm">{factor.label}</span>
                  <span className="mono t-caption">{factor.earned}/{factor.possible}</span>
                  <span className="factor-bar">
                    <span className="factor-fill" style={{ width: `${(factor.earned / factor.possible) * 100}%` }} />
                  </span>
                </div>
                <span className="t-caption">{factor.note}</span>
              </div>
            ))}
          </div>

          <div className="card stack gap-3" style={{ padding: 18 }}>
            <h3 className="t-title-sm">Check history</h3>
            {resource.verifications.length === 0 ? (
              <p className="t-body-sm ink-variant">No check has been recorded yet.</p>
            ) : (
              <ul className="stack gap-2 list-plain">
                {resource.verifications.map((v, i) => (
                  <li key={i} className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="t-body-sm">
                      {v.method === 'link_check' ? 'Automatic link check' : v.method === 'manual_review' ? 'Reviewed by a person' : v.method}
                      {v.httpStatus ? <span className="mono t-caption"> · HTTP {v.httpStatus}</span> : null}
                    </span>
                    <span className="t-caption">{v.outcome} · {relativeDate(v.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}

            {resource.versions.length > 0 && (
              <>
                <h3 className="t-title-sm" style={{ marginTop: 8 }}>Versions</h3>
                <ul className="stack gap-2 list-plain">
                  {resource.versions.map((v) => (
                    <li key={v.version} className="stack gap-1">
                      <span className="t-body-sm">
                        <span className="mono">{v.version}</span>
                        {v.effectiveFrom && <span className="ink-variant"> from {formatDate(v.effectiveFrom)}</span>}
                        {v.supersededAt && <span className="ink-variant"> · superseded {formatDate(v.supersededAt)}</span>}
                      </span>
                      <span className="t-caption">{v.changeNote}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ---- the matter it belongs to ---------------------------------- */}
      {resource.matterSlug && resource.domainSlug && (
        <section className="card stack gap-3" style={{ padding: 20 }}>
          <h2 className="t-title-lg">Where this fits in the law</h2>
          <p className="t-body ink-variant">
            This document belongs to the matter{' '}
            <Link href={`/matters/${resource.domainSlug}/${resource.matterSlug}`} style={{ textDecoration: 'underline' }}>
              {resource.matterName}
            </Link>
            . That page sets out what is usually at issue, what a lawyer actually does, and which forum decides
            it.
          </p>
          <div className="row wrap gap-2">
            <Link href={`/matters/${resource.domainSlug}/${resource.matterSlug}`} className="btn btn-secondary btn-sm">
              About {resource.matterName}
            </Link>
            <Link href={`/resources/search?matter=${resource.matterSlug}`} className="btn btn-ghost btn-sm">
              Every resource for this matter
            </Link>
          </div>
        </section>
      )}

      {/* ---- related --------------------------------------------------- */}
      {related.length > 0 && (
        <section className="stack gap-3">
          <h2 className="t-title-lg">Used alongside this</h2>
          <div className="grid-auto">
            {related.map((card) => <ResourceRow key={card.id} card={card} />)}
          </div>
        </section>
      )}

      {/* ---- professional connection, stated carefully ----------------- */}
      {professionals.hits.length > 0 && (
        <section className="stack gap-3">
          <div className="stack gap-1">
            <h2 className="t-title-lg">If you want this reviewed</h2>
            <p className="t-body-sm ink-variant measure">
              These advocates list the practice area this document belongs to. The Bar Council register does not
              record specialisation, so none of them is shown as a specialist in this document, and this is not
              a recommendation. Ranking here cannot be bought.
            </p>
          </div>
          <div className="stack gap-3">
            {professionals.hits.map((hit) => <ResultCard key={hit.professional.id} hit={hit} showScore={false} />)}
          </div>
          <div className="row wrap gap-2">
            <Link href={`/search?legalMatter=${resource.matterSlug}`} className="btn btn-secondary btn-sm">
              See all {professionals.total}
            </Link>
            <Link href="/resources/kits/i-need-a-free-lawyer" className="btn btn-ghost btn-sm">
              Free legal aid, if you qualify
            </Link>
          </div>
        </section>
      )}

      {/* ---- disclaimer, last and unmissable --------------------------- */}
      <Notice tone="legal">
        <span>
          <strong>Important.</strong> {resource.disclaimer}
        </span>
      </Notice>
    </div>
  );
}
