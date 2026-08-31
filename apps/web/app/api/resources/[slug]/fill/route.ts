import { getResourceDetail, recordDocumentFill, databaseReady } from '@/lib/data';
import { buildResourceDocument } from '@/lib/resource-document';
import { fillTemplate } from '@lexhall/core';

/**
 * Produces a completed document from a submitted form — the corporate
 * document builder's only write path.
 *
 * POST only, and deliberately not a Server Action. A file download needs a
 * real HTTP response with its own headers and body (Server Actions return a
 * value to React, not a Response the browser can save), and this needs its
 * own no-store/no-index headers regardless of what the surrounding page sets.
 *
 * POST rather than GET because the request carries names, addresses and
 * amounts: a GET would put them in the URL, and URLs land in access logs,
 * `Referer` headers, browser history and any intermediary cache along the
 * way. None of that is true of a POST body.
 *
 * The body is always rebuilt server-side from the field values and the
 * template stored in the database — never trusted from the client, and never
 * the client-rendered preview text. Nothing here is ever logged: not the
 * form body, not a field value, not the completed text. `recordDocumentFill`
 * stores counts only (see 018_document_builder.sql).
 */
export async function GET() {
  return new Response('Use POST.', { status: 405, headers: { allow: 'POST' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!databaseReady()) return new Response('The library is not available.', { status: 503 });

  const { slug } = await params;
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
    return new Response('Expected a form submission.', { status: 415 });
  }

  const resource = getResourceDetail(slug);
  if (!resource || !resource.template) return new Response('No such document.', { status: 404 });
  if (resource.status !== 'PUBLISHED' && resource.status !== 'UNDER_REVIEW') {
    return new Response('That resource is not published.', { status: 404 });
  }

  const form = await request.formData();
  const formatRaw = String(form.get('format') ?? 'docx').toLowerCase();
  const format = formatRaw === 'txt' ? 'txt' : 'docx';

  const fields = resource.template.fields;
  const values: Record<string, string> = {};
  for (const f of fields) {
    const raw = form.get(f.key);
    if (typeof raw === 'string') values[f.key] = raw;
  }

  const result = fillTemplate(resource.template.body, fields, values, { mode: 'strict' });
  const failed = result.missingRequired.length > 0 || Object.keys(result.fieldErrors).length > 0;

  try {
    recordDocumentFill({
      slug,
      templateVersion: resource.template.version,
      format,
      fieldCount: fields.length,
      filledCount: result.filled.length,
      leftOpenCount: result.leftOpen.length,
      mode: 'manual',
    });
  } catch {
    // Never let a counter failure block the response.
  }

  const noIndexHeaders = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex', 'x-content-type-options': 'nosniff' } as const;

  if (failed) {
    return Response.json(
      { ok: false, missingRequired: result.missingRequired.map((f) => f.key), fieldErrors: result.fieldErrors },
      { status: 422, headers: noIndexHeaders },
    );
  }

  const generated = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const filledNotice = `Completed from your entries on ${generated}. caseADVO has not reviewed these details.`;

  const file = buildResourceDocument({ resource, body: result.text, format, filledNotice });
  const headers = {
    ...noIndexHeaders,
    'content-type': file.contentType,
    'content-disposition': `attachment; filename="${file.filename}"`,
  };

  if (typeof file.body === 'string') return new Response(file.body, { headers });
  return new Response(file.body, { headers: { ...headers, 'content-length': String(file.body.length) } });
}
