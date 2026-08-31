import { buildDocx, bodyToBlocks } from './docx.ts';
import { downloadFilename, OFFICIAL_STATUS_META } from '@lexhall/core';
import type { OfficialStatus } from '@lexhall/core';
import type { ResourceDetail } from '@lexhall/db';

/**
 * Assembles a resource document — the notice, before-you-use list,
 * jurisdiction notes and provenance footer — around a body of text.
 *
 * Shared by the blank download (GET, body = the raw template) and the filled
 * download (POST /fill, body = `fillTemplate(...).text`), so the two can
 * never drift into inconsistent notices or filenames. `resource.template`
 * must be non-null; callers already check this before rendering a preview or
 * fill form for the resource at all.
 */
export interface BuildResourceDocumentInput {
  resource: ResourceDetail;
  body: string;
  format: 'docx' | 'txt';
  /** Set only for a completed document — never present on the blank download. */
  filledNotice?: string;
}

export interface ResourceDocumentFile {
  /** `Uint8Array<ArrayBuffer>`, not the bare/generic `Uint8Array`, so this
   * stays directly assignable to `BodyInit` at the route handlers without a
   * cast — see `new Uint8Array(file)` below, which copies into a fresh,
   * concretely-typed buffer. */
  body: string | Uint8Array<ArrayBuffer>;
  contentType: string;
  filename: string;
}

export function buildResourceDocument(input: BuildResourceDocumentInput): ResourceDocumentFile {
  const { resource, body, format, filledNotice } = input;
  const statusMeta = OFFICIAL_STATUS_META[resource.officialStatus as OfficialStatus];
  const generated = new Date().toISOString().slice(0, 10);

  const notice = [
    `${statusMeta?.label ?? resource.officialStatus}. ${statusMeta?.plain ?? ''}`,
    resource.disclaimer,
    ...(filledNotice ? [filledNotice] : []),
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
    title: resource.title, stateName: resource.stateName, version: resource.version, extension: format,
  });

  const beforeYouUse = resource.template?.beforeYouUse ?? [];
  const jurisdictionNotes = resource.template?.jurisdictionNotes ?? [];

  if (format === 'txt') {
    const text = [
      resource.title.toUpperCase(),
      '='.repeat(Math.min(72, resource.title.length)),
      '',
      ...notice.map((line) => wrap(line)),
      '',
      beforeYouUse.length > 0 ? 'BEFORE YOU USE THIS' : '',
      ...beforeYouUse.map((item, i) => wrap(`${i + 1}. ${item}`)),
      '',
      jurisdictionNotes.length > 0 ? 'WHAT DIFFERS BY STATE' : '',
      ...jurisdictionNotes.flatMap((note) => [`${note.heading}:`, wrap(note.body), '']),
      '-'.repeat(72),
      '',
      body,
      '',
      '-'.repeat(72),
      ...provenance.map((line) => wrap(line)),
    ].filter((line) => line !== '').join('\n');

    return { body: text, contentType: 'text/plain; charset=utf-8', filename };
  }

  const blocks = [
    ...(beforeYouUse.length > 0
      ? [
        { text: 'Before you use this', style: 'Heading1' as const },
        ...beforeYouUse.map((item, i) => ({ text: `${i + 1}. ${item}`, style: 'Body' as const })),
      ]
      : []),
    ...(jurisdictionNotes.length > 0
      ? [
        { text: 'What differs by state', style: 'Heading1' as const },
        ...jurisdictionNotes.flatMap((note) => [
          { text: note.heading, style: 'Heading2' as const },
          { text: note.body, style: 'Body' as const },
        ]),
      ]
      : []),
    { text: '', style: 'Body' as const },
    { text: 'The document', style: 'Heading1' as const },
    ...bodyToBlocks(body),
  ];

  const file = buildDocx({
    title: resource.title,
    subtitle: `${statusMeta?.label ?? ''} · version ${resource.version} · downloaded ${generated}`,
    notice,
    blocks,
    provenance,
  });

  return {
    body: new Uint8Array(file),
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    filename,
  };
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
