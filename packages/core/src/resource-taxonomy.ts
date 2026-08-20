/**
 * Resource library taxonomy — types, categories, trust levels and the rules that
 * govern how a document may be presented.
 *
 * The single most important idea in this file is the separation between
 * `ResourceType` (what kind of document this is) and `OfficialStatus` (who
 * stands behind it). A platform-authored rent agreement and a Government of
 * India form are both "documents you can download", and a library that renders
 * them identically is a library that misleads. Every card and every detail page
 * therefore carries the official-status badge, and `disclaimerFor` refuses to
 * return an empty string.
 *
 * Nothing here is legal advice and nothing here asserts legal validity. The
 * quality score measures *provenance and freshness*, not whether a document will
 * be accepted by a registrar — a distinction the UI copy repeats, because users
 * will otherwise read a high score as legal assurance.
 */

import { fold } from './text.ts';

// ---------------------------------------------------------------------------
// Resource types
// ---------------------------------------------------------------------------

export const RESOURCE_TYPES = [
  'OFFICIAL_FORM', 'OFFICIAL_GUIDE', 'GOVERNMENT_DOCUMENT', 'COURT_FORM', 'TRIBUNAL_FORM',
  'LEGAL_TEMPLATE', 'AGREEMENT_TEMPLATE', 'APPLICATION_TEMPLATE', 'AFFIDAVIT_TEMPLATE',
  'NOTICE_TEMPLATE', 'CHECKLIST', 'GUIDE', 'FAQ', 'JUDGMENT', 'STATUTE', 'RULE',
  'REGULATION', 'CIRCULAR', 'NOTIFICATION', 'REPORT', 'RESOURCE_LINK', 'CALCULATOR',
  'EXTERNAL_TOOL', 'VIDEO',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface ResourceTypeMeta {
  label: string;
  /** One line the user reads on a card. Says what the document *is*. */
  plain: string;
  /** Chip class from the design system. */
  tone: 'chip' | 'chip-outline' | 'chip-primary' | 'chip-teal' | 'chip-lime' | 'chip-warn';
  /** True when the type may only ever be used for genuinely official material. */
  officialOnly: boolean;
  /** True when the platform can render a preview from its own text. */
  renderable: boolean;
}

export const RESOURCE_TYPE_META: Record<ResourceType, ResourceTypeMeta> = {
  OFFICIAL_FORM: { label: 'Official form', plain: 'A form prescribed or published by the authority itself.', tone: 'chip-teal', officialOnly: true, renderable: false },
  OFFICIAL_GUIDE: { label: 'Official guide', plain: 'Guidance published by the authority that administers the process.', tone: 'chip-teal', officialOnly: true, renderable: false },
  GOVERNMENT_DOCUMENT: { label: 'Government document', plain: 'A document issued by a government body.', tone: 'chip-teal', officialOnly: true, renderable: false },
  COURT_FORM: { label: 'Court form', plain: 'A form published by a court under its own rules.', tone: 'chip-teal', officialOnly: true, renderable: false },
  TRIBUNAL_FORM: { label: 'Tribunal form', plain: 'A form published by a tribunal or commission.', tone: 'chip-teal', officialOnly: true, renderable: false },
  LEGAL_TEMPLATE: { label: 'Template', plain: 'A drafting starting point written for this library.', tone: 'chip-primary', officialOnly: false, renderable: true },
  AGREEMENT_TEMPLATE: { label: 'Agreement template', plain: 'A contract you fill in and adapt. Not a prescribed form.', tone: 'chip-primary', officialOnly: false, renderable: true },
  APPLICATION_TEMPLATE: { label: 'Application template', plain: 'A covering application you adapt — check whether a prescribed form exists.', tone: 'chip-primary', officialOnly: false, renderable: true },
  AFFIDAVIT_TEMPLATE: { label: 'Affidavit template', plain: 'A sworn statement format. Needs stamping and attestation.', tone: 'chip-primary', officialOnly: false, renderable: true },
  NOTICE_TEMPLATE: { label: 'Notice template', plain: 'A demand or notice you adapt before sending.', tone: 'chip-primary', officialOnly: false, renderable: true },
  CHECKLIST: { label: 'Checklist', plain: 'What to gather, check or do, in order.', tone: 'chip-lime', officialOnly: false, renderable: true },
  GUIDE: { label: 'Guide', plain: 'A plain-language explanation of a process.', tone: 'chip-lime', officialOnly: false, renderable: true },
  FAQ: { label: 'FAQ', plain: 'Common questions, answered plainly.', tone: 'chip-lime', officialOnly: false, renderable: true },
  JUDGMENT: { label: 'Judgment', plain: 'A decision of a court or tribunal.', tone: 'chip-outline', officialOnly: true, renderable: false },
  STATUTE: { label: 'Statute', plain: 'The text of an Act.', tone: 'chip-outline', officialOnly: true, renderable: false },
  RULE: { label: 'Rules', plain: 'Rules made under an Act.', tone: 'chip-outline', officialOnly: true, renderable: false },
  REGULATION: { label: 'Regulations', plain: 'Regulations made by an authority.', tone: 'chip-outline', officialOnly: true, renderable: false },
  CIRCULAR: { label: 'Circular', plain: 'An administrative circular or instruction.', tone: 'chip-outline', officialOnly: true, renderable: false },
  NOTIFICATION: { label: 'Notification', plain: 'A gazette or departmental notification.', tone: 'chip-outline', officialOnly: true, renderable: false },
  REPORT: { label: 'Report', plain: 'An official or institutional report.', tone: 'chip-outline', officialOnly: false, renderable: false },
  RESOURCE_LINK: { label: 'Official portal', plain: 'The authority’s own portal, where the process actually happens.', tone: 'chip', officialOnly: false, renderable: false },
  CALCULATOR: { label: 'Calculator', plain: 'A calculation tool.', tone: 'chip', officialOnly: false, renderable: false },
  EXTERNAL_TOOL: { label: 'External tool', plain: 'A tool hosted elsewhere.', tone: 'chip', officialOnly: false, renderable: false },
  VIDEO: { label: 'Video', plain: 'A recorded explanation.', tone: 'chip', officialOnly: false, renderable: false },
};

// ---------------------------------------------------------------------------
// Official status — the distinction that must never blur
// ---------------------------------------------------------------------------

export const OFFICIAL_STATUSES = ['OFFICIAL', 'PLATFORM_TEMPLATE', 'THIRD_PARTY', 'REFERENCE'] as const;
export type OfficialStatus = (typeof OFFICIAL_STATUSES)[number];

export interface OfficialStatusMeta {
  label: string;
  short: string;
  plain: string;
  tone: 'chip-teal' | 'chip-primary' | 'chip-warn' | 'chip-outline';
}

export const OFFICIAL_STATUS_META: Record<OfficialStatus, OfficialStatusMeta> = {
  OFFICIAL: {
    label: 'Official source', short: 'Official', tone: 'chip-teal',
    plain: 'Published by the authority named. We link to their copy rather than hosting our own, so you always get the current version.',
  },
  PLATFORM_TEMPLATE: {
    label: 'CaseADVO template', short: 'Template', tone: 'chip-primary',
    plain: 'Written by CaseADVO. It is not a government or court form and no authority has approved it. Use it as a drafting starting point.',
  },
  THIRD_PARTY: {
    label: 'Third-party resource', short: 'Third party', tone: 'chip-warn',
    plain: 'Published by an organisation that is neither CaseADVO nor the authority concerned. Judge it accordingly.',
  },
  REFERENCE: {
    label: 'Reference material', short: 'Reference', tone: 'chip-outline',
    plain: 'Background material for orientation. Not a form and not something to file.',
  },
};

// ---------------------------------------------------------------------------
// Source trust levels (spec §36)
// ---------------------------------------------------------------------------

export const TRUST_LEVELS: Record<number, { label: string; plain: string }> = {
  1: { label: 'Level 1 — Government or court', plain: 'The issuing authority itself: a ministry, a court, a government department.' },
  2: { label: 'Level 2 — Statutory or regulatory authority', plain: 'A regulator or statutory body publishing within its own remit.' },
  3: { label: 'Level 3 — Bar or legal services authority', plain: 'A Bar Council, or a legal services authority under the Legal Services Authorities Act.' },
  4: { label: 'Level 4 — Institutional source', plain: 'A university, research institution or recognised body.' },
  5: { label: 'Level 5 — Professional organisation', plain: 'A professional association or industry body.' },
  6: { label: 'Level 6 — Third-party source', plain: 'An educational or commercial publisher. Useful, but not authoritative.' },
};

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export const RESOURCE_STATUSES = [
  'RAW', 'REVIEW_REQUIRED', 'VERIFIED', 'PUBLISHED', 'UNDER_REVIEW',
  'SUPERSEDED', 'WITHDRAWN', 'ARCHIVED', 'REJECTED',
] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const RESOURCE_STATUS_META: Record<ResourceStatus, { label: string; plain: string; publicVisible: boolean }> = {
  RAW: { label: 'Raw', plain: 'Just discovered by the ingestion pipeline. Nothing has been checked.', publicVisible: false },
  REVIEW_REQUIRED: { label: 'Review required', plain: 'Discovered and classified, waiting for a person to check it.', publicVisible: false },
  VERIFIED: { label: 'Verified', plain: 'Source, jurisdiction and rights basis checked. Not yet published.', publicVisible: false },
  PUBLISHED: { label: 'Published', plain: 'Live in the library.', publicVisible: true },
  UNDER_REVIEW: { label: 'Under review', plain: 'Live, but flagged — something about it needs re-checking.', publicVisible: true },
  SUPERSEDED: { label: 'Superseded', plain: 'A newer version exists. Kept for the record, not offered as current.', publicVisible: true },
  WITHDRAWN: { label: 'Withdrawn', plain: 'The authority withdrew it. Shown only as a historical record.', publicVisible: true },
  ARCHIVED: { label: 'Archived', plain: 'Removed from the library.', publicVisible: false },
  REJECTED: { label: 'Rejected', plain: 'Reviewed and refused — wrong, unclear rights, or not useful.', publicVisible: false },
};

/** Rights basis. `unknown` may never be published as a local download (spec §68). */
export const RIGHTS_BASES = [
  'public_domain', 'government_open', 'open_licence', 'permission_granted',
  'platform_owned', 'link_only', 'unknown',
] as const;
export type RightsBasis = (typeof RIGHTS_BASES)[number];

export const RIGHTS_BASIS_META: Record<RightsBasis, { label: string; mayMirror: boolean; plain: string }> = {
  public_domain: { label: 'Public domain', mayMirror: true, plain: 'No copyright restriction applies.' },
  government_open: { label: 'Government open data', mayMirror: true, plain: 'Published under a government open-data or reuse policy.' },
  open_licence: { label: 'Open licence', mayMirror: true, plain: 'Released under a licence that permits redistribution.' },
  permission_granted: { label: 'Permission granted', mayMirror: true, plain: 'The publisher gave written permission to host a copy.' },
  platform_owned: { label: 'CaseADVO-authored', mayMirror: true, plain: 'Written by CaseADVO, so CaseADVO may publish it.' },
  link_only: { label: 'Link only', mayMirror: false, plain: 'We link to the publisher’s copy. Hosting one ourselves has not been cleared.' },
  unknown: { label: 'Rights unresolved', mayMirror: false, plain: 'The rights position has not been established, so no copy is offered.' },
};

// ---------------------------------------------------------------------------
// Categories — the public information architecture (spec §51)
// ---------------------------------------------------------------------------

export interface ResourceCategorySeed {
  code: string;
  name: string;
  slug: string;
  /** One line under the category title. */
  plainSummary: string;
  /** Legal-domain code this category maps onto, when one does. */
  domain?: string;
  icon: string;
  sortOrder: number;
  subcategories: string[];
}

export const RESOURCE_CATEGORIES: ResourceCategorySeed[] = [
  { code: 'RC_AGREEMENTS', name: 'Agreements & contracts', slug: 'agreements-contracts', sortOrder: 10, icon: 'handshake', domain: 'D_BUSINESS',
    plainSummary: 'Rent, lease, employment, service, NDA, partnership and shareholder documents you fill in and adapt.',
    subcategories: ['Tenancy & lease', 'Sale & property', 'Employment', 'Services & vendors', 'Company & investment', 'Confidentiality & IP', 'Technology & data'] },
  { code: 'RC_PROPERTY', name: 'Property & rent', slug: 'property-rent', sortOrder: 20, icon: 'home', domain: 'D_PROPERTY',
    plainSummary: 'Renting, buying, title, possession, mutation, builders and society disputes — with the state rules that actually govern them.',
    subcategories: ['Rent & tenancy', 'Sale & purchase', 'Title & due diligence', 'Mutation & records', 'Builders & RERA', 'Societies'] },
  { code: 'RC_LEGAL_NOTICES', name: 'Legal notices', slug: 'legal-notices', sortOrder: 30, icon: 'envelope', domain: 'D_CIVIL',
    plainSummary: 'The letter that precedes a case: demand, breach, recovery, cheque dishonour, eviction, employment.',
    subcategories: ['Money & recovery', 'Property & tenancy', 'Employment', 'Contract & services', 'Consumer', 'Reputation'] },
  { code: 'RC_APPLICATIONS', name: 'Applications', slug: 'applications', sortOrder: 40, icon: 'file-plus', domain: 'D_PUBLIC',
    plainSummary: 'Applications to authorities, courts and grievance cells — with a link to the prescribed form wherever one exists.',
    subcategories: ['Court applications', 'Government applications', 'Grievance & redress', 'Certificates & records', 'Legal aid'] },
  { code: 'RC_AFFIDAVITS', name: 'Affidavits & declarations', slug: 'affidavits-declarations', sortOrder: 50, icon: 'seal', domain: 'D_CIVIL',
    plainSummary: 'Sworn statements and undertakings, with what must be stamped and attested before they mean anything.',
    subcategories: ['Identity & name', 'Address & residence', 'Income & means', 'Ownership', 'Loss of documents', 'Court affidavits'] },
  { code: 'RC_COURT_DOCUMENTS', name: 'Court documents', slug: 'court-documents', sortOrder: 60, icon: 'gavel', domain: 'D_CIVIL',
    plainSummary: 'Vakalatnama, plaint, written statement, petitions and applications — and the court rules that prescribe their form.',
    subcategories: ['Authorisation', 'Pleadings', 'Applications', 'Appeals & revisions', 'Court rules'] },
  { code: 'RC_LEGAL_AID', name: 'Legal aid', slug: 'legal-aid', sortOrder: 70, icon: 'hands', domain: 'D_ADR',
    plainSummary: 'Free legal services under the Legal Services Authorities Act — who qualifies, how to apply, and each state authority’s own forms.',
    subcategories: ['Apply for legal aid', 'State authorities', 'Lok Adalat', 'Victim compensation', 'Schemes'] },
  { code: 'RC_FAMILY', name: 'Family law', slug: 'family-law', sortOrder: 80, icon: 'family', domain: 'D_FAMILY',
    plainSummary: 'Marriage, divorce, maintenance, custody, guardianship, domestic violence, succession and adoption.',
    subcategories: ['Marriage & registration', 'Divorce', 'Maintenance', 'Children', 'Protection from violence', 'Succession & wills'] },
  { code: 'RC_EMPLOYMENT', name: 'Employment & labour', slug: 'employment-labour', sortOrder: 90, icon: 'work', domain: 'D_EMPLOYMENT',
    plainSummary: 'Offer letters, contracts, termination, wages, gratuity, POSH and the labour compliance an employer actually has to keep.',
    subcategories: ['Hiring documents', 'Policies', 'Exit & discipline', 'Wages & dues', 'POSH', 'Compliance'] },
  { code: 'RC_PF_ESI', name: 'PF, ESI & social security', slug: 'pf-esi', sortOrder: 100, icon: 'shield-check', domain: 'D_EMPLOYMENT',
    plainSummary: 'Provident fund, pension, ESI and gratuity — claims, grievances and what an employer must file.',
    subcategories: ['PF claims', 'Pension', 'ESI', 'Gratuity', 'Employer filings', 'Grievance routes'] },
  { code: 'RC_ELECTRICITY', name: 'Electricity & utilities', slug: 'electricity-utilities', sortOrder: 110, icon: 'bolt', domain: 'D_ELECTRICITY',
    plainSummary: 'Excess bills, meters, new connections, disconnection, theft allegations and solar — routed to your own distribution company and regulator.',
    subcategories: ['Billing disputes', 'Meters', 'Connections', 'Disconnection & dues', 'Theft allegations', 'Solar & net metering', 'Regulators & ombudsmen'] },
  { code: 'RC_CONSUMER', name: 'Consumer', slug: 'consumer', sortOrder: 120, icon: 'cart', domain: 'D_CONSUMER',
    plainSummary: 'Defective goods, poor service, e-commerce, telecom and the Consumer Commission route including e-Daakhil.',
    subcategories: ['Complaints', 'E-commerce', 'Telecom', 'Filing & procedure', 'Helplines'] },
  { code: 'RC_BANKING', name: 'Banking & finance', slug: 'banking-finance', sortOrder: 130, icon: 'bank', domain: 'D_MONEY',
    plainSummary: 'Unauthorised transactions, loan and EMI disputes, cheque dishonour, credit cards and the RBI Ombudsman.',
    subcategories: ['Bank complaints', 'Loans & EMI', 'Cheque dishonour', 'Cards & payments', 'Ombudsman & escalation', 'Recovery'] },
  { code: 'RC_INSURANCE', name: 'Insurance', slug: 'insurance', sortOrder: 140, icon: 'umbrella', domain: 'D_MONEY',
    plainSummary: 'Claims, rejections, grievance escalation and the Insurance Ombudsman.',
    subcategories: ['Claims', 'Rejection & repudiation', 'Grievance & ombudsman', 'Policy review'] },
  { code: 'RC_TAX', name: 'Tax & GST', slug: 'tax-gst', sortOrder: 150, icon: 'receipt', domain: 'D_TAX',
    plainSummary: 'Income tax and GST registration, returns, notices, refunds and appeals — with the official forms.',
    subcategories: ['Income tax', 'GST registration', 'GST returns & refunds', 'Notices & replies', 'Appeals', 'TDS'] },
  { code: 'RC_CORPORATE', name: 'Corporate & startup', slug: 'corporate-startup', sortOrder: 160, icon: 'building', domain: 'D_BUSINESS',
    plainSummary: 'Incorporation, founders and shareholder documents, resolutions, MSME registration and compliance calendars.',
    subcategories: ['Incorporation & ROC', 'Founders & investment', 'Resolutions', 'Commercial contracts', 'MSME', 'Compliance'] },
  { code: 'RC_IP', name: 'Intellectual property', slug: 'intellectual-property', sortOrder: 170, icon: 'lightbulb', domain: 'D_IP',
    plainSummary: 'Trade marks, copyright, patents and designs — filing routes, official forms and infringement notices.',
    subcategories: ['Trade marks', 'Copyright', 'Patents & designs', 'Assignment & licensing', 'Enforcement'] },
  { code: 'RC_CYBER', name: 'Cyber & data', slug: 'cyber-data', sortOrder: 180, icon: 'chip', domain: 'D_TECH',
    plainSummary: 'Online and UPI fraud, account takeover, harassment, data breaches and the official reporting routes.',
    subcategories: ['Report a cybercrime', 'Financial fraud', 'Harassment & abuse', 'Data protection', 'Incident response'] },
  { code: 'RC_RTI', name: 'Right to information', slug: 'right-to-information', sortOrder: 190, icon: 'search', domain: 'D_PUBLIC',
    plainSummary: 'RTI applications, first appeals, second appeals and the portals that accept them.',
    subcategories: ['Applications', 'Appeals', 'Guides', 'Portals'] },
  { code: 'RC_ADR', name: 'Mediation & arbitration', slug: 'mediation-arbitration', sortOrder: 200, icon: 'balance', domain: 'D_ADR',
    plainSummary: 'Pre-institution mediation, settlement agreements, arbitration notices and Lok Adalat.',
    subcategories: ['Mediation', 'Pre-institution mediation', 'Arbitration', 'Settlement', 'Lok Adalat'] },
  { code: 'RC_CRIMINAL', name: 'Criminal & police', slug: 'criminal-police', sortOrder: 210, icon: 'shield', domain: 'D_CRIMINAL',
    plainSummary: 'FIRs, complaints, bail applications and the rights that attach at each stage.',
    subcategories: ['FIR & complaints', 'Bail', 'Rights & procedure', 'Victim support'] },
  { code: 'RC_MOTOR', name: 'Motor & transport', slug: 'motor-transport', sortOrder: 220, icon: 'car', domain: 'D_MOTOR',
    plainSummary: 'Accident claims, challans, licence and registration processes.',
    subcategories: ['Accident claims', 'Challans', 'Licence & registration', 'Insurance'] },
  { code: 'RC_RIGHTS', name: 'Rights & protection', slug: 'rights-protection', sortOrder: 230, icon: 'heart', domain: 'D_RIGHTS',
    plainSummary: 'Women, senior citizens, children, persons with disabilities and human rights complaints.',
    subcategories: ['Women', 'Senior citizens', 'Children', 'Disability', 'Human rights'] },
  { code: 'RC_CHECKLISTS', name: 'Checklists', slug: 'checklists', sortOrder: 240, icon: 'list-check',
    plainSummary: 'What to gather, verify and do — before you sign, file or pay.',
    subcategories: ['Before you sign', 'Before you file', 'Due diligence', 'Compliance'] },
  { code: 'RC_GUIDES', name: 'Legal guides', slug: 'legal-guides', sortOrder: 250, icon: 'book',
    plainSummary: 'Plain-language explanations of how a process actually runs, and what it costs in time.',
    subcategories: ['Process guides', 'Rights guides', 'Cost & time', 'Forum guides'] },
  { code: 'RC_LAW', name: 'Statutes & judgments', slug: 'statutes-judgments', sortOrder: 260, icon: 'scales',
    plainSummary: 'The Acts, rules and decisions themselves, from the sources that publish them authoritatively.',
    subcategories: ['Acts', 'Rules & regulations', 'Judgments', 'Notifications'] },
  { code: 'RC_PORTALS', name: 'Government portals', slug: 'government-portals', sortOrder: 270, icon: 'gov',
    plainSummary: 'The official destination for each process, so you never file on an imitation site.',
    subcategories: ['Courts & tribunals', 'Regulators', 'Departments', 'Grievance portals', 'State authorities'] },
];

export function categoryBySlug(slug: string): ResourceCategorySeed | undefined {
  return RESOURCE_CATEGORIES.find((c) => c.slug === slug);
}
export function categoryByCode(code: string): ResourceCategorySeed | undefined {
  return RESOURCE_CATEGORIES.find((c) => c.code === code);
}

// ---------------------------------------------------------------------------
// Resource centres — audience-led entry points (spec §29–32, §27–28)
// ---------------------------------------------------------------------------

export interface ResourceCentreSeed {
  slug: string;
  name: string;
  headline: string;
  plainSummary: string;
  /** Categories whose resources feed this centre. */
  categories: string[];
  /** Matter codes that anchor it. */
  matters: string[];
  /** Search tags used to gather resources into the centre. */
  tags: string[];
  /** Helplines and official routes shown at the top. Facts, not advice. */
  helplines: Array<{ label: string; value: string; note?: string }>;
  sortOrder: number;
}

export const RESOURCE_CENTRES: ResourceCentreSeed[] = [
  {
    slug: 'women', name: 'Women’s legal resource centre', sortOrder: 10,
    headline: 'Protection, maintenance, workplace harassment and the routes that exist for each',
    plainSummary:
      'Domestic violence, maintenance, divorce, custody, workplace sexual harassment, property and inheritance rights, '
      + 'and the official complaint routes — including the ones that do not require a lawyer to start.',
    categories: ['RC_FAMILY', 'RC_RIGHTS', 'RC_LEGAL_AID', 'RC_CRIMINAL'],
    matters: ['F_DV', 'F_MAINTENANCE', 'F_DIVORCE_MUTUAL', 'F_CUSTODY', 'L_POSH', 'S_INTESTATE'],
    tags: ['women', 'domestic violence', 'posh', 'maintenance', 'harassment'],
    helplines: [
      { label: 'Women helpline', value: '181', note: 'All-India women helpline' },
      { label: 'NALSA legal aid helpline', value: '15100', note: 'Free legal aid eligibility and applications' },
      { label: 'Police', value: '112' },
    ],
  },
  {
    slug: 'senior-citizens', name: 'Senior citizens’ resource centre', sortOrder: 20,
    headline: 'Maintenance, property protection, pension and elder abuse',
    plainSummary:
      'Maintenance from children or relatives, protecting property from transfer under pressure, pension and PF, '
      + 'and the Maintenance Tribunal route created specifically so that a senior citizen need not run a civil suit.',
    categories: ['RC_FAMILY', 'RC_RIGHTS', 'RC_PROPERTY', 'RC_PF_ESI'],
    matters: ['R_SENIOR', 'F_MAINTENANCE', 'PU_PENSION', 'P_TITLE'],
    tags: ['senior citizen', 'maintenance tribunal', 'pension', 'elder abuse'],
    helplines: [
      { label: 'Elderline', value: '14567', note: 'National helpline for senior citizens' },
      { label: 'NALSA legal aid helpline', value: '15100' },
    ],
  },
  {
    slug: 'children', name: 'Child rights resource centre', sortOrder: 30,
    headline: 'Custody, guardianship, adoption, protection and education',
    plainSummary:
      'Custody and guardianship, adoption through the statutory route, child protection, juvenile justice, '
      + 'child labour and the right to education — with the authorities that hold jurisdiction over each.',
    categories: ['RC_FAMILY', 'RC_RIGHTS', 'RC_LEGAL_AID'],
    matters: ['F_CUSTODY', 'F_ADOPTION', 'ED_DISPUTE'],
    tags: ['child', 'custody', 'adoption', 'guardianship', 'education'],
    helplines: [
      { label: 'Childline', value: '1098', note: 'Child helpline, 24 hours' },
      { label: 'NALSA legal aid helpline', value: '15100' },
    ],
  },
  {
    slug: 'disability', name: 'Disability rights resource centre', sortOrder: 40,
    headline: 'Certification, accessibility, employment and education rights',
    plainSummary:
      'Disability certification, reservation and accessibility rights, employment and education entitlements, '
      + 'and complaints to the Commissioner for Persons with Disabilities.',
    categories: ['RC_RIGHTS', 'RC_EMPLOYMENT', 'RC_LEGAL_AID'],
    matters: ['R_DISABILITY', 'ED_DISPUTE'],
    tags: ['disability', 'accessibility', 'certificate', 'rights'],
    helplines: [{ label: 'NALSA legal aid helpline', value: '15100' }],
  },
  {
    slug: 'startups', name: 'Startup legal resource centre', sortOrder: 50,
    headline: 'The documents a company actually needs in its first two years',
    plainSummary:
      'Incorporation, founders’ arrangements, employment and contractor documents, IP assignment, '
      + 'customer and vendor contracts, privacy and terms, and the compliance calendar nobody hands you.',
    categories: ['RC_CORPORATE', 'RC_AGREEMENTS', 'RC_EMPLOYMENT', 'RC_IP', 'RC_CYBER'],
    matters: ['CO_INCORP', 'CO_FOUNDERS', 'CT_NDA', 'CT_SERVICE_AGREEMENT', 'IP_TM_FILE', 'L_EMPLOYMENT_CONTRACT'],
    tags: ['startup', 'founders', 'incorporation', 'nda', 'compliance'],
    helplines: [],
  },
  {
    slug: 'msme', name: 'MSME legal resource centre', sortOrder: 60,
    headline: 'Registration, delayed payments and the compliance a small business carries',
    plainSummary:
      'Udyam registration, the statutory delayed-payment route through MSEFC and Samadhaan, vendor and service contracts, '
      + 'GST and labour compliance, and recovery when a buyer simply does not pay.',
    categories: ['RC_CORPORATE', 'RC_AGREEMENTS', 'RC_TAX', 'RC_EMPLOYMENT', 'RC_BANKING'],
    matters: ['CO_MSME_PAYMENT', 'B_RECOVERY', 'T_GST_REG', 'CN_BREACH'],
    tags: ['msme', 'udyam', 'delayed payment', 'samadhaan', 'recovery'],
    helplines: [],
  },
];

export function centreBySlug(slug: string): ResourceCentreSeed | undefined {
  return RESOURCE_CENTRES.find((c) => c.slug === slug);
}

// ---------------------------------------------------------------------------
// Disclaimers (spec §80). Context-sensitive, and never empty.
// ---------------------------------------------------------------------------

export function disclaimerFor(_type: ResourceType, status: OfficialStatus, opts?: { stateName?: string }): string {
  const jurisdiction = opts?.stateName
    ? ` This resource is prepared for ${opts.stateName}; the position differs in other states.`
    : ' Requirements differ between states and change over time.';

  switch (status) {
    case 'OFFICIAL':
      return 'This document is published by the authority named above. We link to their copy rather than hosting one, '
        + 'so that you always reach the current version — but confirm on the authority’s own site that it is current '
        + 'before you file or submit anything.' + jurisdiction;
    case 'PLATFORM_TEMPLATE':
      return 'This is a CaseADVO template, not a government or court form, and no authority has approved it. '
        + 'It is general information, not legal advice, and it has not been drafted for your facts.'
        + jurisdiction
        + ' Have it reviewed by an advocate before you rely on it for anything that matters.';
    case 'THIRD_PARTY':
      return 'This resource is published by a third party. CaseADVO neither wrote it nor verified its contents, '
        + 'and linking to it is not an endorsement.' + jurisdiction;
    case 'REFERENCE':
      return 'Background material for orientation only. It is not a form, not something to file, and not legal advice.'
        + jurisdiction;
    default:
      return 'General information only. Not legal advice.' + jurisdiction;
  }
}

/**
 * A resource claiming an official type without official status is a category
 * error the seeder must refuse — the whole library's credibility rests on it.
 */
export function assertStatusConsistent(type: ResourceType, status: OfficialStatus, slug: string): void {
  if (RESOURCE_TYPE_META[type].officialOnly && status !== 'OFFICIAL') {
    throw new Error(
      `Resource "${slug}" declares type ${type}, which is reserved for material published by the authority itself, `
      + `but its official_status is ${status}. Either the type or the status is wrong.`,
    );
  }
  if (!RESOURCE_TYPE_META[type].officialOnly && status === 'OFFICIAL' && type.startsWith('AGREEMENT')) {
    throw new Error(`Resource "${slug}" cannot be an OFFICIAL agreement template — no authority prescribes contract wording.`);
  }
}

// ---------------------------------------------------------------------------
// Quality score (spec §76). Provenance and freshness. NOT legal validity.
// ---------------------------------------------------------------------------

export interface QualityInput {
  trustLevel: number;
  officialStatus: OfficialStatus;
  lastVerifiedAt?: string | null;
  hasDescription: boolean;
  hasJurisdiction: boolean;
  hasMatter: boolean;
  hasPreview: boolean;
  linkOk: boolean;
  /** Today, injected so the function stays pure and testable. */
  now?: Date;
}

export interface QualityBreakdown {
  score: number;
  factors: Array<{ key: string; label: string; earned: number; possible: number; note: string }>;
}

/**
 * Deterministic, explainable and published — the same discipline the ranking
 * algorithm follows. A score the user cannot interrogate is a score that invites
 * them to read it as legal assurance.
 */
export function qualityScore(input: QualityInput): QualityBreakdown {
  const today = input.now ?? new Date();
  const factors: QualityBreakdown['factors'] = [];

  // Source authority — 30
  const authority = Math.max(0, 30 - (input.trustLevel - 1) * 5);
  factors.push({
    key: 'authority', label: 'Source authority', earned: authority, possible: 30,
    note: TRUST_LEVELS[input.trustLevel]?.label ?? `Level ${input.trustLevel}`,
  });

  // Freshness — 25. Verified within 90 days is full marks; decays to zero at 2 years.
  let freshness = 0;
  let freshNote = 'Never verified';
  if (input.lastVerifiedAt) {
    const days = Math.floor((today.getTime() - new Date(input.lastVerifiedAt).getTime()) / 86_400_000);
    if (days <= 90) { freshness = 25; freshNote = `Verified ${days} day${days === 1 ? '' : 's'} ago`; }
    else if (days >= 730) { freshness = 0; freshNote = `Last verified ${Math.floor(days / 365)} years ago`; }
    else { freshness = Math.round(25 * (1 - (days - 90) / 640)); freshNote = `Verified ${days} days ago`; }
  }
  factors.push({ key: 'freshness', label: 'Freshness', earned: freshness, possible: 25, note: freshNote });

  // Completeness — 20
  let completeness = 0;
  if (input.hasDescription) completeness += 8;
  if (input.hasJurisdiction) completeness += 6;
  if (input.hasMatter) completeness += 6;
  factors.push({
    key: 'completeness', label: 'Metadata completeness', earned: completeness, possible: 20,
    note: [input.hasDescription ? 'described' : 'no description',
      input.hasJurisdiction ? 'jurisdiction set' : 'no jurisdiction',
      input.hasMatter ? 'linked to a matter' : 'not linked to a matter'].join(', '),
  });

  // Reachability — 15
  factors.push({
    key: 'reachable', label: 'Source reachable', earned: input.linkOk ? 15 : 0, possible: 15,
    note: input.linkOk ? 'Last link check succeeded' : 'Last link check did not succeed',
  });

  // Previewable — 10
  factors.push({
    key: 'preview', label: 'Preview available', earned: input.hasPreview ? 10 : 0, possible: 10,
    note: input.hasPreview ? 'Can be read before downloading' : 'Opens at the source',
  });

  const score = factors.reduce((sum, f) => sum + f.earned, 0);
  return { score: Math.max(0, Math.min(100, score)), factors };
}

// ---------------------------------------------------------------------------
// Download filenames (spec §82)
// ---------------------------------------------------------------------------

/** `Maharashtra_Residential_Leave_and_License_Template.pdf`, never `doc_final_v2.pdf`. */
export function downloadFilename(parts: {
  title: string; stateName?: string | null; version?: string | null; extension: string;
}): string {
  // Prefix the state only when the title does not already carry it: a
  // state-specific document is usually titled after its state, and
  // "Maharashtra_Rent_Agreement_Maharashtra" reads like a bug.
  const needsState = parts.stateName
    && !parts.title.toLowerCase().includes(parts.stateName.toLowerCase());
  const words = (needsState ? `${parts.stateName} ${parts.title}` : parts.title)
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 2 && w === w.toLowerCase() ? w : (w[0] ?? '').toUpperCase() + w.slice(1)))
    .join('_');
  const version = parts.version && parts.version !== '1.0' ? `_v${parts.version.replace(/\./g, '-')}` : '';
  const ext = parts.extension.replace(/^\./, '');
  return `CaseADVO_${words}${version}.${ext}`.replace(/_+/g, '_');
}

// ---------------------------------------------------------------------------
// Natural-language resource search (spec §48)
// ---------------------------------------------------------------------------

export interface ResourceQueryIntent {
  /** Cleaned free text left after removing the signals we understood. */
  text: string;
  /** Resource types the phrasing points at. */
  types: ResourceType[];
  /** Category codes the phrasing points at. */
  categories: string[];
  /** State name detected in the query, matched against INDIA_STATES by the caller. */
  stateHint?: string;
  cityHint?: string;
  /** True when the user asked specifically for an official/government document. */
  officialOnly: boolean;
  /** What we recognised, shown back to the user so the routing is never a black box. */
  signals: Array<{ kind: string; value: string; from: string }>;
}

const TYPE_PHRASES: Array<[RegExp, ResourceType[], string]> = [
  [/\b(rent|rental|lease|leave and licen[cs]e|tenancy)\s*(agreement|deed|contract)?\b/i, ['AGREEMENT_TEMPLATE'], 'RC_PROPERTY'],
  [/\b(agreement|contract|deed|mou)\b/i, ['AGREEMENT_TEMPLATE'], 'RC_AGREEMENTS'],
  [/\b(legal notice|notice to|demand notice|notice for)\b/i, ['NOTICE_TEMPLATE'], 'RC_LEGAL_NOTICES'],
  [/\baffidavit\b/i, ['AFFIDAVIT_TEMPLATE'], 'RC_AFFIDAVITS'],
  [/\b(application|apply|claim form)\b/i, ['APPLICATION_TEMPLATE', 'OFFICIAL_FORM'], 'RC_APPLICATIONS'],
  [/\b(form|forms|format|proforma)\b/i, ['OFFICIAL_FORM', 'LEGAL_TEMPLATE'], ''],
  [/\bchecklist\b/i, ['CHECKLIST'], 'RC_CHECKLISTS'],
  [/\b(guide|how to|procedure|process|steps)\b/i, ['GUIDE', 'OFFICIAL_GUIDE'], 'RC_GUIDES'],
  [/\b(vakalatnama|plaint|written statement|petition|rejoinder|caveat)\b/i, ['COURT_FORM', 'LEGAL_TEMPLATE'], 'RC_COURT_DOCUMENTS'],
  [/\b(judgment|judgement|case law|ruling)\b/i, ['JUDGMENT'], 'RC_LAW'],
  [/\b(act|statute|rules|regulation|notification|circular)\b/i, ['STATUTE', 'RULE', 'REGULATION', 'CIRCULAR', 'NOTIFICATION'], 'RC_LAW'],
  [/\b(portal|website|online filing|file online)\b/i, ['RESOURCE_LINK'], 'RC_PORTALS'],
  [/\b(policy|handbook)\b/i, ['LEGAL_TEMPLATE'], 'RC_EMPLOYMENT'],
];

const CATEGORY_PHRASES: Array<[RegExp, string]> = [
  [/\b(pf|epf|provident fund|epfo|uan|pension|eps)\b/i, 'RC_PF_ESI'],
  [/\b(esi|esic)\b/i, 'RC_PF_ESI'],
  [/\b(electricity|discom|meter|power bill|bijli|current bill|load)\b/i, 'RC_ELECTRICITY'],
  [/\b(gst|income tax|itr|tds|customs|assessment|tax notice)\b/i, 'RC_TAX'],
  [/\b(consumer|defective|refund|e-?commerce|edaakhil|e-daakhil)\b/i, 'RC_CONSUMER'],
  [/\b(bank|loan|emi|cheque|credit card|upi|unauthorised transaction|ombudsman|debited|deducted from my account|unauthorised debit|account statement)\b/i, 'RC_BANKING'],
  [/\b(insurance|claim rejected|policy|mediclaim)\b/i, 'RC_INSURANCE'],
  [/\b(divorce|maintenance|custody|marriage|adoption|domestic violence|dowry|will|succession)\b/i, 'RC_FAMILY'],
  [/\b(rent|tenant|landlord|deposit|eviction|property|sale deed|mutation|society|builder|rera|possession)\b/i, 'RC_PROPERTY'],
  [/\b(employment|employee|employer|salary|wages|termination|resign|gratuity|posh|harassment at work|offer letter|appointment letter)\b/i, 'RC_EMPLOYMENT'],
  [/\b(trademark|trade mark|copyright|patent|design|brand)\b/i, 'RC_IP'],
  [/\b(cyber|hacked|phishing|online fraud|data breach|privacy|deepfake)\b/i, 'RC_CYBER'],
  // Online abuse is described in ordinary words far more often than as
  // "cybercrime", and the reporting route is the one thing that must be found.
  [/\b(harass\w*|abus\w*|stalk\w*|troll\w*|threaten\w*|blackmail\w*)\b[^.]{0,40}\b(online|internet|social media|whatsapp|instagram|facebook|message|messages|call|calls)\b|\b(online|internet|social media)\b[^.]{0,40}\b(harass\w*|abus\w*|stalk\w*|blackmail\w*|threaten\w*)/i, 'RC_CYBER'],
  [/\b(rti|right to information|information commission)\b/i, 'RC_RTI'],
  [/\b(legal aid|free lawyer|nalsa|slsa|lok adalat)\b/i, 'RC_LEGAL_AID'],
  [/\b(mediation|arbitration|settlement|conciliation)\b/i, 'RC_ADR'],
  [/\b(fir|bail|police|criminal|arrest)\b/i, 'RC_CRIMINAL'],
  [/\b(company|startup|founder|shareholder|incorporat|llp|roc|msme|udyam|partnership)\b/i, 'RC_CORPORATE'],
  [/\b(accident|challan|driving licen[cs]e|rto|vehicle)\b/i, 'RC_MOTOR'],
  [/\b(senior citizen|disability|women|child|human rights)\b/i, 'RC_RIGHTS'],
];

const OFFICIAL_PHRASES = /\b(official|government|govt|prescribed|statutory|authority|department)\b/i;

/**
 * Deterministic. No model in this path — ADR-006 applies to resource routing
 * exactly as it applies to professional routing: a classifier we can explain and
 * test beats one we cannot.
 */
export function parseResourceQuery(
  raw: string,
  stateNames: string[] = [],
  cityNames: string[] = [],
): ResourceQueryIntent {
  const query = raw.trim();
  const signals: ResourceQueryIntent['signals'] = [];
  const types = new Set<ResourceType>();
  const categories = new Set<string>();
  let remaining = ` ${query} `;

  for (const [pattern, matchedTypes, category] of TYPE_PHRASES) {
    const hit = pattern.exec(query);
    if (!hit) continue;
    for (const t of matchedTypes) types.add(t);
    if (category) categories.add(category);
    const primary = matchedTypes[0];
    if (primary) signals.push({ kind: 'document type', value: RESOURCE_TYPE_META[primary].label, from: hit[0].trim() });
  }

  for (const [pattern, category] of CATEGORY_PHRASES) {
    const hit = pattern.exec(query);
    if (!hit) continue;
    categories.add(category);
    const meta = categoryByCode(category);
    if (meta) signals.push({ kind: 'subject', value: meta.name, from: hit[0].trim() });
  }

  // Geography. Longest match first so "Uttar Pradesh" beats "Pradesh".
  let stateHint: string | undefined;
  const folded = fold(query);
  for (const name of [...stateNames].sort((a, b) => b.length - a.length)) {
    if (folded.includes(fold(name))) {
      stateHint = name;
      signals.push({ kind: 'state', value: name, from: name });
      remaining = remaining.replace(new RegExp(name, 'i'), ' ');
      break;
    }
  }
  let cityHint: string | undefined;
  for (const name of [...cityNames].sort((a, b) => b.length - a.length)) {
    if (fold(remaining).includes(fold(name))) {
      cityHint = name;
      signals.push({ kind: 'city', value: name, from: name });
      break;
    }
  }

  const officialOnly = OFFICIAL_PHRASES.test(query);
  if (officialOnly) signals.push({ kind: 'restriction', value: 'Official sources only', from: (OFFICIAL_PHRASES.exec(query) ?? [''])[0] });

  // Two phrases can point at the same conclusion — "rent agreement" matches both
  // the tenancy rule and the general agreement rule. Showing the user the same
  // signal twice makes the routing look confused when it is not.
  const seen = new Set<string>();
  const deduped = signals.filter((signal) => {
    const key = `${signal.kind}|${signal.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    text: query,
    types: [...types],
    categories: [...categories],
    stateHint,
    cityHint,
    officialOnly,
    signals: deduped,
  };
}

/**
 * Verification outcome classification. A 403 from a government site that blocks
 * automated clients is not a broken link, and treating it as one would empty the
 * library of exactly the sources that matter most.
 */
export type LinkOutcome = 'ok' | 'redirected' | 'blocked' | 'unreachable' | 'gone' | 'server_error';

export const LINK_OUTCOME_META: Record<LinkOutcome, { label: string; healthy: boolean; needsHuman: boolean; plain: string }> = {
  ok: { label: 'Reachable', healthy: true, needsHuman: false, plain: 'The source answered normally.' },
  redirected: { label: 'Moved', healthy: true, needsHuman: true, plain: 'The source now answers at a different address. The new address needs recording.' },
  blocked: { label: 'Blocked to automated checks', healthy: true, needsHuman: true, plain: 'The site refused an automated request. It may be perfectly healthy in a browser — a person has to look.' },
  unreachable: { label: 'Unreachable', healthy: false, needsHuman: true, plain: 'No response, a timeout, or a TLS failure. Could be the site, could be the network.' },
  gone: { label: 'Not found', healthy: false, needsHuman: true, plain: 'The source returned 404 or 410. The document has moved or been withdrawn.' },
  server_error: { label: 'Source error', healthy: false, needsHuman: true, plain: 'The source returned a server error. Usually temporary.' },
};

export function classifyLinkCheck(status: number, error?: string): LinkOutcome {
  if (status === 0) return 'unreachable';
  if (status === 404 || status === 410) return 'gone';
  if (status === 403 || status === 401 || status === 429) return 'blocked';
  if (status >= 500) return 'server_error';
  if (status >= 300 && status < 400) return 'redirected';
  if (status >= 200 && status < 300) return error ? 'blocked' : 'ok';
  return 'server_error';
}

/** Review cadence by type (spec §77). Official forms change without notice. */
export function reviewIntervalDays(type: ResourceType, status: OfficialStatus): number {
  if (status === 'OFFICIAL') {
    if (type === 'OFFICIAL_FORM' || type === 'COURT_FORM' || type === 'TRIBUNAL_FORM') return 90;
    if (type === 'RESOURCE_LINK') return 60;
    return 180;
  }
  if (status === 'PLATFORM_TEMPLATE') return 365;
  return 180;
}
