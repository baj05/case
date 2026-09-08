/**
 * Cases-filed-by-year bar chart. Real scraped filing years only (already
 * bounded to a plausible range by the ingest script) — a gap in the bars is
 * an honest gap in the source's own case history, not a rendering bug.
 */
export function CaseYearChart({ data }: { data: Array<{ year: number; count: number }> }) {
  if (data.length === 0) return null;

  const width = 640;
  const height = 200;
  const padLeft = 36;
  const padBottom = 24;
  const padTop = 12;
  const plotW = width - padLeft - 8;
  const plotH = height - padTop - padBottom;

  const years = data.map((d) => d.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const span = Math.max(1, maxYear - minYear);
  const maxCount = Math.max(...data.map((d) => d.count));
  const barW = Math.max(3, plotW / (span + 1) - 2);

  const yTicks = [0, Math.round(maxCount / 2), maxCount];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cases filed by year" style={{ width: '100%', height: 'auto' }}>
      {yTicks.map((t) => {
        const y = padTop + plotH - (t / maxCount) * plotH;
        return (
          <g key={t}>
            <line x1={padLeft} x2={width - 4} y1={y} y2={y} stroke="var(--outline-variant)" strokeWidth={1} />
            <text x={padLeft - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--on-surface-variant)">{t}</text>
          </g>
        );
      })}
      {data.map((d) => {
        const x = padLeft + ((d.year - minYear) / (span + 1)) * plotW;
        const barH = (d.count / maxCount) * plotH;
        const y = padTop + plotH - barH;
        const showLabel = span <= 12 || d.year % Math.ceil((span + 1) / 12) === 0;
        return (
          <g key={d.year}>
            <rect x={x} y={y} width={barW} height={Math.max(1, barH)} fill="var(--secondary)" rx={2}>
              <title>{d.year}: {d.count} case{d.count === 1 ? '' : 's'}</title>
            </rect>
            {showLabel && (
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize={9} fill="var(--on-surface-variant)">
                {d.year}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
