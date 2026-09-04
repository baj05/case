'use client';

import { useEffect, useState } from 'react';

/**
 * Underline section nav for the profile page — flat anchor links, active
 * one tracked by scroll position, not a hardcoded "first tab" state.
 * Falls back to plain, equally-styled anchor links with no JS: every href
 * is a real `#id` on the page, so navigation works with JavaScript off,
 * only the live underline does not.
 *
 * Deliberately NOT an IntersectionObserver with a narrow "active band":
 * this page has real content (Courts, Enrolment, Address) between the
 * tracked ids, so a narrow band leaves gaps where nothing intersects and
 * the underline freezes on a stale tab while scrolling through them.
 * Instead this uses the standard scrollspy rule — the active tab is
 * whichever tracked section's top has most recently scrolled past a fixed
 * reference line — which always has an answer once the reference line has
 * passed at least one section.
 */
export function ProfileTabs({ tabs }: { tabs: Array<{ href: string; label: string; trackActive?: boolean }> }) {
  const [active, setActive] = useState<string>(tabs[0]?.href ?? '');

  useEffect(() => {
    // A target inside the sticky sidebar (trackActive: false — e.g.
    // #consultation) stays pinned near the reference line for the rest of
    // the scroll once it first reaches its sticky position, which would
    // otherwise permanently win the "largest top <= reference line" check
    // below and freeze every later section as "active: Consultation".
    // It's still a real, working link — just excluded from the scan that
    // decides which underline lights up.
    const ids = tabs.filter((t) => t.trackActive !== false).map((t) => t.href.slice(1));
    const REFERENCE_LINE = 120; // px from viewport top a section must cross to count as "current"
    let raf = 0;

    function recompute() {
      raf = 0;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= REFERENCE_LINE) current = id;
      }
      setActive(`#${current}`);
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(recompute);
    }

    recompute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [tabs]);

  return (
    <nav aria-label="Profile sections" className="profile-tabs">
      {tabs.map((t) => (
        <a key={t.href} href={t.href} className="profile-tab" aria-current={active === t.href ? 'true' : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
