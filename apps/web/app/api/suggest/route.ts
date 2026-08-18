import { NextResponse } from 'next/server';
import { runSuggest, databaseReady } from '@/lib/data';

/**
 * Autocomplete endpoint.
 * Read-only, no personal data, cheap enough to cache briefly.
 */
export async function GET(request: Request) {
  if (!databaseReady()) return NextResponse.json({ items: [] });

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').slice(0, 120);

  try {
    const items = runSuggest(q, 8);
    return NextResponse.json({ items }, {
      headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch {
    // Autocomplete must degrade silently; it should never block the user from
    // submitting their search.
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
