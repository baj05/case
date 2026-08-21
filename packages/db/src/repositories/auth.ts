/**
 * Authentication.
 *
 * RT-010, the top release blocker (docs/RECTIFICATION_TASKS.md,
 * docs/IMPLEMENTATION_ROADMAP.md P0#1) — nothing role-scoped (dashboard,
 * admin, reviews, referrals) can exist without it.
 *
 * Password hashing uses Node's built-in scrypt (no native dependency, no
 * added package — consistent with the zero-infra posture the whole platform
 * is built on). Sessions are opaque random ids in the `session` table, not
 * JWTs, so a session can be revoked by deleting a row.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, now, transaction } from '../client.ts';

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_DAYS = 30;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export type PlatformRole = 'public' | 'professional' | 'platform_admin' | 'platform_moderator';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  platformRole: PlatformRole;
  emailVerifiedAt: string | null;
}

/** `scrypt:<salt-hex>:<hash-hex>` — self-describing so the KDF can change later. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex ?? '', 'hex');
  const expected = Buffer.from(hashHex ?? '', 'hex');
  const actual = scryptSync(password, salt, expected.length);
  // timingSafeEqual throws on length mismatch rather than returning false.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export type AuthErrorCode = 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'NOT_FOUND';

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode) {
    super(code);
    this.code = code;
  }
}

export function createUser(input: {
  email: string; fullName: string; password: string; platformRole?: PlatformRole;
}): AuthUser {
  const email = input.email.trim().toLowerCase();
  const h = db();
  const existing = h.prepare(`SELECT id FROM app_user WHERE email = ?`).get(email);
  if (existing) throw new AuthError('EMAIL_TAKEN');

  const ts = now();
  const passwordHash = hashPassword(input.password);
  const result = h.prepare(
    `INSERT INTO app_user (email, full_name, password_hash, platform_role, created_at, updated_at)
     VALUES (?,?,?,?,?,?)`,
  ).run(email, input.fullName.trim(), passwordHash, input.platformRole ?? 'public', ts, ts);

  return {
    id: Number(result.lastInsertRowid), email, fullName: input.fullName.trim(),
    platformRole: input.platformRole ?? 'public', emailVerifiedAt: null,
  };
}

/**
 * Verify email + password. Locks the account for LOCKOUT_MINUTES after
 * MAX_FAILED_ATTEMPTS consecutive failures, using the failed_login_count /
 * locked_until columns the schema already carries for exactly this purpose.
 */
export function authenticate(email: string, password: string): AuthUser {
  return transaction(() => {
    const h = db();
    const row = h.prepare(
      `SELECT id, email, full_name AS fullName, password_hash AS passwordHash,
              platform_role AS platformRole, email_verified_at AS emailVerifiedAt,
              failed_login_count AS failedLoginCount, locked_until AS lockedUntil
         FROM app_user WHERE email = ? AND deleted_at IS NULL`,
    ).get(email.trim().toLowerCase()) as {
      id: number; email: string; fullName: string; passwordHash: string | null;
      platformRole: PlatformRole; emailVerifiedAt: string | null;
      failedLoginCount: number; lockedUntil: string | null;
    } | undefined;

    if (!row || !row.passwordHash) throw new AuthError('INVALID_CREDENTIALS');
    if (row.lockedUntil && row.lockedUntil > now()) throw new AuthError('ACCOUNT_LOCKED');

    const ok = verifyPasswordHash(password, row.passwordHash);
    const ts = now();
    if (!ok) {
      const failed = row.failedLoginCount + 1;
      const lockUntil = failed >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z')
        : null;
      h.prepare(`UPDATE app_user SET failed_login_count = ?, locked_until = ?, updated_at = ? WHERE id = ?`)
        .run(failed, lockUntil, ts, row.id);
      throw new AuthError('INVALID_CREDENTIALS');
    }

    h.prepare(`UPDATE app_user SET failed_login_count = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?`)
      .run(ts, ts, row.id);

    return {
      id: row.id, email: row.email, fullName: row.fullName,
      platformRole: row.platformRole, emailVerifiedAt: row.emailVerifiedAt,
    };
  });
}

export function createSession(userId: number, meta?: { ipAddress?: string; userAgent?: string }): { id: string; expiresAt: string } {
  const id = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  db().prepare(
    `INSERT INTO session (id, user_id, expires_at, ip_address, user_agent, created_at) VALUES (?,?,?,?,?,?)`,
  ).run(id, userId, expiresAt, meta?.ipAddress ?? null, meta?.userAgent ?? null, now());
  return { id, expiresAt };
}

export function getSessionUser(sessionId: string): AuthUser | null {
  const row = db().prepare(
    `SELECT u.id, u.email, u.full_name AS fullName, u.platform_role AS platformRole,
            u.email_verified_at AS emailVerifiedAt
       FROM session s JOIN app_user u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > ? AND u.deleted_at IS NULL`,
  ).get(sessionId, now()) as AuthUser | undefined;
  return row ?? null;
}

export function deleteSession(sessionId: string): void {
  db().prepare(`DELETE FROM session WHERE id = ?`).run(sessionId);
}

/** Housekeeping — safe to run on a schedule; not load-bearing for correctness. */
export function deleteExpiredSessions(): number {
  const result = db().prepare(`DELETE FROM session WHERE expires_at <= ?`).run(now());
  return Number(result.changes);
}
