'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface ResourceFilterGroup {
  key: string;
  label: string;
  options: Array<{ label: string; value: string; count: number }>;
  openByDefault?: boolean;
}

/**
 * Filters for the resource library.
 *
 * Every change writes to the URL, so a filtered view is shareable and survives
 * the back button. Desktop gets an inline panel, mobile a bottom sheet — a
 * forty-row facet list in a 390px column is not usable.
 */
export function ResourceFilters({ groups, total }: { groups: ResourceFilterGroup[]; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCount = groups.reduce((n, g) => n + (params.get(g.key) ? 1 : 0), 0)
    + (params.get('preview') === '1' ? 1 : 0);

  function push(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    const qs = next.toString();
    router.push(qs ? `/resources/search?${qs}` : '/resources/search');
  }

  const body = (
    <div className="stack">
      <div className="filter-group">
        <label className="checkbox-row" style={{ padding: '4px 2px' }}>
          <input
            type="checkbox"
            checked={params.get('preview') === '1'}
            onChange={(e) => push('preview', e.target.checked ? '1' : null)}
          />
          <span className="stack gap-1">
            <span className="t-body-sm" style={{ fontWeight: 600 }}>Readable here</span>
            <span className="t-caption">
              Only documents you can read in the browser. Official forms open at the publisher instead.
            </span>
          </span>
        </label>
      </div>

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
              {group.options.length === 0 && (
                <p className="t-caption" style={{ padding: '6px 10px' }}>Nothing to filter by in these results.</p>
              )}
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="filter-option"
                  aria-current={current === option.value ? 'true' : undefined}
                  onClick={() => push(group.key, current === option.value ? null : option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  <span className="filter-count">{option.count}</span>
                </button>
              ))}
            </div>
          </details>
        );
      })}

      {activeCount > 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => {
            const next = new URLSearchParams();
            const q = params.get('q');
            if (q) next.set('q', q);
            router.push(next.toString() ? `/resources/search?${next.toString()}` : '/resources/search');
          }}
        >
          Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );

  return (
    <>
      <aside className="card hide-mobile" style={{ padding: 18, alignSelf: 'start', position: 'sticky', top: 88 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 className="t-title">Filter</h2>
          <span className="t-caption mono">{total}</span>
        </div>
        {body}
      </aside>

      <div className="hide-desktop" style={{ position: 'sticky', top: 72, zIndex: 20, paddingBlock: 8 }}>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setSheetOpen(true)}>
          Filter{activeCount > 0 ? ` · ${activeCount}` : ''} · {total} result{total === 1 ? '' : 's'}
        </button>
      </div>

      {sheetOpen && (
        <>
          <div className="drawer-backdrop hide-desktop" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div className="drawer drawer-sheet hide-desktop" role="dialog" aria-modal="true" aria-label="Filter resources">
            <div className="drawer-head">
              <span className="t-title">Filter</span>
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
