# Performance audit

Measured, not assumed. Where a number is absent, it is because it was not measured — not estimated.

## Measured

| Metric | Value | Method |
|---|---|---|
| Search latency | **7.6 – 21.2 ms** across 5 representative queries | in-process timing, 373-record corpus, FTS5 + trigram |
| Health probe | 4.9 ms | `/api/health` |
| Typecheck | ~2–4 s | `tsc --noEmit`, strict |
| Test suite | 0.34 s, 20 tests | `node --test` |
| Production build | 27 routes | `next build` |
| Image payload on disk | 24.7 MB total (368 portraits + 28 editorial) | filesystem |
| Fonts | 4 families / 9 faces, self-hosted at build | `next/font` |
| Runtime third-party requests | **zero** | `remotePatterns: []`, fonts self-hosted |

## Deliberate choices

- **Denormalised search document.** One FTS match + one filter pass, rather than six joins per query. Rebuilt by the indexer, not assembled at request time.
- **Denormalised fee summary.** Price sorting is one join, not a correlated subquery per row.
- **Materialised location path.** Descendant queries are one indexed `LIKE`, not a recursive CTE per request.
- **Portraits copied to our origin.** Removes a third-party dependency from page load and stops leaking visitor IPs to the regulator's CDN.
- **Textures pre-resized** from up to 8000 px to 1400 px (14.9 MB → 2.3 MB on the court set).
- **`ANALYZE` run** after the index migration so the planner has current statistics.

## Fixed

| Issue | Fix |
|---|---|
| 3 tables with an unindexed foreign key — every lookup a full scan | `006_index_fixes.sql` (+ 4 hot-path composites) |
| Court images shipped at up to 5184 px | Resized to 1400 px, quality 82, progressive |
| Next image cache served a stale hero after the source file changed | Content-specific filenames |

## Not measured — and I will not invent the numbers

**No Lighthouse run, no Core Web Vitals (LCP/CLS/INP/TTFB), no bundle analysis, no network throttling, no CPU throttling.** These need a Lighthouse/Playwright harness that is not yet wired. Listed as P2 in [IMPLEMENTATION_ROADMAP](IMPLEMENTATION_ROADMAP.md).

## Known risks at scale

| Risk | Threshold | Mitigation |
|---|---|---|
| JS trigram scorer is O(candidates) | ~10 k records | Replace with `pg_trgm` + GiST on the Postgres migration |
| SQLite single-writer | Concurrent ingestion + traffic | Postgres (ADR-002); the repository layer is the seam |
| Full search-index rebuild | ~100 k records | Incremental reindex per changed record |
| Hero image `loading="lazy"` above the fold | Now | One-line fix; hurts LCP |
