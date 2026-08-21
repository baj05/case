import Image from 'next/image';
import { STATE_EMBLEMS } from '@/lib/state-emblems';

/**
 * Full-bleed, hard-edged marquee band of state government seals — the
 * "logo ipsum" pattern (solid colour band, items flowing edge to edge, no
 * per-item card/border/shadow). Purely descriptive ("resources on this page
 * come from these governments' own portals"), never framed as certification
 * or partnership. The list renders twice back to back and the track
 * animates exactly -50%, landing on the seam between the two copies so the
 * loop shows no jump. Paused on hover/focus, and the animation drops out
 * entirely under prefers-reduced-motion (see globals.css).
 */
export function StateEmblemTicker() {
  const items = [...STATE_EMBLEMS, ...STATE_EMBLEMS];
  return (
    <div className="emblem-ticker" role="group" aria-label="State and union territory governments this library sources documents from">
      <div className="emblem-track">
        {items.map((s, i) => (
          <div key={`${s.code}-${i}`} className="emblem-item" aria-hidden={i >= STATE_EMBLEMS.length}>
            <Image src={`/img/emblems/${s.file}`} alt="" width={56} height={56} className="emblem-mark" />
            <span className="emblem-label">Government of {s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
