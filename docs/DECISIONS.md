# Architecture decision records

Short, dated, and honest about trade-offs. Each records what was chosen, what was rejected, and what would make
us revisit it.

---

### ADR-001 — One `professional` table, not one per kind
**Decision.** Advocates, senior advocates, firms, chambers, LPO providers, mediators and arbitrators share one
table with a `kind` discriminator.
**Why.** Search, claims, reviews, referrals and bookings must address them uniformly. Separate tables would mean
a union in every query and five copies of the verification ladder.
**Cost.** Firm-specific columns will be sparse. Accepted: a `professional_profile_ext` table can hold them later.

### ADR-002 — SQLite via `node:sqlite` for the prototype; Postgres is the production target
**Decision.** The prototype runs on a single SQLite file using Node's built-in driver.
**Why.** Zero dependencies, zero native compilation, no daemon — it runs from the project folder. The user
explicitly asked for a local prototype after a Docker/Postgres attempt was interrupted.
**Seam.** All SQL lives in `packages/db/src/repositories/`. `apps/web` never composes SQL. Porting means
reimplementing those functions against `pg`. Dialect differences are tabulated in
`infrastructure/postgres/README.md`.
**Revisit when.** Concurrent writers, >1 M rows, or real traffic. FTS5 → `tsvector`, JS trigram → `pg_trgm`.

### ADR-003 — FTS5 external-content table plus a JS trigram scorer
**Decision.** Full-text via an FTS5 index over a denormalised `professional_search_doc`; typo tolerance via a
Jaccard trigram similarity in TypeScript.
**Why.** BM25 with per-column weights handles relevance; the trigram pass catches "Rameshh Gupta". A denormalised
search doc means one MATCH plus one filter pass instead of six joins per query. Measured 12–25 ms on 373 records.
**Rejected.** OpenSearch — real operational weight for a corpus this size, and it would have broken the
zero-infrastructure constraint.
**Cost.** The JS trigram pass is O(candidates). Fine to ~10 k; replace with `pg_trgm` + GiST beyond that.

### ADR-004 — Jurisdiction abstraction from day one
**Decision.** `country → jurisdiction → professional_body → court`, and a self-referencing `location` hierarchy
with a materialised `path`. India is seed data, not schema.
**Why.** Retrofitting internationalisation is the classic marketplace rewrite. Three unlaunched countries are
seeded to prove the abstraction is exercised rather than merely asserted.
**Cost.** More joins than an India-only design. Mitigated by denormalising into the search doc.

### ADR-005 — Pluggable render strategy for ingestion
**Decision.** `RenderStrategy = 'http' | 'reader'`. Server-rendered sources use plain HTTP; client-rendered SPAs
go through a render service.
**Why.** barcouncilofindia.org is a UmiJS SPA returning a 661-byte shell to a plain GET. The alternatives were
reverse-engineering its internal API — several routes of which robots.txt disallows, and probing further felt like
unauthorised enumeration of a regulator's server — or rendering the permitted public page a human would see. We
chose the latter.
**Cost.** The keyless reader truncates at ~8 KB, losing ~40 % of member detail (audit L1). A self-hosted
Playwright worker is the fix and is a drop-in third strategy.

### ADR-006 — Deterministic intake classifier, not an LLM
**Decision.** Plain-language routing is a weighted synonym matcher.
**Why.** Three reasons, in order: it cannot hallucinate legal advice; it is explainable, so the UI can show the
user what it concluded and let them correct it; and it runs in under a millisecond with no API dependency or
per-query cost. For a product whose entire value is trust, an unexplainable router is a liability.
**Cost.** It only knows the synonyms we write. Mitigated by the zero-result queue in `/admin`, which surfaces
exactly which phrases are missing — the vocabulary improves from evidence rather than guesswork.
**Where an LLM could sit.** Enriching the synonym vocabulary offline, and summarising judgments — never in the
routing decision path, and never generating advice.

### ADR-007 — Payments behind a provider abstraction, switched off
**Decision.** `ledger_entry` is append-only with a `provider`/`provider_ref` pair and integer minor units. No
processor SDK is integrated.
**Why.** Whether the platform may hold or route consultation fees is an unresolved legal question (C-12).
Integrating Razorpay first and asking later would be the wrong order. Append-only means corrections are opposing
entries, never mutations — the only defensible shape for money.

### ADR-008 — Personal contact data ingested but never published
**Decision.** Residential addresses, personal mobiles and personal emails go into `private_*` columns.
**Why.** They are the strongest available signal that a claimant is who they say they are — the claim scorer
awards 55 points for an email match and 35 for a phone match. That is a legitimate, narrow purpose. Publishing
them is a different act with different proportionality, and we decline it.
**Alternative rejected.** Not ingesting them at all. That would leave claim verification with nothing but
documents, making the flow slower and more manual for every honest advocate.

### ADR-009 — Ranking cannot be bought, enforced at the schema level
**Decision.** `plan.grants_ranking_boost INTEGER NOT NULL DEFAULT 0 CHECK (grants_ranking_boost = 0)`.
**Why.** A policy in a document decays. A CHECK constraint means enabling paid placement requires a migration and
a code change — both of which appear in review. The weights are published at `/how-it-works` and a unit test
asserts no commercial key exists in `RANKING_WEIGHTS`.
**Cost.** Closes off an obvious revenue line. Deliberate: monetisation is SaaS tooling, not visibility.

### ADR-010 — One documented deviation from DESIGN.md
**Decision.** DESIGN.md's component note specifies white text on Action Orange `#FF7A45`. That is 2.6:1 and fails
WCAG 2.2 AA. Solid primary buttons therefore use `--primary #a73a05` with white (6.5:1); orange surfaces use
`--primary-container #ff7a45` with `--on-primary-container #672000` (5.4:1).
**Why.** Both pairings are already defined in DESIGN.md's own Material role tokens, so this honours the palette
rather than substituting one. The visual result is the same warm identity, at AA.

### ADR-011 — No `packages/ui`, components live in the app
**Decision.** The design system is `apps/web/app/globals.css` plus `apps/web/components/`.
**Why.** A shared UI package earns its place when a second app consumes it. Today there is one app; a package
would add build wiring for no benefit. Extract when the admin or professional app splits out.

### ADR-012 — Practice areas are never inferred
**Decision.** Ingested records carry no practice areas. They appear only when a professional claims the profile.
**Why.** The register does not state specialisation. Inferring that a Delhi advocate "probably does labour law"
would be a confident, plausible, unfounded assertion about a real named person, and would poison the one thing the
product sells: that what it says can be relied on.
**Cost.** Practice-area search returns zero results today. Surfaced explicitly in the empty state and in
`/data-sources` rather than hidden.
