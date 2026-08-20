import Link from 'next/link';
import { relativeDate } from '@/lib/format';
import type { ResourceCard as Card } from '@lexhall/db';

/**
 * One resource in a list.
 *
 * Four facts and no more (spec §53): what it is, who stands behind it, where it
 * applies, and when it was last checked. The official-status badge is not
 * optional and is never visually equivalent to the type badge — a user must be
 * able to tell a government form from something we wrote at a glance, from the
 * card, without opening anything.
 */
export function ResourceCard({ card, note }: { card: Card; note?: string }) {
  const jurisdiction = card.stateName ?? (card.isPanIndia ? 'All of India' : null);

  return (
    <article className="result-card lift" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <div className="stack gap-2" style={{ minWidth: 0 }}>
        <div className="row wrap gap-1">
          <span className={`chip ${card.statusTone}`}>{card.statusLabel}</span>
          <span className={`chip ${card.typeTone}`}>{card.typeLabel}</span>
          {jurisdiction && <span className="chip chip-outline">{jurisdiction}</span>}
          {card.hasPreview && <span className="chip chip-outline">Preview</span>}
        </div>

        <h3 className="t-title">
          <Link href={`/resources/${card.slug}`} style={{ textDecoration: 'none' }}>{card.title}</Link>
        </h3>

        <p className="t-body-sm ink-variant clamp-2">{card.description}</p>

        {note && (
          <p className="t-body-sm" style={{ borderLeft: '3px solid var(--action-orange)', paddingLeft: 10 }}>
            {note}
          </p>
        )}

        <div className="row wrap gap-3 t-caption">
          {card.authorityName && <span>{card.authorityName}</span>}
          {card.lastVerifiedAt
            ? <span>Checked {relativeDate(card.lastVerifiedAt)}</span>
            : <span>Not yet checked</span>}
          <span className="mono">{formatLabel(card.docFormat)}</span>
          {card.language !== 'en' && <span>{card.language.toUpperCase()}</span>}
        </div>

        <div className="row wrap gap-2">
          <Link href={`/resources/${card.slug}`} className="btn btn-secondary btn-sm">
            {card.hasPreview ? 'Preview' : 'Open'}
          </Link>
          {card.hasPreview ? (
            <Link href={`/api/resources/${card.slug}/download?format=docx`} className="btn btn-ghost btn-sm">
              Download
            </Link>
          ) : card.sourceUrl ? (
            <a
              href={card.sourceUrl}
              className="btn btn-ghost btn-sm"
              target="_blank"
              rel="noreferrer noopener"
            >
              Open official source ↗
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Compact variant for sidebars and related lists. */
export function ResourceRow({ card }: { card: Card }) {
  return (
    <Link
      href={`/resources/${card.slug}`}
      className="stack gap-1"
      style={{ textDecoration: 'none', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px solid var(--outline-variant)' }}
    >
      <span className="row wrap gap-1">
        <span className={`chip ${card.statusTone}`} style={{ fontSize: '0.6875rem' }}>{card.statusLabel}</span>
        {card.stateName && <span className="chip chip-outline" style={{ fontSize: '0.6875rem' }}>{card.stateName}</span>}
      </span>
      <span className="t-body-sm" style={{ fontWeight: 600 }}>{card.title}</span>
      <span className="t-caption clamp-2">{card.description}</span>
    </Link>
  );
}

function formatLabel(format: string): string {
  switch (format) {
    case 'pdf': return 'PDF';
    case 'docx': return 'DOC';
    case 'xlsx': return 'XLS';
    case 'portal': return 'Web portal';
    case 'template': return 'Editable document';
    case 'zip': return 'Archive';
    default: return 'Web page';
  }
}
