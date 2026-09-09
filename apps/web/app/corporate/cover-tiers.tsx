import type { ReactNode } from 'react';
import {
  ShieldCheckIcon, RupeeIcon, GavelIcon, ChartIcon, PinIcon,
} from '@/components/Icons';

/**
 * CaseADVO Cover — subscription tiers for the Corporate Suite.
 *
 * Priced against how Indian legal-retainer services actually structure
 * monthly cover (roughly ₹10,000–₹1,00,000/month depending on scope —
 * scoped bundles of recurring drafting, compliance and advice, with
 * transactional work like a fund-raise or litigation quoted separately,
 * never folded into "unlimited"). Diamond Cover is the one tier without a
 * listed price: it hands the company the self-serve advocate directory
 * instead of an assigned advocate, so its scope is set case by case.
 *
 * `priceYearly` is exactly 10× `priceMonthly` — "2 months free" for paying
 * annually, a plain, checkable discount rather than an arbitrary number.
 */
export interface CoverTier {
  slug: string;
  name: string;
  tagline: string;
  icon: ReactNode;
  priceMonthly: number | null;
  priceYearly: number | null;
  includes: string[];
  cta: string;
  featured?: boolean;
}

export const COVER_TIERS: CoverTier[] = [
  {
    slug: 'basic',
    name: 'Basic Cover',
    tagline: 'For a small team that just needs the basics handled.',
    icon: <ShieldCheckIcon size={16} />,
    priceMonthly: 7_999,
    priceYearly: 79_990,
    includes: [
      'Unlimited legal questions by chat, answered within 2 business days',
      'Up to 2 agreements drafted or reviewed a month (NDAs, vendor contracts, offer letters)',
      'Notarisation and stamp-paper coordination for up to 2 documents a month',
      'Full access to the Corporate Suite document library',
      'One assigned advocate, so you explain your business once',
    ],
    cta: 'Start with Basic Cover',
  },
  {
    slug: 'pro',
    name: 'Pro Cover',
    tagline: 'For a growing company that signs contracts every week.',
    icon: <RupeeIcon size={16} />,
    priceMonthly: 19_999,
    priceYearly: 199_990,
    includes: [
      'Everything in Basic Cover',
      'Unlimited agreement drafting and review',
      'Up to 5 notarised or stamped documents a month',
      'A monthly compliance checklist — ROC filings, POSH, labour-law deadlines',
      'Priority response within 1 business day, plus a quarterly advisory call',
    ],
    cta: 'Start with Pro Cover',
    featured: true,
  },
  {
    slug: 'max',
    name: 'Max Cover',
    tagline: 'For a company that treats legal like a function, not a fire drill.',
    icon: <GavelIcon size={16} />,
    priceMonthly: 39_999,
    priceYearly: 399_990,
    includes: [
      'Everything in Pro Cover',
      'A dedicated advocate plus a named backup, for continuity',
      'Unlimited notarised and stamped documents',
      'Full employment & HR document suite — offer letters, POSH policy, termination',
      'Contract negotiation support directly with the other side',
      'Same-day response during business hours',
    ],
    cta: 'Start with Max Cover',
  },
  {
    slug: 'ultra',
    name: 'Ultra Cover',
    tagline: 'For a company operating across states, or about to.',
    icon: <ChartIcon size={16} />,
    priceMonthly: 79_999,
    priceYearly: 799_990,
    includes: [
      'Everything in Max Cover',
      'Coverage in every state you operate in — a verified advocate on the ground, not just a phone number',
      'Legal-notice response included, up to 2 notices a quarter',
      'Trademark and IP filing coordination',
      'Fund-raise document support (term sheets, SHA/SSA review) at preferential rates',
      'A named account manager and a 24-hour advocate hotline',
    ],
    cta: 'Start with Ultra Cover',
  },
  {
    slug: 'diamond',
    name: 'Diamond Cover',
    tagline: 'Everything in Ultra — and you choose the advocate yourself.',
    icon: <PinIcon size={16} />,
    priceMonthly: null,
    priceYearly: null,
    includes: [
      'Everything in Ultra Cover',
      'Browse the full verified directory and select your own advocate, rather than one we assign',
      'A named senior advocate plus their full team',
      'In-person meetings arranged at your office',
      'A custom scope and SLA, priced for what you actually need',
    ],
    cta: 'Talk to us about Diamond Cover',
  },
];
