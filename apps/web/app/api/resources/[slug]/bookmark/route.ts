import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { toggleResourceBookmark, databaseReady } from '@/lib/data';

/**
 * Saves or unsaves a resource.
 *
 * There is no authentication in this build, so the list is keyed to an opaque
 * random reference in a first-party cookie. That reference identifies a browser,
 * not a person: it is generated here, never derived from anything about the user,
 * and is not joined to any other table. The UI says the list is device-local
 * rather than implying an account exists.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!databaseReady()) return NextResponse.json({ saved: false }, { status: 503 });
  const { slug } = await params;
  const jar = await cookies();

  let ref = jar.get('lx_ref')?.value;
  const isNew = !ref;
  if (!ref) ref = randomUUID();

  const result = toggleResourceBookmark(ref, slug);
  const response = NextResponse.json(result);
  if (isNew) {
    response.cookies.set('lx_ref', ref, {
      httpOnly: true, sameSite: 'lax', path: '/',
      maxAge: 60 * 60 * 24 * 180, secure: process.env.NODE_ENV === 'production',
    });
  }
  return response;
}
