/**
 * Annotation tests.
 *
 * The most important assertion here is the DRIFT GUARD at the bottom: the
 * joined segments must equal `fillTemplate`'s text for every real template.
 * A live preview built on a second substitution routine is a preview that
 * eventually lies about what the download will contain, and this is what
 * makes that impossible rather than merely unlikely.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { annotateTemplate, fillTemplate } from '../src/document-fill.ts';
import { normaliseTemplateFields } from '../src/document-fields.ts';
import { TENANCY_TEMPLATES, NOTICE_TEMPLATES, type ResourceTemplateSeed, type TemplateField } from '../src/resource-templates.ts';
import { TEMPLATES_SET_2 } from '../src/resource-templates-2.ts';

const ALL_TEMPLATES: ResourceTemplateSeed[] = [...TENANCY_TEMPLATES, ...NOTICE_TEMPLATES, ...TEMPLATES_SET_2];

const FIELDS: TemplateField[] = [
  { key: 'TENANT_NAME', label: 'Tenant name', required: true },
  { key: 'RENT', label: 'Monthly rent', type: 'money', required: true },
  { key: 'GSTIN', label: 'GSTIN', required: false },
];
const BODY = '[[TENANT_NAME]] shall pay [[RENT]].\nGST: [[GSTIN]]';

function flat(lines: ReturnType<typeof annotateTemplate>['lines']) {
  return lines.flat();
}

test('a filled field becomes one segment carrying its key and the substituted text', () => {
  const a = annotateTemplate(BODY, FIELDS, { TENANT_NAME: 'Jane Doe', RENT: '25000', GSTIN: '29ABCDE1234F1Z5' }, { mode: 'draft' });
  const seg = flat(a.lines).find((s) => s.fieldKey === 'RENT');
  assert.equal(seg?.state, 'filled');
  assert.equal(seg?.text, '25,000');
});

test('a blank required field is a `missing` segment that keeps the raw token, so the preview can point at it', () => {
  const a = annotateTemplate(BODY, FIELDS, {}, { mode: 'draft' });
  const seg = flat(a.lines).find((s) => s.fieldKey === 'TENANT_NAME');
  assert.equal(seg?.state, 'missing');
  assert.equal(seg?.text, '[[TENANT_NAME]]');
});

test('a value that fails validation is `missing`, not `filled` — the preview must not show a rejected value as done', () => {
  const a = annotateTemplate(BODY, FIELDS, { RENT: 'twenty five thousand' }, { mode: 'draft' });
  const seg = flat(a.lines).find((s) => s.fieldKey === 'RENT');
  assert.equal(seg?.state, 'missing');
  assert.ok(a.fieldErrors.RENT);
});

test('an optional field left blank is `left_blank`, distinct from `missing`', () => {
  const a = annotateTemplate(BODY, FIELDS, { TENANT_NAME: 'Jane', RENT: '100' }, { mode: 'draft' });
  const seg = flat(a.lines).find((s) => s.fieldKey === 'GSTIN');
  assert.equal(seg?.state, 'left_blank');
  assert.match(seg?.text ?? '', /left blank/);
});

test('an undeclared token is `unknown` and keeps its text verbatim', () => {
  const a = annotateTemplate('Hello [[MYSTERY]]', FIELDS, {}, { mode: 'draft' });
  const seg = flat(a.lines).find((s) => s.fieldKey === 'MYSTERY');
  assert.equal(seg?.state, 'unknown');
  assert.equal(seg?.text, '[[MYSTERY]]');
  assert.deepEqual(a.unknownPlaceholders, ['MYSTERY']);
});

test('fixed prose carries no fieldKey', () => {
  const a = annotateTemplate(BODY, FIELDS, {}, { mode: 'draft' });
  for (const s of flat(a.lines)) {
    if (s.state === 'text') assert.equal(s.fieldKey, undefined);
    else assert.ok(s.fieldKey, `segment in state ${s.state} must name its field`);
  }
});

test('lines are split on newlines, and the line count matches the text', () => {
  const a = annotateTemplate(BODY, FIELDS, { TENANT_NAME: 'Jane', RENT: '100', GSTIN: 'X' }, { mode: 'draft' });
  assert.equal(a.lines.length, a.text.split('\n').length);
  assert.equal(a.lines.length, 2);
});

test('a multi-line value is split across lines but every piece keeps its field key', () => {
  const fields: TemplateField[] = [{ key: 'ADDRESS', label: 'Address', type: 'multiline', required: true }];
  // sanitiseValue collapses runs of blank lines but keeps single newlines,
  // so a two-line address stays two lines.
  const a = annotateTemplate('At [[ADDRESS]] today.', fields, { ADDRESS: 'Flat 4B\nMG Road' }, { mode: 'draft' });
  const pieces = flat(a.lines).filter((s) => s.fieldKey === 'ADDRESS');
  assert.ok(pieces.length >= 1);
  for (const p of pieces) assert.equal(p.state, 'filled');
});

test('SECURITY: a value shaped like a placeholder yields ONE segment, never a nested token', () => {
  const a = annotateTemplate(BODY, FIELDS, { TENANT_NAME: '[[RENT]] and more', RENT: '500' }, { mode: 'draft' });
  const nameSegs = flat(a.lines).filter((s) => s.fieldKey === 'TENANT_NAME');
  assert.equal(nameSegs.length, 1);
  // Brackets are stripped by sanitiseValue, so no placeholder syntax survives.
  assert.equal(a.text.includes('[['), false);
  // And RENT was substituted exactly once, from its own placeholder only.
  assert.equal(a.text.split('500').length - 1, 1);
});

test('strict mode blanks the text but STILL returns lines, so a preview can show what is missing', () => {
  const a = annotateTemplate(BODY, FIELDS, {}, { mode: 'strict' });
  assert.equal(a.text, '');
  assert.ok(a.lines.length > 0, 'the preview needs the lines even when strict output is withheld');
  assert.equal(a.missingRequired.length, 2);
});

// ------------------------------------------------------------- drift guard

test('DRIFT GUARD: joined segments equal fillTemplate text, for every real template, empty and filled', () => {
  const mismatches: string[] = [];
  for (const t of ALL_TEMPLATES) {
    const fields = normaliseTemplateFields(t.fields);

    for (const values of [
      {} as Record<string, string>,
      Object.fromEntries(fields.map((f) => [f.key, sample(f.type)])),
    ]) {
      for (const mode of ['draft', 'strict'] as const) {
        const a = annotateTemplate(t.body, fields, values, { mode });
        const f = fillTemplate(t.body, fields, values, { mode });
        const joined = a.lines.map((line) => line.map((s) => s.text).join('')).join('\n');
        if (a.text !== f.text) mismatches.push(`${t.slug} (${mode}): annotate.text !== fill.text`);
        // In strict-failure the text is deliberately blanked, so compare the
        // lines against the draft text instead of the withheld strict one.
        const expected = mode === 'strict' && f.text === ''
          ? fillTemplate(t.body, fields, values, { mode: 'draft' }).text
          : f.text;
        if (joined !== expected) mismatches.push(`${t.slug} (${mode}): joined lines !== text`);
      }
    }
  }
  assert.deepEqual(mismatches, [], `${mismatches.length} drift(s):\n${mismatches.slice(0, 10).join('\n')}`);
});

function sample(type: string | undefined): string {
  switch (type) {
    case 'money': return '25000';
    case 'number': return '3';
    case 'date': return '2026-03-05';
    default: return 'Sample Value';
  }
}

test('COVERAGE: every real template annotates with every segment accounted for', () => {
  for (const t of ALL_TEMPLATES) {
    const fields = normaliseTemplateFields(t.fields);
    const a = annotateTemplate(t.body, fields, {}, { mode: 'draft' });
    for (const line of a.lines) {
      for (const s of line) {
        assert.ok(s.text.length > 0, `${t.slug}: empty segment emitted`);
        assert.equal(s.text.includes('\n'), false, `${t.slug}: a line segment must not contain a newline`);
      }
    }
  }
});
