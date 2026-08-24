'use client';

import { useRef, useState } from 'react';

const PRESET_COUNT = 10;
const PRESETS = Array.from({ length: PRESET_COUNT }, (_, i) => `/img/avatars/preset-${String(i + 1).padStart(2, '0')}.svg`);

// Uploaded photos are compressed client-side and stored as a data URL —
// this prototype has no blob/object storage. Capped small enough that a
// review row stays lightweight even with a photo attached.
const MAX_DIMENSION = 160;
const JPEG_QUALITY = 0.82;
const MAX_DATA_URL_BYTES = 120_000;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not process that image.')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        if (dataUrl.length > MAX_DATA_URL_BYTES) { reject(new Error('That photo is too large even after compression — try a simpler image.')); return; }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarPicker({ name, disabled }: { name: string; disabled?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await compressImage(file);
      setSelected(dataUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (disabled) return null;

  return (
    <div className="field">
      <input type="hidden" name={name} value={selected ?? ''} />
      <label className="label">Add a photo (optional)</label>
      <div className="row wrap gap-2" style={{ alignItems: 'center' }}>
        {PRESETS.map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => setSelected(selected === src ? null : src)}
            aria-pressed={selected === src}
            aria-label={`Use this preset avatar`}
            style={{
              width: 40, height: 40, borderRadius: '50%', padding: 0, border: selected === src ? '2px solid var(--action-orange)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', overflow: 'hidden', lineHeight: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" width={40} height={40} style={{ display: 'block', width: '100%', height: '100%' }} />
          </button>
        ))}
        <span style={{ width: 1, height: 32, background: 'var(--outline-variant)' }} aria-hidden="true" />
        {selected && selected.startsWith('data:') && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected} alt="Your uploaded photo" width={40} height={40} style={{ borderRadius: '50%', border: '2px solid var(--action-orange)' }} />
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Processing…' : 'Upload a photo'}
        </button>
        {selected && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Remove</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      </div>
      {error && <span className="error-text" role="alert"><span aria-hidden="true">!</span>{error}</span>}
      <p className="t-caption">Shown next to your review if you choose to appear by name. Never shown for anonymous reviews.</p>
    </div>
  );
}
