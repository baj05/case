import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getECourtsStats, getECourtsCourtList, getECourtsStateList,
  getECourtsAdvocateList, getECourtsAdvocateCount, databaseReady,
} from '@/lib/data';
import { formatNumber, compactIndian } from '@/lib/format';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Advocate names on the record — licensed case-record data',
  description:
    'Advocate names appearing on real court case records, sourced under licence from the '
    + 'eCourtsIndia API — distinct from CaseADVO\'s main Bar Council–sourced directory.',
};

const PAGE_SIZE = 30;

const CONFIDENCE_LABEL: Record<string, string> = {
  full_name: 'Full name on record',
  initials_surname: 'Initials + surname only',
  surname_only: 'Surname only',
};

export default async function CourtDirectoryPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; page?: string }> }) {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }

  const { q: rawQ, page: rawPage } = await searchParams;
  const q = (rawQ ?? '').trim();
  const page = Math.max(1, Number(rawPage) || 1);

  const stats = getECourtsStats();
  if (stats.advocates === 0 && stats.states === 0) {
    return (
      <div className="container section-tight stack gap-4">
        <h1 className="t-headline-lg">Advocate names on the record</h1>
        <Notice tone="info" title="No court directory data ingested yet">
          Set <code className="mono">ECOURTS_API_KEY</code> in <code className="mono">.env</code>, then run{' '}
          <code className="mono">npm run db:ecourts -- --structure --advocates</code>.
        </Notice>
      </div>
    );
  }

  const courts = getECourtsCourtList(18);
  const states = getECourtsStateList();
  const total = getECourtsAdvocateCount(q || undefined);
  const advocates = getECourtsAdvocateList({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q: q || undefined });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const retrieved = stats.retrievedAt
    ? new Date(stats.retrievedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const pageHref = (p: number) => `/case-records?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="stack gap-8">
      <section className="hero textured">
        <div className="container stack gap-4" style={{ maxWidth: '56ch' }}>
          <p className="t-label-mono ink-variant">Case-record names</p>
          <h1 className="t-display-lg">Every name that appeared on the record.</h1>
          <p className="t-body-lg ink-variant">
            Court structure across {stats.states} states and union territories, and the advocate names
            appearing on real case records — so you can see who actually practises where.
          </p>
        </div>
      </section>

      <div className="container stack gap-6" style={{ paddingBottom: 'clamp(48px, 8vw, 96px)' }}>
        <Notice tone="legal" title="On the record — not verified profiles">
          These advocate names come from case records supplied under licence by the eCourtsIndia API
          {retrieved ? `, retrieved ${retrieved}` : ''}. A name here means it <strong>appeared on a court
          record</strong> — it is not a CaseADVO-verified profile, and it is not the same as our{' '}
          <Link href="/search" style={{ textDecoration: 'underline' }}>Bar Council–sourced directory</Link>.
          Names are often partial, so two similar entries may or may not be one person; nothing is merged
          on a guess. No litigant or party records are held.
        </Notice>

        <div className="stat-band">
          {[
            [formatNumber(stats.states), 'States & UTs'],
            [formatNumber(stats.districts), 'Districts mapped'],
            [formatNumber(stats.courts), 'Courts seen in the record'],
            [formatNumber(stats.advocates), 'Advocate names on record'],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="stat-band-num">{n}</div>
              <div className="stat-band-label">{l}</div>
            </div>
          ))}
        </div>

        <section className="stack gap-3">
          <div className="row wrap gap-4" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="stack gap-1">
              <h2 className="t-headline-md">Advocates on the record</h2>
              <p className="t-body-sm ink-variant measure">
                Ordered by how many case appearances the source exposes. That is a{' '}
                <strong>coverage signal, not a ranking</strong> — it reflects what this dataset happens to
                show, not an advocate&apos;s ability or standing.
              </p>
            </div>
            <form action="/case-records" className="row gap-2">
              <label htmlFor="adv-q" className="sr-only">Search advocate names</label>
              <input id="adv-q" name="q" defaultValue={q} className="input" placeholder="Search a name…" style={{ minWidth: 200 }} />
              <button type="submit" className="btn btn-secondary">Search</button>
            </form>
          </div>

          <p className="t-caption">
            {formatNumber(total)} name{total === 1 ? '' : 's'}{q ? ` matching “${q}”` : ''}
            {pages > 1 ? ` · page ${page} of ${formatNumber(pages)}` : ''}
          </p>

          {advocates.length === 0 ? (
            <p className="t-body ink-variant">No names match that search.</p>
          ) : (
            <div className="stack gap-2">
              {advocates.map((a) => (
                <article key={a.id} className="card row wrap gap-3" style={{ padding: 14, justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                    <strong style={{ wordBreak: 'break-word' }}>{a.nameRaw}</strong>
                    <span className="row wrap gap-2 t-caption">
                      <span>{CONFIDENCE_LABEL[a.identityConfidence] ?? a.identityConfidence}</span>
                      {a.firstFilingYear && a.lastFilingYear && (
                        <span>· on record {a.firstFilingYear}–{a.lastFilingYear}</span>
                      )}
                      {a.stateCodes.length > 0 && <span>· {a.stateCodes.slice(0, 4).join(', ')}{a.stateCodes.length > 4 ? '…' : ''}</span>}
                    </span>
                  </div>
                  <span className="row wrap gap-2" style={{ alignItems: 'center' }}>
                    {a.identityConfidence !== 'full_name' && (
                      <span className="chip chip-warn" style={{ fontSize: '0.6875rem' }}>Partial name</span>
                    )}
                    <span className="chip chip-outline" style={{ fontSize: '0.6875rem' }}>
                      {a.appearanceCount} appearance{a.appearanceCount === 1 ? '' : 's'}
                    </span>
                    <span className="chip chip-outline" style={{ fontSize: '0.6875rem' }}>
                      {a.courtCodes.length} court{a.courtCodes.length === 1 ? '' : 's'}
                    </span>
                    {a.claimed
                      ? <span className="chip chip-lime" style={{ fontSize: '0.6875rem' }}>Claimed</span>
                      : <span className="t-caption">Unclaimed</span>}
                  </span>
                </article>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="row wrap gap-2" style={{ justifyContent: 'center' }}>
              {page > 1 && <Link href={pageHref(page - 1)} className="btn btn-secondary btn-sm">← Previous</Link>}
              {page < pages && <Link href={pageHref(page + 1)} className="btn btn-secondary btn-sm">Next →</Link>}
            </div>
          )}
        </section>

        {courts.length > 0 && (
          <section className="stack gap-3">
            <h2 className="t-headline-md">Courts most seen in this dataset</h2>
            <div className="grid-auto">
              {courts.map((c) => (
                <div key={c.code} className="card stack gap-1" style={{ padding: 14 }}>
                  <strong className="t-body-sm" style={{ wordBreak: 'break-word' }}>{c.name}</strong>
                  <span className="t-caption mono">{c.code}{c.stateCode ? ` · ${c.stateCode}` : ''}</span>
                  <span className="t-caption">{c.caseCount} case{c.caseCount === 1 ? '' : 's'} sampled</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="stack gap-3">
          <h2 className="t-headline-md">Coverage by state</h2>
          <div className="row wrap gap-1">
            {states.map((s) => (
              <span key={s.code} className="chip chip-outline">
                {s.name} <span className="mono" style={{ opacity: 0.7 }}>{s.districts}</span>
              </span>
            ))}
          </div>
          <p className="t-caption">District count per state, as the source reports it.</p>
        </section>

        <section className="card stack gap-3" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
          <h2 className="t-title-lg">Is one of these you?</h2>
          <p className="t-body ink-variant measure">
            An unclaimed name carries no contact details, no fees and no availability. Claiming links it to
            your Bar Council record and turns it into a real profile you control.
          </p>
          <div className="row wrap gap-2">
            <Link href="/for-professionals" className="btn btn-primary">Claim your profile</Link>
            <Link href="/judicial-data" className="btn btn-secondary">Judicial statistics</Link>
            <Link href="/data-sources" className="btn btn-ghost">Where our data comes from</Link>
          </div>
          <p className="t-caption">
            Source: eCourtsIndia partner API (licensed){retrieved ? ` · retrieved ${retrieved}` : ''} ·{' '}
            {compactIndian(stats.appearances)} appearances recorded across {formatNumber(stats.advocates)} names.
          </p>
        </section>
      </div>
    </div>
  );
}
