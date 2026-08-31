'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { DocSegment } from '@lexhall/core';

/**
 * The document, rendered live beside the form that fills it.
 *
 * Two things make this different from DocumentViewer, which is a reader for
 * a finished document:
 *
 *   1. It scrolls continuously rather than paginating. The panel follows the
 *      field being edited, and a page boundary landing mid-clause fights
 *      that — you would type and see nothing move.
 *   2. It renders SEGMENTS, not text. `annotateTemplate` says which run of
 *      characters came from which field, so the panel can point at the exact
 *      spot being edited. The naive alternative — searching the rendered
 *      text for the value you just typed — breaks as soon as two fields hold
 *      the same value, or a value happens to occur in the fixed prose.
 *
 * Nothing here is ever rendered as markup. Every segment goes in as a text
 * node, so there is no path by which document content becomes HTML.
 */
export function LiveDocument({
  title, lines, activeKey, filledCount, totalCount, heading,
}: {
  title: string;
  lines: DocSegment[][];
  /** The field the user is editing right now, highlighted and scrolled to. */
  activeKey?: string | null;
  filledCount: number;
  totalCount: number;
  /** Optional override for the panel heading. */
  heading?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLElement | null>(null);

  const pct = totalCount === 0 ? 100 : Math.round((filledCount / totalCount) * 100);

  /**
   * Bring the active field into view when it changes.
   *
   * Scoped to the stage's own scroll box via `block: 'nearest'` on the
   * container — a bare `scrollIntoView` would also scroll the PAGE, yanking
   * the form out from under the user's cursor while they type.
   */
  useEffect(() => {
    const el = activeRef.current;
    const stage = stageRef.current;
    if (!el || !stage) return;

    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const elBox = el.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const offset = (elBox.top - stageBox.top) - (stageBox.height / 2) + (elBox.height / 2);
    stage.scrollBy({ top: offset, behavior: reduce ? 'auto' : 'smooth' });
  }, [activeKey, lines]);

  // Rebuilt only when the document actually changes, not on every render.
  const rendered = useMemo(() => lines.map((segments, lineIndex) => (
    // eslint-disable-next-line react/no-array-index-key -- line position IS the identity
    <p key={lineIndex} className="doc-line">
      {segments.length === 0 ? ' ' : segments.map((segment, i) => (
        <Segment
          key={`${lineIndex}-${i}`}
          segment={segment}
          isActive={Boolean(segment.fieldKey) && segment.fieldKey === activeKey}
          onActiveRef={(node) => { if (node) activeRef.current = node; }}
        />
      ))}
    </p>
  )), [lines, activeKey]);

  return (
    <div className="live-doc">
      <div className="live-doc-head">
        <span className="t-label-mono ink-variant">{heading ?? 'Your document, live'}</span>
        <span className="t-caption">{filledCount} of {totalCount} filled</span>
      </div>

      {/*
        * tabIndex on the scroll container: it holds only text, so without it
        * there is nothing focusable inside and a keyboard-only user cannot
        * scroll the document at all.
        */}
      <div
        ref={stageRef}
        className="live-doc-stage"
        tabIndex={0}
        role="group"
        aria-label={`${title} — live preview`}
      >
        <div className="doc-page" role="document">
          {rendered}
        </div>
      </div>

      <div className="live-doc-foot">
        <div className="fill-meter" role="presentation">
          <span style={{ width: `${pct}%` }} />
        </div>
        {/* The count is the accessible version of the meter; the bar itself
            is decorative so it is not announced twice. */}
        <span className="sr-only" role="status">
          {filledCount} of {totalCount} fields filled
        </span>
        <span className="t-caption">
          {filledCount === totalCount
            ? 'Every field is filled.'
            : 'Highlighted blanks are still to fill.'}
        </span>
      </div>
    </div>
  );
}

const CLASS_FOR: Record<DocSegment['state'], string | undefined> = {
  text: undefined,
  filled: 'doc-fill',
  missing: 'doc-placeholder',
  left_blank: 'doc-blank',
  unknown: 'doc-unknown',
};

function Segment({
  segment, isActive, onActiveRef,
}: {
  segment: DocSegment;
  isActive: boolean;
  onActiveRef: (node: HTMLElement | null) => void;
}) {
  if (segment.state === 'text') return <>{segment.text}</>;

  const className = CLASS_FOR[segment.state];
  // A blank shows its label rather than [[UPPER_SNAKE]] — the raw token is
  // what the engine needs, not what a person should have to read.
  const display = segment.state === 'missing'
    ? (segment.fieldKey ?? '').replace(/_/g, ' ').toLowerCase()
    : segment.text;

  return (
    <mark
      ref={isActive ? onActiveRef : undefined}
      className={className}
      data-active={isActive ? 'true' : undefined}
      // Announced by the form field itself; repeating it here would make a
      // screen reader read the whole document twice per keystroke.
      aria-hidden={isActive ? undefined : undefined}
      title={segment.state === 'missing' ? 'Still to fill in' : undefined}
    >
      {display}
    </mark>
  );
}
