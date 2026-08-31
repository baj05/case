import { getResourceDetail, recordResourceEvent, databaseReady } from '@/lib/data';
import { buildResourceDocument } from '@/lib/resource-document';

/**
 * Serves a CaseADVO-authored document as a real file.
 *
 * Only documents CaseADVO wrote are served from here. An official form is not
 * proxied through this endpoint under any circumstances: we do not hold a copy,
 * proxying one would present the authority's document as ours, and it would
 * serve a stale copy the moment the authority revised it. Requesting a download
 * for one returns 409 with the publisher's URL, which is the honest answer.
 *
 * Two formats. `.docx` is a real Word file assembled by lib/docx.ts, and `.txt`
 * is the source text — chosen because both are editable, and a template you
 * cannot edit is useless. There is deliberately no PDF: producing a decent one
 * needs a layout engine, and the user's own word processor will make a better
 * PDF from the .docx in one step than a hand-rolled generator would.
 *
 * Content-Disposition carries a readable filename (spec §82), and the response
 * is explicitly not cached by shared caches — the document carries a generation
 * date and its state notes may change.
 *
 * This always serves the BLANK template. A completed document — one filled
 * from user-supplied values — is only ever produced by POST /fill, which is a
 * distinct route for a reason documented there.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!databaseReady()) return new Response('The library is not available.', { status: 503 });

  const { slug } = await params;
  const format = (new URL(request.url).searchParams.get('format') ?? 'docx').toLowerCase();
  if (format !== 'docx' && format !== 'txt') {
    return new Response('Supported formats are docx and txt.', { status: 400 });
  }

  const resource = getResourceDetail(slug);
  if (!resource) return new Response('No such resource.', { status: 404 });
  if (resource.status !== 'PUBLISHED' && resource.status !== 'UNDER_REVIEW') {
    return new Response('That resource is not published.', { status: 404 });
  }

  if (!resource.template) {
    const where = resource.sourceUrl ?? resource.landingUrl;
    return new Response(
      [
        `“${resource.title}” is published by ${resource.authorityName ?? 'its publisher'}, not by CaseADVO.`,
        '',
        'We do not host a copy, so there is nothing for us to send you. That is deliberate: a mirrored',
        'government form is out of date the moment the authority revises it, and presenting their document',
        'as ours would misstate who stands behind it.',
        '',
        where ? `Get it from the publisher: ${where}` : 'No source URL is recorded for this resource.',
      ].join('\n'),
      { status: 409, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  try {
    recordResourceEvent(slug, 'download');
  } catch {
    // Never let a counter failure block the download.
  }

  const file = buildResourceDocument({ resource, body: resource.template.body, format });
  const headers = {
    'content-type': file.contentType,
    'content-disposition': `attachment; filename="${file.filename}"`,
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  };

  if (typeof file.body === 'string') return new Response(file.body, { headers });
  return new Response(file.body, { headers: { ...headers, 'content-length': String(file.body.length) } });
}
