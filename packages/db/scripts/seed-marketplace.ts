/**
 * Seed the demo marketplace: twelve fictional providers, 100 service posts
 * and their comment threads.
 *
 * `--reset` clears the existing demo rows first. Needed once, because the
 * listings seeded before migration 025 have no provider, banner or expiry
 * and cannot be backfilled sensibly — but every one of them is is_demo = 1
 * fixture data with nothing real hanging off it, so dropping them costs
 * nothing. Without the flag this is additive: INSERT OR IGNORE on
 * seed_key/handle, and comment threads only for listings that have none.
 *
 * Deliberately never touches rows with is_demo = 0. If this surface ever
 * carries real advocates' own listings, running the seeder must not be
 * able to delete their work.
 */
import { applySchema, db } from '../src/client.ts';
import { seedMarketplace } from '../src/repositories/marketplace.ts';

const reset = process.argv.includes('--reset');

applySchema();

if (reset) {
  const h = db();
  h.exec(`DELETE FROM marketplace_comment WHERE listing_id IN
            (SELECT id FROM marketplace_listing WHERE is_demo = 1)`);
  h.exec('DELETE FROM marketplace_listing WHERE is_demo = 1');
  h.exec('DELETE FROM marketplace_provider WHERE is_demo = 1');
  console.log('Cleared existing demo marketplace rows.');
}

const report = seedMarketplace(100);
console.log(
  `Providers: ${report.providers} new. `
  + `Listings: ${report.inserted} inserted, ${report.skipped} already present. `
  + `Comments: ${report.comments}.`,
);
