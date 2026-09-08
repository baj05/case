'use client';

import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Horizontal pill row above the results — the common filters people reach
 * for first (kind, verification, availability), plus a trigger that opens
 * the existing FilterPanel drawer for everything else (practice area,
 * state, court, fee/experience). Reads/writes the same URL params
 * FilterPanel does, so the two never disagree — neither owns the state.
 */
export function QuickFilterBar({ kindOptions, practiceOptions = [] }: {
  kindOptions: Array<{ label: string; value: string }>;
  /** Top practice areas by real advocate count — a fast path into the same
   * ?practice= filter the sidebar's full list already uses, not a separate
   * filtering mechanism. */
  practiceOptions?: Array<{ label: string; value: string; count: number }>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function withParam(key: string, value: string | null): string {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    const qs = next.toString();
    return qs ? `/search?${qs}` : '/search';
  }

  function toggle(key: string, value: string) {
    router.push(withParam(key, params.get(key) === value ? null : value));
  }

  const kind = params.get('kind');
  const practice = params.get('practice');

  return (
    <div className="quick-filter-bar" role="group" aria-label="Quick filters">
      {practiceOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="pill-filter"
          aria-pressed={practice === opt.value}
          onClick={() => toggle('practice', opt.value)}
        >
          {opt.label} <span className="pill-filter-count">{opt.count}</span>
        </button>
      ))}
      {kindOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="pill-filter"
          aria-pressed={kind === opt.value}
          onClick={() => toggle('kind', opt.value)}
        >
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        className="pill-filter"
        aria-pressed={params.get('verified') === '1'}
        onClick={() => router.push(withParam('verified', params.get('verified') === '1' ? null : '1'))}
      >
        Bar enrolment verified
      </button>
      <button
        type="button"
        className="pill-filter"
        aria-pressed={params.get('available') === '1'}
        onClick={() => router.push(withParam('available', params.get('available') === '1' ? null : '1'))}
      >
        Has availability
      </button>
      <button
        type="button"
        className="pill-filter pill-filter-more"
        onClick={() => window.dispatchEvent(new CustomEvent('caseadvo:open-filters'))}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        More filters
      </button>
    </div>
  );
}
