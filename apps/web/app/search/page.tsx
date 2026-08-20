import Link from 'next/link';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DualSearch } from '@/components/DualSearch';
import { ResultCard } from '@/components/ResultCard';
import { FilterPanel, type FilterGroupSpec } from '@/components/FilterPanel';
import { EmptyState, Notice, ResultSkeletonList } from '@/components/States';
import { runSearch, getPracticeAreas, getCourts, getStates, recordSearchEvent, databaseReady } from '@/lib/data';
import { formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Find a legal professional',
  description: 'Search advocates, senior advocates and firms by legal issue, practice area, court, jurisdiction and city.',
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!databaseReady()) {
    return (
      <div className="container section">
        <Notice tone="warn" title="Database not initialised">
          Run <code className="mono">npm run ingest</code> to build the local database.
        </Notice>
      </div>
    );
  }

  const sp = await searchParams;
  const q = one(sp.q) ?? '';
  // `near` is a free-text place from the dual search; the classifier resolves
  // it, so it is appended to the query rather than needing its own lookup.
  const near = one(sp.near) ?? '';
  const combinedQuery = [q, near].filter(Boolean).join(' ');
  const page = Math.max(1, Number(one(sp.page) ?? '1') || 1);

  const filters = {
    q: combinedQuery,
    practice: one(sp.practice),
    location: one(sp.location),
    court: one(sp.court),
    kind: one(sp.kind),
    matter: one(sp.matter),
    legalMatter: one(sp.legalMatter),
    language: one(sp.language),
    verifiedOnly: one(sp.verified) === '1',
    acceptingOnly: one(sp.accepting) === '1',
    availableSoon: one(sp.available) === '1',
    feeMaxMinor: one(sp.feemax) ? Number(one(sp.feemax)) : undefined,
    minYears: one(sp.years) ? Number(one(sp.years)) : undefined,
    sort: (one(sp.sort) as
      'relevance' | 'verification' | 'name' | 'fee_asc' | 'fee_desc' | 'experience_desc' | undefined)
      ?? 'relevance',
    page,
    perPage: 12,
  };

  const outcome = runSearch(filters);

  // Zero-result intelligence (spec §112). Stores the query and the parse, never
  // a matter description.
  try {
    recordSearchEvent({
      rawQuery: q || null,
      parsed: {
        practiceArea: outcome.intake.practiceArea?.value.code ?? null,
        location: outcome.intake.location?.value.slug ?? null,
        court: outcome.intake.court?.value.slug ?? null,
        matterType: outcome.intake.matterType?.value.code ?? null,
        legalMatter: outcome.intake.matter?.value.code ?? null,
        urgency: outcome.intake.urgency,
      },
      filters: { practice: filters.practice, location: filters.location, court: filters.court, kind: filters.kind, legalMatter: filters.legalMatter },
      resultCount: outcome.total,
      topProfessionalId: outcome.hits[0]?.professional.id ?? null,
      latencyMs: outcome.latencyMs,
      sessionRef: null,
    });
  } catch { /* telemetry must never break the page */ }

  // ---- filter groups, counts computed from the live corpus -----------------
  const areas = getPracticeAreas();
  const courts = getCourts();
  const states = getStates();

  const groups: FilterGroupSpec[] = [
    {
      key: 'practice',
      label: 'Practice area',
      openByDefault: true,
      options: areas.map((a) => ({
        label: a.parentName ? `${a.parentName} › ${a.name}` : a.name,
        value: a.slug,
        count: a.professionalCount,
      })),
    },
    {
      key: 'location',
      label: 'State or union territory',
      options: states.filter((s) => s.professionalCount > 0 || s.name === 'Delhi').map((s) => ({
        label: s.name, value: s.slug, count: s.professionalCount,
      })),
    },
    {
      key: 'court',
      label: 'Court or tribunal',
      options: courts.filter((c) => c.tier <= 4).map((c) => ({
        label: c.shortName ?? c.name, value: c.slug, count: c.professionalCount,
      })),
    },
    {
      key: 'kind',
      label: 'Professional type',
      options: [
        { label: 'Advocate', value: 'advocate' },
        { label: 'Senior Advocate', value: 'senior_advocate' },
        { label: 'Law firm', value: 'law_firm' },
        { label: 'Chambers', value: 'chamber' },
        { label: 'Mediator', value: 'mediator' },
        { label: 'Arbitrator', value: 'arbitrator' },
        { label: 'Legal process outsourcing', value: 'lpo' },
      ],
    },
  ];

  const start = (outcome.page - 1) * outcome.perPage + 1;
  const end = Math.min(outcome.total, outcome.page * outcome.perPage);
  const totalPages = Math.max(1, Math.ceil(outcome.total / outcome.perPage));

  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = one(v);
      if (val) next.set(k, val);
    }
    if (n > 1) next.set('page', String(n)); else next.delete('page');
    const qs = next.toString();
    return qs ? `/search?${qs}` : '/search';
  };

  return (
    <div className="container section-tight stack gap-6">
      {/* --------------------------------------------------------- search bar */}
      <div className="stack gap-3">
        <DualSearch defaultQuery={q} defaultLocation={one(sp.near) ?? ''} size="sm" />

        {/* What we understood, and how to correct it. */}
        {(q || outcome.appliedFilters.length > 0) && (
          <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
            <div className="stack gap-2" style={{ minWidth: 0 }}>
              <p className="t-body" style={{ fontWeight: 600 }}>{outcome.intake.interpretation}</p>
              {outcome.appliedFilters.length > 0 && (
                <div className="row wrap gap-1">
                  {outcome.appliedFilters.map((f) => (
                    <span key={`${f.key}-${f.value}`} className="chip chip-teal" title={f.label}>
                      {f.value}
                    </span>
                  ))}
                </div>
              )}
              {outcome.intake.alternativePracticeAreas.length > 0 && (
                <p className="t-caption">
                  Did you mean:{' '}
                  {outcome.intake.alternativePracticeAreas.map((alt, i) => (
                    <span key={alt.value.id}>
                      {i > 0 && ' · '}
                      <Link href={`/search?practice=${alt.value.slug}${q ? `&q=${encodeURIComponent(q)}` : ''}`} style={{ textDecoration: 'underline' }}>
                        {alt.value.name}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------- results + filters */}
      <div className="search-layout">
        <FilterPanel groups={groups} total={outcome.total} />

        <div className="stack gap-4" style={{ minWidth: 0 }}>
          <div className="row wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p className="t-body-sm ink-variant" role="status">
              {outcome.total === 0
                ? 'No matching professionals'
                : `${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(outcome.total)}`}
              <span className="mono"> · {outcome.latencyMs}ms</span>
            </p>
            <form method="get" className="row gap-2">
              {Object.entries(sp).map(([k, v]) => {
                const val = one(v);
                return k === 'sort' || !val ? null : <input key={k} type="hidden" name={k} value={val} />;
              })}
              <label htmlFor="sort" className="t-caption">Sort</label>
              <select id="sort" name="sort" defaultValue={filters.sort} className="select" style={{ width: 'auto', minHeight: 40 }}>
                <option value="relevance">Best match</option>
                <option value="fee_asc">Consultation fee: low to high</option>
                <option value="fee_desc">Consultation fee: high to low</option>
                <option value="experience_desc">Years in practice: most first</option>
                <option value="verification">Verification level</option>
                <option value="name">Name A–Z</option>
              </select>
              <button type="submit" className="btn btn-secondary btn-sm">Apply</button>
            </form>
          </div>

          <Suspense fallback={<ResultSkeletonList />}>
            {outcome.total === 0 ? (
              <EmptyState
                title="No professionals match that combination yet"
                body={
                  outcome.intake.practiceArea
                    ? `We understood this as ${outcome.intake.practiceArea.value.name}. Practice areas are self-declared, so they only appear on profiles a professional has claimed — which is why a specific area can return nothing while the directory itself is large.`
                    : 'Try widening the location, or search by name, court or Bar Council instead.'
                }
                actions={outcome.recovery.map((r) => ({ label: r.label, href: r.href, detail: `${r.count}` }))}
              />
            ) : (
              <div className="stack gap-3">
                {outcome.hits.map((hit) => (
                  <ResultCard key={hit.professional.id} hit={hit} showScore={filters.sort === 'relevance'} />
                ))}
              </div>
            )}
          </Suspense>

          {/* Thin-result recovery even when there ARE results. */}
          {outcome.total > 0 && outcome.recovery.length > 0 && (
            <Notice tone="info" title="Only a few matches">
              <span className="row wrap gap-2" style={{ marginTop: 6 }}>
                {outcome.recovery.map((r) => (
                  <Link key={r.href} href={r.href} className="chip chip-button chip-outline">
                    {r.label} <span className="mono">{r.count}</span>
                  </Link>
                ))}
              </span>
            </Notice>
          )}

          {totalPages > 1 && (
            <nav className="row wrap gap-2" aria-label="Pagination" style={{ justifyContent: 'center', paddingTop: 8 }}>
              {outcome.page > 1 && <Link href={pageHref(outcome.page - 1)} className="btn btn-secondary btn-sm" rel="prev">Previous</Link>}
              <span className="t-body-sm ink-variant" style={{ alignSelf: 'center' }}>
                Page {outcome.page} of {totalPages}
              </span>
              {outcome.page < totalPages && <Link href={pageHref(outcome.page + 1)} className="btn btn-secondary btn-sm" rel="next">Next</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
