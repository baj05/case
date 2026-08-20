import { NextResponse } from 'next/server';
import { recordResourceEvent, databaseReady } from '@/lib/data';

const ALLOWED = new Set(['view', 'preview', 'download', 'source_open', 'share']);

/**
 * Records that something happened to a resource. Aggregate only.
 *
 * No identifier, no session reference, no query, no referrer is stored — only a
 * counter against the resource and a timestamp. The documents in this library
 * disclose that somebody may be facing eviction, a criminal charge or domestic
 * violence, and that is not data to accumulate against a person (spec §59).
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!databaseReady()) return NextResponse.json({ ok: false }, { status: 503 });
  const { slug } = await params;
  const kind = new URL(request.url).searchParams.get('kind') ?? 'view';
  if (!ALLOWED.has(kind)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    recordResourceEvent(slug, kind as 'view');
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
