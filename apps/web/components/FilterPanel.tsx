'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export interface FilterOption { label: string; value: string; count?: number }
export interface FilterGroupSpec {
  key: string;
  label: string;
  options: FilterOption[];
  openByDefault?: boolean;
}

/**
 * Filters as a real query system (spec §11): every change writes to the URL, so
 * results are shareable, bookmarkable and survive the back button.
 *
 * Desktop renders an inline panel; mobile renders a bottom sheet, because a
 * 50-row filter list in a narrow column is unusable (spec §7, §12).
 */
export function FilterPanel({ groups, total }: { groups: FilterGroupSpec[]; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount = groups.reduce((n, g) => n + (params.get(g.key) ? 1 : 0), 0)
    + (params.get('verified') === '1' ? 1 : 0)
    + (params.get('accepting') === '1' ? 1 : 0);

  function withParam(key: string, value: string | null): string {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete('page'); // any filter change resets pagination
    const qs = next.toString();
    return qs ? `/search?${qs}` : '/search';
  }

  function toggle(key: string, value: string) {
    router.push(withParam(key, params.get(key) === value ? null : value));
  }

  const body = (
    <div className="stack">
      {groups.map((group) => {
        const current = params.get(group.key);
        return (
          <details key={group.key} className="filter-group" open={group.openByDefault || Boolean(current)}>
            <summary className="filter-summary">
              <span>
                {group.label}
                {current && <span className="chip chip-primary" style={{ marginLeft: 8, fontSize: '0.6875rem' }}>1</span>}
              </span>
            </summary>
            <div className="filter-options" role="group" aria-label={group.label}>
              {group.options.length === 0 && <p className="t-caption" style={{ padding: '6px 10px' }}>Nothing to filter by yet.</p>}
              {group.options.map((opt) => {
                const isOn = current === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className="filter-option"
                    aria-current={isOn ? 'true' : undefined}
                    aria-pressed={isOn}
                    onClick={() => toggle(group.key, opt.value)}
                    style={{ background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                  >
                    <span className="truncate">{opt.label}</span>
                    {typeof opt.count === 'number' && <span className="filter-count">{opt.count}</span>}
                  </button>
                );
              })}
            </div>
          </details>
        );
      })}

      <div className="filter-group stack gap-2">
        <span className="filter-summary" style={{ cursor: 'default' }}>Trust and availability</span>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={params.get('verified') === '1'}
            onChange={(e) => router.push(withParam('verified', e.target.checked ? '1' : null))}
          />
          <span className="stack gap-1">
            <span className="t-body-sm" style={{ fontWeight: 600 }}>Bar enrolment verified</span>
            <span className="t-caption">Only professionals whose enrolment we have confirmed</span>
          </span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={params.get('accepting') === '1'}
            onChange={(e) => router.push(withParam('accepting', e.target.checked ? '1' : null))}
          />
          <span className="stack gap-1">
            <span className="t-body-sm" style={{ fontWeight: 600 }}>Accepting consultation requests</span>
            <span className="t-caption">Requires a claimed profile</span>
          </span>
        </label>
      </div>

      {activeCount > 0 && (
        <div style={{ paddingTop: 14 }}>
          <Link href={params.get('q') ? `/search?q=${encodeURIComponent(params.get('q') ?? '')}` : '/search'} className="btn btn-ghost btn-sm btn-block">
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: inline panel */}
      <aside className="card hide-mobile" style={{ padding: '4px 18px 18px', position: 'sticky', top: 84, alignSelf: 'start' }} aria-label="Filters">
        <div className="filter-group row" style={{ justifyContent: 'space-between' }}>
          <span className="t-title">Filters</span>
          {activeCount > 0 && <span className="chip chip-primary">{activeCount}</span>}
        </div>
        {body}
      </aside>

      {/* Mobile: sticky trigger + bottom sheet */}
      <div className="hide-desktop" style={{ position: 'sticky', top: 68, zIndex: 20, paddingBlock: 8, background: 'var(--surface)' }}>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setSheetOpen(true)} aria-expanded={sheetOpen}>
          Filters{activeCount > 0 ? ` · ${activeCount}` : ''} · {total} result{total === 1 ? '' : 's'}
        </button>
      </div>

      {sheetOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div className="drawer drawer-sheet" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="drawer-head">
              <span className="t-title">Filters</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSheetOpen(false)}>Close</button>
            </div>
            <div className="drawer-body">{body}</div>
            <div className="drawer-foot">
              <button type="button" className="btn btn-primary btn-block" onClick={() => setSheetOpen(false)}>
                Show {total} result{total === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
