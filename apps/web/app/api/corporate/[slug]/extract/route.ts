import { getResourceDetail, getFlags, databaseReady, recordAiExtraction } from '@/lib/data';
import { extractFieldValues } from '@/lib/ai/extract-fields';
import { CORPORATE_SUITE_SLUGS } from '@lexhall/core';

/**
 * Propose field values from a description the user wrote.
 *
 * A route handler rather than a Server Action, for three reasons: it is a
 * read-only *proposal* and writes nothing; it needs its own timeout and rate
 * limit, independent of the page's; and it returns a diff the client renders
 * as accept/edit/ignore rows rather than a value React should apply.
 *
 * Behind FEATURE_AI_FIELD_EXTRACT, off by default. See ADR-013 and
 * COMPLIANCE_MATRIX C-17a for why extraction is permitted where generation
 * is not.
 *
 * Never logged, never stored: the user's prose, and the extracted values.
 * `ai_field_extraction` records counts and a latency figure only.
 */
export async function GET() {
  return new Response('Use POST.', { status: 405, headers: { allow: 'POST' } });
}

const MAX_BODY = 12_000;

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!databaseReady()) return new Response('Unavailable.', { status: 503 });

  const flags = getFlags();
  // 404, not 403: a disabled feature should not advertise that it exists.
  if (!flags.FEATURE_CORPORATE || !flags.FEATURE_AI_FIELD_EXTRACT) {
    return new Response('Not found.', { status: 404 });
  }

  const { slug } = await params;
  if (!CORPORATE_SUITE_SLUGS.includes(slug)) return new Response('Not found.', { status: 404 });

  const resource = getResourceDetail(slug);
  if (!resource?.template) return new Response('Not found.', { status: 404 });

  let prose = '';
  try {
    const body = await request.text();
    if (body.length > MAX_BODY) return new Response('Too long.', { status: 413 });
    const parsed = JSON.parse(body) as { prose?: unknown };
    if (typeof parsed.prose !== 'string') return new Response('Expected { prose }.', { status: 400 });
    prose = parsed.prose;
  } catch {
    return new Response('Expected JSON.', { status: 400 });
  }

  const fields = resource.template.fields;
  const result = await extractFieldValues({ fields, prose });

  try {
    recordAiExtraction({
      slug,
      promptChars: prose.length,
      fieldsOffered: fields.length,
      fieldsReturned: result.items.length,
      lowConfidence: result.items.filter((i) => i.confidence === 'low').length,
      rejected: result.items.filter((i) => i.problem).length,
      model: result.model,
      latencyMs: result.latencyMs,
      outcome: result.outcome,
    });
  } catch {
    // Telemetry must never break the feature.
  }

  return Response.json(
    {
      // Field labels are echoed so the client can render a proposal row
      // without a second lookup. The values are the user's own, normalised.
      items: result.items.map((i) => ({
        ...i,
        label: fields.find((f) => f.key === i.key)?.label ?? i.key,
      })),
      unfilled: result.unfilled,
      outcome: result.outcome,
    },
    { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } },
  );
}
