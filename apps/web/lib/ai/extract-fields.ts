import 'server-only';
import { normaliseFieldValue, sanitiseValue } from '@lexhall/core';
import type { TemplateField } from '@lexhall/core';

/**
 * Extract candidate field values from text the user wrote.
 *
 * See ADR-013 and COMPLIANCE_MATRIX C-17a. The rule this file exists to
 * enforce: a language model may READ values out of the user's own sentence;
 * it may never WRITE text that reaches a document.
 *
 * Three things make that structural rather than a promise:
 *
 *   1. The schema is generated from the template's own declared fields —
 *      `additionalProperties: false`, and no property that accepts prose.
 *      There is no channel for clause text to come back at all.
 *   2. Every returned value goes through `normaliseFieldValue`, the same
 *      validation a hand-typed value passes. A model that returns "about
 *      twenty five thousand" for a money field fails exactly as a user
 *      typing that would, and is marked low-confidence rather than used.
 *   3. Nothing here writes anything. The caller renders proposals; only
 *      what the user accepts becomes form state.
 */

export interface ExtractionItem {
  key: string;
  /** Already sanitised and normalised — safe to place in form state. */
  value: string;
  confidence: 'high' | 'low';
  /** The span of the user's text this came from, quoted back for checking. */
  evidence: string;
  /** Set when normalisation rejected the model's value. */
  problem?: string;
}

export interface ExtractionResult {
  items: ExtractionItem[];
  /** Field keys the model did not fill. Surfaced so the user knows what is left. */
  unfilled: string[];
  model: string;
  latencyMs: number;
  outcome: 'ok' | 'timeout' | 'error' | 'empty' | 'disabled';
}

const MODEL = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS = 20_000;
const MAX_PROSE = 6_000;

/**
 * The JSON schema the model must answer in, built from the declared fields.
 *
 * Every property is `{ value, evidence }` and nothing else. There is
 * deliberately no `notes`, no `clause`, no `suggestion` — a property that
 * accepts free prose would be the one hole through which model-authored
 * text could reach a document.
 */
export function buildExtractionSchema(fields: TemplateField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const f of fields) {
    properties[f.key] = {
      type: 'object',
      additionalProperties: false,
      properties: {
        value: { type: 'string', description: `Value for: ${f.label}${f.hint ? ` (${f.hint})` : ''}` },
        evidence: { type: 'string', description: 'The exact words from the input this was taken from.' },
      },
      required: ['value', 'evidence'],
    };
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties,
  };
}

function buildPrompt(fields: TemplateField[], prose: string): string {
  const list = fields.map((f) => {
    const type = f.type ?? 'text';
    return `- ${f.key} (${f.label}) — type: ${type}${f.hint ? `; note: ${f.hint}` : ''}`;
  }).join('\n');

  return [
    'You are extracting values for the fields of a legal document template from a description a person wrote.',
    '',
    'Rules:',
    '- Only extract values that are actually stated or unambiguously implied in the description.',
    '- Omit any field the description does not cover. Do NOT guess, and do NOT use a placeholder.',
    '- For a money field return digits only, e.g. 25000. For a date return ISO format, e.g. 2026-03-05.',
    '  For a number field return digits only.',
    '- `evidence` must be a verbatim span copied from the description.',
    '- Never write clause text, advice, or any wording of your own into a value.',
    '',
    'Fields:',
    list,
    '',
    'Description:',
    '---',
    prose,
    '---',
  ].join('\n');
}

/**
 * Call the model, then distrust everything it said.
 *
 * Unknown keys are dropped, values are sanitised and normalised, and
 * anything still carrying placeholder syntax is discarded outright.
 */
export async function extractFieldValues(input: {
  fields: TemplateField[];
  prose: string;
}): Promise<ExtractionResult> {
  const started = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fields = input.fields;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const prose = input.prose.slice(0, MAX_PROSE);

  const empty = (outcome: ExtractionResult['outcome']): ExtractionResult => ({
    items: [], unfilled: fields.map((f) => f.key), model: MODEL,
    latencyMs: Date.now() - started, outcome,
  });

  if (!apiKey) return empty('disabled');
  if (prose.trim().length < 20) return empty('empty');

  let raw: Record<string, { value?: unknown; evidence?: unknown }>;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          tools: [{
            name: 'record_fields',
            description: 'Record the field values found in the description.',
            input_schema: buildExtractionSchema(fields),
          }],
          // Force the tool, so the reply is structured data and never prose.
          tool_choice: { type: 'tool', name: 'record_fields' },
          messages: [{ role: 'user', content: buildPrompt(fields, prose) }],
        }),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return empty('error');
    const body = await response.json() as { content?: Array<{ type: string; input?: unknown }> };
    const toolUse = body.content?.find((c) => c.type === 'tool_use');
    if (!toolUse?.input || typeof toolUse.input !== 'object') return empty('empty');
    raw = toolUse.input as Record<string, { value?: unknown; evidence?: unknown }>;
  } catch (error) {
    return empty((error as Error).name === 'AbortError' ? 'timeout' : 'error');
  }

  const items: ExtractionItem[] = [];
  for (const [key, proposal] of Object.entries(raw)) {
    // additionalProperties:false is the model's instruction, not a guarantee.
    const field = byKey.get(key);
    if (!field) continue;
    if (!proposal || typeof proposal.value !== 'string') continue;

    const candidate = proposal.value.trim();
    if (candidate.length === 0) continue;
    // A value shaped like a placeholder is discarded, not sanitised into
    // something plausible — a model returning template syntax means the
    // extraction went wrong, and a silently repaired value hides that.
    if (candidate.includes('[[') || candidate.includes(']]')) continue;

    const evidence = typeof proposal.evidence === 'string' ? sanitiseValue(proposal.evidence, 240) : '';

    const normalised = normaliseFieldValue(field, candidate);
    if (!normalised.ok) {
      // Kept, but low-confidence and unchecked: the user may well be able to
      // correct it faster than typing from scratch, and hiding it would hide
      // that the model found something for this field at all.
      items.push({ key, value: sanitiseValue(candidate, field.maxLength ?? 500), confidence: 'low', evidence, problem: normalised.error });
      continue;
    }

    // Store the RAW sanitised value, not the normalised display form: the
    // form field holds what a user would type ("25000"), and fillTemplate
    // formats it at substitution time. Putting "25,000" in the input would
    // then be re-parsed on submit.
    items.push({
      key,
      value: sanitiseValue(candidate, field.maxLength ?? 500),
      confidence: evidence.length > 0 ? 'high' : 'low',
      evidence,
    });
  }

  return {
    items,
    unfilled: fields.filter((f) => !items.some((i) => i.key === f.key)).map((f) => f.key),
    model: MODEL,
    latencyMs: Date.now() - started,
    outcome: items.length > 0 ? 'ok' : 'empty',
  };
}
