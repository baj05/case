'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { DialogFlush } from './ui/Dialog';

export interface ViewerField { key: string; label: string; hint?: string }

/**
 * Document viewer for CaseADVO-authored templates.
 *
 * The requirement was "do not make the user download a file to see what it is",
 * and this is the honest way to meet it for the documents we actually hold. It
 * paginates, zooms, searches within the document, goes full screen and supports
 * the keyboard — over text we wrote, so no untrusted content is ever rendered
 * and no PDF engine is shipped to the browser.
 *
 * Official documents are not rendered here at all. They belong to their
 * publisher, we do not host a copy, and pretending to display one inside our own
 * chrome would blur exactly the line the rest of this library works to keep
 * sharp. For those, the page offers the publisher's own copy.
 *
 * Placeholders are highlighted rather than hidden. A template whose blanks are
 * invisible is a template that gets signed with the blanks still in it.
 */
export function DocumentViewer({
  body, fields, title, onPreview,
}: {
  body: string;
  fields: ViewerField[];
  title: string;
  /** Fired once, so the aggregate preview count reflects reads not renders. */
  onPreview?: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const reported = useRef(false);
  const fsToggleRef = useRef<HTMLButtonElement>(null);
  const wasFullscreen = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    onPreview?.();
  }, [onPreview]);

  /**
   * Return focus to the full-screen toggle after leaving full screen.
   *
   * The Dialog's own focus restore cannot do this: entering full screen
   * moves the whole shell — the toggle button included — inside the dialog,
   * so the node that had focus when the dialog opened is unmounted, and
   * there is nothing left for the dialog to restore focus to. Without this,
   * closing full screen drops focus on `<body>` and a keyboard user has to
   * Tab from the top of the page to get back to where they were.
   */
  useEffect(() => {
    if (wasFullscreen.current && !fullscreen) fsToggleRef.current?.focus();
    wasFullscreen.current = fullscreen;
  }, [fullscreen]);

  // Pagination is by line budget rather than rendered height: it is stable
  // across zoom levels and font loading, which real height measurement is not.
  //
  // The budget is narrower on a phone. A legal clause that occupies one line at
  // 1280px occupies four at 375px, so a fixed count produces a "page" the user
  // has to scroll through for a screen and a half — which defeats the point of
  // paginating at all.
  const [linesPerPage, setLinesPerPage] = useState(46);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 560px)');
    const apply = () => setLinesPerPage(narrow.matches ? 22 : 46);
    apply();
    narrow.addEventListener('change', apply);
    return () => narrow.removeEventListener('change', apply);
  }, []);

  const pages = useMemo(() => {
    const lines = body.split('\n');
    const out: string[][] = [];
    for (let i = 0; i < lines.length; i += linesPerPage) out.push(lines.slice(i, i + linesPerPage));
    return out.length > 0 ? out : [['']];
  }, [body, linesPerPage]);

  const total = pages.length;
  const current = Math.min(Math.max(1, page), total);

  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    const needle = query.trim().toLowerCase();
    return pages
      .map((lines, index) => ({
        page: index + 1,
        hits: lines.filter((l) => l.toLowerCase().includes(needle)).length,
      }))
      .filter((p) => p.hits > 0);
  }, [pages, query]);

  const clamp = useCallback((n: number) => Math.min(Math.max(1, n), total), [total]);
  const go = useCallback((next: number) => setPage(clamp(next)), [clamp]);
  /** Relative movement, applied to the latest state so rapid clicks all count. */
  const step = useCallback((delta: number) => setPage((p) => clamp(p + delta)), [clamp]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (event.key === 'Escape') (target as HTMLInputElement).blur();
        return;
      }
      // Listening on `document` only makes sense in full screen, where the
      // rest of the page is already inert behind the dialog. Embedded
      // inline — the normal case, e.g. a resource preview sitting in the
      // middle of a page of prose — this used to hijack ArrowLeft/Right,
      // Home/End and PageUp/Down for the WHOLE PAGE regardless of where
      // focus actually was, breaking ordinary keyboard navigation and
      // radio-group arrow keys anywhere else on that page. Requiring focus
      // to be inside this component's own shell is what confines it.
      if (!fullscreen && !shellRef.current?.contains(target)) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); step(1); }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); step(-1); }
      if (event.key === 'Home') { event.preventDefault(); go(1); }
      if (event.key === 'End') { event.preventDefault(); go(total); }
      if (event.key === '+' || event.key === '=') setZoom((z) => Math.min(200, z + 10));
      if (event.key === '-') setZoom((z) => Math.max(70, z - 10));
      // Escape while full screen is handled by the Dialog, which also
      // restores focus to the trigger — doing it here as well would fight it.
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [total, go, step, fullscreen]);

  const shell = (
    <div className="doc-shell" ref={shellRef} data-fullscreen={fullscreen}>
      <div className="doc-toolbar">
        <div className="row gap-1">
          <button
            type="button" className="btn btn-ghost btn-sm" onClick={() => step(-1)}
            disabled={current <= 1} aria-label="Previous page"
          >
            ‹
          </button>
          <span className="mono" aria-live="polite" style={{ minWidth: 76, textAlign: 'center' }}>
            {current} / {total}
          </span>
          <button
            type="button" className="btn btn-ghost btn-sm" onClick={() => step(1)}
            disabled={current >= total} aria-label="Next page"
          >
            ›
          </button>
        </div>

        <label className="doc-search">
          <span className="sr-only">Search within this document</span>
          <input
            className="input"
            type="search"
            placeholder="Find in document"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              const first = e.target.value.trim().length >= 2 ? matchFirstPage(pages, e.target.value) : null;
              if (first) setPage(first);
            }}
            style={{ minHeight: 34, fontSize: '0.8125rem', paddingBlock: 4 }}
          />
        </label>

        <div className="row gap-1">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.max(70, z - 10))} aria-label="Zoom out">−</button>
          <span className="mono" style={{ minWidth: 46, textAlign: 'center' }}>{zoom}%</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.min(200, z + 10))} aria-label="Zoom in">+</button>
          <button ref={fsToggleRef} type="button" className="btn btn-secondary btn-sm" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? 'Exit' : 'Full screen'}
          </button>
        </div>
      </div>

      {query.trim().length >= 2 && (
        <div className="doc-findbar">
          {matches.length === 0
            ? <span className="t-caption">No match for “{query}” in this document.</span>
            : (
              <span className="t-caption">
                {matches.reduce((n, m) => n + m.hits, 0)} match
                {matches.reduce((n, m) => n + m.hits, 0) === 1 ? '' : 'es'} on page
                {matches.length === 1 ? ' ' : 's '}
                {matches.map((m, i) => (
                  <span key={m.page}>
                    {i > 0 && ', '}
                    <button type="button" className="doc-jump" onClick={() => go(m.page)}>{m.page}</button>
                  </span>
                ))}
              </span>
            )}
        </div>
      )}

      {/* tabIndex so a keyboard user can actually reach and scroll this box —
          it held only static text with nothing focusable inside it, and the
          keyboard shortcuts above have nothing to attach to without this. */}
      <div className="doc-stage" tabIndex={0} role="group" aria-label={`${title} content`}>
        <div
          className="doc-page"
          style={{ fontSize: `${zoom / 100 * 0.8125}rem` }}
          role="document"
          aria-label={`${title}, page ${current} of ${total}`}
        >
          {(pages[current - 1] ?? []).map((line, i) => (
            <p key={i} className="doc-line">{renderLine(line, query)}</p>
          ))}
        </div>
      </div>

      <div className="doc-foot">
        <span className="t-caption">
          {fields.length > 0
            ? `${fields.length} field${fields.length === 1 ? '' : 's'} to fill in — highlighted in the document`
            : 'Nothing to fill in — this document is read as it stands'}
        </span>
        {fields.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowFields((v) => !v)}>
            {showFields ? 'Hide the list' : 'List the fields'}
          </button>
        )}
      </div>

      {showFields && fields.length > 0 && (
        <div className="doc-fields">
          <ol className="stack gap-2">
            {fields.map((f) => (
              <li key={f.key} className="stack gap-1">
                <span className="t-body-sm" style={{ fontWeight: 600 }}>{f.label}</span>
                <span className="mono t-caption">[[{f.key}]]</span>
                {f.hint && <span className="t-caption">{f.hint}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );

  if (!fullscreen) return shell;

  // Full screen goes through the Radix-backed Dialog rather than a
  // hand-rolled overlay. The overlay this replaces had no focus trap, no
  // scroll lock, and no focus restore on close — a keyboard user could Tab
  // out of the "modal" into the page behind it, and nothing told a screen
  // reader the rest of the page was inert.
  return (
    <DialogFlush open onOpenChange={(open) => setFullscreen(open)} title={`${title} — full screen`}>
      {shell}
    </DialogFlush>
  );
}

function matchFirstPage(pages: string[][], query: string): number | null {
  const needle = query.trim().toLowerCase();
  for (const [index, lines] of pages.entries()) {
    if (lines.some((l) => l.toLowerCase().includes(needle))) return index + 1;
  }
  return null;
}

/**
 * Renders one line, marking placeholders and search hits.
 *
 * Everything here is text we authored and it is rendered as text nodes, never as
 * markup — there is no path by which document content becomes HTML.
 */
function renderLine(line: string, query: string): React.ReactNode {
  if (line.trim().length === 0) return ' ';

  const parts: React.ReactNode[] = [];
  const pattern = /\[\[([A-Z0-9_]+)\]\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > last) parts.push(highlight(line.slice(last, match.index), query, `t${last}`));
    parts.push(
      <mark key={`p${match.index}`} className="doc-placeholder" title="You fill this in">
        {match[1]?.replace(/_/g, ' ').toLowerCase()}
      </mark>,
    );
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(highlight(line.slice(last), query, `t${last}`));
  return parts.length > 0 ? parts : line;
}

function highlight(text: string, query: string, key: string): React.ReactNode {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2 || !text.toLowerCase().includes(needle)) return <span key={key}>{text}</span>;

  const out: React.ReactNode[] = [];
  let rest = text;
  let i = 0;
  while (true) {
    const at = rest.toLowerCase().indexOf(needle);
    if (at === -1) { out.push(<span key={`${key}-${i}`}>{rest}</span>); break; }
    if (at > 0) out.push(<span key={`${key}-${i}a`}>{rest.slice(0, at)}</span>);
    out.push(<mark key={`${key}-${i}b`} className="doc-hit">{rest.slice(at, at + needle.length)}</mark>);
    rest = rest.slice(at + needle.length);
    i += 1;
    if (rest.length === 0) break;
  }
  return <span key={key}>{out}</span>;
}
