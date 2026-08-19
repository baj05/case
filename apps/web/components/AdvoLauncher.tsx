'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdvoChat } from './AdvoChat';

/**
 * Site-wide Advo AI launcher.
 *
 * The chat bot is reachable from every page, not only its own — which is the
 * point of a bot. Mounted lazily: the chat component (and its network calls)
 * only load once someone opens it, so the launcher costs nothing on pages
 * nobody uses it from.
 */
export function AdvoLauncher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The dedicated page already contains the full experience; a floating copy
  // there would be two chats competing.
  const suppressed = pathname === '/advo-ai';

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
      // A power-user shortcut, deliberately not a single letter so it cannot
      // fire while someone is typing in a field.
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((v) => !v); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (suppressed) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          className="advo-fab"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="advo-panel"
        >
          <span className="advo-fab-mark" aria-hidden="true">◆</span>
          <span className="advo-fab-text">
            <span className="advo-fab-title">Ask Advo AI</span>
            <span className="advo-fab-sub">Describe your matter</span>
          </span>
        </button>
      )}

      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="advo-panel" id="advo-panel" role="dialog" aria-modal="true" aria-label="Advo AI">
            <div className="drawer-head">
              <span className="row gap-2">
                <span className="advo-mark" aria-hidden="true">◆</span>
                <span className="stack" style={{ gap: 0 }}>
                  <strong>Advo AI</strong>
                  <span className="t-caption">Deterministic filter · not a lawyer</span>
                </span>
              </span>
              <span className="row gap-2">
                <Link href="/advo-ai" className="btn btn-ghost btn-sm hide-mobile">Open full page</Link>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
              </span>
            </div>
            <div className="advo-panel-body">
              <AdvoChat compact />
            </div>
          </div>
        </>
      )}
    </>
  );
}
