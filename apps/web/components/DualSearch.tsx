'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion { kind: string; label: string; sublabel: string | null; href: string }

const KIND_LABEL: Record<string, string> = {
  practice_area: 'Area', location: 'Place', court: 'Court',
  professional: 'Person', organisation: 'Firm', matter_type: 'Service',
};

/**
 * Two-field discovery search, the pattern Practo uses: WHERE on the left,
 * WHAT on the right, one submit.
 *
 * It works because the two questions are genuinely separate — a user usually
 * knows their city with certainty and their legal category only vaguely. Asking
 * them in one box forces the classifier to disentangle them; asking separately
 * removes the ambiguity entirely.
 *
 * The free-text field still accepts a whole sentence, so nothing is lost for
 * people who would rather just describe the problem.
 */
export function DualSearch({
  defaultQuery = '', defaultLocation = '', size = 'lg', autoFocus = false,
}: { defaultQuery?: string; defaultLocation?: string; size?: 'lg' | 'sm'; autoFocus?: boolean }) {
  const router = useRouter();
  const uid = useId();
  const [q, setQ] = useState(defaultQuery);
  const [loc, setLoc] = useState(defaultLocation);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [locItems, setLocItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState<'q' | 'loc' | null>(null);
  const [active, setActive] = useState(-1);
  const shellRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!shellRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // One debounced suggest for whichever field is focused.
  useEffect(() => {
    const term = open === 'loc' ? loc : q;
    if (!open || term.trim().length < 2) { if (open === 'loc') setLocItems([]); else setItems([]); return; }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { items: Suggestion[] };
        const all = data.items ?? [];
        if (open === 'loc') setLocItems(all.filter((i) => i.kind === 'location' || i.kind === 'court'));
        else setItems(all);
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') { setItems([]); setLocItems([]); }
      }
    }, 140);
    return () => clearTimeout(t);
  }, [q, loc, open]);

  function submit() {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    // The location field is free text; the classifier resolves it server-side,
    // so "Bombay" and "Mumbai" both work without a lookup here.
    if (loc.trim()) params.set('near', loc.trim());
    setOpen(null);
    router.push(params.toString() ? `/search?${params}` : '/search');
  }

  const list = open === 'loc' ? locItems : items;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, field: 'q' | 'loc') {
    if (e.key === 'ArrowDown' && list.length) { e.preventDefault(); setOpen(field); setActive((i) => (i + 1) % list.length); }
    else if (e.key === 'ArrowUp' && list.length) { e.preventDefault(); setActive((i) => (i <= 0 ? list.length - 1 : i - 1)); }
    else if (e.key === 'Escape') { setOpen(null); setActive(-1); }
    else if (e.key === 'Enter') {
      const chosen = list[active];
      if (open === field && active >= 0 && chosen) {
        e.preventDefault();
        if (field === 'loc') { setLoc(chosen.label); setOpen(null); }
        else { setOpen(null); router.push(chosen.href); }
      }
    }
  }

  return (
    <div className={`dual-search ${size === 'sm' ? 'dual-sm' : ''}`} ref={shellRef} role="search">
      <div className="dual-field dual-loc">
        <span aria-hidden="true" className="dual-icon">⌖</span>
        <label htmlFor={`${uid}-loc`} className="sr-only">City, state or court</label>
        <input
          id={`${uid}-loc`} className="dual-input" value={loc} placeholder="City, state or court"
          autoComplete="off" role="combobox" aria-expanded={open === 'loc'} aria-controls={`${uid}-list`}
          onFocus={() => setOpen('loc')} onChange={(e) => { setLoc(e.target.value); setOpen('loc'); }}
          onKeyDown={(e) => onKeyDown(e, 'loc')}
        />
        {loc && (
          <button type="button" className="dual-clear" aria-label="Clear location" onClick={() => { setLoc(''); setOpen('loc'); }}>×</button>
        )}
      </div>

      <span className="dual-divider" aria-hidden="true" />

      <div className="dual-field dual-q">
        <span aria-hidden="true" className="dual-icon">⌕</span>
        <label htmlFor={`${uid}-q`} className="sr-only">What legal help do you need?</label>
        <input
          id={`${uid}-q`} className="dual-input" value={q} autoFocus={autoFocus}
          placeholder="Describe your issue, or search a name, area or court"
          autoComplete="off" role="combobox" aria-expanded={open === 'q'} aria-controls={`${uid}-list`}
          aria-activedescendant={open === 'q' && active >= 0 ? `${uid}-opt-${active}` : undefined}
          onFocus={() => setOpen('q')} onChange={(e) => { setQ(e.target.value); setOpen('q'); }}
          onKeyDown={(e) => onKeyDown(e, 'q')}
        />
      </div>

      <button type="button" className="btn btn-primary dual-submit" onClick={submit}>Search</button>

      {open && list.length > 0 && (
        <div className="suggest-panel dual-panel" id={`${uid}-list`} role="listbox" aria-label="Suggestions">
          {list.map((item, i) => (
            <button
              key={`${item.kind}-${item.href}-${i}`} id={`${uid}-opt-${i}`} type="button" role="option"
              aria-selected={i === active} className="suggest-item"
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                if (open === 'loc') { setLoc(item.label); setOpen(null); }
                else { setOpen(null); router.push(item.href); }
              }}
            >
              <span className="suggest-kind">{KIND_LABEL[item.kind] ?? item.kind}</span>
              <span className="stack" style={{ minWidth: 0 }}>
                <span className="truncate" style={{ fontWeight: 600 }}>{item.label}</span>
                {item.sublabel && <span className="t-caption truncate">{item.sublabel}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
