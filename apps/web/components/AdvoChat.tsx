'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { SHORTLIST_SORTS, ADVO_DISCLAIMER, type AdvoState, type ShortlistSort } from '@lexhall/core';
import { initials } from '@lexhall/core';
import { VerificationBadge } from './Badges';

interface AvailabilityDay { date: string; count: number; hasVideo: boolean }

interface Entry {
  slug: string; displayName: string; bodyRole: string | null; photoUrl: string | null;
  verificationLevel: number; claimStatus: string; locationName: string | null;
  yearsExperience: number | null; acceptsConsultations: boolean;
  minConsultMinor: number | null; currencyCode: string; hasFilingFees: boolean;
  serviceCount: number; practiceAreas: string[]; courts: string[];
  score: number; reasons: string[]; caveats: string[]; feeLabel: string;
  availability: AvailabilityDay[];
}

const DAY_LABEL = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });
const DATE_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * Next-available strip: real bookable slots from `generateSlots`, bucketed
 * per day server-side (see `/api/advo`'s `decorate`) — never a placeholder
 * calendar. A day with zero slots is shown greyed-out rather than omitted,
 * so "nothing soon" is a visible fact, not a gap the user has to guess at.
 */
function AvailabilityStrip({ days, slug }: { days: AvailabilityDay[]; slug: string }) {
  if (days.length === 0) return null;
  return (
    <div className="row gap-1" style={{ overflowX: 'auto', paddingBottom: 2 }}>
      {days.slice(0, 6).map((d) => {
        const cellStyle = {
          flex: '0 0 auto', minWidth: 64, textAlign: 'center' as const, padding: '6px 8px',
          borderRadius: 'var(--r-sm)', textDecoration: 'none',
          background: d.count > 0 ? 'var(--electric-lime)' : 'var(--surface-container)',
          color: d.count > 0 ? 'var(--on-lime)' : 'var(--on-surface-variant)',
        };
        const label = DAY_LABEL.format(new Date(`${d.date}T00:00:00Z`));
        const date = DATE_LABEL.format(new Date(`${d.date}T00:00:00Z`));
        const countLabel = d.count > 0 ? `${d.count} slot${d.count === 1 ? '' : 's'}` : 'No slots';
        if (d.count === 0) {
          return (
            <div key={d.date} className="stack gap-0" style={cellStyle} aria-label={`${label} ${date}: no slots`}>
              <span className="t-caption" style={{ fontWeight: 600 }}>{label}</span>
              <span className="t-caption">{date}</span>
              <span className="t-caption">{countLabel}</span>
            </div>
          );
        }
        return (
          <Link key={d.date} href={`/advocates/${slug}/book`} className="stack gap-0" style={cellStyle}>
            <span className="t-caption" style={{ fontWeight: 600 }}>{label}</span>
            <span className="t-caption">{date}</span>
            <span className="t-caption">{countLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Advo AI — the conversational filter.
 *
 * It asks the handful of questions that actually change the answer, then hands
 * back a shortlist you can re-sort by fee, experience or verification. Each
 * entry carries why it is there AND what might not suit, because a
 * recommendation that hides its downsides is not a recommendation.
 */
export function AdvoChat({ compact = false, pendingMessage, onConsumePending }: {
  compact?: boolean;
  /** A message queued by something outside the chat (e.g. a quick-start
   * card). Consumed on the next render once the conversation is ready to
   * receive free text, then cleared via `onConsumePending` so it cannot
   * resend itself. */
  pendingMessage?: string | null;
  onConsumePending?: () => void;
} = {}) {
  const [state, setState] = useState<AdvoState | null>(null);
  const [results, setResults] = useState<Entry[]>([]);
  const [sort, setSort] = useState<ShortlistSort>('match');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void call({ action: 'start' }); }, []);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }); }, [state, results.length]);

  // Fires once the greeting turn has landed and the box is free to accept
  // text — a quick-start click before that would race the initial 'start' call.
  useEffect(() => {
    if (pendingMessage && state && !busy) {
      send(pendingMessage);
      onConsumePending?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage, state, busy]);

  async function call(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/advo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state, sort, ...payload }),
      });
      if (!res.ok) throw new Error(`Advo AI could not respond (${res.status}).`);
      const data = await res.json() as { state: AdvoState; results: Entry[]; sort: ShortlistSort; error?: string };
      if (data.error) throw new Error(data.error);
      setState(data.state);
      if (data.results) setResults(data.results);
      if (data.sort) setSort(data.sort);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * `value` is what the engine reads; `display` is what the conversation shows.
   * They differ for option chips — "10+ years" must reach the engine as `10`.
   */
  function send(value: string, answering?: string, display?: string) {
    if (!value.trim() || busy) return;
    setDraft('');
    void call({ action: 'turn', message: value, answering, display });
  }

  const q = state?.nextQuestion ?? null;

  /**
   * Quick refinements offered once the shortlist is up. Each one resends a
   * STRUCTURED answer (the same `answering` key the original question used),
   * not free text — `advance()` only re-parses practice area/location/urgency
   * from free text after `done` (see advoai.ts's `advance`), so a chip
   * promising "show cheaper options" via a typed sentence would silently do
   * nothing. Resending a structured key updates the fact and re-filters even
   * after `done`, because `nextQuestion`'s `asked` set only gates which
   * question comes NEXT, not whether an answer is accepted.
   *
   * Deliberately NOT a Zocdoc-style "what's the difference between X and Y"
   * chip: that promises a free-text explanation, and this engine generates
   * no free text by design (ADR-006) — offering it would be a broken promise,
   * not a feature. Every chip here is a lever the state machine already has.
   */
  const refinementChips: Array<{ label: string; value: string; answering: string; display: string }> = [];
  if (state?.done) {
    const f = state.facts;
    if (f.budgetMaxMinor === null || f.budgetMaxMinor > 250_000) {
      refinementChips.push({ label: 'Cap fees at ₹2,500', value: '250000', answering: 'budget', display: 'Up to ₹2,500' });
    }
    if ((f.minExperienceYears ?? 0) < 10) {
      refinementChips.push({ label: '10+ years experience only', value: '10', answering: 'experience', display: '10+ years' });
    }
    if (f.preferredMode !== 'video') {
      refinementChips.push({ label: 'Switch to video call', value: 'video', answering: 'mode', display: 'Video call' });
    }
    if (f.urgency !== 'emergency') {
      refinementChips.push({ label: 'Mark as urgent', value: 'emergency', answering: 'urgency', display: 'Today or tomorrow' });
    }
  }

  return (
    <div className={compact ? 'advo-layout advo-compact' : 'advo-layout'}>
      {/* ------------------------------------------------------ conversation */}
      <div className="card stack gap-0" style={{ overflow: 'hidden', minWidth: 0 }}>
        <div className="advo-head">
          <span className="advo-mark" aria-hidden="true">◆</span>
          <span className="stack" style={{ gap: 0 }}>
            <strong>Advo AI</strong>
            <span className="t-caption">Deterministic filter · not a lawyer</span>
          </span>
          {state && !state.done && (
            <span className="advo-progress" aria-label={`Readiness ${Math.round(state.readiness * 100)} percent`}>
              <span className="advo-progress-fill" style={{ width: `${Math.round(state.readiness * 100)}%` }} />
            </span>
          )}
        </div>

        <div className="advo-log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation">
          {state?.transcript.map((t, i) => (
            <div key={i} className={`advo-turn advo-${t.role}`}>
              <span className="advo-bubble">{t.text}</span>
            </div>
          ))}
          {busy && <div className="advo-turn advo-advo"><span className="advo-bubble advo-typing"><span /><span /><span /></span></div>}
          {error && (
            <div className="notice notice-error" role="alert" style={{ margin: '8px 0' }}>
              <span className="notice-icon" aria-hidden="true">!</span>
              <div className="stack gap-2">
                <span>{error}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => void call({ action: 'start' })}>
                  Start again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Question options, then free text. Both always available. */}
        <div className="advo-input">
          {q?.help && <p className="t-caption" style={{ marginBottom: 8 }}>{q.help}</p>}
          {q && q.options.length > 0 && (
            <div className="row wrap gap-2" style={{ marginBottom: 10 }}>
              {q.options.map((o) => (
                <button key={o.value} type="button" className="chip chip-button chip-outline"
                  disabled={busy} onClick={() => send(o.value, q.key, o.label)}>
                  {o.label}
                </button>
              ))}
              {q.skippable && (
                <button type="button" className="chip chip-button" disabled={busy}
                  onClick={() => send(q.key === 'budget' ? 'any' : q.key === 'experience' ? '0' : 'skip', q.key, 'No preference')}>
                  Skip
                </button>
              )}
            </div>
          )}

          {refinementChips.length > 0 && (
            <div className="row wrap gap-2" style={{ marginBottom: 10 }}>
              {refinementChips.map((c) => (
                <button key={c.answering} type="button" className="chip chip-button chip-outline"
                  disabled={busy} onClick={() => send(c.value, c.answering, c.display)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(draft, q?.key); }}
            className="row gap-2"
          >
            <label htmlFor="advo-input" className="sr-only">Your reply</label>
            <input
              id="advo-input" className="input" value={draft} disabled={busy}
              placeholder={state?.done ? 'Add anything else, and I will re-filter' : q?.prompt ?? 'Tell me what has happened'}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>Send</button>
          </form>

          {state?.done && (
            <div className="row wrap gap-2" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void call({ action: 'start' })}>
                Start over
              </button>
              <span className="t-caption" style={{ alignSelf: 'center' }}>{state.understanding}</span>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- shortlist */}
      <div className="stack gap-3" style={{ minWidth: 0 }}>
        <div className="row wrap gap-3" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="t-headline-md">
            {state?.done ? `${results.length} professional${results.length === 1 ? '' : 's'} shortlisted` : 'Shortlist'}
          </h2>
          {state?.done && results.length > 0 && (
            <div className="row gap-2">
              <label htmlFor="advo-sort" className="t-caption">Order by</label>
              <select
                id="advo-sort" className="select" value={sort} style={{ width: 'auto', minHeight: 40 }}
                onChange={(e) => { const s = e.target.value as ShortlistSort; setSort(s); void call({ action: 'sort', sort: s }); }}
              >
                {SHORTLIST_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {!state?.done && (
          <p className="t-body ink-variant">
            Answer a few questions and I will narrow the register down to the professionals who can
            actually act on this, then let you order them by fee or experience.
          </p>
        )}

        {state?.done && results.length === 0 && (
          <div className="notice notice-info">
            <span className="notice-icon" aria-hidden="true">ⓘ</span>
            <div className="stack gap-2">
              <strong>Nothing matched those constraints</strong>
              <span className="t-body-sm">
                Most likely the fee ceiling or the experience minimum is too tight, or no professional
                in that location has declared this practice area yet. Try relaxing one of them.
              </span>
              <Link href="/search" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
                Browse the full directory
              </Link>
            </div>
          </div>
        )}

        {results.map((e, i) => (
          <article key={e.slug} className="advo-card">
            <span className="advo-rank" aria-hidden="true">{i + 1}</span>
            <span className="avatar" style={{ width: 52, height: 52 }}>
              {e.photoUrl
                ? <Image src={e.photoUrl} alt="" width={52} height={52} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                : <span className="monogram" style={{ fontSize: 18 }} aria-hidden="true">{initials(e.displayName)}</span>}
            </span>

            <div className="stack gap-2" style={{ minWidth: 0 }}>
              <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                <h3 className="t-title">
                  <Link href={`/advocates/${e.slug}`} style={{ textDecoration: 'none' }}>{e.displayName}</Link>
                </h3>
                <span className="stack" style={{ gap: 0, textAlign: 'right' }}>
                  <strong className="mono">{e.feeLabel}</strong>
                  <span className="t-caption">first consultation</span>
                </span>
              </div>

              {e.bodyRole && <p className="t-caption clamp-2">{e.bodyRole}</p>}

              <div className="row wrap gap-1">
                <VerificationBadge level={e.verificationLevel} compact />
                {e.yearsExperience !== null && <span className="chip chip-outline">{e.yearsExperience} yrs</span>}
                {e.locationName && <span className="chip chip-outline">{e.locationName}</span>}
                {e.hasFilingFees && <span className="chip chip-outline">Filing charges published</span>}
              </div>

              {e.practiceAreas.length > 0 && (
                <div className="row wrap gap-1">
                  {e.practiceAreas.slice(0, 3).map((a) => <span key={a} className="chip chip-primary">{a}</span>)}
                </div>
              )}

              <AvailabilityStrip days={e.availability} slug={e.slug} />

              {e.reasons.length > 0 && (
                <ul className="stack gap-1">
                  {e.reasons.map((r) => (
                    <li key={r} className="row gap-2 t-caption" style={{ alignItems: 'flex-start' }}>
                      <span aria-hidden="true" style={{ color: 'var(--secondary)', fontWeight: 700 }}>✓</span>{r}
                    </li>
                  ))}
                </ul>
              )}
              {e.caveats.length > 0 && (
                <ul className="stack gap-1">
                  {e.caveats.map((c) => (
                    <li key={c} className="row gap-2 t-caption" style={{ alignItems: 'flex-start' }}>
                      <span aria-hidden="true" style={{ color: 'var(--outline)', fontWeight: 700 }}>!</span>{c}
                    </li>
                  ))}
                </ul>
              )}

              <div className="row wrap gap-2">
                <Link href={`/advocates/${e.slug}`} className="btn btn-secondary btn-sm">View profile</Link>
                {e.acceptsConsultations
                  ? <Link href={`/advocates/${e.slug}/book`} className="btn btn-primary btn-sm">Book</Link>
                  : <Link href={`/advocates/${e.slug}/consult`} className="btn btn-ghost btn-sm">Send an enquiry</Link>}
              </div>
            </div>
          </article>
        ))}

        <p className="t-caption" style={{ marginTop: 4 }}>{ADVO_DISCLAIMER}</p>
      </div>
    </div>
  );
}
