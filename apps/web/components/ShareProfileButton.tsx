'use client';

import { useState } from 'react';

/** Native share sheet when available, clipboard-copy fallback otherwise —
 * standard web pattern, not tied to any one product's branding. */
export function ShareProfileButton({ name, path }: { name: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); } catch { /* user cancelled the share sheet */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable; nothing to fall back to */ }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={handleShare}>
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}
