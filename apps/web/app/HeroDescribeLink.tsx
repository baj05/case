'use client';

/**
 * A one-line client-side "describe it instead" link for the homepage hero.
 * Kept as its own tiny component so the homepage stays a server component and
 * still renders its metadata + SSR corpus stats on request.
 */
export function HeroDescribeLink() {
  return (
    <p className="t-body-sm ink-variant">
      Prefer to describe it?{' '}
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); document.querySelector<HTMLButtonElement>('.advo-fab')?.click(); }}
        style={{ textDecoration: 'underline' }}
      >
        Ask Advo AI
      </a>{' '}
      — the side chat on the right.
    </p>
  );
}
