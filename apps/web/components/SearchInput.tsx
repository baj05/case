'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion { kind: string; label: string; sublabel: string | null; href: string }

const KIND_LABEL: Record<string, string> = {
  practice_area: 'Area', location: 'Place', court: 'Court',
  professional: 'Person', organisation: 'Firm', matter_type: 'Service',
};

/**
 * Search field with accessible autocomplete.
 *
 * Implements the ARIA 1.2 combobox pattern: arrow keys move the active option,
 * Enter selects, Escape closes, and the listbox is announced. Suggestions are
 * debounced and every in-flight request is abortable so a fast typist never
 * sees results from a stale keystroke.
 */
export function SearchInput({
  defaultValue = '', autoFocus = false, placeholder = 'Describe your legal issue, or search a name, court or city',
  size = 'lg',
}: { defaultValue?: string; autoFocus?: boolean; placeholder?: string; size?: 'lg' | 'md' }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced suggest. 140ms is below the threshold where typing feels laggy.
  useEffect(() => {
    if (value.trim().length < 2) { setItems([]); return; }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items ?? []);
        setActive(-1);
      } catch (error) {
        // An aborted request is expected, not a failure worth surfacing.
        if ((error as Error).name !== 'AbortError') setItems([]);
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => clearTimeout(timer);
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function submit(query: string) {
    setOpen(false);
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/search');
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && items.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === 'ArrowUp' && items.length > 0) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      const chosen = items[active];
      if (open && active >= 0 && chosen) { event.preventDefault(); setOpen(false); router.push(chosen.href); }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  }

  const showPanel = open && (items.length > 0 || (value.trim().length >= 2 && !loading));

  return (
    <div className="search-shell" ref={shellRef}>
      <form
        className="search-bar"
        role="search"
        onSubmit={(e) => { e.preventDefault(); submit(value); }}
      >
        <span aria-hidden="true" className="ink-variant" style={{ fontSize: '1.05rem', flex: 'none' }}>⌕</span>
        <label htmlFor={`${listId}-input`} className="sr-only">What legal help do you need?</label>
        <input
          id={`${listId}-input`}
          className="search-input"
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className={`btn btn-primary btn-pill ${size === 'lg' ? '' : 'btn-sm'}`}>
          Search
        </button>
      </form>

      {showPanel && (
        <div className="suggest-panel" id={`${listId}-list`} role="listbox" aria-label="Search suggestions">
          {items.length === 0 ? (
            <div className="stack gap-1" style={{ padding: '14px 16px' }}>
              <strong className="t-body-sm">No matching suggestion</strong>
              <span className="t-caption">Press Enter to search for “{value.trim()}” anyway.</span>
            </div>
          ) : (
            items.map((item, i) => (
              <button
                key={`${item.kind}-${item.href}-${i}`}
                id={`${listId}-opt-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className="suggest-item"
                onMouseEnter={() => setActive(i)}
                onClick={() => { setOpen(false); router.push(item.href); }}
              >
                <span className="suggest-kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
                <span className="stack" style={{ minWidth: 0 }}>
                  <span className="truncate" style={{ fontWeight: 600 }}>{item.label}</span>
                  {item.sublabel && <span className="t-caption truncate">{item.sublabel}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
