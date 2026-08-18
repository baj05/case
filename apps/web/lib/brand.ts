/**
 * Single source of brand truth. Renaming the platform is a change to this file
 * only — nothing else hardcodes the name.
 */
export const BRAND = {
  name: 'Lexhall',
  wordmark: 'Lexhall',
  mark: 'L',
  tagline: 'Find the right legal professional for your matter.',
  descriptor: 'A legal professional network and legal-operations platform',
  supportEmail: 'data-correction@lexhall.example',
} as const;

/** Copy that carries legal weight, kept in one place for counsel to review. */
export const LEGAL_COPY = {
  noEndorsement:
    'Listings are compiled from official public registers. Inclusion is not a recommendation, '
    + 'endorsement or comparison of any professional, and no fee is charged for placement.',
  notAdvice:
    'Information on this platform is general and is not legal advice. Only a qualified legal '
    + 'professional who has considered your circumstances can advise you.',
  unclaimedProfile:
    'This profile was compiled from an official public register and has not yet been confirmed by '
    + 'the professional. Details may be out of date.',
  reviewsGated:
    'Reviews are not published on this platform pending completion of a professional-conduct and '
    + 'data-protection review.',
  feesGated:
    'Fees are set and collected by the professional directly. This platform does not process '
    + 'consultation payments and takes no share of professional fees.',
  confidentiality:
    'Do not include confidential or privileged details in this form. Share only what is needed to '
    + 'assess whether the professional can assist you.',
} as const;
