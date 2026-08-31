/**
 * Field-type inference tests.
 *
 * The unit tests below are pinned to real keys pulled from the actual seed
 * templates specifically because a naive heuristic gets several of them
 * wrong in a way that would REJECT legitimate input (see document-fields.ts
 * for the false positives this was calibrated against — FEE_BASIS/FEE_MODE,
 * RENT_DAY, AMOUNT_WORDS). The coverage test at the bottom then proves the
 * inference is safe against every real field across every real template,
 * not just the handful exercised by name here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { inferFieldType, inferRequired, normaliseTemplateFields } from '../src/document-fields.ts';
import { fillTemplate } from '../src/document-fill.ts';
import { TENANCY_TEMPLATES, NOTICE_TEMPLATES, type ResourceTemplateSeed } from '../src/resource-templates.ts';
import { TEMPLATES_SET_2 } from '../src/resource-templates-2.ts';

const ALL_TEMPLATES: ResourceTemplateSeed[] = [...TENANCY_TEMPLATES, ...NOTICE_TEMPLATES, ...TEMPLATES_SET_2];

// ---------------------------------------------------------------- inferFieldType

test('inferFieldType: a bare amount-like key is money', () => {
  assert.equal(inferFieldType({ key: 'RENT' }), 'money');
  assert.equal(inferFieldType({ key: 'DEPOSIT' }), 'money');
  assert.equal(inferFieldType({ key: 'AMOUNT_DUE' }), 'money');
});

test('inferFieldType: COMMISSION is a tribunal name, not money — found via the browser preview, not guessed', () => {
  // The only real field with this exact key is `{ key: 'COMMISSION', label:
  // 'Name of the District Commission' }` in the consumer-complaint template,
  // used as `BEFORE THE [[COMMISSION]]`. Money-typing it would reject the
  // tribunal's name the user is meant to type there.
  assert.equal(inferFieldType({ key: 'COMMISSION' }), 'text');
});

test('inferFieldType: FEE_BASIS and FEE_MODE are NOT money, despite containing "FEE"', () => {
  // These describe a billing arrangement ("per hour", "fixed"), not a rupee
  // figure. Forcing money-type validation on them would reject the very
  // text they exist to hold.
  assert.equal(inferFieldType({ key: 'FEE_BASIS' }), 'text');
  assert.equal(inferFieldType({ key: 'FEE_MODE' }), 'text');
  assert.equal(inferFieldType({ key: 'FEE' }), 'money');
});

test('inferFieldType: RENT_DAY is a day-of-month number, not money, despite containing "RENT"', () => {
  assert.equal(inferFieldType({ key: 'RENT_DAY' }), 'number');
});

test('inferFieldType: AMOUNT_WORDS is text, not money — it holds the words form of an amount', () => {
  assert.equal(inferFieldType({ key: 'AMOUNT_WORDS' }), 'text');
});

test('inferFieldType: a *_DATE key is a date', () => {
  assert.equal(inferFieldType({ key: 'START_DATE' }), 'date');
  assert.equal(inferFieldType({ key: 'EFFECTIVE_DATE' }), 'date');
  assert.equal(inferFieldType({ key: 'DATE' }), 'date');
});

test('inferFieldType: duration suffixes (_MONTHS/_DAYS/_YEARS) are numbers', () => {
  assert.equal(inferFieldType({ key: 'NOTICE_MONTHS' }), 'number');
  assert.equal(inferFieldType({ key: 'DEADLINE_DAYS' }), 'number');
  assert.equal(inferFieldType({ key: 'CONFIDENTIALITY_YEARS' }), 'number');
});

test('inferFieldType: an *_ADDRESS key is multiline', () => {
  assert.equal(inferFieldType({ key: 'LANDLORD_ADDRESS' }), 'multiline');
  assert.equal(inferFieldType({ key: 'TENANT_ADDRESS' }), 'multiline');
});

test('inferFieldType: an ordinary name/identifier key defaults to text', () => {
  assert.equal(inferFieldType({ key: 'TENANT_NAME' }), 'text');
  assert.equal(inferFieldType({ key: 'CHEQUE_NO' }), 'text');
});

test('inferFieldType: a rate/percentage key stays text, since it is commonly typed with a unit or % sign', () => {
  assert.equal(inferFieldType({ key: 'INTEREST_RATE' }), 'text');
  assert.equal(inferFieldType({ key: 'ESCALATION_PERCENT' }), 'text');
});

// ----------------------------------------------------------------- inferRequired

test('inferRequired: no hint, or an unrelated hint, means required', () => {
  assert.equal(inferRequired({}), true);
  assert.equal(inferRequired({ hint: 'The city where it is signed' }), true);
});

test('inferRequired: an optionality hint means not required', () => {
  assert.equal(inferRequired({ hint: 'Leave blank if not applicable' }), false);
  assert.equal(inferRequired({ hint: 'Optional' }), false);
  assert.equal(inferRequired({ hint: 'If any' }), false);
});

// ------------------------------------------------------------ normaliseTemplateFields

test('normaliseTemplateFields: an explicit type on the field always wins over the inferred one', () => {
  const [f] = normaliseTemplateFields([{ key: 'RENT', label: 'Rent', type: 'text' }]);
  assert.equal(f!.type, 'text'); // author said text; inference would have said money — author wins
});

test('normaliseTemplateFields: an explicit required:false always wins over inference', () => {
  const [f] = normaliseTemplateFields([{ key: 'RENT', label: 'Rent', required: false }]);
  assert.equal(f!.required, false); // no optionality hint, so inference alone would say true
});

test('normaliseTemplateFields: leaves label/hint/options untouched', () => {
  const [f] = normaliseTemplateFields([{ key: 'PLAN', label: 'Plan', hint: 'Pick one', options: ['A', 'B'] }]);
  assert.equal(f!.label, 'Plan');
  assert.equal(f!.hint, 'Pick one');
  assert.deepEqual(f!.options, ['A', 'B']);
});

// --------------------------------------------------- coverage sweep over real seeds

test('COVERAGE: normaliseTemplateFields assigns a type and a required flag to every field in every real template', () => {
  for (const t of ALL_TEMPLATES) {
    const normalised = normaliseTemplateFields(t.fields);
    for (const f of normalised) {
      assert.ok(f.type, `${t.slug}: field "${f.key}" has no type after normalisation`);
      assert.equal(typeof f.required, 'boolean', `${t.slug}: field "${f.key}" has no boolean required after normalisation`);
    }
  }
});

/** One plausible, correctly-shaped value per inferred type — used only to
 * prove the inferred type doesn't reject a well-formed value of its own
 * kind, across every real field in every real template. */
function sampleValueFor(type: string | undefined): string {
  switch (type) {
    case 'money': return '25000';
    case 'number': return '3';
    case 'date': return '2026-03-05';
    default: return 'Sample Value';
  }
}

test('COVERAGE: after normalisation, every real template fills successfully in strict mode with a type-appropriate sample value', () => {
  const failures: string[] = [];
  for (const t of ALL_TEMPLATES) {
    const normalised = normaliseTemplateFields(t.fields).map((f) => ({ ...f, required: true }));
    const values: Record<string, string> = {};
    for (const f of normalised) values[f.key] = sampleValueFor(f.type);
    const r = fillTemplate(t.body, normalised, values, { mode: 'strict' });
    if (r.text === '') {
      failures.push(`${t.slug}: missing=${r.missingRequired.map((f) => f.key).join(',')} errors=${JSON.stringify(r.fieldErrors)}`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} template(s) failed a type-appropriate fill:\n${failures.join('\n')}`);
});
