#!/usr/bin/env node
/**
 * Ingestion CLI.
 *   npm run ingest                     full run, all 24 State Bar Councils
 *   npm run ingest -- --dry-run        parse and report, write nothing
 *   npm run ingest -- --councils SBC05,SBC12
 *   npm run ingest -- --no-photos --attempts 1
 */
import { parseArgs } from 'node:util';
import { applySchema, isInitialised } from '@lexhall/db';
import { ingestBci } from './src/pipeline.ts';

const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    councils: { type: 'string' },
    attempts: { type: 'string', default: '1' },
    'no-photos': { type: 'boolean', default: false },
    strategy: { type: 'string', default: 'reader' },
    'init-db': { type: 'boolean', default: false },
  },
  allowPositionals: false,
});

if (values['init-db'] || !isInitialised()) {
  process.stdout.write('initialising database schema\n');
  applySchema();
}

const strategy = values.strategy === 'http' ? 'http' : 'reader';
const started = Date.now();

process.stdout.write(`\nLexhall ingestion — Bar Council of India\n${'─'.repeat(64)}\n`);

try {
  const report = await ingestBci({
    dryRun: Boolean(values['dry-run']),
    strategy,
    councils: values.councils?.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
    attempts: Math.max(1, Number(values.attempts) || 1),
    downloadPhotos: !values['no-photos'],
    onProgress: (m) => process.stdout.write(`${m}\n`),
  });

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(`${'─'.repeat(64)}\n`);
  process.stdout.write(`councils        ${report.councilsStored}/${report.councilsSeen} stored\n`);
  process.stdout.write(`pages fetched   ${report.totals.pagesFetched}\n`);
  process.stdout.write(`records seen    ${report.totals.recordsSeen}\n`);
  process.stdout.write(`  created       ${report.totals.created}\n`);
  process.stdout.write(`  updated       ${report.totals.updated}\n`);
  process.stdout.write(`  unchanged     ${report.totals.unchanged}\n`);
  process.stdout.write(`  failed        ${report.totals.failed}\n`);
  process.stdout.write(`partial records ${report.incompleteRecords} (flagged for review)\n`);
  process.stdout.write(`photos stored   ${report.photosStored}\n`);
  if (report.publishGate) process.stdout.write(`published       ${report.publishGate.published} (${report.publishGate.withheld} withheld)\n`);
  process.stdout.write(`indexed         ${report.indexed}\n`);
  process.stdout.write(`elapsed         ${seconds}s\n`);
  if (report.warnings.length) {
    process.stdout.write(`\nwarnings (${report.warnings.length}):\n`);
    for (const w of report.warnings.slice(0, 10)) process.stdout.write(`  · ${w}\n`);
  }
  process.stdout.write('\n');
} catch (error) {
  process.stderr.write(`\ningestion failed: ${(error as Error).message}\n`);
  process.exitCode = 1;
}
