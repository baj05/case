import type { Metadata } from 'next';
import Image from 'next/image';
import { getImageCredits } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Image credits',
  description: 'Attribution for every editorial photograph used on this site.',
};

export default async function CreditsPage() {
  const credits = await getImageCredits();

  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 900 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Attribution</p>
        <h1 className="t-headline-lg">Image credits</h1>
        <p className="t-body ink-variant measure">
          Editorial photography is sourced from openly licensed works, filtered to licences that permit
          commercial use and modification. Advocates&apos; portraits are not listed here — those are the
          official photographs published by each Bar Council, and each profile links to its source.
        </p>
      </div>

      {credits.length === 0 ? (
        <p className="t-body ink-variant">
          No credits manifest found. Run <code className="mono">node scripts/fetch-imagery.mjs</code> to
          download editorial imagery and generate attribution.
        </p>
      ) : (
        <div className="grid-auto">
          {credits.map((c) => (
            <figure key={c.slug} className="card stack gap-2" style={{ padding: 0, overflow: 'hidden' }}>
              <Image src={c.file} alt={c.title ?? ''} width={400} height={260} sizes="(max-width: 700px) 100vw, 300px" style={{ objectFit: 'cover', width: '100%', height: 160 }} />
              <figcaption className="stack gap-1" style={{ padding: '12px 16px 16px' }}>
                {c.title && <span className="t-body-sm" style={{ fontWeight: 600 }}>{c.title}</span>}
                <span className="t-caption">
                  by {c.creatorUrl ? <a href={c.creatorUrl} target="_blank" rel="noopener noreferrer nofollow" style={{ textDecoration: 'underline' }}>{c.creator}</a> : c.creator}
                </span>
                <span className="row wrap gap-1" style={{ marginTop: 2 }}>
                  <span className="chip chip-outline">{c.licence}</span>
                  {c.licenceUrl && <a href={c.licenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="chip chip-button chip-outline">Licence ↗</a>}
                  {c.sourcePage && <a href={c.sourcePage} target="_blank" rel="noopener noreferrer nofollow" className="chip chip-button chip-outline">Original ↗</a>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
