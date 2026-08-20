'use client';

import { useEffect, useState } from 'react';

/**
 * Save, share and download-tracking for a resource.
 *
 * "Saved" is device-local. There is no authentication in this build, so a
 * bookmark is keyed to an opaque reference in a cookie, and the UI says so
 * rather than implying an account exists. Pretending otherwise would lose
 * someone's saved eviction notice on their next device.
 *
 * Nothing here sends the document, the query or any identifier anywhere. The
 * only thing recorded is that a preview or download of this slug happened.
 */
export function ResourceActions({
  slug, title, hasPreview, sourceUrl, initiallySaved,
}: {
  slug: string;
  title: string;
  hasPreview: boolean;
  sourceUrl: string | null;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  async function toggleSave() {
    setBusy(true);
    try {
      const response = await fetch(`/api/resources/${slug}/bookmark`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json() as { saved: boolean };
        setSaved(data.saved);
      }
    } catch {
      // Offline or blocked: leave the button as it was rather than lying about it.
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = window.location.href;
    if (canShare) {
      try {
        await navigator.share({ title, url });
        setShared('shared');
        void fetch(`/api/resources/${slug}/event?kind=share`, { method: 'POST' });
        return;
      } catch {
        // The user dismissed the sheet. Fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared('copied');
      setTimeout(() => setShared('idle'), 2400);
      void fetch(`/api/resources/${slug}/event?kind=share`, { method: 'POST' });
    } catch {
      setShared('idle');
    }
  }

  return (
    <div className="stack gap-2">
      <div className="row wrap gap-2">
        {hasPreview ? (
          <>
            <a
              className="btn btn-primary"
              href={`/api/resources/${slug}/download?format=docx`}
              onClick={() => void fetch(`/api/resources/${slug}/event?kind=download`, { method: 'POST' })}
            >
              Download as .docx
            </a>
            <a
              className="btn btn-secondary"
              href={`/api/resources/${slug}/download?format=txt`}
              onClick={() => void fetch(`/api/resources/${slug}/event?kind=download`, { method: 'POST' })}
            >
              Plain text
            </a>
          </>
        ) : sourceUrl ? (
          <a
            className="btn btn-primary"
            href={sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => void fetch(`/api/resources/${slug}/event?kind=source_open`, { method: 'POST' })}
          >
            Open at the official source ↗
          </a>
        ) : null}

        <button
          type="button"
          className={saved ? 'btn btn-navy' : 'btn btn-secondary'}
          onClick={toggleSave}
          data-loading={busy ? 'true' : undefined}
          aria-pressed={saved}
        >
          {saved ? 'Saved' : 'Save'}
        </button>

        <button type="button" className="btn btn-ghost" onClick={share}>
          {shared === 'copied' ? 'Link copied' : shared === 'shared' ? 'Shared' : 'Share'}
        </button>
      </div>

      <p className="t-caption">
        {saved
          ? 'Saved on this device only — there are no accounts in this build, so the list lives in a cookie.'
          : 'Saving keeps this in a list on this device. No account, and nothing about what you saved leaves the browser.'}
      </p>
    </div>
  );
}
