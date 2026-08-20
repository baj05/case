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

exec "$@"
