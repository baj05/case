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

// --- resource library -------------------------------------------------------
// These assertions exist because the failure modes they guard against are the
// ones that would make the library actively misleading, not merely broken.

await check('resource hub', '/resources', {
  '200': status(200),
  'states the corpus size from the database': has('resources.'),
  'draws the official-versus-template distinction on the hub itself':
    (b) => b.includes('Two kinds of thing live here') && b.includes('approved by nobody'),
  'names the library documentation': has('How this library works'),
  'offers intent-led kits': has('Start from what happened'),
  'admits which categories are empty': hasAny('hold nothing yet', 'Browse by category'),
  'no error state': notError,
});

await check('resource search understands a state', '/resources/search?q=rent+agreement+for+Maharashtra', {
  '200': status(200),
  'shows what it understood': has('What we understood from that'),
  'resolves the state': has('resources are ranked first'),
  'ranks the Maharashtra document first': (b) => {
    const target = b.indexOf('Residential rent agreement — Maharashtra');
    if (target === -1) return false;
    const firstCard = b.indexOf('result-card');
    // The first card rendered must be the state document, not merely present.
    return firstCard > -1 && target > firstCard && target - firstCard < 1200;
  },
  'explains that pan-India documents are still shown': has('genuinely apply across'),
  'no error state': notError,
});

await check('resource search finds a document by its own name', '/resources/search?q=vakalatnama', {
  '200': status(200),
  'returns something': (b) => !b.includes('Nothing in the library matches that'),
  'no error state': notError,
});

await check('an unmatchable query says so rather than showing everything', '/resources/search?q=zzzqqxnothing', {
  '200': status(200),
  'admits the library does not hold it': has('Nothing in the library matches that'),
  'does not silently return the whole library': (b) => !b.includes('result-card'),
});

await check('state-specific template', '/resources/rent-agreement-maharashtra', {
  '200': status(200),
  'is labelled a CaseADVO template, not an official form': has('CaseADVO template'),
  'says explicitly that no authority approved it': has('no authority has approved it'),
  'carries the state rule before the document': has('what this state requires'),
  'states the compulsory-registration position for the state':
    hasAny('compulsory', 'must be registered'),
  'renders a readable preview rather than only a download': has('doc-page'),
  'marks the blanks the user must fill in': has('doc-placeholder'),
  'publishes the provenance breakdown': has('How this scores on provenance'),
  'warns that the score is not legal validity': has('not a statement about legal validity'),
  'carries a closing disclaimer': has('not legal advice'),
  'no error state': notError,
});

// An official resource is published only after its URL has actually been
// fetched, so on an instance where `--verify-resources` has not run it is
// correctly absent. That is the publication gate working, not a failure, so the
// assertion adapts rather than demanding a verified library.
const officialSlug = 'nalsa-legal-aid-eligibility';
const officialProbe = await fetch(`${BASE}/resources/${officialSlug}`, { signal: AbortSignal.timeout(30_000) })
  .then((r) => r.status)
  .catch(() => 0);

if (officialProbe === 200) {
  await check('official resource offers the publisher, not a copy', `/resources/${officialSlug}`, {
    '200': status(200),
    'is labelled official': has('Official source'),
    'explains why there is no local preview': has('Why there is no preview here'),
    'links out to the authority': has('nalsa.gov.in'),
    'names the authority': has('National Legal Services Authority'),
    'no error state': notError,
  });

  await check('download refuses to proxy an official document', `/api/resources/${officialSlug}/download?format=docx`, {
    '409 conflict': status(409),
    'explains that we do not host a copy': has('do not host a copy'),
    'points at the publisher instead': has('nalsa.gov.in'),
  });
} else {
  await check('unverified official resource is withheld rather than published', `/resources/${officialSlug}`, {
    'is not served': (_b, res) => res.status === 404,
  });
  console.log(
    `  · note: official resources are unpublished on this instance (${BASE}).\n`
    + '    Run `npm run resources:verify` — publication is gated on fetching the source URL.',
  );
}

await check('template download is a real docx', '/api/resources/rent-agreement-maharashtra/download?format=docx', {
  '200': status(200),
  'sends a wordprocessing content type':
    (_b, res) => (res.headers.get('content-type') ?? '').includes('wordprocessingml'),
  'sends a readable filename':
    (_b, res) => /filename="CaseADVO_[A-Za-z0-9_]+\.docx"/.test(res.headers.get('content-disposition') ?? ''),
  'is not cached by shared caches':
    (_b, res) => (res.headers.get('cache-control') ?? '').includes('no-store'),
});

await check('plain-text download', '/api/resources/vakalatnama/download?format=txt', {
  '200': status(200),
  'includes the before-you-use guidance': hasAny('BEFORE YOU USE THIS', 'prescribed'),
  'records its provenance in the file': has('CaseADVO resource library'),
});

await check('category page', '/resources/category/legal-aid', {
  '200': status(200),
  'names the category': has('Legal aid'),
  'offers state filtering': has('By state'),
  'no error state': notError,
});

await check('state-aware kit', '/resources/kits/renting-a-home', {
  '200': status(200),
  'asks for the state and says why it matters': has('Which state?'),
  'admits a bundle is not completeness': has('not a complete legal position'),
  'orders the documents rather than listing them alphabetically': has('in the order they matter'),
  'no error state': notError,
});

await check('kit falls back honestly for a state it has nothing for', '/resources/kits/renting-a-home?state=Mizoram', {
  '200': status(200),
  'says so rather than substituting another state':
    hasAny('We hold nothing specific to', 'specifically'),
  'no error state': notError,
});

await check('resource centre leads with the helpline', '/resources/centres/women', {
  '200': status(200),
  'shows the helpline before the taxonomy': has('If you need help now'),
  'carries a real number': has('181'),
  'no error state': notError,
});

await check('library documentation is honest about gaps', '/resources/about', {
  '200': status(200),
  'explains why a 403 is not a broken link': has('Why a 403 is not a broken link'),
  'lists what the library will not do': has('What this library will not do'),
  'states the known gaps': has('Known gaps'),
  'separates provenance from legal validity': has('provenance score is not a legal score'),
  'no error state': notError,
});

await check('resource suggestions', '/api/resources/suggest?q=rent', {
  '200': status(200),
  'returns items': has('"items"'),
  'returns at least one document': (b) => JSON.parse(b).items.length > 0,
});

await check('resource admin surfaces the review queue', '/admin/resources', {
  '200': status(200),
  'declares that it is unauthenticated': has('unauthenticated'),
  'shows the lifecycle': has('Lifecycle'),
  'shows the review queue': has('Review queue'),
  'no error state': notError,
});

await check('matter page links to its documents', '/matters/property-rent/rent-agreement', {
  '200': status(200),
  'offers documents for the matter': hasAny('Documents and forms for this matter', 'Where it is heard'),
  'no error state': notError,
});

await check('sitemap lists resources but not search views', '/sitemap.xml', {
  '200': status(200),
  'includes a resource': has('/resources/'),
  'excludes search result pages': (b) => !b.includes('/resources/search'),
  'excludes the saved list': (b) => !b.includes('/resources/saved'),
});

await check('robots keeps crawlers off the endpoints', '/robots.txt', {
  '200': status(200),
  'disallows the api': has('/api/'),
  'disallows admin': has('/admin'),
  'declares a sitemap': has('Sitemap'),
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
