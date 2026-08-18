/**
 * Search relevance test set (spec §83).
 * Each case is a query a real user would type, plus what the router must
 * conclude. These run in CI; a regression here is a product regression.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntake, type IntakeVocabulary } from '../src/intake.ts';
import { PRACTICE_AREAS, MATTER_TYPES } from '../src/taxonomy.ts';
import { normaliseName, titleCaseName, trigramSimilarity, toFtsQuery } from '../src/text.ts';
import { rank, assertWeightsValid } from '../src/ranking.ts';

// Build a vocabulary from the seed taxonomy plus a small, real geography and
// court set. These are factual public entities, not invented records.
const vocab: IntakeVocabulary = {
  practiceAreas: PRACTICE_AREAS.map((pa, i) => ({
    id: i + 1, code: pa.code, name: pa.name, slug: pa.slug,
    synonyms: pa.synonyms.map(([phrase, weight]) => ({ phrase, weight })),
  })),
  locations: [
    { id: 1, name: 'Delhi', slug: 'delhi', level: 1, aliases: ['new delhi', 'ncr', 'nct of delhi'] },
    { id: 2, name: 'Noida', slug: 'noida', level: 4, aliases: ['gautam buddha nagar'] },
    { id: 3, name: 'Mumbai', slug: 'mumbai', level: 4, aliases: ['bombay'] },
    { id: 4, name: 'Jabalpur', slug: 'jabalpur', level: 4, aliases: [] },
    { id: 5, name: 'Bengaluru', slug: 'bengaluru', level: 4, aliases: ['bangalore'] },
    { id: 6, name: 'Kolkata', slug: 'kolkata', level: 4, aliases: ['calcutta'] },
    { id: 7, name: 'Bhopal', slug: 'bhopal', level: 4, aliases: [] },
    { id: 8, name: 'Madhya Pradesh', slug: 'madhya-pradesh', level: 1, aliases: ['mp'] },
  ],
  courts: [
    { id: 1, name: 'Supreme Court of India', shortName: 'Supreme Court', slug: 'supreme-court-of-india', tier: 1, aliases: ['sci', 'apex court'] },
    { id: 2, name: 'Delhi High Court', shortName: 'Delhi HC', slug: 'delhi-high-court', tier: 2, aliases: ['high court of delhi'] },
    { id: 3, name: 'Madhya Pradesh High Court', shortName: 'MP HC', slug: 'madhya-pradesh-high-court', tier: 2, aliases: ['jabalpur high court', 'high court of madhya pradesh'] },
    { id: 4, name: 'Calcutta High Court', shortName: 'Calcutta HC', slug: 'calcutta-high-court', tier: 2, aliases: ['high court at calcutta'] },
  ],
  matterTypes: MATTER_TYPES.map((mt, i) => ({ id: i + 1, code: mt.code, name: mt.name, slug: mt.slug, synonyms: [] })),
};

test('routes the brief\'s worked example: PF dispute in Delhi', () => {
  const r = classifyIntake('I need help with an employee PF dispute in Delhi.', vocab);
  assert.equal(r.practiceArea?.value.code, 'PF');
  assert.equal(r.location?.value.slug, 'delhi');
  assert.ok(r.isNaturalLanguage, 'should read as described problem, not a keyword');
});

test('routes plain language with no legal terminology at all', () => {
  const r = classifyIntake("My employer hasn't deposited my PF", vocab);
  assert.equal(r.practiceArea?.value.code, 'PF');
});

test('routes the landlord/deposit example from the brief', () => {
  const r = classifyIntake("My landlord isn't returning my deposit", vocab);
  assert.equal(r.practiceArea?.value.code, 'PROPERTY');
  assert.ok(r.isNaturalLanguage);
});

test('resolves a court and does not let the city swallow the court name', () => {
  const r = classifyIntake('Jabalpur High Court advocate', vocab);
  assert.equal(r.court?.value.slug, 'madhya-pradesh-high-court');
  // The seat is still useful context, but the court is the primary signal.
  assert.ok(r.court.confidence > 0.4);
});

test('handles former city names', () => {
  const bombay = classifyIntake('corporate lawyer in Bombay', vocab);
  assert.equal(bombay.location?.value.slug, 'mumbai');
  assert.equal(bombay.practiceArea?.value.code, 'CORPORATE');

  const blr = classifyIntake('trademark lawyer Bangalore', vocab);
  assert.equal(blr.location?.value.slug, 'bengaluru');
  assert.equal(blr.practiceArea?.value.code, 'IP');
});

test('prefers the more specific city over its state', () => {
  const r = classifyIntake('labour lawyer in Jabalpur', vocab);
  assert.equal(r.location?.value.slug, 'jabalpur');
});

test('detects matter type separately from practice area', () => {
  const r = classifyIntake('contract review for my company', vocab);
  assert.equal(r.practiceArea?.value.code, 'CONTRACT');
  assert.equal(r.matterType?.value.code, 'REVIEW');
});

test('detects local counsel intent, which drives the referral flow', () => {
  const r = classifyIntake('need local counsel in Bhopal for a hearing', vocab);
  assert.equal(r.matterType?.value.code, 'LOCAL_COUNSEL');
  assert.equal(r.location?.value.slug, 'bhopal');
});

test('escalates urgency from real-world phrasing', () => {
  assert.equal(classifyIntake('my brother was arrested last night', vocab).urgency, 'emergency');
  assert.equal(classifyIntake('need a reply urgently, deadline tomorrow', vocab).urgency, 'urgent');
  assert.equal(classifyIntake('corporate lawyer in Mumbai', vocab).urgency, 'normal');
});

test('offers competitive alternatives without inventing them', () => {
  const r = classifyIntake('pf and esi compliance for my factory', vocab);
  assert.ok(['PF', 'ESI', 'LABOUR_COMPLIANCE'].includes(r.practiceArea?.value.code ?? ''));
  const codes = [r.practiceArea?.value.code, ...r.alternativePracticeAreas.map((a) => a.value.code)];
  assert.ok(codes.includes('ESI') || codes.includes('LABOUR_COMPLIANCE'));
});

test('an empty or nonsense query yields nulls, never a wrong confident answer', () => {
  const r = classifyIntake('asdkjhasd zzz', vocab);
  assert.equal(r.practiceArea, null);
  assert.equal(r.location, null);
  assert.equal(r.interpretation, 'Showing all listed legal professionals.');
});

test('produces a human-readable interpretation for the confirmation chip', () => {
  const r = classifyIntake('divorce lawyer in Delhi', vocab);
  assert.match(r.interpretation, /Family/);
  assert.match(r.interpretation, /Delhi/);
});

test('name normalisation strips honorifics for deduplication', () => {
  assert.equal(normaliseName('SH. O.P. FAIZI'), normaliseName('O P Faizi'));
  assert.equal(normaliseName("HON'BLE JUSTICE Ramesh Gupta"), normaliseName('Ramesh Gupta'));
  assert.equal(normaliseName('Adv. K C Mittal'), 'k c mittal');
});

test('title casing keeps initials intact', () => {
  assert.equal(titleCaseName('SURYA PRAKASH KHATRI'), 'Surya Prakash Khatri');
  assert.equal(titleCaseName('K C MITTAL'), 'K C Mittal');
  assert.equal(titleCaseName('D.K. SHARMA'), 'D.K. Sharma');
});

test('trigram similarity supports typo-tolerant name search', () => {
  assert.ok(trigramSimilarity('Ramesh Gupta', 'Rameshh Gupta') > 0.6);
  assert.ok(trigramSimilarity('Ramesh Gupta', 'Suresh Nair') < 0.3);
});

test('FTS query builder neutralises operators and prefix-matches the last token', () => {
  assert.equal(toFtsQuery('labour del'), '"labour" OR "del"*');
  // A bare OR/NOT/quote must not become an FTS operator.
  assert.ok(!toFtsQuery('labour OR NOT "x"').includes('NOT '));
});

test('ranking weights sum to 100 and carry no commercial factor', () => {
  assertWeightsValid();
  const out = rank({
    practiceRelevance: 1, practiceDetail: 'Lists Provident Fund',
    jurisdictionRelevance: 1, jurisdictionDetail: 'Delhi',
    courtRelevance: 0.5, courtDetail: 'Delhi High Court',
    textRelevance: 0.8, textDetail: 'name match',
    verificationLevel: 3, yearsExperience: 12,
    acceptsConsultations: true, profileCompleteness: 80,
  });
  assert.ok(out.score > 70 && out.score <= 100, `score out of range: ${out.score}`);
  const keys = out.factors.map((f) => f.key);
  for (const forbidden of ['subscription', 'featured', 'ad_spend', 'plan_tier']) {
    assert.ok(!keys.includes(forbidden as never), `ranking must not consider ${forbidden}`);
  }
});

test('an unverified, unclaimed profile still ranks on merit, not zero', () => {
  const out = rank({
    practiceRelevance: 1, practiceDetail: 'x', jurisdictionRelevance: 1, jurisdictionDetail: 'x',
    courtRelevance: 0, courtDetail: 'x', textRelevance: 0, textDetail: 'x',
    verificationLevel: 0, yearsExperience: null, acceptsConsultations: false, profileCompleteness: 30,
  });
  assert.ok(out.score > 45, `unclaimed relevant profile should not be buried: ${out.score}`);
});
