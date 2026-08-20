#!/usr/bin/env node
/**
 * Ingestion CLI.
 *   npm run ingest                     full run, all 24 State Bar Councils
 *   npm run ingest -- --dry-run        parse and report, write nothing
 *   npm run ingest -- --councils SBC05,SBC12
 *   npm run ingest -- --no-photos --attempts 1
 *
 * Resource library (see docs/RESOURCE_INGESTION_REPORT.md):
 *   npm run ingest -- --resources              seed the catalogue and templates
 *   npm run ingest -- --verify-resources       link-check every source URL
 *   npm run ingest -- --harvest-resources      read publisher form pages
 *   npm run ingest -- --publish-reviewed       promote reviewed harvest rows
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
    judges: { type: 'boolean', default: false },
    resources: { type: 'boolean', default: false },
    'verify-resources': { type: 'boolean', default: false },
    'harvest-resources': { type: 'boolean', default: false },
    'publish-reviewed': { type: 'boolean', default: false },
    limit: { type: 'string' },
  },
  allowPositionals: false,
});

if (values['init-db'] || !isInitialised()) {
  process.stdout.write('initialising database schema\n');
  applySchema({ fresh: !isInitialised() });
}

const strategy = values.strategy === 'http' ? 'http' : 'reader';
const started = Date.now();

process.stdout.write(`\nLexhall ingestion — Bar Council of India\n${'─'.repeat(64)}\n`);

const resourceMode = values.resources || values['verify-resources']
  || values['harvest-resources'] || values['publish-reviewed'];

if (resourceMode) {
  const {
    seedResourceLibraryData, verifyResourceLinks, harvestResources, promoteReviewedHarvest,
  } = await import('./src/resources.ts');
  const write = (m: string) => process.stdout.write(`${m}\n`);
  const limit = values.limit ? Math.max(1, Number(values.limit)) : undefined;

  if (values.resources) {
    write('\nseeding the resource library');
    seedResourceLibraryData(write);
  }

  if (values['harvest-resources']) {
    write('\nharvesting publisher form pages (robots.txt read and obeyed per host)');
    const r = await harvestResources({ limit, dryRun: Boolean(values['dry-run']), onProgress: write });
    write(
      `${'─'.repeat(64)}\ntargets ${r.targetsRun}, discovered ${r.discovered}, inserted ${r.inserted}, `
      + `duplicates ${r.duplicates}, rejected ${r.rejected}, robots-skipped ${r.blockedByRobots}, errors ${r.errors}`,
    );
    write('every inserted row is at REVIEW_REQUIRED and is not visible on the public site');
  }

  if (values['verify-resources']) {
    write('\nverifying resource links');
    const r = await verifyResourceLinks({ limit, dryRun: Boolean(values['dry-run']), onProgress: write });
    write(`${'─'.repeat(64)}\nchecked ${r.checked}`);
    for (const [outcome, n] of Object.entries(r.byOutcome).sort((a, b) => b[1] - a[1])) {
      write(`  ${outcome.padEnd(14)} ${n}`);
    }
    write(`published by this pass ${r.published}, unpublished ${r.unpublished}, needing a person ${r.needsHuman}`);
  }

  if (values['publish-reviewed']) {
    write('\npromoting reviewed harvest rows');
    const r = promoteReviewedHarvest({ limit, onProgress: write });
    write(`${'─'.repeat(64)}\nconsidered ${r.considered}, promoted ${r.promoted}, held ${r.skipped.length}`);
  }

  process.stdout.write('\n');
  process.exit(0);
}

if (values.judges) {
  const { ingestJudges } = await import('./src/pipeline.ts');
  const r = await ingestJudges({ dryRun: Boolean(values['dry-run']), onProgress: (m) => process.stdout.write(`${m}\n`) });
  process.stdout.write(`${'─'.repeat(64)}\njudges seen ${r.seen}, created ${r.created}, updated ${r.updated}, with parent HC ${r.linked}\n\n`);
  process.exit(0);
}

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
