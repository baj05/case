# Data pipeline

```
source registry (DB row: robots status, rate limit, publish_allowed, terms note)
  → robots.txt fetch + parse + enforce
  → render          (strategy: http | reader | [playwright])
  → parse           typed records per adapter
  → raw_record      immutable, SHA-256 content hash → change detection
  → normalise       name folding, honorific stripping, title casing
  → entity resolve  source_ref → exact normalised name in body → trigram ≥0.82 → else new
  → upsert          professional + enrolment + court links + languages
  → QC issues       missing_name, incomplete_extraction, suspected_duplicate, unmapped_location
  → publish gate    source cleared ∧ not opted out ∧ minimum fields ∧ attributable
  → confidence      source authority + field completeness + claim status
  → search index    FTS5 rebuild + suggest corpus
```

## Why raw records are immutable

This is the part that earned its keep. When the court-resolution logic was found to be **fabricating** associations (matching on court *seat*, so any Delhi address matched every Delhi-seated tribunal), the fix could be applied and **373 records reprocessed from stored raw payloads without re-crawling the source** — `packages/ingestion/relink.ts`. Fabricated links fell from ~358 to 16 accurate ones.

A pipeline that discards its raw input cannot do that.

## Adding a source

Write an adapter exposing `fetch → parse` returning typed records. Register it as a `source` row. The rest of the pipeline is shared. `packages/ingestion/src/sources/bci.ts` and `judges.ts` are the two worked examples.

## Environments

`raw_record.state`: `pending → normalised → linked` (or `rejected` / `superseded`). Nothing reaches a public page without passing the publish gate, which checks `source.publish_allowed`.

## Commands

```bash
npm run ingest                      # all 24 State Bar Councils (~2 min, polite)
npm run ingest -- --dry-run         # parse and report, write nothing
npm run ingest -- --councils SBC05  # one council
npm run ingest:judges               # Supreme Court judges
npm run db:demo                     # demo fees/availability on real records
npm run db:demo -- --clear          # revert to true unclaimed state
```

## Demo configuration, and why it is honest

`db:demo` does **not** invent advocates. It takes 20 real ingested records and simulates them having claimed their profile and declared fees and availability — configuration only they could really supply. Every row is audit-marked `demo.configured`, the `DEMO_DATA_SEEDED` flag makes the UI disclose it on the profile, booking and Advo AI surfaces, and `--clear` reverts everything.
