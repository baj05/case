/** Apply any .sql migrations not yet recorded in schema_migration, against
 * the real dev database. Additive only — see applySchema()'s own doc
 * comment in client.ts for the fresh-vs-additive distinction. */
import { applySchema } from '../src/client.ts';

const result = applySchema();
console.log(`Applied: ${result.applied.join(', ') || '(none)'}`);
console.log(`Already applied: ${result.skipped.length} migration(s)`);
