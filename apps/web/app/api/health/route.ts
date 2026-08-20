import { NextResponse } from 'next/server';
import { databaseReady, getCorpus } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Liveness and readiness in one probe.
 *
 * "Up" is not the same as "usable": a container with an empty database serves
 * pages that say "run ingest" and would pass a naive 200-check. This reports
 * corpus size so an unseeded instance is visibly degraded.
 */
export async function GET() {
  const startedAt = performance.now();
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  const dbOk = (() => { try { return databaseReady(); } catch { return false; } })();
  checks.database = { ok: dbOk, detail: dbOk ? 'reachable, schema present' : 'unreachable or not initialised' };

  let corpus = 0;
  let indexed = 0;
  if (dbOk) {
    try {
      const c = getCorpus();
      corpus = c.professionals;
      indexed = c.professionals;
      checks.corpus = {
        ok: corpus > 0,
        detail: corpus > 0 ? `${corpus} published professionals` : 'empty — run `npm run ingest`',
      };
      checks.searchIndex = { ok: indexed > 0, detail: `${indexed} documents` };
    } catch (error) {
      checks.corpus = { ok: false, detail: (error as Error).message.slice(0, 120) };
    }
  }

  // Distinguish three states deliberately:
  //   error     — database unreachable, the app cannot serve
  //   degraded  — schema present but no corpus; pages render and say "run ingest"
  //   ok        — reachable and populated
  const degraded = Object.values(checks).some((c) => !c.ok);
  const status = !dbOk ? 'error' : degraded ? 'degraded' : 'ok';

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
      checks,
    },
    {
      status: status === 'error' ? 503 : 200,
      headers: { 'cache-control': 'no-store' },
    },
  );
}
