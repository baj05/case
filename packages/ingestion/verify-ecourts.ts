/**
 * Verify the eCourtsIndia API key works, using the cheapest calls available.
 *
 *   npm run ecourts:verify
 *
 * Prints coverage and quota-relevant facts. Never prints the key itself.
 */
import { listStates, hasECourtsKey, ECourtsApiError } from './src/ecourts-api.ts';

if (!hasECourtsKey()) {
  process.stderr.write(
    'ECOURTS_API_KEY is not set.\n\n'
    + 'Add it to .env in the project root:\n'
    + '  ECOURTS_API_KEY="eci_live_xxxxxxxx"\n\n'
    + 'Get a key at https://ecourtsindia.com/api\n',
  );
  process.exit(1);
}

const masked = (process.env.ECOURTS_API_KEY ?? '').trim();
process.stdout.write(`key loaded: ${masked.slice(0, 9)}…${masked.slice(-4)} (${masked.length} chars)\n`);
process.stdout.write(`base: ${process.env.ECOURTS_API_BASE ?? 'https://webapi.ecourtsindia.com'}\n\n`);

try {
  const states = await listStates();
  process.stdout.write(`✓ authenticated — court-structure returned ${Array.isArray(states) ? states.length : '?'} states\n`);
  if (Array.isArray(states)) {
    for (const s of states.slice(0, 8)) process.stdout.write(`    ${s.state}  ${s.stateName}\n`);
    if (states.length > 8) process.stdout.write(`    … and ${states.length - 8} more\n`);
  }
  process.stdout.write('\nKey works. Ready to build the ingestion.\n');
} catch (e) {
  const err = e as ECourtsApiError;
  process.stderr.write(`✗ ${err.code}: ${err.message}\n`);
  if (err.code === 'NOT_AUTHENTICATED') {
    process.stderr.write('\nThe key was rejected. Check it is a *live* key (eci_live_…) and pasted whole.\n');
  }
  process.exit(1);
}
