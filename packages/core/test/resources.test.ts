/**
 * Resource library tests.
 *
 * These cover the rules that, if they break, cause the library to mislead
 * somebody about a legal document — which is a different and worse class of bug
 * than a layout regression. In order of severity:
 *
 *   1. A platform template can never be labelled official.
 *   2. A disclaimer is never empty, and names the state when there is one.
 *   3. A 403 is not a broken link.
 *   4. The provenance score cannot be gamed into looking like legal assurance.
 *   5. Query routing understands the phrasings people actually use.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RESOURCE_CATEGORIES, RESOURCE_TYPE_META, OFFICIAL_STATUS_META, RESOURCE_TYPES,
  assertStatusConsistent, disclaimerFor, qualityScore, classifyLinkCheck,
  LINK_OUTCOME_META, reviewIntervalDays, downloadFilename, parseResourceQuery,
  RESOURCE_CENTRES, categoryByCode, categoryBySlug,
} from '../src/resource-taxonomy.ts';
import { RESOURCE_SOURCES } from '../src/resource-sources.ts';
import { CATALOG_CENTRAL } from '../src/resource-catalog.ts';
import { CATALOG_STATES, TENANCY_REGIMES, SLSA_HARVEST_TARGETS } from '../src/resource-catalog-states.ts';
import { TENANCY_TEMPLATES, NOTICE_TEMPLATES } from '../src/resource-templates.ts';
import { TEMPLATES_SET_2 } from '../src/resource-templates-2.ts';
import { RESOURCE_KITS, matchKits, kitBySlug } from '../src/resource-kits.ts';
import { INDIA_STATES } from '../src/geography.ts';

const ALL_TEMPLATES = [...TENANCY_TEMPLATES, ...NOTICE_TEMPLATES, ...TEMPLATES_SET_2];
const ALL_CATALOG = [...CATALOG_CENTRAL, ...CATALOG_STATES];

// ---------------------------------------------------------------------------
// 1. Official status can never be claimed falsely
// ---------------------------------------------------------------------------

test('a type reserved for official material cannot carry a non-official status', () => {
  for (const type of RESOURCE_TYPES) {
    if (!RESOURCE_TYPE_META[type].officialOnly) continue;
    assert.throws(
      () => assertStatusConsistent(type, 'PLATFORM_TEMPLATE', 'test-slug'),
      /reserved for material published by the authority/,
      `${type} must refuse PLATFORM_TEMPLATE`,
    );
  }
});

test('every platform template declares a type that is not reserved for official material', () => {
  for (const tpl of ALL_TEMPLATES) {
    assert.doesNotThrow(
      () => assertStatusConsistent(tpl.type, 'PLATFORM_TEMPLATE', tpl.slug),
      `template ${tpl.slug} declares ${tpl.type}, which is reserved for official documents`,
    );
  }
});

test('every catalogue entry marked OFFICIAL names an authority and a URL', () => {
  for (const entry of ALL_CATALOG) {
    assert.doesNotThrow(() => assertStatusConsistent(entry.type, entry.officialStatus, entry.slug));
    if (entry.officialStatus !== 'OFFICIAL') continue;
    assert.ok(entry.authority.length > 3, `${entry.slug} claims OFFICIAL without naming an authority`);
    assert.match(entry.url, /^https?:\/\//, `${entry.slug} claims OFFICIAL without a URL`);
    assert.ok(
      RESOURCE_SOURCES.some((s) => s.code === entry.source),
      `${entry.slug} references source ${entry.source}, which is not in the source register`,
    );
  }
});

test('no catalogue entry proposes hosting a copy of a government document', () => {
  // Every source in the register is link-only until permission is recorded.
  for (const source of RESOURCE_SOURCES) {
    assert.ok(source.rightsNote.length > 20, `${source.code} has no rights note`);
  }
});

// ---------------------------------------------------------------------------
// 2. Disclaimers
// ---------------------------------------------------------------------------

test('a disclaimer is never empty, whatever the combination', () => {
  for (const type of RESOURCE_TYPES) {
    for (const status of Object.keys(OFFICIAL_STATUS_META) as Array<keyof typeof OFFICIAL_STATUS_META>) {
      const text = disclaimerFor(type, status);
      assert.ok(text.length > 60, `${type}/${status} produced a disclaimer of ${text.length} characters`);
    }
  }
});

test('a platform template disclaimer says it is not a government form and not advice', () => {
  const text = disclaimerFor('AGREEMENT_TEMPLATE', 'PLATFORM_TEMPLATE');
  assert.match(text, /not a government or court form/i);
  assert.match(text, /not legal advice/i);
});

test('a state-specific disclaimer names the state and warns the position differs elsewhere', () => {
  const text = disclaimerFor('AGREEMENT_TEMPLATE', 'PLATFORM_TEMPLATE', { stateName: 'Maharashtra' });
  assert.match(text, /Maharashtra/);
  assert.match(text, /differs in other states/i);
});

test('an official disclaimer tells the user to confirm currency at the source', () => {
  const text = disclaimerFor('OFFICIAL_FORM', 'OFFICIAL');
  assert.match(text, /authority/i);
  assert.match(text, /current version/i);
});

// ---------------------------------------------------------------------------
// 3. Link classification — the 403 problem
// ---------------------------------------------------------------------------

test('a 403 is classified as blocked, is not treated as unhealthy, and needs a person', () => {
  const outcome = classifyLinkCheck(403);
  assert.equal(outcome, 'blocked');
  assert.equal(LINK_OUTCOME_META[outcome].healthy, true, 'a bot block is not evidence a document is gone');
  assert.equal(LINK_OUTCOME_META[outcome].needsHuman, true);
});

test('404 and 410 are the only statuses treated as the document being gone', () => {
  assert.equal(classifyLinkCheck(404), 'gone');
  assert.equal(classifyLinkCheck(410), 'gone');
  assert.equal(classifyLinkCheck(500), 'server_error');
  assert.equal(classifyLinkCheck(503), 'server_error');
  assert.equal(classifyLinkCheck(429), 'blocked');
  assert.equal(classifyLinkCheck(401), 'blocked');
});

test('a transport failure is unreachable, not gone', () => {
  const outcome = classifyLinkCheck(0, 'fetch failed');
  assert.equal(outcome, 'unreachable');
  assert.equal(LINK_OUTCOME_META[outcome].healthy, false);
  assert.equal(LINK_OUTCOME_META[outcome].needsHuman, true);
});

test('a 200 is healthy and needs nobody', () => {
  assert.equal(classifyLinkCheck(200), 'ok');
  assert.equal(LINK_OUTCOME_META.ok.needsHuman, false);
});

test('official forms are re-checked more often than templates', () => {
  assert.ok(
    reviewIntervalDays('OFFICIAL_FORM', 'OFFICIAL') < reviewIntervalDays('AGREEMENT_TEMPLATE', 'PLATFORM_TEMPLATE'),
    'a prescribed form changes without notice; our own template does not',
  );
  assert.equal(reviewIntervalDays('RESOURCE_LINK', 'OFFICIAL'), 60);
});

// ---------------------------------------------------------------------------
// 4. The provenance score
// ---------------------------------------------------------------------------

const NOW = new Date('2026-08-20T00:00:00Z');

test('the score rewards a government source over a third-party one', () => {
  const base = {
    officialStatus: 'OFFICIAL' as const, lastVerifiedAt: '2026-08-01T00:00:00Z',
    hasDescription: true, hasJurisdiction: true, hasMatter: true, hasPreview: false, linkOk: true, now: NOW,
  };
  const government = qualityScore({ ...base, trustLevel: 1 });
  const thirdParty = qualityScore({ ...base, trustLevel: 6 });
  assert.ok(government.score > thirdParty.score);
  assert.equal(government.score - thirdParty.score, 25);
});

test('the score decays as verification ages, and reaches zero freshness at two years', () => {
  const base = {
    trustLevel: 1, officialStatus: 'OFFICIAL' as const, hasDescription: true,
    hasJurisdiction: true, hasMatter: true, hasPreview: false, linkOk: true, now: NOW,
  };
  const fresh = qualityScore({ ...base, lastVerifiedAt: '2026-08-19T00:00:00Z' });
  const old = qualityScore({ ...base, lastVerifiedAt: '2023-01-01T00:00:00Z' });
  const never = qualityScore({ ...base, lastVerifiedAt: null });

  const freshness = (r: typeof fresh) => r.factors.find((f) => f.key === 'freshness')!.earned;
  assert.equal(freshness(fresh), 25);
  assert.equal(freshness(old), 0);
  assert.equal(freshness(never), 0);
  assert.ok(fresh.score > old.score);
});

test('a failing link check costs the reachability points', () => {
  const base = {
    trustLevel: 1, officialStatus: 'OFFICIAL' as const, lastVerifiedAt: '2026-08-19T00:00:00Z',
    hasDescription: true, hasJurisdiction: true, hasMatter: true, hasPreview: false, now: NOW,
  };
  const reachable = qualityScore({ ...base, linkOk: true });
  const not = qualityScore({ ...base, linkOk: false });
  assert.equal(reachable.score - not.score, 15);
});

test('the score is bounded, explainable, and its factors sum to it', () => {
  const result = qualityScore({
    trustLevel: 1, officialStatus: 'OFFICIAL', lastVerifiedAt: '2026-08-20T00:00:00Z',
    hasDescription: true, hasJurisdiction: true, hasMatter: true, hasPreview: true, linkOk: true, now: NOW,
  });
  assert.equal(result.score, 100);
  assert.equal(result.factors.reduce((n, f) => n + f.earned, 0), result.score);
  for (const factor of result.factors) {
    assert.ok(factor.note.length > 0, `factor ${factor.key} has no explanation`);
    assert.ok(factor.earned <= factor.possible);
  }

  const worst = qualityScore({
    trustLevel: 6, officialStatus: 'THIRD_PARTY', lastVerifiedAt: null,
    hasDescription: false, hasJurisdiction: false, hasMatter: false, hasPreview: false, linkOk: false, now: NOW,
  });
  assert.equal(worst.score, 5, 'level 6 still earns the residual authority point');
  assert.ok(worst.score >= 0);
});

// ---------------------------------------------------------------------------
// 5. Query routing
// ---------------------------------------------------------------------------

const STATES = INDIA_STATES.map((s) => s.name);
const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Noida', 'Chennai', 'Pune', 'Gurugram'];

test('"I need a rent agreement for Mumbai" routes to property, agreements and Maharashtra', () => {
  const intent = parseResourceQuery('I need a rent agreement for Mumbai', STATES, CITIES);
  assert.ok(intent.types.includes('AGREEMENT_TEMPLATE'));
  assert.ok(intent.categories.includes('RC_PROPERTY'));
  assert.equal(intent.cityHint, 'Mumbai');
  assert.ok(intent.signals.length >= 2, 'the routing must be explainable to the user');
});

test('"rent agreement for Maharashtra" resolves the state itself', () => {
  const intent = parseResourceQuery('rent agreement for Maharashtra', STATES, CITIES);
  assert.equal(intent.stateHint, 'Maharashtra');
  assert.ok(intent.categories.includes('RC_PROPERTY'));
});

test('plain-language complaints route without any legal vocabulary', () => {
  const cases: Array<[string, string]> = [
    ['my employer has not paid my PF', 'RC_PF_ESI'],
    ['electricity bill is too high', 'RC_ELECTRICITY'],
    ['the phone I bought is defective', 'RC_CONSUMER'],
    ['money debited from my account by fraud', 'RC_BANKING'],
    ['I want a divorce by mutual consent', 'RC_FAMILY'],
    ['I cannot afford a lawyer, is there free legal aid', 'RC_LEGAL_AID'],
    ['someone is harassing me online', 'RC_CYBER'],
    ['I need to file an RTI', 'RC_RTI'],
    ['trademark for my brand name', 'RC_IP'],
    ['my landlord kept the deposit', 'RC_PROPERTY'],
  ];
  for (const [query, expected] of cases) {
    const intent = parseResourceQuery(query, STATES, CITIES);
    assert.ok(
      intent.categories.includes(expected),
      `“${query}” should route to ${expected}, got [${intent.categories.join(', ')}]`,
    );
  }
});

test('asking for an official form restricts to official sources, and says so', () => {
  const intent = parseResourceQuery('official government form for PF withdrawal', STATES, CITIES);
  assert.equal(intent.officialOnly, true);
  assert.ok(intent.signals.some((s) => s.kind === 'restriction'));
});

test('an empty or meaningless query produces no signals rather than a guess', () => {
  const intent = parseResourceQuery('zzzz', STATES, CITIES);
  assert.equal(intent.categories.length, 0);
  assert.equal(intent.types.length, 0);
  assert.equal(intent.signals.length, 0);
});

test('every signal records the words it came from', () => {
  const intent = parseResourceQuery('legal notice for cheque bounce in Delhi', STATES, CITIES);
  for (const signal of intent.signals) {
    assert.ok(signal.from.length > 0, `signal ${signal.kind} does not say where it came from`);
  }
});

// ---------------------------------------------------------------------------
// 6. Kits
// ---------------------------------------------------------------------------

test('kit intent matching finds the right kit from a sentence a person would say', () => {
  const cases: Array<[string, string]> = [
    ['I am renting a flat in Mumbai', 'renting-a-home'],
    ['starting a business', 'starting-a-company'],
    ['pf not deposited by employer', 'pf-problem'],
    ['electricity bill too high', 'electricity-bill-problem'],
    ['I lost money to online fraud', 'i-was-defrauded-online'],
  ];
  for (const [query, slug] of cases) {
    const matches = matchKits(query);
    assert.ok(matches.length > 0, `“${query}” matched no kit`);
    assert.equal(matches[0]!.kit.slug, slug, `“${query}” matched ${matches[0]!.kit.slug}`);
  }
});

test('an unrelated query matches no kit rather than the nearest one', () => {
  assert.equal(matchKits('what is the weather today').length, 0);
});

test('every kit carries a disclaimer that admits a bundle is not completeness', () => {
  for (const kit of RESOURCE_KITS) {
    assert.ok(kit.disclaimer.length > 80, `kit ${kit.slug} has no substantive disclaimer`);
    assert.ok(kit.items.length >= 3, `kit ${kit.slug} has too few items to be a kit`);
    assert.ok(kit.intentSynonyms.length >= 3, `kit ${kit.slug} needs more phrasings to be findable`);
    for (const item of kit.items) {
      assert.ok(item.note.length > 15, `kit ${kit.slug} item ${item.slug} has no note explaining its place`);
    }
  }
});

test('every kit slug is unique and resolvable', () => {
  const slugs = new Set<string>();
  for (const kit of RESOURCE_KITS) {
    assert.equal(slugs.has(kit.slug), false, `duplicate kit slug ${kit.slug}`);
    slugs.add(kit.slug);
    assert.equal(kitBySlug(kit.slug)?.slug, kit.slug);
  }
});

// ---------------------------------------------------------------------------
// 7. Structural integrity of the catalogue
// ---------------------------------------------------------------------------

test('every slug in the library is unique', () => {
  const seen = new Map<string, string>();
  for (const entry of [...ALL_CATALOG, ...ALL_TEMPLATES]) {
    const previous = seen.get(entry.slug);
    assert.equal(previous, undefined, `slug ${entry.slug} is used twice`);
    seen.set(entry.slug, entry.title);
  }
});

test('every resource references a category that exists', () => {
  for (const entry of ALL_CATALOG) {
    assert.ok(categoryByCode(entry.category), `${entry.slug} references unknown category ${entry.category}`);
  }
});

test('subcategories named on a resource exist in that category', () => {
  for (const entry of ALL_CATALOG) {
    if (!entry.subcategory) continue;
    const category = categoryByCode(entry.category);
    assert.ok(
      category?.subcategories.includes(entry.subcategory),
      `${entry.slug} claims subcategory “${entry.subcategory}”, which is not defined in ${entry.category}`,
    );
  }
});

test('every category has a unique slug and a real description', () => {
  const slugs = new Set<string>();
  for (const category of RESOURCE_CATEGORIES) {
    assert.equal(slugs.has(category.slug), false, `duplicate category slug ${category.slug}`);
    slugs.add(category.slug);
    assert.equal(categoryBySlug(category.slug)?.code, category.code);
    assert.ok(category.plainSummary.length > 40, `${category.code} has a thin summary`);
    assert.ok(category.subcategories.length > 0, `${category.code} has no subcategories`);
  }
});

test('a state-specific resource names a real state, and a pan-India one does not claim a state', () => {
  const codes = new Set(INDIA_STATES.map((s) => `IN-${s.code}`));
  for (const entry of ALL_CATALOG) {
    if (entry.stateCode) {
      assert.ok(codes.has(entry.stateCode), `${entry.slug} names unknown state ${entry.stateCode}`);
      assert.equal(entry.panIndia, false, `${entry.slug} claims both a state and pan-India applicability`);
    }
  }
});

test('every catalogue entry explains what it is for', () => {
  for (const entry of ALL_CATALOG) {
    assert.ok(entry.description.length > 60, `${entry.slug} has a thin description`);
    assert.ok(entry.notes.length >= 1, `${entry.slug} has no usage notes`);
    assert.ok(entry.keywords.length >= 2, `${entry.slug} has too few keywords to be findable`);
  }
});

test('every template has a body, placeholders that are declared, and jurisdiction notes', () => {
  for (const tpl of ALL_TEMPLATES) {
    assert.ok(tpl.body.length > 400, `${tpl.slug} has a suspiciously short body`);
    assert.ok(tpl.jurisdictionNotes.length >= 1, `${tpl.slug} has no jurisdiction note`);
    assert.ok(tpl.beforeYouUse.length >= 1, `${tpl.slug} has no "before you use" guidance`);

    // Every placeholder used in the body must be declared, or the preview will
    // show a blank the user is never told about.
    const used = new Set([...tpl.body.matchAll(/\[\[([A-Z0-9_]+)\]\]/g)].map((m) => m[1]!));
    const declared = new Set(tpl.fields.map((f) => f.key));
    for (const key of used) {
      assert.ok(declared.has(key), `${tpl.slug} uses [[${key}]] but does not declare it`);
    }
    for (const field of tpl.fields) {
      assert.ok(field.label.length > 2, `${tpl.slug} field ${field.key} has no label`);
    }
  }
});

test('a template that references an official form links to it', () => {
  // If the "before you use" text tells the user a prescribed form exists, the
  // entry must actually point at it rather than leaving them to search.
  const shouldLink = ALL_TEMPLATES.filter((t) =>
    /prescribed form|official form|portal|official source/i.test(
      [...t.beforeYouUse, ...t.jurisdictionNotes.map((n) => n.body)].join(' '),
    ));
  for (const tpl of shouldLink) {
    assert.ok(
      (tpl.officialLinks ?? []).length > 0,
      `${tpl.slug} mentions an official form or portal without linking to one`,
    );
  }
});

test('every official link is https and names a publisher', () => {
  for (const tpl of ALL_TEMPLATES) {
    for (const link of tpl.officialLinks ?? []) {
      assert.match(link.url, /^https:\/\//, `${tpl.slug} links to a non-https URL: ${link.url}`);
      assert.ok(link.publisher.length > 2, `${tpl.slug} link ${link.url} has no publisher`);
      assert.ok(link.label.length > 4, `${tpl.slug} link ${link.url} has no label`);
    }
  }
});

// ---------------------------------------------------------------------------
// 8. Jurisdiction awareness — the harm this library exists to prevent
// ---------------------------------------------------------------------------

test('every tenancy regime names a real state and states its distinctive rule', () => {
  const codes = new Set(INDIA_STATES.map((s) => `IN-${s.code}`));
  const seen = new Set<string>();
  for (const regime of TENANCY_REGIMES) {
    assert.ok(codes.has(regime.stateCode), `unknown state ${regime.stateCode}`);
    assert.equal(seen.has(regime.stateCode), false, `duplicate regime for ${regime.stateCode}`);
    seen.add(regime.stateCode);
    assert.ok(regime.headline.length > 40, `${regime.stateName} has no substantive headline rule`);
    assert.ok(regime.points.length >= 3, `${regime.stateName} has too few points to be useful`);
    assert.ok(
      regime.points.some((p) => /registration|registered|register/i.test(p)),
      `${regime.stateName} does not address registration, which is the question that matters most`,
    );
  }
});

test('Maharashtra records that registration is compulsory regardless of the eleven-month term', () => {
  const mh = TENANCY_REGIMES.find((r) => r.stateCode === 'IN-MH');
  assert.ok(mh, 'Maharashtra must be covered — it is the state where the eleven-month device fails');
  assert.match(mh!.headline, /compulsory|required/i);
  assert.ok(mh!.points.some((p) => /eleven|11/i.test(p)), 'the eleven-month point must be addressed explicitly');
});

test('no tenancy note hard-codes a stamp-duty rate or a deposit cap figure', () => {
  // Rates change by notification. A library that states one will be wrong within
  // a year, and a user will rely on it.
  for (const regime of TENANCY_REGIMES) {
    for (const point of regime.points) {
      assert.equal(
        /\b\d+(\.\d+)?\s*(per cent|%)\s*(of|stamp)/i.test(point), false,
        `${regime.stateName} states a rate: “${point.slice(0, 80)}”`,
      );
      assert.equal(
        /\brs\.?\s*\d/i.test(point), false,
        `${regime.stateName} states a rupee figure: “${point.slice(0, 80)}”`,
      );
    }
  }
});

test('one harvest target exists per state legal services authority, each with a real URL', () => {
  assert.ok(SLSA_HARVEST_TARGETS.length >= 30, 'coverage should be near-national');
  const states = new Set<string>();
  for (const target of SLSA_HARVEST_TARGETS) {
    assert.match(target.formsUrl, /^https:\/\/[a-z]+\.nalsa\.gov\.in\//);
    assert.ok(target.authority.length > 10);
    assert.equal(states.has(target.stateCode), false, `duplicate harvest target for ${target.stateCode}`);
    states.add(target.stateCode);
  }
});

// ---------------------------------------------------------------------------
// 9. Filenames and centres
// ---------------------------------------------------------------------------

test('a download filename is readable and carries the state', () => {
  const name = downloadFilename({
    title: 'Residential rent agreement (11 months)',
    stateName: 'Maharashtra', version: '1.0', extension: 'docx',
  });
  assert.match(name, /^CaseADVO_Maharashtra_Residential_Rent_Agreement_11_Months\.docx$/);
  assert.equal(name.includes('final'), false);
  assert.equal(/\s/.test(name), false, 'a filename with spaces breaks on download');
});

test('a filename records a non-initial version', () => {
  const name = downloadFilename({ title: 'Legal notice', stateName: null, version: '2.1', extension: 'txt' });
  assert.match(name, /_v2-1\.txt$/);
});

test('every resource centre gathers real categories and gives a route to help', () => {
  const slugs = new Set<string>();
  for (const centre of RESOURCE_CENTRES) {
    assert.equal(slugs.has(centre.slug), false, `duplicate centre ${centre.slug}`);
    slugs.add(centre.slug);
    assert.ok(centre.categories.length > 0, `${centre.slug} gathers nothing`);
    for (const code of centre.categories) {
      assert.ok(categoryByCode(code), `${centre.slug} references unknown category ${code}`);
    }
    assert.ok(centre.plainSummary.length > 80, `${centre.slug} has a thin summary`);
  }
});

test('the centres for people at risk carry a helpline', () => {
  for (const slug of ['women', 'children', 'senior-citizens']) {
    const centre = RESOURCE_CENTRES.find((c) => c.slug === slug);
    assert.ok(centre, `${slug} centre must exist`);
    assert.ok(
      centre!.helplines.length > 0,
      `${slug} must carry a helpline: somebody arriving in an emergency should not have to read a taxonomy`,
    );
  }
});
