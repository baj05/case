'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';

const NAV = [
  { href: '/search', label: 'Find a professional' },
  { href: '/resources', label: 'Free resources' },
  { href: '/matters', label: 'Legal matters' },
  { href: '/practice-areas', label: 'Practice areas' },
  { href: '/courts', label: 'Courts' },
  { href: '/judges', label: 'Judges' },
  { href: '/bar-councils', label: 'Bar Councils' },
  { href: '/for-professionals', label: 'For professionals' },
];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation, and lock scroll while it is open.
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="container row" style={{ justifyContent: 'space-between', gap: 16 }}>
        <Link href="/" className="wordmark" aria-label={`${BRAND.name} home`}>
          <span className="wordmark-mark" aria-hidden="true">{BRAND.mark}</span>
          <span>{BRAND.wordmark}</span>
        </Link>

        <nav className="nav-pill hide-mobile" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link" aria-current={isCurrent(item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

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
                <Link
                  key={item.href}
                  href={item.href}
                  className="filter-option"
                  aria-current={isCurrent(item.href) ? 'true' : undefined}
                  style={{ fontSize: '1rem', minHeight: 48 }}
                >
                  {item.label}
                </Link>
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
