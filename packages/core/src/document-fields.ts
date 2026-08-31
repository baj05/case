/**
 * Fills in `type`/`required` on a `TemplateField` by inference, so the 26
 * existing seed templates get real form validation without a single one of
 * them being hand-edited. Explicit values on the field always win — this
 * module only fills gaps, never overrides an author's choice.
 *
 * Calibrated against the 195 real field keys across every seeded template
 * (not guessed), specifically to avoid two false-positive classes that would
 * actively reject valid input if got wrong:
 *   - `FEE_BASIS` / `FEE_MODE` contain "FEE" but describe a billing
 *     arrangement ("per hour"), not an amount — excluded by checking the
 *     KEY'S LAST TOKEN, not a bare substring match.
 *   - `RENT_DAY` (day of month, 1-31) contains "RENT" but is not a rupee
 *     figure — caught by checking the day/month/year suffix BEFORE the
 *     money check, so it never reaches it.
 *
 * Where a field is genuinely ambiguous (a rate or a percentage that people
 * commonly type with a unit or a % sign, an invoice/cheque number that is
 * often alphanumeric), this module deliberately infers 'text' rather than a
 * stricter type. A wrongly-loose type only misses out on nicer formatting;
 * a wrongly-strict type actively rejects legitimate input. When unsure,
 * prefer the failure mode that doesn't block the user.
 */
import type { TemplateField, TemplateFieldType } from './resource-templates.ts';

function tokensOf(key: string): string[] {
  return key.split('_').filter(Boolean);
}

// Deliberately excludes 'COMMISSION': the only field with that exact key in
// the real seed data is `{ key: 'COMMISSION', label: 'Name of the District
// Commission' }` in the consumer-complaint template — a tribunal name, not a
// monetary commission. A field for an actual fee-share would use a
// COMMISSION_AMOUNT-style key, which still matches via the AMOUNT token.
const MONEY_TOKENS = new Set([
  'AMOUNT', 'RENT', 'DEPOSIT', 'SALARY', 'WAGE', 'WAGES', 'CTC', 'ARREARS',
  'COMPENSATION', 'REFUND', 'FEE', 'FEES', 'DEDUCTION', 'PRICE',
  'STIPEND', 'PREMIUM',
]);
// If the field's LAST token is one of these, it is not a bare amount even
// though an earlier token matched a money word (FEE_BASIS, AMOUNT_WORDS).
const MONEY_EXCLUDED_LAST_TOKEN = new Set([
  'BASIS', 'MODE', 'RATE', 'PERCENT', 'PERIOD', 'WORDS',
  'DAY', 'DAYS', 'MONTH', 'MONTHS', 'YEAR', 'YEARS',
]);

const MULTILINE_TOKENS = new Set([
  'ADDRESS', 'SCOPE', 'DUTIES', 'PURPOSE', 'HISTORY', 'REASON', 'REASONS',
  'GROUND', 'GROUNDS', 'DESCRIPTION', 'DEFICIENCY', 'DETAILS', 'NOTES',
  'DELIVERABLES', 'COMPONENTS', 'ROLES', 'QUESTIONS', 'DEMANDS', 'TEXT',
  'MATTERS', 'PERIOD', 'LIABILITY', 'SERVICE',
]);

const DURATION_SUFFIX_RE = /_(DAY|DAYS|MONTH|MONTHS|YEAR|YEARS)$/;
const DATE_KEY_RE = /(^DATE$|_DATE$)/;

/**
 * Infer a type purely from the field's key (and, as a tie-breaker only,
 * nothing from the hint — the hint is free text an author wrote for humans,
 * not a reliable machine signal). Order matters: date and duration checks
 * run before the money check specifically so `RENT_DAY` and `AMOUNT_WORDS`
 * don't get swept into 'money' by an earlier, broader token match.
 */
export function inferFieldType(field: Pick<TemplateField, 'key'>): TemplateFieldType {
  const key = field.key;
  if (DATE_KEY_RE.test(key)) return 'date';
  if (DURATION_SUFFIX_RE.test(key)) return 'number';

  const tokens = tokensOf(key);
  const lastToken = tokens[tokens.length - 1];
  if (tokens.some((t) => MONEY_TOKENS.has(t)) && !MONEY_EXCLUDED_LAST_TOKEN.has(lastToken ?? '')) {
    return 'money';
  }
  if (tokens.some((t) => MULTILINE_TOKENS.has(t))) return 'multiline';
  return 'text';
}

const OPTIONAL_HINT_RE = /leave blank|if any|optional|if applicable/i;

/** A field is required unless its own hint says otherwise. Every template
 * field declared today describes something the document genuinely needs, so
 * "required by default" is the correct prior — optionality is the
 * exception, and templates already phrase it in the hint when it applies. */
export function inferRequired(field: Pick<TemplateField, 'hint'>): boolean {
  if (field.hint && OPTIONAL_HINT_RE.test(field.hint)) return false;
  return true;
}

/**
 * Fill in `type`/`required` for every field that doesn't already declare
 * them explicitly. Called once, inside `seedTemplate()` — so the database
 * always stores the richer shape and zero seed files need editing to get it.
 */
export function normaliseTemplateFields(fields: TemplateField[]): TemplateField[] {
  return fields.map((f) => ({
    ...f,
    type: f.type ?? inferFieldType(f),
    required: f.required ?? inferRequired(f),
  }));
}
