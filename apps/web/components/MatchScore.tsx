'use client';

import { useState } from 'react';
import type { MatchFactor } from '@lexhall/core';

/**
 * Explainable match score.
 *
 * Spec §14 and §84: ranking must be legible and must not be a black box. The
 * breakdown is the actual weighting used, and there is deliberately no
 * commercial factor to show, because none exists.
 */
export function MatchScore({ score, factors }: { score: number; factors: MatchFactor[] }) {
  const [open, setOpen] = useState(false);
  const segments = 10;
  const filled = Math.round((score / 100) * segments);

  return (
    <div className="stack gap-2" style={{ minWidth: 0 }}>
      <button
        type="button"
        className="row gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <span className="t-label-mono ink-variant">Match</span>
        <span className="mono" style={{ fontWeight: 600 }}>{score.toFixed(0)}/100</span>
        <span className="meter" style={{ width: 68 }} aria-hidden="true">
          {Array.from({ length: segments }, (_, i) => (
            <span key={i} className="meter-seg" data-on={i < filled} />
          ))}
        </span>
        <span className="t-caption" style={{ textDecoration: 'underline' }}>{open ? 'Hide' : 'Why'}</span>
      </button>

      {open && (
        <div className="stack gap-1" style={{ padding: '12px 14px', background: 'var(--surface-low)', borderRadius: 'var(--r)' }}>
          <p className="t-caption" style={{ marginBottom: 4 }}>
            Ranked on professional relevance only. Placement cannot be purchased.
          </p>
          {factors.map((f) => (
            <div key={f.key} className="factor-row">
              <span className="t-body-sm">{f.label}</span>
              <span className="mono t-caption">{f.earned.toFixed(1)}/{f.weight}</span>
              <span className="factor-bar">
                <span className="factor-fill" style={{ width: `${f.weight === 0 ? 0 : (f.earned / f.weight) * 100}%` }} />
              </span>
              <span className="t-caption" style={{ gridColumn: '1 / -1' }}>{f.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
