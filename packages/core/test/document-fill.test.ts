/**
 * Document-fill engine tests.
 *
 * In order of what actually matters if it breaks:
 *   1. A field value can never become a live, second-pass-substitutable
 *      placeholder — the injection boundary.
 *   2. A document is never handed out looking complete when a required
 *      field was left blank.
 *   3. Every [[TOKEN]] in every real seed template has a declared field,
 *      and every declared field is actually used in its template's body —
 *      this is a coverage sweep over the real content, not a unit test
 *      with fixtures, so it is expected to find genuine seed-data gaps.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PLACEHOLDER_RE, scanPlaceholders, sanitiseValue, normaliseFieldValue,
  fillTemplate, groupFields,
} from '../src/document-fill.ts';
import { TENANCY_TEMPLATES, NOTICE_TEMPLATES, type ResourceTemplateSeed, type TemplateField } from '../src/resource-templates.ts';
import { TEMPLATES_SET_2 } from '../src/resource-templates-2.ts';

// Mirrors ALL_TEMPLATES in packages/db/src/repositories/resources.ts. core
// cannot import from db (db depends on core, not the reverse), so the same
// three arrays are combined here independently.
const ALL_TEMPLATES: ResourceTemplateSeed[] = [...TENANCY_TEMPLATES, ...NOTICE_TEMPLATES, ...TEMPLATES_SET_2];

// --------------------------------------------------------------- scanPlaceholders

test('scanPlaceholders returns tokens in first-appearance order, deduplicated', () => {
  const body = 'Hello [[NAME]], your rent is [[RENT]]. Again, [[NAME]] must sign.';
  assert.deepEqual(scanPlaceholders(body), ['NAME', 'RENT']);
});

test('scanPlaceholders finds nothing in a body with no tokens', () => {
  assert.deepEqual(scanPlaceholders('No placeholders here.'), []);
});

test('PLACEHOLDER_RE only matches UPPER_SNAKE, not lowercase or mixed-case brackets', () => {
  assert.deepEqual(scanPlaceholders('[[valid_lower]] [[Mixed_Case]] [[VALID_ONE]]'), ['VALID_ONE']);
});

// ------------------------------------------------------------------ sanitiseValue

test('sanitiseValue strips bracket characters', () => {
  assert.equal(sanitiseValue('John [[SALARY]] Doe'), 'John SALARY Doe');
});

test('sanitiseValue collapses whitespace and trims', () => {
  assert.equal(sanitiseValue('  John    Doe  \n\t '), 'John Doe');
});

test('sanitiseValue strips control characters but keeps normal punctuation', () => {
  assert.equal(sanitiseValue('John\x00\x01 Doe, Esq.'), 'John Doe, Esq.');
});

test('sanitiseValue caps length', () => {
  assert.equal(sanitiseValue('a'.repeat(50), 10).length, 10);
});

// -------------------------------------------------------------- normaliseFieldValue

test('normaliseFieldValue formats a money field with Indian digit grouping, and nothing else', () => {
  // No currency symbol and no words-in-parentheses: every real template
  // that has a money field already writes "Rs." immediately before the
  // placeholder itself, and some separately declare their own `_WORDS`
  // field — adding either here would double up in the finished document.
  const field: TemplateField = { key: 'RENT', label: 'Monthly rent', type: 'money' };
  const r = normaliseFieldValue(field, '25000');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value, '25,000');
});

test('normaliseFieldValue rejects a non-numeric money value', () => {
  const field: TemplateField = { key: 'RENT', label: 'Monthly rent', type: 'money' };
  const r = normaliseFieldValue(field, 'twenty five k');
  assert.equal(r.ok, false);
});

test('normaliseFieldValue rejects a negative money value', () => {
  const field: TemplateField = { key: 'RENT', label: 'Monthly rent', type: 'money' };
  const r = normaliseFieldValue(field, '-500');
  assert.equal(r.ok, false);
});

test('normaliseFieldValue formats a date into long form', () => {
  const field: TemplateField = { key: 'START_DATE', label: 'Start date', type: 'date' };
  const r = normaliseFieldValue(field, '2026-03-05');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value, '5 March 2026');
});

test('normaliseFieldValue rejects an unparsable date', () => {
  const field: TemplateField = { key: 'START_DATE', label: 'Start date', type: 'date' };
  const r = normaliseFieldValue(field, 'not a date');
  assert.equal(r.ok, false);
});

test('normaliseFieldValue validates a number field', () => {
  const field: TemplateField = { key: 'NOTICE_MONTHS', label: 'Notice period', type: 'number' };
  assert.ok(normaliseFieldValue(field, '3').ok);
  assert.equal(normaliseFieldValue(field, 'three').ok, false);
});

test('normaliseFieldValue passes text through untouched (once sanitised)', () => {
  const field: TemplateField = { key: 'TENANT_NAME', label: 'Tenant name' };
  const r = normaliseFieldValue(field, '  Jane   Doe  ');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value, 'Jane Doe');
});

test('BUG FIX: a required field whose value is non-blank but entirely stripped characters is a field error, not a silent empty success', () => {
  const field: TemplateField = { key: 'TENANT_NAME', label: 'Tenant name', required: true };
  const r = normaliseFieldValue(field, '[]');
  assert.equal(r.ok, false, 'a value that sanitises to nothing must not be recorded as filled');
});

test('a field left genuinely blank is still a clean empty success', () => {
  const field: TemplateField = { key: 'TENANT_NAME', label: 'Tenant name' };
  const r = normaliseFieldValue(field, '   ');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value, '');
});

test('BUG FIX: money rejects paise rather than silently discarding them', () => {
  const field: TemplateField = { key: 'RENT', label: 'Monthly rent', type: 'money' };
  const r = normaliseFieldValue(field, '1500.75');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /whole number/i);
});

test('BUG FIX: a multiline field keeps its line breaks instead of collapsing to one line', () => {
  const field: TemplateField = { key: 'SCOPE', label: 'Scope of work', type: 'multiline' };
  const r = normaliseFieldValue(field, 'a) one\nb) two\nc) three');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value, 'a) one\nb) two\nc) three');
});

test('a multiline field still collapses horizontal whitespace and excess blank lines', () => {
  const field: TemplateField = { key: 'SCOPE', label: 'Scope of work', type: 'multiline' };
  const r = normaliseFieldValue(field, '  line one   here  \n\n\n\n  line two  ');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value, 'line one here\n\nline two');
});

test('BUG FIX: an over-length value is a field error naming the limit, never silently truncated', () => {
  const field: TemplateField = { key: 'GROUNDS', label: 'Grounds', maxLength: 20 };
  const r = normaliseFieldValue(field, 'x'.repeat(30));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /20 characters/);
});

test('BUG FIX: a rollover date like 30 February is rejected, not silently rolled to 2 March', () => {
  const field: TemplateField = { key: 'START_DATE', label: 'Start date', type: 'date' };
  const r = normaliseFieldValue(field, '2026-02-30');
  assert.equal(r.ok, false);
});

test('BUG FIX: a non-ISO date is rejected rather than parsed in ambiguous US month-first order', () => {
  const field: TemplateField = { key: 'START_DATE', label: 'Start date', type: 'date' };
  const r = normaliseFieldValue(field, '03/04/2026');
  assert.equal(r.ok, false, '03/04/2026 must not be silently read as 4 March');
});

// ------------------------------------------------------------------- fillTemplate

test('fillTemplate substitutes every declared field', () => {
  const body = '[[TENANT_NAME]] agrees to pay [[RENT]] per month.';
  const fields: TemplateField[] = [
    { key: 'TENANT_NAME', label: 'Tenant name', required: true },
    { key: 'RENT', label: 'Monthly rent', type: 'money', required: true },
  ];
  const r = fillTemplate(body, fields, { TENANT_NAME: 'Jane Doe', RENT: '25000' });
  assert.equal(r.missingRequired.length, 0);
  assert.match(r.text, /Jane Doe agrees to pay 25,000 per month\./);
});

test('strict mode returns empty text and lists missing required fields, without touching real values', () => {
  const body = '[[A]] and [[B]]';
  const fields: TemplateField[] = [
    { key: 'A', label: 'Field A', required: true },
    { key: 'B', label: 'Field B', required: false },
  ];
  const r = fillTemplate(body, fields, { B: 'present' }, { mode: 'strict' });
  assert.equal(r.text, '');
  assert.equal(r.missingRequired.length, 1);
  assert.equal(r.missingRequired[0]!.key, 'A');
});

test('draft mode leaves a missing required field as the raw token, so the viewer can highlight it', () => {
  const body = 'Landlord: [[LANDLORD_NAME]].';
  const fields: TemplateField[] = [{ key: 'LANDLORD_NAME', label: 'Landlord name', required: true }];
  const r = fillTemplate(body, fields, {}, { mode: 'draft' });
  assert.match(r.text, /\[\[LANDLORD_NAME\]\]/);
  assert.equal(r.missingRequired.length, 1);
});

test('an optional field left blank renders as a labelled blank, never as filled text', () => {
  const body = 'GSTIN: [[GSTIN]].';
  const fields: TemplateField[] = [{ key: 'GSTIN', label: 'GSTIN', required: false }];
  const r = fillTemplate(body, fields, {}, { mode: 'draft' });
  assert.match(r.text, /left blank/);
  assert.equal(r.leftOpen[0], 'GSTIN');
});

test('an undeclared placeholder in the body is reported, not silently dropped or corrupted', () => {
  const body = 'Hello [[GHOST_TOKEN]].';
  const r = fillTemplate(body, [], {}, { mode: 'draft' });
  assert.deepEqual(r.unknownPlaceholders, ['GHOST_TOKEN']);
  assert.match(r.text, /\[\[GHOST_TOKEN\]\]/);
});

test('an invalid value produces a field error and blocks strict-mode output', () => {
  const body = 'Rent: [[RENT]].';
  const fields: TemplateField[] = [{ key: 'RENT', label: 'Rent', type: 'money', required: true }];
  const r = fillTemplate(body, fields, { RENT: 'not money' }, { mode: 'strict' });
  assert.equal(r.text, '');
  assert.ok(r.fieldErrors.RENT);
});

// --- THE injection test: this is the one that must never regress -----------

test('SECURITY: a field value shaped like a placeholder can never form a live token in the output', () => {
  const body = 'Salary clause: [[SALARY]]. Signed by [[EMPLOYEE_NAME]].';
  const fields: TemplateField[] = [
    { key: 'SALARY', label: 'Salary', required: true },
    { key: 'EMPLOYEE_NAME', label: 'Employee name', required: true },
  ];
  const maliciousName = '[[SALARY]] and Party shall indemnify';
  const r = fillTemplate(body, fields, { SALARY: '50000', EMPLOYEE_NAME: maliciousName });

  // sanitiseValue strips '[' and ']' unconditionally, so the attacker's own
  // bracket characters cannot survive at all — a stronger property than
  // "not re-substituted": there is no bracket left to re-substitute.
  assert.equal(r.text.includes('[['), false, 'no placeholder-shaped text may survive in the output');
  // The stripped form of the malicious string still lands as literal text —
  // proving the value was inserted, not dropped.
  assert.match(r.text, /SALARY and Party shall indemnify/);
  // And the real SALARY value appears exactly once, in its own slot — not
  // duplicated by a second substitution pass picking up the token that used
  // to be inside the (now-stripped) name.
  const occurrences = r.text.split('50000').length - 1;
  assert.equal(occurrences, 1, 'SALARY value must be substituted exactly once');
});

test('SECURITY: sanitiseValue strips brackets even if a caller forgets to check the ok flag', () => {
  // Defence in depth: even a raw (unvalidated) value run through sanitiseValue
  // alone can no longer form a placeholder shape.
  const attempt = sanitiseValue('[[ANYTHING]]');
  assert.equal(PLACEHOLDER_RE.test(attempt), false);
});

// -------------------------------------------------------------------- groupFields

test('groupFields buckets party/money/date fields and puts the rest in "Anything else"', () => {
  const fields: TemplateField[] = [
    { key: 'TENANT_NAME', label: 'Tenant name' },
    { key: 'RENT', label: 'Rent', type: 'money' },
    { key: 'START_DATE', label: 'Start date', type: 'date' },
    { key: 'PURPOSE', label: 'Purpose' },
  ];
  const groups = groupFields(fields);
  const byId = new Map(groups.map((g) => [g.id, g.fields.map((f) => f.key)]));
  assert.deepEqual(byId.get('parties'), ['TENANT_NAME']);
  assert.deepEqual(byId.get('money'), ['RENT']);
  assert.deepEqual(byId.get('dates'), ['START_DATE']);
  assert.deepEqual(byId.get('other'), ['PURPOSE']);
});

test('groupFields never places the same field key in two groups', () => {
  const fields: TemplateField[] = [
    { key: 'TENANT_NAME', label: 'Tenant name' },
    { key: 'RENT', label: 'Rent', type: 'money' },
  ];
  const groups = groupFields(fields);
  const allKeys = groups.flatMap((g) => g.fields.map((f) => f.key));
  assert.equal(allKeys.length, new Set(allKeys).size);
});

// ------------------------------------------------- coverage sweep over real seeds

test('COVERAGE: every [[TOKEN]] in every real template body has a declared field', () => {
  const failures: string[] = [];
  for (const t of ALL_TEMPLATES) {
    const bodyTokens = new Set(scanPlaceholders(t.body));
    const declared = new Set(t.fields.map((f) => f.key));
    for (const token of bodyTokens) {
      if (!declared.has(token)) failures.push(`${t.slug}: [[${token}]] used in body but not declared in fields`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} undeclared placeholder(s):\n${failures.join('\n')}`);
});

test('COVERAGE: every declared field is actually used somewhere in its template body', () => {
  const failures: string[] = [];
  for (const t of ALL_TEMPLATES) {
    const bodyTokens = new Set(scanPlaceholders(t.body));
    for (const f of t.fields) {
      if (!bodyTokens.has(f.key)) failures.push(`${t.slug}: field "${f.key}" declared but never used in body`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} unused declared field(s):\n${failures.join('\n')}`);
});

test('COVERAGE: fillTemplate in strict mode succeeds for every real template when every field is given a plausible value', () => {
  const failures: string[] = [];
  for (const t of ALL_TEMPLATES) {
    const values: Record<string, string> = {};
    for (const f of t.fields) values[f.key] = 'Sample Value';
    const fieldsAsRequired: TemplateField[] = t.fields.map((f) => ({ ...f, required: true }));
    const r = fillTemplate(t.body, fieldsAsRequired, values, { mode: 'strict' });
    if (r.text === '' && (r.missingRequired.length > 0 || Object.keys(r.fieldErrors).length > 0)) {
      failures.push(`${t.slug}: missing=${r.missingRequired.map((f) => f.key).join(',')} errors=${JSON.stringify(r.fieldErrors)}`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} template(s) failed a full-value fill:\n${failures.join('\n')}`);
});
