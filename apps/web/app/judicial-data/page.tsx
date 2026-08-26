import Link from 'next/link';
import type { Metadata } from 'next';
import { getJudicialData, getHighCourts, databaseReady } from '@/lib/data';
import { pickStats, type JudicialSnapshot } from '@lexhall/db';
import { compactIndian } from '@/lib/format';
import { Notice } from '@/components/States';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Judicial data — pendency, disposal and case-type statistics',
  description:
    'Official case pendency and disposal statistics for India\'s District Courts and High Courts, '
    + 'sourced from the National Judicial Data Grid with full attribution.',
};

const grouped = (n: number) => n.toLocaleString('en-IN');

function StatBar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="stack gap-1">
      <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="t-body-sm">{label}</span>
        <span className="row gap-2" style={{ alignItems: 'baseline' }}>
          <strong className="mono t-body-sm">{grouped(value)}</strong>
          {sub && <span className="t-caption">{sub}</span>}
        </span>
      </div>
      <span style={{ height: 6, borderRadius: 4, background: 'var(--surface-high)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--action-orange)' }} />
      </span>
    </div>
  );
}

function TierPanel({ snap, tier, title, blurb }: {
  snap: JudicialSnapshot; tier: 'district' | 'high_court'; title: string; blurb: string;
}) {
  const pending = pickStats(snap, tier, 'pendency').find((s) => s.label === 'total_pending');
  const overOne = pickStats(snap, tier, 'pendency').find((s) => s.label === 'older_than_one_year');
  const ages = pickStats(snap, tier, 'age_band');
  const flow = pickStats(snap, tier, 'flow');
  if (!pending) return null;

  const maxAge = Math.max(...ages.map((a) => a.total ?? 0), 1);
  const instituted = flow.find((f) => f.label === 'instituted_last_month');
  const disposed = flow.find((f) => f.label === 'disposed_last_month');

  return (
    <section className="card stack gap-4" style={{ padding: 'clamp(18px, 3vw, 26px)' }}>
      <div className="stack gap-1">
        <h2 className="t-title-lg">{title}</h2>
        <p className="t-body-sm ink-variant measure">{blurb}</p>
      </div>

      <div className="row wrap gap-5" style={{ alignItems: 'baseline' }}>
        <span className="stack" style={{ gap: 0 }}>
          <strong style={{ fontSize: '2.25rem', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {compactIndian(pending.total ?? 0)}
          </strong>
          <span className="t-caption">cases pending · {grouped(pending.total ?? 0)}</span>
        </span>
        <span className="stack" style={{ gap: 0 }}>
          <strong className="t-title-sm">{grouped(pending.civil ?? 0)}</strong>
          <span className="t-caption">civil</span>
        </span>
        <span className="stack" style={{ gap: 0 }}>
          <strong className="t-title-sm">{grouped(pending.criminal ?? 0)}</strong>
          <span className="t-caption">criminal</span>
        </span>
        {overOne?.percent != null && (
          <span className="stack" style={{ gap: 0 }}>
            <strong className="t-title-sm">{overOne.percent}%</strong>
            <span className="t-caption">pending over a year</span>
          </span>
        )}
      </div>

      {ages.length > 0 && (
        <div className="stack gap-2">
          <span className="t-caption" style={{ fontWeight: 700 }}>How long cases have been pending</span>
          <div className="stack gap-2" style={{ maxWidth: 520 }}>
            {ages.map((a) => (
              <StatBar key={a.label} label={a.label} value={a.total ?? 0} max={maxAge} sub={a.percent != null ? `${a.percent}%` : undefined} />
            ))}
          </div>
        </div>
      )}

      {instituted && disposed && (
        <div className="row wrap gap-4">
          <span className="stack" style={{ gap: 0 }}>
            <strong className="t-title-sm">{grouped(instituted.total ?? 0)}</strong>
            <span className="t-caption">filed last month</span>
          </span>
          <span className="stack" style={{ gap: 0 }}>
            <strong className="t-title-sm">{grouped(disposed.total ?? 0)}</strong>
            <span className="t-caption">disposed last month</span>
          </span>
          <span className="stack" style={{ gap: 0 }}>
            <strong className="t-title-sm">
              {(disposed.total ?? 0) >= (instituted.total ?? 0) ? 'Clearing' : 'Growing'}
            </strong>
            <span className="t-caption">
              backlog {(disposed.total ?? 0) >= (instituted.total ?? 0) ? 'shrinking' : 'rising'} month-on-month
            </span>
          </span>
        </div>
      )}
    </section>
  );
}

/**
 * The Supreme Court grid reports a different shape from the other two: it
 * breaks pendency down by registration state rather than by age (a filed
 * matter is not pending in the same sense until registered and listed), and
 * it publishes coram-wise pendency, which only exists where bench size is a
 * constitutional question. Rendering it through TierPanel would have meant
 * showing empty age bands and hiding the two things that make it distinct.
 */
function SupremeCourtPanel({ snap }: { snap: JudicialSnapshot }) {
  const pending = pickStats(snap, 'supreme_court', 'pendency').find((s) => s.label === 'total_pending');
  if (!pending) return null;
  const reg = pickStats(snap, 'supreme_court', 'registration');
  const coram = pickStats(snap, 'supreme_court', 'coram').filter((c) => (c.total ?? 0) > 0);
  const flow = pickStats(snap, 'supreme_court', 'flow');
  const instYear = flow.find((f) => f.label === 'instituted_this_year');
  const dispYear = flow.find((f) => f.label === 'disposed_this_year');
  const maxReg = Math.max(...reg.map((r) => r.total ?? 0), 1);

  return (
    <section className="card stack gap-4" style={{ padding: 'clamp(18px, 3vw, 26px)' }}>
      <div className="stack gap-1">
        <h2 className="t-title-lg">Supreme Court of India</h2>
        <p className="t-body-sm ink-variant measure">
          The apex court. Pendency here is reported by registration stage rather than age — a matter
          is filed long before it is registered, listed and heard.
        </p>
      </div>

      <div className="row wrap gap-5" style={{ alignItems: 'baseline' }}>
        <span className="stack" style={{ gap: 0 }}>
          <strong style={{ fontSize: '2.25rem', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {grouped(pending.total ?? 0)}
          </strong>
          <span className="t-caption">cases pending</span>
        </span>
        <span className="stack" style={{ gap: 0 }}>
          <strong className="t-title-sm">{grouped(pending.civil ?? 0)}</strong>
          <span className="t-caption">civil</span>
        </span>
        <span className="stack" style={{ gap: 0 }}>
          <strong className="t-title-sm">{grouped(pending.criminal ?? 0)}</strong>
          <span className="t-caption">criminal</span>
        </span>
        {instYear && dispYear && (
          <span className="stack" style={{ gap: 0 }}>
            <strong className="t-title-sm">
              {Math.round(((dispYear.total ?? 0) / Math.max(instYear.total ?? 1, 1)) * 100)}%
            </strong>
            <span className="t-caption">disposed vs filed, this year</span>
          </span>
        )}
      </div>

      {reg.length > 0 && (
        <div className="stack gap-2">
          <span className="t-caption" style={{ fontWeight: 700 }}>Where pending matters sit</span>
          <div className="stack gap-2" style={{ maxWidth: 560 }}>
            {reg.map((r) => <StatBar key={r.label} label={r.label} value={r.total ?? 0} max={maxReg} />)}
          </div>
        </div>
      )}

      {coram.length > 0 && (
        <div className="stack gap-2">
          <span className="t-caption" style={{ fontWeight: 700 }}>Constitution bench pendency</span>
          <p className="t-caption">
            Matters awaiting a larger bench. The bracketed figure includes connected matters heard together.
          </p>
          <div className="row wrap gap-2">
            {coram.map((c) => (
              <span key={c.label} className="card row gap-2" style={{ padding: '8px 12px', alignItems: 'baseline' }}>
                <strong className="t-body-sm">{c.label}</strong>
                <span className="mono t-body-sm">{grouped(c.total ?? 0)}</span>
                {c.percent != null && c.percent > 0 && (
                  <span className="t-caption">({grouped(c.percent)} with connected)</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function JudicialDataPage() {
  if (!databaseReady()) {
    return <div className="container section"><Notice tone="warn">Run <code className="mono">npm run ingest</code> first.</Notice></div>;
  }
  const snap = getJudicialData();
  const highCourts = getHighCourts();

  if (!snap.available) {
    return (
      <div className="container section-tight stack gap-4">
        <h1 className="t-headline-lg">Judicial data</h1>
        <Notice tone="info" title="No judicial statistics ingested yet">
          Run <code className="mono">npm run db:judicial</code> to load the National Judicial Data Grid extract.
        </Notice>
      </div>
    );
  }

  const caseTypes = pickStats(snap, 'high_court', 'case_type');
  const delays = pickStats(snap, 'high_court', 'delay_reason');
  const litigants = pickStats(snap, 'district', 'litigant_profile');
  const maxType = Math.max(...caseTypes.map((c) => c.total ?? 0), 1);
  const maxDelay = Math.max(...delays.map((d) => d.total ?? 0), 1);
  const retrieved = snap.retrievedAt ? new Date(snap.retrievedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="stack gap-8">
      <section className="hero textured">
        <div className="container stack gap-4" style={{ maxWidth: '56ch' }}>
          <p className="t-label-mono ink-variant">Judicial data</p>
          <h1 className="t-display-lg">What the courts are actually carrying.</h1>
          <p className="t-body-lg ink-variant">
            Official pendency, disposal and case-type figures for India&apos;s District Courts and High
            Courts — so you can see how long a matter like yours typically waits before you file it.
          </p>
        </div>
      </section>

      <div className="container stack gap-6" style={{ paddingBottom: 'clamp(48px, 8vw, 96px)' }}>
        <Notice tone="legal" title="Government statistics, reproduced — not CaseADVO's own figures">
          These are aggregate counts published by the National Judicial Data Grid (NIC, Government of
          India){retrieved ? `, retrieved ${retrieved}` : ''}. CaseADVO has not independently verified them,
          and they are <strong>aggregates only</strong> — no case records, party names or litigant data are
          held here. Check the source before relying on a figure.
        </Notice>

        <SupremeCourtPanel snap={snap} />

        <TierPanel
          snap={snap} tier="district" title="District Courts"
          blurb="Trial courts across all states and union territories — where most matters begin and the majority of pendency sits."
        />
        <TierPanel
          snap={snap} tier="high_court" title="High Courts"
          blurb="The 25 High Courts, hearing appeals, writ petitions and matters in their original jurisdiction."
        />

        {caseTypes.length > 0 && (
          <section className="card stack gap-3" style={{ padding: 'clamp(18px, 3vw, 26px)' }}>
            <div className="stack gap-1">
              <h2 className="t-title-lg">What High Courts are hearing</h2>
              <p className="t-body-sm ink-variant measure">
                Pending matters by case type. Writ petitions dominate — the constitutional remedy against
                state action, and the reason so much High Court work is administrative rather than criminal.
              </p>
            </div>
            <div className="stack gap-2" style={{ maxWidth: 620 }}>
              {caseTypes.map((c) => (
                <StatBar key={c.label} label={c.label} value={c.total ?? 0} max={maxType} />
              ))}
            </div>
          </section>
        )}

        <div className="grid-auto">
          {delays.length > 0 && (
            <section className="card stack gap-3" style={{ padding: 'clamp(18px, 3vw, 26px)' }}>
              <h2 className="t-title-sm">Why cases wait</h2>
              <p className="t-body-sm ink-variant">Recorded delay reasons in High Court matters.</p>
              <div className="stack gap-2">
                {delays.map((d) => (
                  <StatBar key={d.label} label={d.label} value={d.total ?? 0} max={maxDelay} />
                ))}
              </div>
            </section>
          )}

          {litigants.length > 0 && (
            <section className="card stack gap-3" style={{ padding: 'clamp(18px, 3vw, 26px)' }}>
              <h2 className="t-title-sm">Who is filing</h2>
              <p className="t-body-sm ink-variant">District Court matters filed by these groups.</p>
              <div className="stack gap-3">
                {litigants.map((l) => (
                  <div key={l.label} className="row gap-3" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="t-body-sm">
                      {l.label === 'filed_by_women' ? 'Filed by women' : 'Filed by senior citizens'}
                    </span>
                    <strong className="mono">{grouped(l.total ?? 0)}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {highCourts.length > 0 && (
          <section className="stack gap-3">
            <h2 className="t-headline-md">The {highCourts.length} High Courts</h2>
            <div className="row wrap gap-1">
              {highCourts.map((c) => (
                <Link key={c.slug} href={`/search?q=${encodeURIComponent(c.name)}`} className="chip chip-button chip-outline">
                  {c.name}
                </Link>
              ))}
            </div>
            <p className="t-caption">Selecting a court searches CaseADVO&apos;s advocate directory for it.</p>
          </section>
        )}

        <section className="card stack gap-3" style={{ padding: 'clamp(20px, 4vw, 32px)' }}>
          <h2 className="t-title-lg">Where this comes from</h2>
          <div className="stack gap-2">
            {snap.sources.map((s) => (
              <div key={s.code} className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                <span className="stack" style={{ gap: 0 }}>
                  <strong className="t-body-sm">{s.name}</strong>
                  <span className="t-caption">{s.publisher}</span>
                </span>
                <span className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className="chip chip-lime">{s.authority.replace(/_/g, ' ')}</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="t-caption" style={{ textDecoration: 'underline' }}>
                    Open source ↗
                  </a>
                </span>
              </div>
            ))}
          </div>
          <p className="t-caption">
            Data version <code className="mono">{snap.dataVersion}</code>
            {retrieved ? ` · retrieved ${retrieved}` : ''} · aggregate counts only, no personal data held.
          </p>
          <div className="row wrap gap-2">
            <Link href="/search" className="btn btn-primary">Find an advocate</Link>
            <Link href="/data-sources" className="btn btn-secondary">All our data sources</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
