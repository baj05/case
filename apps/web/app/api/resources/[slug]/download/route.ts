import { getResourceDetail, recordResourceEvent, databaseReady } from '@/lib/data';
import { buildDocx, bodyToBlocks } from '@/lib/docx';
import { downloadFilename, OFFICIAL_STATUS_META } from '@lexhall/core';
import type { OfficialStatus } from '@lexhall/core';

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

  const statusMeta = OFFICIAL_STATUS_META[resource.officialStatus as OfficialStatus];
  const generated = new Date().toISOString().slice(0, 10);

  const notice = [
    `${statusMeta?.label ?? resource.officialStatus}. ${statusMeta?.plain ?? ''}`,
    resource.disclaimer,
  ];

  const provenance = [
    `Source: CaseADVO resource library, /resources/${resource.slug}`,
    `Version ${resource.version}. Downloaded ${generated}.`,
    resource.stateName
      ? `Prepared for ${resource.stateName}. The position differs in other states.`
      : 'Requirements differ between states and change over time.',
    resource.links.length > 0
      ? `Related official sources: ${resource.links.map((l) => `${l.label} — ${l.url}`).join(' | ')}`
      : '',
  ].filter(Boolean);

  const filename = downloadFilename({
    title: resource.title,
    stateName: resource.stateName,
    version: resource.version,
    extension: format,
  });

  try {
    recordResourceEvent(slug, 'download');
  } catch {
    // Never let a counter failure block the download.
  }

  if (format === 'txt') {
    const text = [
      resource.title.toUpperCase(),
      '='.repeat(Math.min(72, resource.title.length)),
      '',
      ...notice.map((line) => wrap(line)),
      '',
      resource.template.beforeYouUse.length > 0 ? 'BEFORE YOU USE THIS' : '',
      ...resource.template.beforeYouUse.map((item, i) => wrap(`${i + 1}. ${item}`)),
      '',
      resource.template.jurisdictionNotes.length > 0 ? 'WHAT DIFFERS BY STATE' : '',
      ...resource.template.jurisdictionNotes.flatMap((note) => [`${note.heading}:`, wrap(note.body), '']),
      '-'.repeat(72),
      '',
      resource.template.body,
      '',
      '-'.repeat(72),
      ...provenance.map((line) => wrap(line)),
    ].filter((line) => line !== '').join('\n');

    return new Response(text, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  }

  const blocks = [
    ...(resource.template.beforeYouUse.length > 0
      ? [
        { text: 'Before you use this', style: 'Heading1' as const },
        ...resource.template.beforeYouUse.map((item, i) => ({ text: `${i + 1}. ${item}`, style: 'Body' as const })),
      ]
      : []),
    ...(resource.template.jurisdictionNotes.length > 0
      ? [
        { text: 'What differs by state', style: 'Heading1' as const },
        ...resource.template.jurisdictionNotes.flatMap((note) => [
          { text: note.heading, style: 'Heading2' as const },
          { text: note.body, style: 'Body' as const },
        ]),
      ]
      : []),
    { text: '', style: 'Body' as const },
    { text: 'The document', style: 'Heading1' as const },
    ...bodyToBlocks(resource.template.body),
  ];

  const file = buildDocx({
    title: resource.title,
    subtitle: `${statusMeta?.label ?? ''} · version ${resource.version} · downloaded ${generated}`,
    notice,
    blocks,
    provenance,
  });

  return new Response(new Uint8Array(file), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'content-disposition': `attachment; filename="${filename}"`,
      'content-length': String(file.length),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Hard-wraps a paragraph for the plain-text format at a readable measure. */
function wrap(text: string, width = 78): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) { lines.push(line.trim()); line = word; }
    else line = `${line} ${word}`;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.join('\n');
}
