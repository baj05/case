/**
 * Photograph handling.
 *
 * Official portraits published by the regulator are downloaded and served from
 * our own origin rather than hotlinked. Two reasons: hotlinking leaks every
 * visitor's IP to the Bar Council's CDN, and it makes our pages depend on
 * their uptime. The original URL is retained as provenance.
 */
import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DEFAULT_POLICY } from './http.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PHOTO_DIR = join(REPO_ROOT, 'apps', 'web', 'public', 'img', 'advocates');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 3_000_000;

export interface StoredPhoto { publicPath: string; sourceUrl: string; bytes: number }

export async function downloadPhoto(sourceUrl: string): Promise<StoredPhoto | null> {
  try {
    // Content-addressed filename: stable across runs, no collisions, and a
    // changed portrait naturally becomes a new file.
    const ext = /\.(jpe?g|png|webp)(\?|$)/i.exec(sourceUrl)?.[1]?.toLowerCase() ?? 'jpg';
    const hash = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 16);
    const filename = `${hash}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const dest = join(PHOTO_DIR, filename);
    const publicPath = `/img/advocates/${filename}`;

    await mkdir(PHOTO_DIR, { recursive: true });
    try {
      await access(dest);
      return { publicPath, sourceUrl, bytes: 0 }; // already cached
    } catch { /* not cached, continue */ }

    const res = await fetch(sourceUrl, {
      headers: { 'user-agent': DEFAULT_POLICY.userAgent },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
    if (!ALLOWED.has(contentType)) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 500 || buffer.byteLength > MAX_BYTES) return null;

    await writeFile(dest, buffer);
    return { publicPath, sourceUrl, bytes: buffer.byteLength };
  } catch {
    return null;
  }
}
