/**
 * Main navigation, including the mega-menu panels.
 *
 * Single source of truth for both the desktop dropdown and the mobile drawer,
 * so the two can never drift apart.
 *
 * Every href here points at a route that actually exists (see
 * `apps/web/app/**\/page.tsx`) or a real filter on one — the slugs come from
 * `legal_domain`, `practice_area`, `resource_category` and
 * `resource_collection` in the seeded database. A menu that promises a page
 * and 404s is worse than a shorter menu.
 */

export interface NavLink {
  href: string;
  label: string;
  /** One-line explanation, shown on the wider mega-menu columns. */
  hint?: string;
}

export interface NavColumn {
  heading: string;
  links: NavLink[];
  /** Optional link rendered at the foot of the column, e.g. "See all". */
  footer?: NavLink;
}

export interface NavItem {
  href: string;
  label: string;
  /** Present => this item opens a mega-menu panel. */
  columns?: NavColumn[];
  /** Promoted callout shown on the right rail of the panel. */
  feature?: { href: string; label: string; body: string; cta: string };
}

export const NAV: NavItem[] = [
  {
    href: '/search',
    label: 'Find a lawyer',
    columns: [
      {
        heading: 'By practice area',
        links: [
          { href: '/search?practice=corporate-commercial', label: 'Corporate & Commercial' },
          { href: '/search?practice=criminal', label: 'Criminal' },
          { href: '/search?practice=family', label: 'Family' },
          { href: '/search?practice=property-real-estate', label: 'Property & Real Estate' },
          { href: '/search?practice=labour-employment', label: 'Labour & Employment' },
          { href: '/search?practice=civil-litigation', label: 'Civil Litigation' },
          { href: '/search?practice=tax', label: 'Tax' },
          { href: '/search?practice=consumer', label: 'Consumer' },
        ],
        footer: { href: '/practice-areas', label: 'All practice areas' },
      },
      {
        heading: 'By organisation',
        links: [
          { href: '/firms', label: 'Law firms & chambers', hint: 'Team-level engagement' },
          { href: '/lpo', label: 'LPO providers', hint: 'PF, ESI, labour compliance' },
        ],
        footer: { href: '/search', label: 'Browse every professional' },
      },
      {
        heading: 'By court & register',
        links: [
          { href: '/courts', label: 'Courts & tribunals' },
          { href: '/judges', label: 'Supreme Court judges' },
          { href: '/bar-councils', label: 'State Bar Councils' },
          { href: '/forums', label: 'Consumer & other forums' },
          { href: '/judicial-data', label: 'Judicial data', hint: 'Pendency & disposal statistics' },
          { href: '/case-records', label: 'Case-record names', hint: 'Advocate names from licensed case data — a separate, smaller dataset than the main directory' },
        ],
        footer: { href: '/data-sources', label: 'Where our data comes from' },
      },
    ],
    feature: {
      href: '/advo-ai',
      label: 'Not sure who you need?',
      body: 'Describe the problem in plain words. Advo AI works out the practice area, jurisdiction and court — no legal terminology needed.',
      cta: 'Ask Advo AI',
    },
  },
  {
    href: '/matters',
    label: 'Legal matters',
    columns: [
      {
        heading: 'Personal & family',
        links: [
          { href: '/matters/family-personal', label: 'Family & Personal' },
          { href: '/matters/property-rent', label: 'Property & Rent' },
          { href: '/matters/consumer-utilities', label: 'Consumer & Utilities' },
          { href: '/matters/electricity-power', label: 'Electricity & Power' },
          { href: '/matters/motor-transport-accidents', label: 'Motor, Transport & Accidents' },
          { href: '/matters/health-education', label: 'Health & Education' },
        ],
      },
      {
        heading: 'Work & money',
        links: [
          { href: '/matters/employment-labour', label: 'Employment & Labour' },
          { href: '/matters/money-banking-debt', label: 'Money, Banking & Debt' },
          { href: '/matters/tax-gst', label: 'Tax & GST' },
          { href: '/matters/business-corporate', label: 'Business & Corporate' },
          { href: '/matters/regulatory-compliance', label: 'Regulatory & Compliance' },
          { href: '/matters/legal-operations-lpo', label: 'Legal Operations & LPO' },
        ],
      },
      {
        heading: 'Disputes & rights',
        links: [
          { href: '/matters/criminal', label: 'Criminal' },
          { href: '/matters/civil-disputes', label: 'Civil Disputes' },
          { href: '/matters/mediation-arbitration', label: 'Mediation & Arbitration' },
          { href: '/matters/government-public-law', label: 'Government & Public Law' },
          { href: '/matters/rights-protection', label: 'Rights & Protection' },
          { href: '/matters/technology-cyber-data', label: 'Technology, Cyber & Data' },
        ],
        footer: { href: '/matters', label: 'Browse all legal matters' },
      },
    ],
  },
  {
    href: '/resources',
    label: 'Resources & guides',
    columns: [
      {
        heading: 'Documents & formats',
        links: [
          { href: '/resources/category/agreements-contracts', label: 'Agreements & contracts' },
          { href: '/resources/category/legal-notices', label: 'Legal notices' },
          { href: '/resources/category/affidavits-declarations', label: 'Affidavits & declarations' },
          { href: '/resources/category/court-documents', label: 'Court documents' },
          { href: '/resources/category/applications', label: 'Applications' },
          { href: '/resources/category/checklists', label: 'Checklists' },
        ],
      },
      {
        heading: 'By subject',
        links: [
          { href: '/resources/category/property-rent', label: 'Property & rent' },
          { href: '/resources/category/employment-labour', label: 'Employment & labour' },
          { href: '/resources/category/tax-gst', label: 'Tax & GST' },
          { href: '/resources/category/pf-esi', label: 'PF, ESI & social security' },
          { href: '/resources/category/corporate-startup', label: 'Corporate & startup' },
          { href: '/resources/category/consumer', label: 'Consumer' },
          { href: '/resources/category/family-law', label: 'Family law' },
          { href: '/resources/category/right-to-information', label: 'Right to information' },
        ],
      },
      {
        heading: 'Guided kits',
        links: [
          { href: '/resources/kits/renting-a-home', label: 'Renting a home' },
          { href: '/resources/kits/starting-a-company', label: 'Starting a company' },
          { href: '/resources/kits/pf-problem', label: 'My PF has not been deposited' },
          { href: '/resources/kits/electricity-bill-problem', label: 'My electricity bill is wrong' },
          { href: '/resources/kits/consumer-complaint', label: 'I was sold something defective' },
          { href: '/resources/kits/money-owed-to-me', label: 'Someone owes me money' },
          { href: '/resources/kits/i-was-defrauded-online', label: 'I lost money to an online fraud' },
          { href: '/resources/kits/i-need-a-free-lawyer', label: 'I cannot afford a lawyer' },
        ],
      },
      {
        heading: 'Official & help',
        links: [
          { href: '/resources/category/government-portals', label: 'Government portals' },
          { href: '/resources/category/legal-aid', label: 'Legal aid' },
          { href: '/resources/category/statutes-judgments', label: 'Statutes & judgments' },
          { href: '/resources/search', label: 'Search the library' },
          { href: '/resources/saved', label: 'Saved resources' },
        ],
        footer: { href: '/resources/about', label: 'How the library works' },
      },
    ],
  },
  {
    href: '/reviews',
    label: 'Reviews',
    columns: [
      {
        heading: 'Browse experiences',
        links: [
          { href: '/reviews', label: 'All recent experiences' },
          { href: '/search', label: 'Advocate reviews', hint: 'By practice area, court or city' },
          { href: '/firms', label: 'Law firm reviews', hint: 'Team-level client experience' },
          { href: '/lpo', label: 'LPO reviews', hint: 'Turnaround, SLA and communication' },
        ],
      },
      {
        heading: 'Share & understand',
        links: [
          { href: '/search', label: 'Write a review', hint: 'Find the professional first' },
          { href: '/rate-us', label: 'Rate CaseADVO', hint: 'Feedback on the platform itself' },
          { href: '/trust/reviews', label: 'How reviews work' },
        ],
      },
    ],
    feature: {
      href: '/trust/reviews',
      label: 'Verified, or clearly not',
      body: 'A review is tied to a real completed booking, or a company email domain we confirmed. Anything else publishes as unverified — and says so.',
      cta: 'How we verify',
    },
  },
  {
    href: '/corporate',
    label: 'Corporate Suite',
    columns: [
      {
        heading: 'Hiring and the workforce',
        links: [
          { href: '/corporate/employment-agreement', label: 'Employment agreement' },
          { href: '/corporate/consultant-agreement', label: 'Consultant or contractor agreement' },
          { href: '/corporate/resignation-and-relieving-request', label: 'Resignation & full and final settlement' },
        ],
      },
      {
        heading: 'Confidentiality and deals',
        links: [
          { href: '/corporate/mutual-nda', label: 'Mutual non-disclosure agreement' },
        ],
      },
      {
        heading: 'Founders and governance',
        links: [
          { href: '/corporate/founders-agreement', label: 'Founders’ agreement' },
          { href: '/corporate/board-resolution-general', label: 'Board resolution (general form)' },
        ],
        footer: { href: '/corporate', label: 'All corporate documents' },
      },
      {
        heading: 'Workplace compliance',
        links: [
          { href: '/corporate/posh-policy', label: 'POSH policy' },
        ],
      },
      {
        heading: 'Your company',
        links: [
          { href: '/corporate/start', label: 'Set up a company account', hint: 'Share documents and bookings with colleagues' },
        ],
      },
    ],
    feature: {
      href: '/corporate',
      label: 'Fill it in, not just download it',
      body: 'Answer a short set of questions and get a completed NDA, offer letter or founders’ agreement — no blanks left in the document.',
      cta: 'Open the document builder',
    },
  },
  { href: '/for-professionals', label: 'For lawyers' },
];
