import Link from 'next/link';
import { BRAND, LEGAL_COPY } from '@/lib/brand';

export function Footer() {
  const columns = [
    {
      head: 'Find',
      links: [
        { href: '/search', label: 'Search professionals' },
        { href: '/firms', label: 'Law firms & chambers' },
        { href: '/lpo', label: 'LPO providers' },
        { href: '/practice-areas', label: 'Practice areas' },
        { href: '/courts', label: 'Courts and tribunals' },
        { href: '/judges', label: 'Supreme Court judges' },
        { href: '/bar-councils', label: 'State Bar Councils' },
      ],
    },
    {
      head: 'Reviews',
      links: [
        { href: '/reviews', label: 'Browse reviews' },
        { href: '/trust/reviews', label: 'How reviews work' },
        { href: '/rate-us', label: 'Rate CaseADVO' },
      ],
    },
    {
      head: 'Legal matters',
      links: [
        { href: '/matters', label: 'Browse by legal matter' },
        { href: '/forums', label: 'Forums and tribunals' },
        { href: '/matters/electricity-power', label: 'Electricity disputes' },
        { href: '/matters/family-personal', label: 'Family and personal' },
        { href: '/matters/property-rent', label: 'Property and rent' },
      ],
    },
    {
      head: 'Free resources',
      links: [
        { href: '/resources', label: 'Resource library' },
        { href: '/resources/category/agreements-contracts', label: 'Agreements and contracts' },
        { href: '/resources/category/legal-aid', label: 'Legal aid forms' },
        { href: '/resources/category/government-portals', label: 'Government portals' },
        { href: '/resources/about', label: 'How the library works' },
      ],
    },
    {
      head: 'Professionals',
      links: [
        { href: '/for-professionals', label: 'Claim your profile' },
        { href: '/for-professionals#verification', label: 'How verification works' },
        { href: '/dashboard', label: 'Professional dashboard' },
      ],
    },
    {
      head: 'Transparency',
      links: [
        { href: '/how-it-works', label: 'How results are ranked' },
        { href: '/data-sources', label: 'Where our data comes from' },
        { href: '/credits', label: 'Image credits' },
        { href: '/bot', label: 'About our crawler' },
      ],
    },
    {
      head: 'Your data',
      links: [
        { href: '/legal/data-request', label: 'Correct or remove my listing' },
        { href: '/legal/privacy', label: 'Privacy' },
        { href: '/legal/terms', label: 'Terms' },
        { href: '/legal/grievance', label: 'Grievance redressal' },
      ],
    },
  ];

  return (
    <footer className="site-footer">
      <div className="container stack gap-8">
        <div className="grid-auto">
          <div className="stack gap-3" style={{ minWidth: 220 }}>
            <span className="wordmark" style={{ color: '#fff' }}>
              <span className="wordmark-mark" aria-hidden="true">{BRAND.mark}</span>
              {BRAND.wordmark}
            </span>
            <p className="t-body-sm" style={{ maxWidth: '34ch' }}>{BRAND.descriptor}. India launch market.</p>
          </div>
          {columns.map((col) => (
            <nav key={col.head} className="stack gap-2" aria-label={col.head}>
              <span className="footer-head">{col.head}</span>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} className="t-body-sm">{l.label}</Link>
              ))}
            </nav>
          ))}
        </div>

        <hr className="divider" style={{ background: 'rgba(255,255,255,0.16)' }} />

        <div className="stack gap-3">
          <p className="t-caption" style={{ color: '#aeb6c9', maxWidth: '92ch' }}>{LEGAL_COPY.noEndorsement}</p>
          <p className="t-caption" style={{ color: '#aeb6c9', maxWidth: '92ch' }}>{LEGAL_COPY.notAdvice}</p>
          <p className="t-caption" style={{ color: '#8f97aa' }}>
            Prototype build. Not a live service. © {new Date().getFullYear()} {BRAND.name}.
          </p>
        </div>
      </div>
    </footer>
  );
}
