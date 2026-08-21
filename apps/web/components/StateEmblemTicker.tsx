import Image from 'next/image';
import { STATE_EMBLEMS } from '@/lib/state-emblems';

/**
 * Infinite-scroll ticker of state government seals — purely descriptive
 * ("resources on this page come from these governments' own portals"), never
 * framed as certification or partnership. The list renders twice back to
 * back and the track animates exactly -50%, landing on the seam between the
 * two copies so the loop shows no jump. Paused on hover/focus, and the
 * animation drops out entirely under prefers-reduced-motion (see globals.css).
 */
export function StateEmblemTicker() {
  const items = [...STATE_EMBLEMS, ...STATE_EMBLEMS];
  return (
    <div className="emblem-ticker" role="group" aria-label="State and union territory governments this library sources documents from">
      <div className="emblem-track">
        {items.map((s, i) => (
          <div key={`${s.code}-${i}`} className="emblem-item" aria-hidden={i >= STATE_EMBLEMS.length}>
            {s.file ? (
              <Image src={`/img/emblems/${s.file}`} alt="" width={40} height={40} className="emblem-mark" />
            ) : (
              <span className="emblem-mark emblem-mark-text" aria-hidden="true">{s.name.slice(0, 2).toUpperCase()}</span>
            )}
            <span className="emblem-label">Government of {s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
