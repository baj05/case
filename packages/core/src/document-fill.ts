/**
 * Deterministic placeholder substitution for platform document templates.
 *
 * Every template body carries `[[UPPER_SNAKE]]` tokens (see
 * resource-templates.ts's header comment). This module is the ONLY place
 * that turns those tokens into a completed document. It is pure,
 * synchronous, has no I/O, and never generates text — every character in
 * the output either came from the fixed template body or from a value the
 * user typed into a declared field.
 */
import type { TemplateField } from './resource-templates.ts';

/** Matches a placeholder token. Global so `String.replace` walks the whole
 * body in one pass. */
export const PLACEHOLDER_RE = /\[\[([A-Z0-9_]+)\]\]/g;

/**
 * Every placeholder token in `body`, in first-appearance order, deduplicated.
 * Used both by the field-coverage test and by `groupFields` callers that
 * want the template's own token order rather than the `fields` array's order.
 */
export function scanPlaceholders(body: string): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const m of body.matchAll(PLACEHOLDER_RE)) {
    const token = m[1]!;
    if (!seen.has(token)) { seen.add(token); ordered.push(token); }
  }
  return ordered;
}

/** Control characters and bracket characters stripped, unconditionally, from
 * any value before it can reach a template body — see sanitiseValue below. */
function stripUnsafeChars(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex -- deliberately stripping control chars
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/[[\]]/g, '');
}

/**
 * Collapse whitespace.
 *
 * `preserveNewlines` keeps line breaks — collapsing them like any other
 * whitespace is what used to turn a multi-line address, or a numbered list
 * of grounds, into one unreadable run of text. Runs of spaces/tabs around
 * each newline are still trimmed, and three or more consecutive blank
 * lines collapse to one, so the field can't be used to pad a document with
 * vertical whitespace.
 */
function collapseWhitespace(s: string, preserveNewlines: boolean): string {
  if (!preserveNewlines) return s.replace(/\s+/g, ' ').trim();
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean a raw field value before it can ever reach the template body.
 *
 * This is the injection boundary: every `[` and `]` character is stripped
 * UNCONDITIONALLY, so a value can never contain placeholder syntax at all —
 * there is nothing to "detect and reject", the bracket simply cannot survive
 * into the output. Control characters are stripped too, and length is capped
 * so one field cannot blow out document layout.
 *
 * This is the general-purpose form — whitespace fully collapsed, truncated
 * rather than rejected — used where a hard length hasn't already been
 * agreed with the user (e.g. cleaning AI-suggested text for display).
 * `normaliseFieldValue`, the actual validation boundary for a document
 * field, does NOT call this: it needs to preserve newlines for a multiline
 * field and to REJECT rather than silently truncate an over-length value,
 * so it applies the same two steps itself with those differences.
 */
export function sanitiseValue(raw: string, max = 500): string {
  return collapseWhitespace(stripUnsafeChars(raw), false).slice(0, max);
}

const MONEY_RE = /^-?\d[\d,]*(\.\d{1,2})?$/;
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

/**
 * ISO `YYYY-MM-DD` only.
 *
 * A looser fallback that also accepted anything `new Date()` could parse
 * used to sit here — but that parses `03/04/2026` as 4 March in US
 * month-first order, which is silently the wrong day for the Indian date
 * `dd/mm/yyyy` most people typing it mean. The wizard's own `<input
 * type="date">` always emits ISO, so this only tightens what a direct API
 * caller can send — which is exactly where an ambiguous format is a risk
 * rather than a convenience.
 */
function formatDateLabel(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const cleaned = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (!iso) return { ok: false, error: 'Enter a date as YYYY-MM-DD.' };
  const year = Number(iso[1]);
  const month = Number(iso[2]);
  const day = Number(iso[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls an out-of-range day/month forward rather than rejecting
  // it (2026-02-30 silently becomes 2 March), so the round-trip is checked
  // explicitly rather than trusting that construction succeeded.
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return { ok: false, error: 'Enter a valid date.' };
  }
  const value = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { ok: true, value };
}

/**
 * Coerce and validate one raw value against its field's inferred/declared
 * type. This is where a "25000" becomes "25,000" for a money field, or a
 * date becomes its long form — the template body is never asked to do this
 * formatting itself.
 *
 * A money field renders as digits only, with Indian grouping — no currency
 * symbol and no words-in-parentheses. Every real template that has a money
 * field already writes the currency marker itself immediately before the
 * placeholder ("Rs. [[RENT]]", "Rs. [[CTC]]" — confirmed by sweeping every
 * money-typed field in the seed data), and several separately declare their
 * own `_WORDS` field for a hand-typed words form right next to it. Adding a
 * "₹" prefix here would double up the currency marker in every document;
 * adding a "(Rupees ... only)" suffix here would double up with those
 * templates' own `_WORDS` field. Formatting only the digits is the one
 * behaviour that is correct for both.
 */
export function normaliseFieldValue(
  field: TemplateField,
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const max = field.maxLength ?? 500;
  // Multiline keeps its line breaks; every other type collapses whitespace
  // completely, matching sanitiseValue's behaviour exactly (it is not
  // called directly here so this can preserve newlines without changing
  // that shared function's contract for its other callers).
  const clean = collapseWhitespace(stripUnsafeChars(raw), field.type === 'multiline');

  // A value that had real content before cleaning but none after it (e.g.
  // "[]", or a string made only of control characters) must not be
  // recorded as a successful, empty fill. That is indistinguishable from
  // "left blank" downstream — except this field may be required, and the
  // document would render with nothing where a value belongs and no error
  // anywhere to say so.
  if (raw.trim().length > 0 && clean.length === 0) {
    return { ok: false, error: `Enter ${field.label.toLowerCase()} using at least one letter or number.` };
  }
  if (clean.length === 0) return { ok: true, value: '' };

  // An over-length value is rejected, not silently cut. Truncating used to
  // ship a document with a sentence severed mid-word and no indication
  // anything was lost; asking the user to shorten it is the only version
  // that does not lose content without telling anyone.
  if (clean.length > max) {
    return { ok: false, error: `Keep ${field.label.toLowerCase()} to ${max} characters or fewer — it is currently ${clean.length}.` };
  }

  switch (field.type) {
    case 'money': {
      if (!MONEY_RE.test(clean)) return { ok: false, error: `Enter ${field.label.toLowerCase()} as a plain number, e.g. 25000.` };
      // Rejected, not rounded: silently dropping paise from a rent or a
      // salary figure is a wrong number in a signed document, not a
      // formatting nicety.
      if (clean.includes('.')) {
        return { ok: false, error: `Enter ${field.label.toLowerCase()} as a whole number of rupees, without paise — e.g. 25000.` };
      }
      const numeric = Number(clean.replace(/,/g, ''));
      if (!Number.isFinite(numeric) || numeric < 0) return { ok: false, error: 'Enter a valid, non-negative amount.' };
      return { ok: true, value: Math.trunc(numeric).toLocaleString('en-IN') };
    }
    case 'number': {
      if (!NUMBER_RE.test(clean)) return { ok: false, error: `Enter ${field.label.toLowerCase()} as a number.` };
      return { ok: true, value: clean };
    }
    case 'date':
      return formatDateLabel(clean);
    case 'select': {
      if (!field.options || field.options.length === 0) return { ok: true, value: clean };
      const match = field.options.find((o) => o.toLowerCase() === clean.toLowerCase());
      if (!match) return { ok: false, error: `Choose one of: ${field.options.join(', ')}.` };
      return { ok: true, value: match };
    }
    default:
      return { ok: true, value: clean };
  }
}

export interface FillResult {
  /** The completed body. Empty string in 'strict' mode when required fields
   * are missing or any value fails validation — callers must check
   * `missingRequired`/`fieldErrors`, not treat an empty string as success. */
  text: string;
  filled: string[];
  missingRequired: TemplateField[];
  /** Optional fields the user left blank — rendered as a labelled blank, not
   * as filled text, so the document never LOOKS complete when it isn't. */
  leftOpen: string[];
  /** Tokens present in the template body with no matching entry in `fields`
   * — a seed data bug, surfaced rather than silently dropped. */
  unknownPlaceholders: string[];
  fieldErrors: Record<string, string>;
}

/** What a run of document text came from. */
export type SegmentState =
  /** Fixed template prose. */
  | 'text'
  /** A field the user has filled with a valid value. */
  | 'filled'
  /** A required field still blank, or one whose value failed validation. */
  | 'missing'
  /** An optional field deliberately left blank. */
  | 'left_blank'
  /** A token in the body with no declared field — seed-data bug. */
  | 'unknown';

export interface DocSegment {
  text: string;
  state: SegmentState;
  /** The field this run came from. Absent only for `state: 'text'`. */
  fieldKey?: string;
}

export interface AnnotatedFill extends FillResult {
  /**
   * The document as lines of segments, so a live preview can locate a field
   * EXACTLY rather than searching the rendered text for it. Searching is
   * what a naive implementation does, and it breaks the moment two fields
   * hold the same value or a value happens to occur in the fixed prose.
   */
  lines: DocSegment[][];
}

/**
 * The one substitution implementation.
 *
 * `fillTemplate` is this function plus a join, so the text served as a
 * download and the text shown in the live preview cannot drift apart — a
 * second substitution routine for the preview is how a preview starts
 * lying about what you will receive.
 *
 * SECURITY-CRITICAL: substitution is a single forward pass over the body,
 * and a substituted value is NEVER re-scanned. That is what makes it safe
 * for a value to literally contain the text "[[SALARY]]" without that text
 * becoming a live, second-pass-substitutable token. A
 * `while (body.includes('[['))` loop WOULD re-scan its own output and is
 * exploitable; do not write one, here or anywhere else that touches this
 * body text.
 */
export function annotateTemplate(
  body: string,
  fields: TemplateField[],
  values: Record<string, string>,
  opts: { mode?: 'strict' | 'draft' } = {},
): AnnotatedFill {
  const mode = opts.mode ?? 'strict';
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const declaredTokens = new Set(fields.map((f) => f.key));
  const unknownPlaceholders = scanPlaceholders(body).filter((t) => !declaredTokens.has(t));

  const filled: string[] = [];
  const leftOpen: string[] = [];
  const missingRequired: TemplateField[] = [];
  const fieldErrors: Record<string, string> = {};

  const segments: DocSegment[] = [];
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(body)) !== null) {
    if (match.index > cursor) {
      segments.push({ text: body.slice(cursor, match.index), state: 'text' });
    }
    const token = match[1]!;
    const field = byKey.get(token);

    if (!field) {
      // Undeclared token: left exactly as-is rather than guessed at. The
      // coverage test is what catches this; this branch only avoids
      // corrupting output for a seed bug it did not cause.
      segments.push({ text: match[0], state: 'unknown', fieldKey: token });
    } else {
      const raw = values[token];
      if (raw == null || raw.trim().length === 0) {
        if (field.required) {
          if (!missingRequired.includes(field)) missingRequired.push(field);
          // The raw token is kept so the preview can still show, and point
          // at, the blank the user has to fill.
          segments.push({ text: match[0], state: 'missing', fieldKey: token });
        } else {
          if (!leftOpen.includes(token)) leftOpen.push(token);
          segments.push({ text: `____________ (${field.label} — left blank)`, state: 'left_blank', fieldKey: token });
        }
      } else {
        const result = normaliseFieldValue(field, raw);
        if (!result.ok) {
          fieldErrors[token] = result.error;
          segments.push({ text: match[0], state: 'missing', fieldKey: token });
        } else {
          if (!filled.includes(token)) filled.push(token);
          segments.push({ text: result.value, state: 'filled', fieldKey: token });
        }
      }
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), state: 'text' });

  const failed = mode === 'strict' && (missingRequired.length > 0 || Object.keys(fieldErrors).length > 0);

  return {
    text: failed ? '' : segments.map((s) => s.text).join(''),
    lines: splitSegmentsIntoLines(segments),
    filled,
    missingRequired,
    leftOpen,
    unknownPlaceholders,
    fieldErrors,
  };
}

/**
 * Split segments at newlines so the viewer can paginate by line while
 * keeping each run's provenance. A single segment can span several lines
 * (a multi-line address, or a long stretch of fixed prose), so this cannot
 * be done by splitting the joined string.
 */
function splitSegmentsIntoLines(segments: DocSegment[]): DocSegment[][] {
  const lines: DocSegment[][] = [[]];
  for (const segment of segments) {
    const pieces = segment.text.split('\n');
    for (const [index, piece] of pieces.entries()) {
      if (index > 0) lines.push([]);
      if (piece.length > 0) {
        lines[lines.length - 1]!.push({ ...segment, text: piece });
      }
    }
  }
  return lines;
}

/**
 * Fill a template body from field values.
 *
 * A thin wrapper over `annotateTemplate` — see there for the substitution
 * rules and the security note.
 */
export function fillTemplate(
  body: string,
  fields: TemplateField[],
  values: Record<string, string>,
  opts: { mode?: 'strict' | 'draft' } = {},
): FillResult {
  const { lines: _lines, ...result } = annotateTemplate(body, fields, values, opts);
  return result;
}

/**
 * Group fields for a multi-step wizard, purely from naming conventions
 * already used across the seed templates — no per-template UI config is
 * needed for a new template to render sensibly.
 */
export function groupFields(fields: TemplateField[]): Array<{ id: string; label: string; fields: TemplateField[] }> {
  const groups: Array<{ id: string; label: string; test: (f: TemplateField) => boolean }> = [
    { id: 'parties', label: 'Parties', test: (f) => /^(LANDLORD|TENANT|EMPLOYER|EMPLOYEE|PARTY|FIRST_PARTY|SECOND_PARTY|CONSULTANT|FOUNDER|COMPANY|CLIENT|VENDOR)/.test(f.key) },
    { id: 'money', label: 'Money', test: (f) => f.type === 'money' },
    { id: 'dates', label: 'Dates & term', test: (f) => f.type === 'date' || /(MONTHS|YEARS|DAYS|DURATION|NOTICE_PERIOD)$/.test(f.key) },
    { id: 'other', label: 'Anything else', test: () => true },
  ];
  const used = new Set<string>();
  const result = groups.map((g) => ({
    id: g.id,
    label: g.label,
    fields: fields.filter((f) => !used.has(f.key) && g.test(f) && (used.add(f.key), true)),
  }));
  return result.filter((g) => g.fields.length > 0);
}
