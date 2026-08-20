#!/usr/bin/env node
/**
 * HTTP-level smoke suite. Runs against a live server (local or container) with
 * no browser dependency, so it works in CI without downloading Chromium.
 *
 * It asserts on rendered CONTENT, not just status codes — a 200 that renders an
 * error state is still a failure. Browser-level interaction (clicking through
 * the booking stepper, driving Advo AI) still needs Playwright; that gap is
 * recorded in docs/TEST_PLAN.md.
 *
 *   node scripts/smoke.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? process.env.SMOKE_BASE ?? 'http://localhost:3000';

let pass = 0;
const failures = [];

async function check(name, path, assertions) {
  try {
    const res = await fetch(BASE + path, { signal: AbortSignal.timeout(30_000) });
    const body = res.headers.get('content-type')?.includes('json')
      ? JSON.stringify(await res.json())
      : await res.text();
    for (const [label, fn] of Object.entries(assertions)) {
      const ok = fn(body, res);
      if (ok) pass += 1;
      else failures.push(`${name} → ${label}`);
    }
  } catch (error) {
    failures.push(`${name} → request failed: ${error.message}`);
  }
}

const has = (s) => (body) => body.includes(s);
/**
 * Any-of matcher. `has('A') || has('B')` is a trap: it ORs two FUNCTIONS, the
 * first of which is always truthy, so only the first string is ever checked.
 */
const hasAny = (...needles) => (body) => needles.some((n) => body.includes(n));
const status = (n) => (_b, res) => res.status === n;
const notError = (body) => !/Something went wrong|Application error|Internal Server Error/i.test(body);

// --- health -----------------------------------------------------------------
await check('health', '/api/health', {
  '200': status(200),
  'reports ok or degraded': hasAny('"status":"ok"', '"status":"degraded"'),
  'reports database check': has('"database"'),
});

// --- public discovery -------------------------------------------------------
await check('homepage', '/', {
  '200': status(200),
  'renders hero headline': has('advocate for'),
  'renders live corpus figure': (b) => /\b\d{2,4}\b[\s\S]{0,120}official registers/i.test(b),
  'has search': has('dual-search'),
  'has chat launcher': has('advo-fab'),
  'no error state': notError,
});

await check('search (plain language)', '/search?q=advocate+in+jabalpur', {
  '200': status(200),
  'interprets the query': has('Jabalpur'),
  'returns results': (b) => /\d+–\d+ of \d+/.test(b),
  'shows a match score': hasAny('MATCH', 'Match', 'meter-seg'),
  'no error state': notError,
});

await check('search (zero result recovery)', '/search?q=IP+lawyer+in+Siliguri', {
  '200': status(200),
  'offers recovery, not a dead end': (b) =>
    /Try instead|Browse all listed|Broaden|Widen|Search across/i.test(b),
});

await check('search (fee sort)', '/search?practice=labour-employment&sort=fee_desc', {
  '200': status(200),
  'renders fee column': has('Consultation'),
});

await check('profile', '/advocates/rakesh-sherawat', {
  '200': status(200),
  'shows provenance': has('Where this came from'),
  'shows verification ladder': has('Verification'),
  'names the source': has('Bar Council of India'),
  'no error state': notError,
});

await check('booking', '/advocates/rakesh-sherawat/book', {
  '200': status(200),
  'renders the stepper': has('stepper'),
  'discloses fees before commitment': has('consultation'),
  'no error state': notError,
});

await check('judges', '/judges', {
  '200': status(200),
  'lists judges': has('Chief Justice'),
  'states the no-ratings policy': (b) => /no ratings here/i.test(b),
});

await check('practice areas', '/practice-areas', { '200': status(200), 'no error': notError });
await check('courts', '/courts', { '200': status(200), 'lists High Courts': has('High Court') });
await check('bar councils', '/bar-councils', { '200': status(200), 'no error': notError });
await check('transparency', '/how-it-works', { '200': status(200), 'publishes weights': hasAny('weight', 'Weight') });
await check('data sources', '/data-sources', { '200': status(200), 'states the coverage limit': (b) => /not a directory of every advocate/i.test(b) });
await check('credits', '/credits', { '200': status(200), 'attributes imagery': hasAny('Licence', 'licence') });
await check('admin', '/admin', { '200': status(200), 'warns it is unprotected': (b) => /not access-controlled/i.test(b) });

// --- API --------------------------------------------------------------------
await check('suggest api', '/api/suggest?q=del', {
  '200': status(200),
  'returns items': has('"items"'),
});

// --- error handling ---------------------------------------------------------
await check('404', '/definitely-not-a-real-page', { '404': status(404) });
await check('unknown advocate', '/advocates/not-a-real-person-xyz', { '404': status(404) });

// --- legal matter taxonomy --------------------------------------------------
await check('matters index', '/matters', {
  '200': status(200),
  'names the domain count': (b) => /matters across[\s\S]{0,40}domains/.test(b),
  'links a domain': has('/matters/electricity-power'),
  'no error state': notError,
});

await check('matters domain', '/matters/electricity-power', {
  '200': status(200),
  'groups by practice area': has('Electricity &amp; Power'),
  'links a matter': has('/matters/electricity-power/excess-electricity-bill'),
  'no error state': notError,
});

await check('matter detail', '/matters/electricity-power/excess-electricity-bill', {
  '200': status(200),
  'states what is at issue': has('What is usually at issue'),
  'lists an issue from the taxonomy': hasAny('Average billing applied without reading', 'Wrong tariff category applied'),
  'names the work a lawyer does': has('What a lawyer does here'),
  'shows the forum ladder': has('Where it is heard'),
  'names the first forum': hasAny('DISCOM Consumer Grievance Cell', 'Consumer Grievance Redressal Forum'),
  'shows the escalation route': has('Escalates to'),
  'offers a matter-scoped search': has('legalMatter=excess-electricity-bill'),
  'carries the not-advice notice': hasAny('not advice on your case', 'general information'),
  'no error state': notError,
});

await check('matter detail (document matter)', '/matters/property-rent/rent-agreement', {
  '200': status(200),
  'names the stamp duty issue': hasAny('Stamp duty', 'stamp duty'),
  'lists drafting as the work': hasAny('Drafting', 'Document review'),
  'no error state': notError,
});

await check('unknown matter is a 404', '/matters/electricity-power/not-a-real-matter', {
  '404': status(404),
});

await check('forums index', '/forums', {
  '200': status(200),
  'counts the forums': (b) => /forums a legal matter/.test(b),
  'groups tribunals': has('Appellate tribunals'),
  'shows an escalation route': has('Appeal lies to'),
  'no error state': notError,
});

await check('matter-scoped search', '/search?legalMatter=excess-electricity-bill', {
  '200': status(200),
  'labels the declared matter filter': hasAny('declared by the professional', 'via its practice area'),
  'no error state': notError,
});

await check('unrecognised matter filter returns nothing, not everything', '/search?legalMatter=nonsense-matter-slug', {
  '200': status(200),
  'says it is not recognised': has('not recognised'),
  'shows an empty state instead of the whole directory': has('No professionals match that combination yet'),
});

await check('matter routing from plain language', '/search?q=meter+jal+gaya+and+discom+wants+money', {
  '200': status(200),
  'routes to the meter matter': hasAny('Meter or smart meter dispute', 'Electricity'),
  'no error state': notError,
});

// --- report -----------------------------------------------------------------
const total = pass + failures.length;
console.log(`\nsmoke: ${pass}/${total} assertions passed  (${BASE})`);
if (failures.length) {
  console.log('\nfailures:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('all assertions passed');
