'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Modal behaviour every dialog on this site needs: Escape closes it, Tab
 * cycles inside it, and the page behind it stops scrolling.
 *
 * Shared rather than reimplemented per dialog — the focus trap in
 * particular is the part that silently goes missing, and a dialog you can
 * tab out of leaves a keyboard user typing into a page they cannot see
 * behind the backdrop.
 */
export function useModalDialog(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const root = ref.current;
      if (!root) return;
      const focusable = [...root.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
      )].filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) return;
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      // Only intercept at the two ends; everything between is the
      // browser's own tab order, which is already correct.
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Restores whatever was there before rather than clearing outright, so
    // two dialogs open in sequence cannot leave the page unscrollable.
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [ref, onClose]);
}
