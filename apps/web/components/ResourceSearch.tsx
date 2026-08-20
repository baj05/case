'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Suggestion { slug: string; title: string; kind: string; official: boolean }

/**
 * The resource search box.
 *
 * Suggestions come from the library itself, so an empty result is a fact about
 * our holdings rather than a spelling problem — and the examples underneath are
 * real queries that return real documents, not aspirational ones.
 */
export function ResourceSearch({
  initial = '', examples = [], autoFocus = false, size = 'lg',
}: {
  initial?: string;
  examples?: string[];
  autoFocus?: boolean;
  size?: 'lg' | 'sm';
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/resources/suggest?q=${encodeURIComponent(value)}`);
        if (!response.ok) return;
        const data = await response.json() as { items: Suggestion[] };
        setItems(data.items ?? []);
        setOpen((data.items ?? []).length > 0);
        setActive(-1);
      } catch {
        // A failed suggestion request must never break typing.
      }
    }, 160);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function submit(query: string) {
    setOpen(false);
    router.push(query.trim() ? `/resources/search?q=${encodeURIComponent(query.trim())}` : '/resources/search');
  }

  return (
    <div className="stack gap-2 full">
      <div className="search-shell" ref={boxRef}>
        <form
          className="search-bar"
          onSubmit={(e) => { e.preventDefault(); if (active >= 0 && items[active]) router.push(`/resources/${items[active].slug}`); else submit(value); }}
          role="search"
        >
          <span aria-hidden="true" className="dual-icon" style={{ paddingLeft: 4 }}>⌕</span>
          {/* flex rather than width:100% — with `full` the label claimed its own
              row, pushing the icon and the button onto rows of their own and
              leaving the input too narrow to show its own placeholder. */}
          <label style={{ flex: '1 1 12ch', minWidth: 0 }}>
            <span className="sr-only">Search for a legal document, form or guide</span>
            <input
              className="search-input"
              type="search"
              value={value}
              autoFocus={autoFocus}
              // Short enough to fit the input at 375px. The full description
              // lives in the label, which screen readers read instead.
              placeholder="What do you need?"
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls="resource-suggest"
              aria-autocomplete="list"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(items.length - 1, a + 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
                if (e.key === 'Escape') setOpen(false);
              }}
              style={size === 'sm' ? { minHeight: 40, fontSize: '0.9375rem' } : undefined}
            />
          </label>
          <button type="submit" className={`btn btn-primary btn-pill ${size === 'sm' ? 'btn-sm' : ''}`}>Search</button>
        </form>

        {open && items.length > 0 && (
          <ul className="suggest-panel" id="resource-suggest" role="listbox">
            {items.map((item, i) => (
              <li key={item.slug} role="option" aria-selected={i === active}>
                <Link
                  href={`/resources/${item.slug}`}
                  className="suggest-item"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="truncate">{item.title}</span>
                  <span className="suggest-kind">{item.official ? 'Official' : item.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {examples.length > 0 && (
        <div className="row wrap gap-1">
          <span className="t-caption">Try</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              className="chip chip-button chip-outline"
              onClick={() => { setValue(example); submit(example); }}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
