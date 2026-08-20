#!/bin/sh
set -e
# ---------------------------------------------------------------------------
# A fresh container has an empty volume. Applying the schema on boot means a new
# deployment reports "degraded" (schema present, corpus empty) instead of
# "error", and the operator sees a working site that says "run ingest" rather
# than a hard failure. Migrations are additive and idempotent, so this is safe
# on every restart, including over an existing populated volume.
# ---------------------------------------------------------------------------
echo "[entrypoint] ensuring schema at ${DATABASE_PATH}"
node --input-type=module -e "
  const { applySchema, isInitialised } = await import('/app/packages/db/src/client.ts');
  const fresh = !isInitialised();
  const r = applySchema({ fresh });
  console.log('[entrypoint] migrations applied:', r.applied.join(', ') || '(none)');
" || echo "[entrypoint] WARNING: schema step failed; the health probe will report it"

echo "[entrypoint] seeding reference data"
node --input-type=module -e "
  const { seedReferenceData } = await import('/app/packages/db/src/repositories/reference.ts');
  const r = seedReferenceData();
  console.log('[entrypoint] reference:', JSON.stringify(r));
" || echo "[entrypoint] WARNING: reference seed failed"

# ---------------------------------------------------------------------------
# The legal matter taxonomy and the resource library are configuration, not
# crawled data: they come from the seed files in packages/core and need no
# network. Seeding them on boot means a fresh container serves a working
# resource library instead of an empty one that looks broken.
#
# What is NOT done here is verification. Publication of an official resource is
# gated on actually fetching its URL, and doing that on every container start
# would hammer government sites on each deploy — the same reason the README tells
# operators to import a snapshot rather than crawl. So a fresh container's
# catalogue entries sit at VERIFIED and the library shows its own templates until
# an operator runs:
#
#   docker compose exec web node packages/ingestion/cli.ts --verify-resources
# ---------------------------------------------------------------------------
echo "[entrypoint] seeding taxonomy and resource library"
node --input-type=module -e "
  const { seedTaxonomy, seedResourceLibrary } = await import('/app/packages/db/src/repositories/index.ts');
  const t = seedTaxonomy();
  console.log('[entrypoint] taxonomy:', t.domains, 'domains,', t.matters, 'matters,', t.forums, 'forums');
  const r = seedResourceLibrary();
  console.log('[entrypoint] resources:', r.catalogue, 'catalogue,', r.templates, 'templates,', r.stateVariants, 'state variants,', r.kits, 'kits');
  console.log('[entrypoint] resource verification is a separate step: node packages/ingestion/cli.ts --verify-resources');
" || echo "[entrypoint] WARNING: resource seed failed; /resources will report an empty library"

exec "$@"
