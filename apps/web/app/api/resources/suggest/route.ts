import { NextResponse } from 'next/server';
import { suggestResources, databaseReady } from '@/lib/data';

/**
 * Autocomplete over the resource library.
 *
 * Read-only, no personal data, and it must degrade silently — a failing
 * suggestion request may never stop somebody submitting their search.
 */
export async function GET(request: Request) {
  if (!databaseReady()) return NextResponse.json({ items: [] });
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 120);
  try {
    return NextResponse.json({ items: suggestResources(q, 8) }, {
      headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
