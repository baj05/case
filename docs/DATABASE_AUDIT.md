# Database audit

62 application tables (excluding FTS5 shadow tables), 6 migrations, SQLite via `node:sqlite`. Postgres is the production target — see [DECISIONS](DECISIONS.md) ADR-002.

## Integrity — measured

| Check | Result |
|---|---|
| `pragma foreign_key_check` | **0 violations** |
| Orphan `fee_schedule` rows | 0 |
| Orphan `availability_rule` rows | 0 |
| Orphan `professional_search_doc` rows | 0 |
| `professional` rows with no `source_id` | 0 |
| Published rows missing provenance | 0 |
| Tables with a FK but no index | **0** (was 3 — fixed in `006_index_fixes.sql`) |

## Constraints that enforce policy, not just shape

These are the ones worth knowing about, because they make a policy decision impossible to reverse by configuration alone:

| Constraint | Effect |
|---|---|
| `plan.grants_ranking_boost CHECK (= 0)` | Paid search ranking cannot be enabled without a migration. ADR-009. |
| `booking.platform_fee_minor CHECK (= 0)` | The platform cannot take a cut of a consultation fee. C-12. |
| `judge` table has **no** rating/score/sentiment column | Judge gamification is structurally impossible. C-14. |
| `professional` unique index on `(source_id, source_ref)` | One upstream record maps to exactly one profile — the fix for E1. |
| `booking` unique partial index on `(professional_id, starts_at_utc)` where status is live | Double-booking is impossible at the storage layer, not just in application code. |

## Public/private separation

Enforced at the query layer, not by convention: `repositories/profile.ts` selects an explicit `PUBLIC_COLUMNS` list. There is no `SELECT *` on the public path, so a `private_*` column cannot reach a page by accident.

Five zones: public professional · private professional (`private_email`, `private_phone`, `private_residence`) · client · matter · audit. Matter and consultation text are excluded from every search index **by construction** — the index is built from a separate projection that has no access to those columns.

## Timestamps and money

- All timestamps ISO-8601 UTC strings, formatted in exactly one place (`client.ts: now()`).
- All money as **integer minor units**. No floats anywhere in the financial path. `ledger_entry` is append-only; corrections are opposing entries.
- Booking quotes are **snapshotted** at creation, so a later fee edit cannot retroactively change what a client was told.

## Remaining schema debt

| Item | Impact | Priority |
|---|---|---|
| Firm-specific columns will be sparse in the single `professional` table (ADR-001) | Cosmetic today | Low — split to `professional_profile_ext` when firms are built |
| No soft-delete sweeper job | `deleted_at` rows accumulate | Low |
| SQLite has no `timestamptz`; dialect gap tabulated in `infrastructure/postgres/README.md` | Migration work | Medium, before real traffic |
