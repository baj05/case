import Image from 'next/image';
import { STATE_EMBLEMS } from '@/lib/state-emblems';

/**
 * Two full-bleed marquee bands of state government seals — the "logo ipsum"
 * pattern (solid colour band, items flowing edge to edge, no per-item card,
 * border or shadow). Top band carries the seals and scrolls right; bottom
 * band carries the plain "Government of X" labels and scrolls left, so the
 * two read as independent, counter-moving strips. Purely descriptive
 * ("resources on this page come from these governments' own portals"),
 * never framed as certification or partnership.
 *
 * Each band renders the list twice back to back and animates exactly -50%
 * (or +50% for the reverse band), landing on the seam between the two
 * copies so the loop shows no jump. Paused on hover/focus, and the
 * animation drops out entirely under prefers-reduced-motion (see globals.css).
 */
export function StateEmblemTicker() {
  const items = [...STATE_EMBLEMS, ...STATE_EMBLEMS];
  return (
    <div className="emblem-bands" role="group" aria-label="State and union territory governments this library sources documents from">
      <div className="emblem-ticker emblem-ticker-logos">
        <div className="emblem-track emblem-track-right">
          {items.map((s, i) => (
            <div key={`logo-${s.code}-${i}`} className="emblem-item" aria-hidden={i >= STATE_EMBLEMS.length}>
              <Image src={`/img/emblems/${s.file}`} alt="" width={140} height={140} className="emblem-mark" />
            </div>
          ))}
        </div>
      </div>
      <div className="emblem-ticker emblem-ticker-text">
        <div className="emblem-track emblem-track-left">
          {items.map((s, i) => (
            <span key={`label-${s.code}-${i}`} className="emblem-label-huge" aria-hidden={i >= STATE_EMBLEMS.length}>
              Government of {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
