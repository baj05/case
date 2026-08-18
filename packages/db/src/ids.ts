/**
 * Human-quotable reference codes.
 *
 * Used for consultation requests, matters and referrals so a person can read
 * one over the phone. Crockford's base32 alphabet drops I/L/O/U, which removes
 * the 1/I and 0/O confusions and avoids accidental profanity.
 */
import { randomInt } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function referenceCode(prefix: string, length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return `${prefix}-${out}`;
}

/** URL slug. Collisions are resolved by the caller appending a discriminator. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Deterministic content hash for ingestion change detection. */
export async function contentHash(value: unknown): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

/** JSON.stringify with sorted keys, so key order never changes the hash. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}
