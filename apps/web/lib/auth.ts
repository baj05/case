import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser, type AuthUser, type PlatformRole } from '@lexhall/db';

const SESSION_COOKIE = 'lexhall_session';

/** The signed-in user for this request, or null. Never throws. */
export async function currentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getSessionUser(sessionId);
}

export async function setSessionCookie(sessionId: string, expiresAt: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function sessionCookieValue(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

/**
 * Route guard for Server Components. Redirects to /login (preserving the
 * intended destination) when signed out, and to / with no explanation
 * leaked when signed in with the wrong role — a wrong-role user should not
 * learn a page exists at all.
 */
export async function requireUser(role?: PlatformRole, redirectTo?: string): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) {
    const next = redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : '';
    redirect(`/login${next}`);
  }
  if (role && user.platformRole !== role && user.platformRole !== 'platform_admin') {
    redirect('/');
  }
  return user;
}
