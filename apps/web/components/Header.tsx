'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { NAV, type NavItem } from '@/lib/nav';
import { formatNumber } from '@/lib/format';

/** Pointer-driven open/close is debounced so a diagonal mouse path from the
 * trigger down into the panel doesn't flicker the menu shut mid-travel. */
const CLOSE_DELAY_MS = 140;

export function Header({ totalProfessionals }: { totalProfessionals?: number }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Which mega-menu is open (label), or null. */
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  /** Which accordion is expanded in the mobile drawer. */
  const [openSection, setOpenSection] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenMenu(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close everything on navigation, and lock scroll while the drawer is open.
  useEffect(() => { setMenuOpen(false); setOpenMenu(null); setOpenSection(null); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Escape closes the drawer or the open panel; a pointer press outside the
  // nav closes the panel (a panel that only closes on hover-out is a trap for
  // anyone navigating by keyboard or touch).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      setOpenMenu((current) => {
        if (current) {
          // Return focus to the trigger the panel belongs to.
          navRef.current?.querySelector<HTMLElement>(`[data-menu-trigger="${current}"]`)?.focus();
        }
        return null;
      });
    }
    function onPointerDown(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  const isCurrent = (href: string) => {
    const path = href.split('?')[0] ?? href;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="container row" style={{ justifyContent: 'space-between', gap: 16 }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Link href="/" className="wordmark" aria-label={`${BRAND.name} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="" width={32} height={32} className="wordmark-logo" aria-hidden="true" />
            <span>{BRAND.wordmark}</span>
          </Link>
          {typeof totalProfessionals === 'number' && (
            <Link href="/search" className="header-count-badge hide-mobile" title="Total professionals currently listed">
              {formatNumber(totalProfessionals)} advocates listed
            </Link>
          )}
        </div>

        <div ref={navRef} className="nav-shell hide-mobile" onMouseLeave={scheduleClose} onMouseEnter={cancelClose}>
          <nav className="nav-pill" aria-label="Main">
            {NAV.map((item) => (
              <NavTrigger
                key={item.href}
                item={item}
                open={openMenu === item.label}
                current={isCurrent(item.href)}
                onOpen={() => { cancelClose(); setOpenMenu(item.label); }}
                onToggle={() => setOpenMenu((v) => (v === item.label ? null : item.label))}
              />
            ))}
          </nav>

          {NAV.filter((i) => i.columns).map((item) => (
            <div
              key={item.href}
              id={`megamenu-${slug(item.label)}`}
              className="megamenu"
              data-open={openMenu === item.label}
              hidden={openMenu !== item.label}
              onMouseEnter={cancelClose}
            >
              <div className="megamenu-inner">
                <div className="megamenu-cols" data-count={item.columns?.length ?? 0}>
                  {item.columns?.map((col) => (
                    <div key={col.heading} className="megamenu-col">
                      <p className="megamenu-heading">{col.heading}</p>
                      <ul className="megamenu-list">
                        {col.links.map((l) => (
                          <li key={l.href + l.label}>
                            <Link href={l.href} className="megamenu-link">
                              <span className="megamenu-link-label">{l.label}</span>
                              {l.hint && <span className="megamenu-link-hint">{l.hint}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {col.footer && (
                        <Link href={col.footer.href} className="megamenu-more">
                          {col.footer.label} <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
                {item.feature && (
                  <Link href={item.feature.href} className="megamenu-feature">
                    <span className="megamenu-feature-label">{item.feature.label}</span>
                    <span className="megamenu-feature-body">{item.feature.body}</span>
                    <span className="megamenu-feature-cta">{item.feature.cta} <span aria-hidden="true">→</span></span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="row gap-2">
          <Link href="/for-professionals" className="btn btn-navy btn-pill btn-sm hide-mobile">Claim your profile</Link>
          <button
            type="button"
            className="btn btn-secondary btn-pill btn-sm hide-desktop"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="drawer-backdrop hide-desktop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="drawer drawer-sheet hide-desktop" id="mobile-nav" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="drawer-head">
              <span className="t-title">Menu</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)}>Close</button>
            </div>
            <div className="drawer-body stack gap-1">
              {NAV.map((item) => (
                item.columns ? (
                  <div key={item.href} className="stack" style={{ gap: 0 }}>
                    <button
                      type="button"
                      className="filter-option drawer-accordion"
                      aria-expanded={openSection === item.label}
                      onClick={() => setOpenSection((v) => (v === item.label ? null : item.label))}
                    >
                      <span>{item.label}</span>
                      <span className="drawer-chevron" data-open={openSection === item.label} aria-hidden="true">⌄</span>
                    </button>
                    {openSection === item.label && (
                      <div className="drawer-sub stack gap-1">
                        <Link href={item.href} className="drawer-sub-link" style={{ fontWeight: 600 }}>
                          All {item.label.toLowerCase()}
                        </Link>
                        {item.columns.map((col) => (
                          <div key={col.heading} className="stack" style={{ gap: 0 }}>
                            <p className="drawer-sub-heading">{col.heading}</p>
                            {col.links.map((l) => (
                              <Link key={l.href + l.label} href={l.href} className="drawer-sub-link">{l.label}</Link>
                            ))}
                            {col.footer && (
                              <Link href={col.footer.href} className="drawer-sub-link">{col.footer.label} →</Link>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="filter-option"
                    aria-current={isCurrent(item.href) ? 'true' : undefined}
                    style={{ fontSize: '1rem', minHeight: 48 }}
                  >
                    {item.label}
                  </Link>
                )
              ))}
              <hr className="divider" style={{ margin: '10px 0' }} />
              <Link href="/legal/data-request" className="filter-option" style={{ minHeight: 48 }}>Correct or remove my listing</Link>
              <Link href="/admin" className="filter-option" style={{ minHeight: 48 }}>Platform admin</Link>
            </div>
            <div className="drawer-foot">
              <Link href="/for-professionals" className="btn btn-primary btn-block">Claim your profile</Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * A top-level nav item. Items with a panel stay real links (so the section
 * landing page is always reachable, and middle-click/⌘-click still work);
 * the panel opens on hover and on focus, and the caret is a separate button
 * so keyboard and touch users get an explicit, labelled way to open it
 * without losing the link.
 */
function NavTrigger({
  item, open, current, onOpen, onToggle,
}: { item: NavItem; open: boolean; current: boolean; onOpen: () => void; onToggle: () => void }) {
  if (!item.columns) {
    return (
      <Link href={item.href} className="nav-link" aria-current={current ? 'page' : undefined}>
        {item.label}
      </Link>
    );
  }
  return (
    <span
      className="nav-item"
      onMouseEnter={onOpen}
      // Focus opens the panel so a keyboard user tabbing onto the section
      // link can see what is inside it — but NOT when the caret itself takes
      // focus, because that would fire immediately before its own click and
      // the toggle would close what focus just opened (tap and Enter would
      // then appear to do nothing at all).
      onFocus={(e) => { if (!(e.target as HTMLElement).closest('.nav-caret')) onOpen(); }}
    >
      <Link href={item.href} className="nav-link nav-link-has-menu" aria-current={current ? 'page' : undefined}>
        {item.label}
      </Link>
      <button
        type="button"
        className="nav-caret"
        data-menu-trigger={item.label}
        aria-expanded={open}
        aria-controls={`megamenu-${slug(item.label)}`}
        aria-label={`${open ? 'Hide' : 'Show'} ${item.label} menu`}
        onClick={(e) => { e.preventDefault(); onToggle(); }}
      >
        <span className="nav-caret-glyph" data-open={open} aria-hidden="true">⌄</span>
      </button>
    </span>
  );
}
