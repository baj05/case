/**
 * Catalogue of official resources — central authorities, courts and regulators.
 *
 * RULES THIS FILE FOLLOWS, without exception:
 *
 * 1. Every `url` was reached during authoring, either directly from this network
 *    or through a retrieval service, and its title checked against the page. A
 *    URL nobody looked at does not belong here.
 * 2. `delivery` is 'link' for everything. We have not obtained permission to
 *    rehost any government document, so the library stores metadata and points
 *    at the publisher's own copy. That is also the honest answer to "is this the
 *    current version" — the authority's copy always is.
 * 3. `officialStatus: 'OFFICIAL'` means the named authority published it. It is
 *    never used for anything Lexhall wrote.
 * 4. Where a landing page is offered rather than a direct PDF, that is
 *    deliberate: deep links to government PDFs rot within months, landing pages
 *    survive, and the landing page is where the authority itself publishes the
 *    current form.
 *
 * `confirmed` records whether the URL answered from *our* network at authoring
 * time. Several government sites refuse automated clients or fail TLS
 * negotiation from outside India; those are marked false and the seeder holds
 * them at REVIEW_REQUIRED rather than publishing something we could not see.
 */

import type { ResourceType, OfficialStatus } from './resource-taxonomy.ts';

export interface ResourceCatalogSeed {
  slug: string;
  title: string;
  description: string;
  type: ResourceType;
  officialStatus: OfficialStatus;
  /** RESOURCE_CATEGORIES code. */
  category: string;
  subcategory?: string;
  /** resource_source.code */
  source: string;
  authority: string;
  url: string;
  /** The stable page the document lives on, when `url` is the document itself. */
  landingUrl?: string;
  docFormat: 'pdf' | 'html' | 'portal' | 'xlsx' | 'docx' | 'zip';
  trustLevel: 1 | 2 | 3 | 4 | 5 | 6;
  /** legal_matter code. */
  matter?: string;
  /** practice_area code, when no single matter fits. */
  practiceArea?: string;
  /** forum code this resource belongs to. */
  forum?: string;
  panIndia: boolean;
  /** jurisdiction code (IN-MH …) when state-specific. */
  stateCode?: string;
  keywords: string[];
  /** Two or three lines of "what this actually is and when you need it". */
  notes: string[];
  /** Reached from this network during authoring. */
  confirmed: boolean;
  language?: string;
}

// ===========================================================================
// COURTS AND THE JUDICIAL SYSTEM
// ===========================================================================

const COURTS: ResourceCatalogSeed[] = [
  {
    slug: 'supreme-court-forms', title: 'Supreme Court of India — forms',
    description: 'The Supreme Court’s own forms page, including the application for a certified copy and the forms its Registry accepts.',
    type: 'COURT_FORM', officialStatus: 'OFFICIAL', category: 'RC_COURT_DOCUMENTS', subcategory: 'Court rules',
    source: 'SCI', authority: 'Supreme Court of India', url: 'https://www.sci.gov.in/forms',
    docFormat: 'html', trustLevel: 1, forum: 'F_SC', panIndia: true, confirmed: false,
    keywords: ['supreme court form', 'certified copy application', 'sci forms', 'registry form'],
    notes: [
      'These are the Supreme Court’s own forms. Nothing Lexhall writes is a substitute for them.',
      'The certified-copy application is the one most people actually need — it is how you obtain an authenticated copy of an order or judgment.',
      'The site refuses automated requests, so open it in a browser.',
    ],
  },
  {
    slug: 'supreme-court-rules', title: 'Supreme Court Rules, 2013 and amendments',
    description: 'The rules that govern practice and procedure in the Supreme Court, including the amendment notifications as published.',
    type: 'RULE', officialStatus: 'OFFICIAL', category: 'RC_LAW', subcategory: 'Rules & regulations',
    source: 'SCI', authority: 'Supreme Court of India', url: 'https://www.sci.gov.in/supreme-court-rules',
    docFormat: 'html', trustLevel: 1, forum: 'F_SC', panIndia: true, confirmed: false,
    keywords: ['supreme court rules', 'practice and procedure', 'sci rules 2013'],
    notes: [
      'The Rules prescribe the form of every petition filed in the Supreme Court — including the format of a special leave petition.',
      'Amendment notifications are listed separately; read the latest one alongside the base Rules.',
    ],
  },
  {
    slug: 'supreme-court-legal-services-committee', title: 'Supreme Court Legal Services Committee — free and subsidised legal aid',
    description: 'How to obtain legal representation in the Supreme Court through the SCLSC, including the middle-income group scheme.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_LEGAL_AID', subcategory: 'Apply for legal aid',
    source: 'SCI', authority: 'Supreme Court Legal Services Committee', url: 'https://www.sci.gov.in/legal-aid',
    docFormat: 'html', trustLevel: 1, matter: 'A_LEGAL_AID', forum: 'F_SC', panIndia: true, confirmed: false,
    keywords: ['supreme court legal aid', 'sclsc', 'middle income group scheme', 'free lawyer supreme court'],
    notes: [
      'Two distinct routes: free legal aid for those eligible under the Legal Services Authorities Act, and a subsidised middle-income group scheme with its own income ceiling.',
      'The state legal services authorities publish the SCLSC application, affidavit and Vakalatnama forms — several are in this library under Legal aid.',
    ],
  },
  {
    slug: 'ecourts-services', title: 'eCourts Services — case status, orders and cause lists',
    description: 'The national portal for case status, orders, judgments and cause lists across District and High Courts.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_PORTALS', subcategory: 'Courts & tribunals',
    source: 'ECOURTS', authority: 'eCommittee, Supreme Court of India', url: 'https://ecourts.gov.in/',
    docFormat: 'portal', trustLevel: 1, panIndia: true, confirmed: true,
    keywords: ['case status', 'ecourts', 'cause list', 'court case search', 'CNR number'],
    notes: [
      'If you have a CNR number you can track any case in the district judiciary from here without going near the court.',
      'Case status is authoritative for listing and orders; it is not a substitute for a certified copy.',
    ],
  },
  {
    slug: 'ecourts-case-status-search', title: 'eCourts case status search (services portal)',
    description: 'Search a pending or decided case by CNR, party name, advocate, FIR number or filing number.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_PORTALS', subcategory: 'Courts & tribunals',
    source: 'ECOURTS', authority: 'eCommittee, Supreme Court of India', url: 'https://services.ecourts.gov.in/ecourtindia_v6/',
    docFormat: 'portal', trustLevel: 1, panIndia: true, confirmed: true,
    keywords: ['case status search', 'cnr', 'party name search', 'advocate case list'],
    notes: [
      'The advocate-wise search is how most practitioners find their own listings for the next day.',
      'A case that does not appear here may simply not be digitised in that district yet.',
    ],
  },
  {
    slug: 'ecourts-efiling', title: 'eFiling for District and High Courts',
    description: 'The official electronic filing portal, with its user manuals and the list of courts that accept e-filing.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_PORTALS', subcategory: 'Courts & tribunals',
    source: 'EFILING', authority: 'eCommittee, Supreme Court of India', url: 'https://efiling.ecourts.gov.in/',
    docFormat: 'portal', trustLevel: 1, panIndia: true, confirmed: false,
    keywords: ['efiling', 'e-filing court', 'file case online', 'electronic filing'],
    notes: [
      'e-Filing acceptance varies by court and case type — check the court’s own notification before assuming it applies.',
      'Registration requires a mobile number and, for advocates, Bar Council enrolment details.',
    ],
  },
  {
    slug: 'ecourts-judgment-search', title: 'eCourts judgment search (full text)',
    description: 'Full-text search across the judgments and final orders published by the district judiciary and High Courts.',
    type: 'JUDGMENT', officialStatus: 'OFFICIAL', category: 'RC_LAW', subcategory: 'Judgments',
    source: 'ECOURTS', authority: 'eCommittee, Supreme Court of India', url: 'https://judgments.ecourts.gov.in/',
    docFormat: 'portal', trustLevel: 1, panIndia: true, confirmed: true,
    keywords: ['judgment search', 'free case law', 'court order search', 'full text judgment'],
    notes: [
      'Free and official — no subscription. Coverage is strongest for recent years.',
      'A judgment downloaded here is a copy of the court’s own PDF, not a headnote written by a publisher.',
    ],
  },
  {
    slug: 'njdg-pendency', title: 'National Judicial Data Grid — pendency statistics',
    description: 'Case pendency, disposal and age profile by state, district, court and case type.',
    type: 'REPORT', officialStatus: 'OFFICIAL', category: 'RC_GUIDES', subcategory: 'Cost & time',
    source: 'NJDG', authority: 'eCommittee, Supreme Court of India', url: 'https://njdg.ecourts.gov.in/njdg_v3/',
    docFormat: 'portal', trustLevel: 1, panIndia: true, confirmed: true,
    keywords: ['pendency', 'how long does a case take', 'njdg', 'case backlog', 'disposal time'],
    notes: [
      'The honest answer to "how long will this take" starts here: the age profile of pending cases in the actual court that would hear yours.',
      'Aggregate data. It tells you the distribution, not your case.',
    ],
  },
];

// ===========================================================================
// LEGAL AID AND ALTERNATIVE DISPUTE RESOLUTION
// ===========================================================================

const LEGAL_AID: ResourceCatalogSeed[] = [
  {
    slug: 'nalsa-legal-aid-eligibility', title: 'Free legal aid — who qualifies and how to apply',
    description: 'NALSA’s statement of who is entitled to free legal services under section 12 of the Legal Services Authorities Act, and the routes to apply.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_LEGAL_AID', subcategory: 'Apply for legal aid',
    source: 'NALSA', authority: 'National Legal Services Authority', url: 'https://nalsa.gov.in/legal-aid/',
    docFormat: 'html', trustLevel: 1, matter: 'A_LEGAL_AID', forum: 'F_NALSA', panIndia: true, confirmed: true,
    keywords: ['free legal aid', 'nalsa', 'free lawyer', 'legal services authority', 'section 12', 'eligibility'],
    notes: [
      'Entitlement is by category, not only by income: women, children, members of Scheduled Castes and Scheduled Tribes, persons in custody, victims of trafficking, industrial workmen, persons with disabilities and disaster victims are entitled irrespective of income, along with those under the prescribed income ceiling.',
      'You apply to the legal services institution nearest the court — DLSA at the district court, SLSA at the High Court, SCLSC at the Supreme Court.',
      'The helpline is 15100 and there is no fee for the application itself.',
    ],
  },
  {
    slug: 'nalsa-legal-aid-faqs', title: 'NALSA frequently asked questions on legal services',
    description: 'The authority’s own answers on eligibility, where to apply, what is covered and what happens after an application.',
    type: 'FAQ', officialStatus: 'OFFICIAL', category: 'RC_LEGAL_AID', subcategory: 'Apply for legal aid',
    source: 'NALSA', authority: 'National Legal Services Authority', url: 'https://nalsa.gov.in/faqs/',
    docFormat: 'html', trustLevel: 1, matter: 'A_LEGAL_AID', forum: 'F_NALSA', panIndia: true, confirmed: true,
    keywords: ['nalsa faq', 'legal aid questions', 'am i eligible for legal aid'],
    notes: [
      'Answers the questions people actually ask: whether there is a charge, whether you can choose the advocate, what happens if aid is refused.',
      'Free legal services cover court fees, process fees, drafting, and representation — not the other side’s costs if you lose.',
    ],
  },
  {
    slug: 'nalsa-lok-adalat', title: 'Lok Adalat — settlement without a trial',
    description: 'What a Lok Adalat is, which matters it can settle, and why its award is final.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_ADR', subcategory: 'Lok Adalat',
    source: 'NALSA', authority: 'National Legal Services Authority', url: 'https://nalsa.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'A_MEDIATION', forum: 'F_LOK_ADALAT', panIndia: true, confirmed: true,
    keywords: ['lok adalat', 'national lok adalat', 'settlement', 'compromise', 'no court fee'],
    notes: [
      'An award of a Lok Adalat is deemed a decree of a civil court and is final — there is no appeal from it. That cuts both ways: it ends the dispute, and it ends your right to argue it.',
      'Court fee already paid is refundable when a matter settles in Lok Adalat.',
      'Pre-litigation matters can be taken to a Lok Adalat without filing a case at all.',
    ],
  },
  {
    slug: 'nalsa-victim-compensation', title: 'Victim compensation schemes',
    description: 'Compensation for victims of crime through the legal services authorities, including the schemes for women victims and survivors of sexual assault.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_LEGAL_AID', subcategory: 'Victim compensation',
    source: 'NALSA', authority: 'National Legal Services Authority', url: 'https://nalsa.gov.in/victim-compensation/',
    docFormat: 'html', trustLevel: 1, practiceArea: 'CRIMINAL', forum: 'F_DLSA', panIndia: true, confirmed: true,
    keywords: ['victim compensation', 'compensation scheme', 'crime victim', 'interim compensation'],
    notes: [
      'Compensation is decided by the State or District Legal Services Authority, not by the trial court, and can be applied for while the trial is still running.',
      'Interim compensation is possible where the need is immediate — medical treatment, for example.',
    ],
  },
  {
    slug: 'nalsa-mediation', title: 'Mediation through the legal services authorities',
    description: 'How mediation is organised by the legal services authorities, and what a mediated settlement is worth.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_ADR', subcategory: 'Mediation',
    source: 'NALSA', authority: 'National Legal Services Authority', url: 'https://nalsa.gov.in/mediation/',
    docFormat: 'html', trustLevel: 1, matter: 'A_MEDIATION', forum: 'F_MEDIATION_CENTRE', panIndia: true, confirmed: true,
    keywords: ['mediation', 'mediation centre', 'settlement', 'court annexed mediation'],
    notes: [
      'Court-annexed mediation is free at legal services mediation centres.',
      'A settlement reached in mediation is recorded and, once the court takes it on record, is enforceable.',
    ],
  },
  {
    slug: 'nalsa-schemes', title: 'NALSA schemes for vulnerable groups',
    description: 'The authority’s standing schemes — legal services for victims of trafficking, children, senior citizens, workers, disaster victims and persons with mental illness.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_RIGHTS', subcategory: 'Human rights',
    source: 'NALSA', authority: 'National Legal Services Authority', url: 'https://nalsa.gov.in/schemes/',
    docFormat: 'html', trustLevel: 1, forum: 'F_NALSA', panIndia: true, confirmed: true,
    keywords: ['nalsa schemes', 'vulnerable groups', 'legal services scheme', 'trafficking', 'senior citizens'],
    notes: [
      'Each scheme names a specific entitlement and the institution that delivers it — useful when a DLSA is unsure whether a category is covered.',
      'The Legal Aid Defence Counsel system now provides full-time salaried defence counsel in criminal cases in most districts.',
    ],
  },
  {
    slug: 'tele-law', title: 'Tele-Law — free legal advice before a dispute becomes a case',
    description: 'Government scheme connecting citizens to a panel lawyer by video or telephone through Common Service Centres, at no cost to eligible users.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_LEGAL_AID', subcategory: 'Apply for legal aid',
    source: 'DOJ', authority: 'Department of Justice, Ministry of Law and Justice', url: 'https://www.tele-law.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'A_LEGAL_AID', panIndia: true, confirmed: true,
    keywords: ['tele law', 'free legal advice', 'panel lawyer', 'pre-litigation advice', 'CSC'],
    notes: [
      'Advice, not representation. It is the right route when you do not yet know whether you have a case.',
      'Delivered through Common Service Centres and the Tele-Law mobile app; advice is free for those entitled under the Legal Services Authorities Act and nominally priced for others.',
    ],
  },
];

// ===========================================================================
// EMPLOYMENT, PF, ESI
// ===========================================================================

const WORK: ResourceCatalogSeed[] = [
  {
    slug: 'epfo-which-claim-form', title: 'EPFO — which claim form to submit',
    description: 'EPFO’s own guidance on choosing the correct claim form by employment status and purpose, with the forms themselves.',
    type: 'OFFICIAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_PF_ESI', subcategory: 'PF claims',
    source: 'EPFO', authority: 'Employees’ Provident Fund Organisation',
    url: 'https://pmvbry.epfindia.gov.in/employee-documents',
    docFormat: 'html', trustLevel: 1, matter: 'PF_WITHDRAWAL', forum: 'F_EPFO', panIndia: true, confirmed: false,
    keywords: ['pf claim form', 'form 19', 'form 10c', 'form 31', 'form 10d', 'pf withdrawal form', 'epf form'],
    notes: [
      'The form depends on what you are claiming: final settlement, partial advance, pension, or transfer. Submitting the wrong one is the commonest cause of rejection.',
      'Composite claim forms replaced several older forms — check the current list rather than an old blog post.',
      'Most claims can now be filed online through the member portal without any paper form at all.',
    ],
  },
  {
    slug: 'epfo-member-portal', title: 'EPFO member portal — passbook, claims and UAN',
    description: 'The official member interface: activate a UAN, view the passbook, file and track claims, update KYC.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_PF_ESI', subcategory: 'PF claims',
    source: 'EPFO', authority: 'Employees’ Provident Fund Organisation',
    url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
    docFormat: 'portal', trustLevel: 1, matter: 'PF_WITHDRAWAL', forum: 'F_EPFO', panIndia: true, confirmed: true,
    keywords: ['uan login', 'pf passbook', 'epfo member portal', 'pf balance', 'file pf claim online'],
    notes: [
      'The passbook is the evidence that matters if you are alleging your employer did not deposit contributions: it shows month-by-month credits.',
      'KYC must be seeded and verified by the employer before an online claim will go through.',
    ],
  },
  {
    slug: 'epfigms-grievance', title: 'EPFiGMS — PF grievance filing',
    description: 'The EPFO grievance management system: file a grievance against an employer or an EPFO office and track it.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_PF_ESI', subcategory: 'Grievance routes',
    source: 'EPFO', authority: 'Employees’ Provident Fund Organisation', url: 'https://epfigms.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'PF_NOT_DEPOSITED', forum: 'F_EPFO', panIndia: true, confirmed: true,
    keywords: ['pf grievance', 'epfigms', 'pf not deposited complaint', 'employer not paying pf', 'pf complaint online'],
    notes: [
      'This is the first formal step when contributions are deducted from salary but not credited. Keep the registration number: it is the proof that you raised it.',
      'A grievance here is administrative. It runs in parallel with — and does not replace — an inquiry under section 7A, which is what actually determines the amount an employer owes.',
    ],
  },
  {
    slug: 'epfo-documents-downloads', title: 'EPFO documents, circulars and downloads',
    description: 'EPFO’s document library: the Act, the schemes, contribution rates, wage ceilings and circulars.',
    type: 'GOVERNMENT_DOCUMENT', officialStatus: 'OFFICIAL', category: 'RC_PF_ESI', subcategory: 'Employer filings',
    source: 'EPFO', authority: 'Employees’ Provident Fund Organisation', url: 'https://pmvbry.epfindia.gov.in/documents',
    docFormat: 'html', trustLevel: 1, practiceArea: 'PF', forum: 'F_EPFO', panIndia: true, confirmed: false,
    keywords: ['epf act', 'epf scheme 1952', 'contribution rate', 'wage ceiling', 'epfo circular'],
    notes: [
      'The Employees’ Provident Funds and Miscellaneous Provisions Act, 1952 and the three schemes made under it are here in their official text.',
      'Circulars matter in practice: they are how EPFO tells its own offices to treat a question, and they are citable.',
    ],
  },
  {
    slug: 'esic-publications-forms', title: 'ESIC forms and publications',
    description: 'ESIC’s publications library, which carries the benefit claim forms — accident report, dependants’ benefit, funeral expenses, family declaration.',
    type: 'OFFICIAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_PF_ESI', subcategory: 'ESI',
    source: 'ESIC', authority: 'Employees’ State Insurance Corporation', url: 'https://esic.gov.in/publications',
    docFormat: 'html', trustLevel: 1, matter: 'ESI_BENEFIT', forum: 'F_ESIC', panIndia: true, confirmed: false,
    keywords: ['esic form', 'form 1a', 'form 11 accident', 'form 15 dependants benefit', 'esi claim form', 'funeral expenses'],
    notes: [
      'The accident book (Form 11) and the accident report (Form 12) are the employer’s obligation — an employment injury claim is much harder without them.',
      'Regional office sites carry the same forms; use whichever loads.',
    ],
  },
  {
    slug: 'esic-portal', title: 'ESIC portal — registration and benefits',
    description: 'The ESIC portal for employer registration, insured person registration and benefit administration.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_PF_ESI', subcategory: 'ESI',
    source: 'ESIC', authority: 'Employees’ State Insurance Corporation', url: 'https://esic.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'ESI_CONTRIB', forum: 'F_ESIC', panIndia: true, confirmed: false,
    keywords: ['esic registration', 'esi portal', 'esic login', 'insured person'],
    notes: [
      'ESI applies to establishments in notified areas above the employee threshold, and to employees under the wage ceiling. Both are prescribed and both change.',
      'Medical benefit is delivered through ESIC hospitals and dispensaries — the entitlement is to treatment, not reimbursement, in most cases.',
    ],
  },
  {
    slug: 'chief-labour-commissioner', title: 'Chief Labour Commissioner (Central) — complaints and conciliation',
    description: 'The central labour machinery: conciliation officers, industrial dispute references and the complaint routes for central-sphere establishments.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_EMPLOYMENT', subcategory: 'Compliance',
    source: 'LABOUR_MIN', authority: 'Office of the Chief Labour Commissioner (Central)', url: 'https://clc.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'L_INDUSTRIAL', forum: 'F_LABOUR_COMMISSIONER', panIndia: true, confirmed: true,
    keywords: ['labour commissioner', 'industrial dispute', 'conciliation', 'unpaid wages complaint', 'clc'],
    notes: [
      'Whether your dispute is "central sphere" or "state sphere" decides which office has jurisdiction — banks, railways, mines and telecom are central; most other employers are state.',
      'Conciliation is compulsory before most industrial disputes can be referred for adjudication.',
    ],
  },
  {
    slug: 'shebox-posh-complaint', title: 'SHe-Box — workplace sexual harassment complaint',
    description: 'The government’s single-window portal for complaints of sexual harassment at the workplace under the POSH Act.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_EMPLOYMENT', subcategory: 'POSH',
    source: 'SHE_BOX', authority: 'Ministry of Women and Child Development', url: 'https://shebox.wcd.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'L_POSH', forum: 'F_POSH_IC', panIndia: true, confirmed: true,
    keywords: ['posh complaint', 'shebox', 'sexual harassment at work', 'internal committee', 'workplace harassment'],
    notes: [
      'A complaint here is routed to the Internal Committee of the employer, or to the Local Committee where the employer has none.',
      'The Act prescribes a limitation of three months from the incident, extendable by a further three months for reasons recorded.',
      'Every employer with ten or more workers must have an Internal Committee. If yours does not, that is itself a contravention.',
    ],
  },
];

// ===========================================================================
// CONSUMER
// ===========================================================================

const CONSUMER: ResourceCatalogSeed[] = [
  {
    slug: 'edaakhil-consumer-filing', title: 'e-Daakhil — file a consumer complaint online',
    description: 'The official portal for electronic filing of consumer complaints before District, State and National Commissions.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CONSUMER', subcategory: 'Filing & procedure',
    source: 'EDAAKHIL', authority: 'National Consumer Disputes Redressal Commission', url: 'https://edaakhil.nic.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'C_DEFECTIVE', forum: 'F_CONSUMER_DIST', panIndia: true, confirmed: true,
    keywords: ['consumer complaint online', 'edaakhil', 'e-daakhil', 'consumer court filing', 'consumer forum'],
    notes: [
      'You can file, pay the fee and serve notice without going to the Commission. Jurisdiction still depends on the value of the goods or services paid for.',
      'A complaint must ordinarily be filed within two years of the cause of action.',
      'The consumer route is available even where an agreement names arbitration — consumer remedies are not displaced by an arbitration clause.',
    ],
  },
  {
    slug: 'national-consumer-helpline', title: 'National Consumer Helpline',
    description: 'Pre-litigation consumer grievance redressal: register a complaint against a company and have it taken up with the company’s nodal officer.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CONSUMER', subcategory: 'Helplines',
    source: 'CONSUMER_HELPLINE', authority: 'Department of Consumer Affairs', url: 'https://consumerhelpline.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'C_SERVICE', forum: 'F_NCH', panIndia: true, confirmed: true,
    keywords: ['consumer helpline', '1915', 'complaint against company', 'nch', 'consumer grievance'],
    notes: [
      'Free, and far faster than a Commission for straightforward problems — most convergence partners respond because they have signed up to.',
      'Call 1915 or use the portal. Keep the docket number.',
      'This is not adjudication. If the company refuses, the Commission route remains open and the helpline record is useful evidence of the attempt.',
    ],
  },
  {
    slug: 'ncdrc-rules-orders', title: 'National Consumer Disputes Redressal Commission',
    description: 'The apex consumer commission: its orders, the Consumer Protection Rules and Regulations, and cause lists.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_CONSUMER', subcategory: 'Filing & procedure',
    source: 'NCDRC', authority: 'National Consumer Disputes Redressal Commission', url: 'https://ncdrc.nic.in/',
    docFormat: 'html', trustLevel: 1, matter: 'C_DEFECTIVE', forum: 'F_CONSUMER_NAT', panIndia: true, confirmed: true,
    keywords: ['ncdrc', 'consumer protection rules', 'consumer commission orders', 'revision petition consumer'],
    notes: [
      'The Commission’s own orders are the best guide to how a consumer complaint is actually decided on facts like yours.',
      'Pecuniary jurisdiction thresholds were revised under the Consumer Protection Act, 2019 — check the current limits before choosing where to file.',
    ],
  },
  {
    slug: 'consumer-affairs-department', title: 'Department of Consumer Affairs',
    description: 'The parent department: consumer protection legislation, rules, e-commerce guidelines and standards.',
    type: 'GOVERNMENT_DOCUMENT', officialStatus: 'OFFICIAL', category: 'RC_CONSUMER', subcategory: 'Complaints',
    source: 'CONSUMER_HELPLINE', authority: 'Department of Consumer Affairs', url: 'https://doca.gov.in/',
    docFormat: 'html', trustLevel: 1, practiceArea: 'CONSUMER', panIndia: true, confirmed: true,
    keywords: ['consumer protection act', 'e-commerce rules', 'consumer affairs', 'unfair trade practice'],
    notes: [
      'The Consumer Protection (E-Commerce) Rules are here — they are what an online marketplace is actually obliged to do.',
      'Guidelines on dark patterns and misleading advertisements are issued by the CCPA under this department.',
    ],
  },
  {
    slug: 'trai-consumer-complaints', title: 'TRAI — telecom consumer complaints and regulations',
    description: 'The telecom regulator: consumer protection regulations, complaint escalation, and tariff and quality-of-service orders.',
    type: 'REGULATION', officialStatus: 'OFFICIAL', category: 'RC_CONSUMER', subcategory: 'Telecom',
    source: 'TRAI', authority: 'Telecom Regulatory Authority of India', url: 'https://www.trai.gov.in/',
    docFormat: 'html', trustLevel: 2, matter: 'C_TELECOM', forum: 'F_TRAI', panIndia: true, confirmed: true,
    keywords: ['telecom complaint', 'trai', 'network problem', 'billing dispute telecom', 'dnd', 'spam calls'],
    notes: [
      'TRAI does not decide individual complaints. The route is: service provider’s complaint centre, then its appellate authority, then the consumer commission.',
      'The regulations do fix time limits for the operator to respond — quoting them moves things.',
    ],
  },
  {
    slug: 'sanchar-saathi', title: 'Sanchar Saathi — report a fraudulent connection or lost handset',
    description: 'Government portal to check the mobile connections issued in your name, block a lost handset and report suspected communication fraud.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CYBER', subcategory: 'Financial fraud',
    source: 'CYBERCRIME', authority: 'Department of Telecommunications', url: 'https://sancharsaathi.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'CY_FRAUD', panIndia: true, confirmed: true,
    keywords: ['sanchar saathi', 'lost phone', 'connections in my name', 'sim fraud', 'chakshu', 'report fraud call'],
    notes: [
      'The "know your mobile connections" check is worth running once a year — connections taken fraudulently on your identity are how SIM-swap fraud starts.',
      'A lost handset can be blocked here by IMEI so it cannot be used on any network.',
    ],
  },
];

// ===========================================================================
// BANKING, FINANCE, INSURANCE, SECURITIES
// ===========================================================================

const MONEY: ResourceCatalogSeed[] = [
  {
    slug: 'rbi-cms-complaint', title: 'RBI Ombudsman — file a complaint against a bank or NBFC',
    description: 'The Reserve Bank’s Complaint Management System, the entry point to the Integrated Ombudsman Scheme.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_BANKING', subcategory: 'Ombudsman & escalation',
    source: 'RBI', authority: 'Reserve Bank of India', url: 'https://cms.rbi.org.in/',
    docFormat: 'portal', trustLevel: 2, matter: 'B_LOAN_DISPUTE', forum: 'F_RBI_OMBUDSMAN', panIndia: true, confirmed: true,
    keywords: ['rbi ombudsman', 'bank complaint', 'cms rbi', 'banking ombudsman', 'complaint against bank'],
    notes: [
      'You must first complain to the bank and either wait 30 days or receive a rejection. A complaint filed before that is returned.',
      'One scheme now covers banks, NBFCs and payment system participants, so you no longer have to work out which ombudsman applies.',
      'There is no fee, and you do not need a lawyer.',
    ],
  },
  {
    slug: 'rbi-main', title: 'Reserve Bank of India — directions and customer protection',
    description: 'RBI’s master directions and circulars, including the limited-liability framework for unauthorised electronic transactions.',
    type: 'CIRCULAR', officialStatus: 'OFFICIAL', category: 'RC_BANKING', subcategory: 'Bank complaints',
    source: 'RBI', authority: 'Reserve Bank of India', url: 'https://www.rbi.org.in/',
    docFormat: 'html', trustLevel: 2, matter: 'B_FRAUD', panIndia: true, confirmed: true,
    keywords: ['rbi circular', 'unauthorised transaction', 'zero liability', 'master direction', 'fair practices code'],
    notes: [
      'The customer-liability circular on unauthorised electronic transactions is the single most useful document if money left your account without your authority: liability turns on how quickly you reported it.',
      'Report to the bank in writing and keep the acknowledgement. The clock starts at the bank’s receipt of your report, not at the transaction.',
    ],
  },
  {
    slug: 'sebi-scores', title: 'SEBI SCORES — complaint against a listed company or intermediary',
    description: 'SEBI’s complaint redress system for investors, covering listed companies, brokers, mutual funds and other intermediaries.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_BANKING', subcategory: 'Ombudsman & escalation',
    source: 'SEBI', authority: 'Securities and Exchange Board of India', url: 'https://scores.sebi.gov.in/',
    docFormat: 'portal', trustLevel: 2, matter: 'SE_INVESTOR', forum: 'F_SEBI_SCORES', panIndia: true, confirmed: true,
    keywords: ['scores', 'sebi complaint', 'investor grievance', 'broker complaint', 'mutual fund complaint'],
    notes: [
      'Complain to the intermediary first; SCORES expects that step and records it.',
      'SCORES is followed by the Online Dispute Resolution route (SMART ODR) for unresolved disputes — that is where a binding outcome comes from.',
    ],
  },
  {
    slug: 'sebi-main', title: 'SEBI — regulations, circulars and investor material',
    description: 'The securities regulator’s own regulations, circulars, orders and investor-education material.',
    type: 'REGULATION', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'Compliance',
    source: 'SEBI', authority: 'Securities and Exchange Board of India', url: 'https://www.sebi.gov.in/',
    docFormat: 'html', trustLevel: 2, practiceArea: 'SECURITIES', forum: 'F_SEBI', panIndia: true, confirmed: true,
    keywords: ['sebi regulations', 'lodr', 'insider trading regulations', 'icdr', 'takeover code'],
    notes: [
      'Listing obligations, insider trading, takeovers and issue of capital all live here in their consolidated form.',
      'SEBI orders are searchable and are the practical guide to how a provision is enforced.',
    ],
  },
  {
    slug: 'irdai-bima-bharosa', title: 'Bima Bharosa — insurance complaint portal',
    description: 'IRDAI’s grievance portal for policyholders, and the route to the Insurance Ombudsman.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_INSURANCE', subcategory: 'Grievance & ombudsman',
    source: 'IRDAI', authority: 'Insurance Regulatory and Development Authority of India', url: 'https://bimabharosa.irdai.gov.in/',
    docFormat: 'portal', trustLevel: 2, matter: 'I_CLAIM_REJECTED', forum: 'F_INSURANCE_OMBUDSMAN', panIndia: true, confirmed: true,
    keywords: ['insurance complaint', 'bima bharosa', 'claim rejected', 'irda complaint', 'insurance ombudsman'],
    notes: [
      'Complain to the insurer’s grievance officer first. Bima Bharosa records and escalates; it does not replace that step.',
      'The Insurance Ombudsman can award compensation up to a prescribed limit and is free to approach. There is a time limit measured from the insurer’s rejection.',
    ],
  },
  {
    slug: 'irdai-regulations', title: 'IRDAI — regulations and policyholder protection',
    description: 'The insurance regulator’s regulations, including the protection-of-policyholders’-interests framework.',
    type: 'REGULATION', officialStatus: 'OFFICIAL', category: 'RC_INSURANCE', subcategory: 'Policy review',
    source: 'IRDAI', authority: 'Insurance Regulatory and Development Authority of India', url: 'https://irdai.gov.in/',
    docFormat: 'html', trustLevel: 2, practiceArea: 'INSURANCE', panIndia: true, confirmed: true,
    keywords: ['irdai regulations', 'policyholder protection', 'claim settlement timeline', 'free look period'],
    notes: [
      'The policyholder-protection regulations fix the time within which an insurer must decide a claim and what it must tell you when it repudiates.',
      'Repudiation without stating the ground, in writing, is itself a breach worth pointing out.',
    ],
  },
  {
    slug: 'drt-recovery', title: 'Debts Recovery Tribunals',
    description: 'The tribunals that hear bank recovery applications and borrower applications under the SARFAESI Act.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_BANKING', subcategory: 'Recovery',
    source: 'DRT', authority: 'Debts Recovery Tribunals, Ministry of Finance', url: 'https://drt.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'B_RECOVERY', forum: 'F_DRT', panIndia: true, confirmed: true,
    keywords: ['drt', 'sarfaesi', 'recovery tribunal', 'securitisation application', 'bank auction challenge'],
    notes: [
      'A borrower challenging a SARFAESI measure files a securitisation application under section 17 — the limitation is short, measured in days from the measure.',
      'Appeals go to the Debts Recovery Appellate Tribunal, usually on deposit of a portion of the debt.',
    ],
  },
];

// ===========================================================================
// TAX
// ===========================================================================

const TAX: ResourceCatalogSeed[] = [
  {
    slug: 'income-tax-portal', title: 'Income Tax e-filing portal',
    description: 'The official portal for returns, responses to notices, appeals, refunds and grievances.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_TAX', subcategory: 'Income tax',
    source: 'INCOME_TAX', authority: 'Income Tax Department', url: 'https://www.incometax.gov.in/iec/foportal/',
    docFormat: 'portal', trustLevel: 1, matter: 'T_IT_NOTICE', forum: 'F_INCOME_TAX', panIndia: true, confirmed: true,
    keywords: ['income tax portal', 'itr filing', 'e-filing', 'respond to notice', 'income tax login'],
    notes: [
      'Notices are served in the portal’s e-proceedings tab as well as by email. A notice you did not open is still served.',
      'Form 35 — the first appeal to the Commissioner (Appeals) — is filed here, and the limitation is 30 days from receipt of the order.',
    ],
  },
  {
    slug: 'income-tax-return-forms', title: 'Income tax return forms and utilities',
    description: 'The department’s downloads page for ITR forms, offline utilities and the schema for each assessment year.',
    type: 'OFFICIAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_TAX', subcategory: 'Income tax',
    source: 'INCOME_TAX', authority: 'Income Tax Department',
    url: 'https://www.incometax.gov.in/iec/foportal/downloads/income-tax-returns',
    docFormat: 'html', trustLevel: 1, practiceArea: 'TAX', forum: 'F_INCOME_TAX', panIndia: true, confirmed: true,
    keywords: ['itr form', 'itr 1', 'itr 3', 'income tax form download', 'offline utility'],
    notes: [
      'Which ITR applies depends on your sources of income, not on your profession. Filing the wrong form makes the return defective.',
      'Forms are released per assessment year — do not reuse last year’s utility.',
    ],
  },
  {
    slug: 'gst-portal', title: 'GST portal',
    description: 'Registration, returns, refunds, replies to notices and appeals under the GST law.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_TAX', subcategory: 'GST registration',
    source: 'GST', authority: 'Goods and Services Tax Network', url: 'https://www.gst.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'T_GST_REG', forum: 'F_GST_OFFICER', panIndia: true, confirmed: false,
    keywords: ['gst portal', 'gst registration', 'gst return', 'gstr', 'gst login', 'gst refund'],
    notes: [
      'Every GST proceeding is numbered by form: REG for registration, RFD for refunds, DRC for demands and recovery, APL for appeals. Knowing the series tells you what stage you are at.',
      'A show-cause notice in DRC-01 has a reply window fixed in the notice itself. Missing it usually means an order under section 73 or 74 follows on the material already on record.',
      'The site refuses automated requests; open it in a browser.',
    ],
  },
  {
    slug: 'cbic-notifications', title: 'CBIC — GST and customs notifications and circulars',
    description: 'The Board’s notifications, circulars and instructions on GST, customs and central excise.',
    type: 'CIRCULAR', officialStatus: 'OFFICIAL', category: 'RC_TAX', subcategory: 'Notices & replies',
    source: 'CBIC', authority: 'Central Board of Indirect Taxes and Customs', url: 'https://www.cbic.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'T_GST_NOTICE', panIndia: true, confirmed: true,
    keywords: ['cbic circular', 'gst notification', 'customs notification', 'gst rate', 'exemption notification'],
    notes: [
      'A GST position almost always turns on a notification rather than the bare Act — the rate, the exemption and the procedure are all notified.',
      'Circulars bind the department, not the taxpayer, which makes them useful when an officer takes a contrary view.',
    ],
  },
  {
    slug: 'cestat', title: 'CESTAT — Customs, Excise and Service Tax Appellate Tribunal',
    description: 'The appellate tribunal for indirect tax matters: its orders, procedure and cause lists.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_TAX', subcategory: 'Appeals',
    source: 'CBIC', authority: 'CESTAT', url: 'https://cestat.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'T_CUSTOMS', forum: 'F_CESTAT', panIndia: true, confirmed: true,
    keywords: ['cestat', 'service tax appeal', 'customs appeal', 'excise tribunal'],
    notes: [
      'Appeals require a pre-deposit fixed by statute; the tribunal cannot simply waive it.',
      'Its orders are the practical authority on classification and valuation disputes.',
    ],
  },
];

// ===========================================================================
// CORPORATE, MSME, IP
// ===========================================================================

const BUSINESS: ResourceCatalogSeed[] = [
  {
    slug: 'mca-portal', title: 'Ministry of Corporate Affairs — company and LLP filings',
    description: 'Incorporation, annual filings, charge registration, name reservation and the forms for each.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'Incorporation & ROC',
    source: 'MCA', authority: 'Ministry of Corporate Affairs', url: 'https://www.mca.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'CO_ROC', forum: 'F_ROC', panIndia: true, confirmed: false,
    keywords: ['mca', 'company incorporation', 'spice+', 'roc filing', 'aoc-4', 'mgt-7', 'llp form', 'din'],
    notes: [
      'Incorporation runs through SPICe+, which bundles name reservation, incorporation, PAN, TAN, EPFO, ESIC and GST registration into one application.',
      'Annual filings are AOC-4 (financial statements) and MGT-7 or 7A (annual return). Late filing attracts per-day additional fees that mount quickly.',
      'The site refuses automated requests; open it in a browser.',
    ],
  },
  {
    slug: 'nclt', title: 'National Company Law Tribunal',
    description: 'The tribunal for company law and insolvency: rules, forms, cause lists and orders.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'Compliance',
    source: 'MCA', authority: 'National Company Law Tribunal', url: 'https://nclt.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'CO_INSOLVENCY', forum: 'F_NCLT', panIndia: true, confirmed: true,
    keywords: ['nclt', 'insolvency', 'ibc', 'oppression and mismanagement', 'section 7 application', 'cirp'],
    notes: [
      'An insolvency application by a financial creditor is under section 7 of the IBC; by an operational creditor, section 9 after a section 8 demand notice.',
      'The minimum default threshold for admitting an application is prescribed and has been revised — check it before filing.',
      'Oppression and mismanagement petitions under sections 241–242 also come here, not to a civil court.',
    ],
  },
  {
    slug: 'nclat', title: 'National Company Law Appellate Tribunal',
    description: 'Appeals from NCLT and from the Insolvency and Bankruptcy Board, with judgments and cause lists.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'Compliance',
    source: 'MCA', authority: 'National Company Law Appellate Tribunal', url: 'https://nclat.nic.in/',
    docFormat: 'html', trustLevel: 1, matter: 'CO_INSOLVENCY', forum: 'F_NCLAT', panIndia: true, confirmed: true,
    keywords: ['nclat', 'insolvency appeal', 'company appeal'],
    notes: [
      'The appeal period from an NCLT order under the IBC is 30 days, extendable by 15 days only.',
      'NCLAT judgments are the working law on the insolvency code between statutory amendments.',
    ],
  },
  {
    slug: 'udyam-registration', title: 'Udyam registration — MSME',
    description: 'The official portal for registering a micro, small or medium enterprise and obtaining the Udyam certificate.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'MSME',
    source: 'MSME', authority: 'Ministry of Micro, Small and Medium Enterprises', url: 'https://udyamregistration.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'CO_MSME_PAYMENT', panIndia: true, confirmed: true,
    keywords: ['udyam', 'msme registration', 'udyam certificate', 'msme number'],
    notes: [
      'Registration is free and based on your own declaration linked to PAN and GST. Anyone charging you for it is selling you nothing.',
      'The certificate is what unlocks the delayed-payment remedy: without it you cannot go to an MSEFC.',
    ],
  },
  {
    slug: 'msme-samadhaan', title: 'MSME Samadhaan — delayed payment complaint',
    description: 'File a delayed-payment reference against a buyer under the MSMED Act, heard by the Micro and Small Enterprises Facilitation Council.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'MSME',
    source: 'MSME', authority: 'Ministry of Micro, Small and Medium Enterprises', url: 'https://samadhaan.msme.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'CO_MSME_PAYMENT', forum: 'F_MSEFC', panIndia: true, confirmed: false,
    keywords: ['msme samadhaan', 'delayed payment', 'msefc', 'buyer not paying', 'msme interest'],
    notes: [
      'The MSMED Act fixes the payment period at 45 days at most and makes compound interest payable at a multiple of the RBI bank rate. That interest is statutory — it does not depend on your contract.',
      'The MSEFC must endeavour to decide a reference within 90 days. Its award is enforceable like an arbitral award.',
      'You must be Udyam-registered as a micro or small enterprise on the date of the contract.',
    ],
  },
  {
    slug: 'msme-champions-grievance', title: 'MSME CHAMPIONS grievance portal',
    description: 'The ministry’s grievance and handholding portal for micro, small and medium enterprises.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'MSME',
    source: 'MSME', authority: 'Ministry of Micro, Small and Medium Enterprises',
    url: 'https://champions.gov.in/Government-India/Ministry-MSME-Portal-handholding/msme-problem-complaint-welcome.htm',
    docFormat: 'portal', trustLevel: 1, practiceArea: 'CORPORATE', panIndia: true, confirmed: true,
    keywords: ['champions portal', 'msme grievance', 'msme complaint'],
    notes: ['For grievances about schemes, credit and clearances rather than private payment disputes — those go to Samadhaan.'],
  },
  {
    slug: 'nsws-single-window', title: 'National Single Window System — approvals and licences',
    description: 'A single application point for central and state approvals a business needs to start and operate.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'Compliance',
    source: 'NSWS', authority: 'Invest India / Department for Promotion of Industry and Internal Trade',
    url: 'https://www.nsws.gov.in/', docFormat: 'portal', trustLevel: 1, matter: 'CO_INCORP', panIndia: true, confirmed: true,
    keywords: ['single window', 'business licence', 'approvals', 'nsws', 'know your approvals'],
    notes: [
      'The "know your approvals" tool is genuinely useful: give it your sector and state and it lists the licences that actually apply.',
      'It routes to the issuing department; it does not itself grant anything.',
    ],
  },
  {
    slug: 'ipindia-trademark-forms', title: 'Trade mark forms and official fees',
    description: 'The Trade Marks Registry’s schedule of forms and fees, with each prescribed form (TM-A, TM-O, TM-R and the rest).',
    type: 'OFFICIAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_IP', subcategory: 'Trade marks',
    source: 'IPINDIA', authority: 'Office of the Controller General of Patents, Designs and Trade Marks',
    url: 'https://ipindia.gov.in/pages/trade-marks/learn/forms-and-official-fees',
    docFormat: 'html', trustLevel: 1, matter: 'IP_TM_FILE', forum: 'F_TM_REGISTRY', panIndia: true, confirmed: false,
    keywords: ['tm-a', 'trademark form', 'trade mark fees', 'tm-o opposition', 'tm-r renewal', 'trademark application form'],
    notes: [
      'TM-A is the application, TM-O the notice of opposition, TM-R the renewal. The fee differs for an individual, startup or small enterprise and for e-filing versus physical filing.',
      'Opposition must be filed within four months of publication in the Trade Marks Journal — that period is not extendable.',
    ],
  },
  {
    slug: 'ipindia-portal', title: 'Intellectual Property India — patents, designs, trade marks and GI',
    description: 'The IP office’s portal: e-filing, status search, the Journal, and the Acts and Rules for each right.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_IP', subcategory: 'Trade marks',
    source: 'IPINDIA', authority: 'Office of the Controller General of Patents, Designs and Trade Marks',
    url: 'https://ipindia.gov.in/', docFormat: 'portal', trustLevel: 1, practiceArea: 'IP', panIndia: true, confirmed: true,
    keywords: ['ip india', 'patent search', 'trademark search', 'design registration', 'gi registration', 'trademark status'],
    notes: [
      'Run the public trade mark search before you name anything. It is free, and it is the cheapest possible legal advice.',
      'Patent and design applications have absolute-novelty consequences — publishing or selling before filing can destroy the right.',
    ],
  },
  {
    slug: 'copyright-office', title: 'Copyright Office — registration and the Act',
    description: 'Copyright registration procedure, forms, fees and the Copyright Act and Rules.',
    type: 'OFFICIAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_IP', subcategory: 'Copyright',
    source: 'COPYRIGHT', authority: 'Copyright Office, DPIIT', url: 'https://copyright.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'IP_COPYRIGHT', forum: 'F_COPYRIGHT_OFFICE', panIndia: true, confirmed: false,
    keywords: ['copyright registration', 'copyright form xiv', 'software copyright', 'copyright act'],
    notes: [
      'Copyright exists on creation; registration is evidence, not the source of the right. It still matters in an infringement suit.',
      'Software is registered as a literary work, and the source-code extracts required are prescribed.',
    ],
  },
  {
    slug: 'cci-competition', title: 'Competition Commission of India',
    description: 'Competition regulations, combination filing requirements and the Commission’s orders.',
    type: 'REGULATION', officialStatus: 'OFFICIAL', category: 'RC_CORPORATE', subcategory: 'Compliance',
    source: 'CCI', authority: 'Competition Commission of India', url: 'https://www.cci.gov.in/',
    docFormat: 'html', trustLevel: 2, matter: 'CP_DOMINANCE', forum: 'F_CCI', panIndia: true, confirmed: false,
    keywords: ['cci', 'competition act', 'cartel', 'abuse of dominance', 'combination notice', 'merger control'],
    notes: [
      'Information under section 19 is how a private party brings a cartel or abuse-of-dominance allegation to the Commission.',
      'Combination notification thresholds are prescribed by value of assets and turnover, and there is now a deal-value threshold as well.',
    ],
  },
];

// ===========================================================================
// CYBER, DATA, RTI, PUBLIC LAW
// ===========================================================================

const PUBLIC: ResourceCatalogSeed[] = [
  {
    slug: 'cybercrime-reporting', title: 'National Cyber Crime Reporting Portal',
    description: 'The official route to report cybercrime, including a dedicated channel for financial fraud and for crimes against women and children.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CYBER', subcategory: 'Report a cybercrime',
    source: 'CYBERCRIME', authority: 'Ministry of Home Affairs', url: 'https://cybercrime.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'CY_FRAUD', forum: 'F_CYBERCRIME', panIndia: true, confirmed: true,
    keywords: ['cybercrime complaint', 'online fraud', 'upi fraud', 'report cyber crime', '1930', 'financial fraud'],
    notes: [
      'For money lost to fraud, speed decides the outcome. Call 1930 or file here immediately — the reporting-and-management system can freeze funds still in transit, and that window is hours, not days.',
      'Complaints about crimes against women and children can be filed anonymously.',
      'Keep every transaction reference, screenshot and phone number. The bank will ask for the complaint acknowledgement number.',
    ],
  },
  {
    slug: 'cert-in-incident', title: 'CERT-In — incident reporting and advisories',
    description: 'India’s national computer emergency response team: incident reporting obligations, directions and security advisories.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_CYBER', subcategory: 'Incident response',
    source: 'CERTIN', authority: 'Indian Computer Emergency Response Team', url: 'https://www.cert-in.org.in/',
    docFormat: 'html', trustLevel: 1, matter: 'CY_DATA', forum: 'F_CERTIN', panIndia: true, confirmed: true,
    keywords: ['cert-in', 'incident reporting', 'data breach reporting', 'cyber security directions', '6 hours'],
    notes: [
      'CERT-In directions require certain cyber incidents to be reported within six hours of noticing them. If you run a service, know this before you need it.',
      'Log-retention and KYC requirements under the same directions apply to service providers, intermediaries and data centres.',
    ],
  },
  {
    slug: 'rti-online-central', title: 'RTI Online — file an RTI to a central public authority',
    description: 'The official portal to file an RTI application and first appeal to central ministries and departments, and to pay the fee.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_RTI', subcategory: 'Portals',
    source: 'RTI_ONLINE', authority: 'Department of Personnel and Training', url: 'https://rtionline.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'PU_RTI', forum: 'F_PIO', panIndia: true, confirmed: true,
    keywords: ['rti online', 'file rti', 'rti application', 'rti fee', 'first appeal rti'],
    notes: [
      'Ten rupees, and free for those below the poverty line. A PIO must ordinarily reply within 30 days — 48 hours where life or liberty is involved.',
      'This portal covers central public authorities only. State public authorities have their own portals or accept applications on paper.',
      'Ask for documents and records, not for opinions or reasons — an RTI is a right to information held, not a right to an explanation.',
    ],
  },
  {
    slug: 'central-information-commission', title: 'Central Information Commission — second appeal',
    description: 'The Commission that hears second appeals and complaints under the RTI Act, with its decisions and procedure.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_RTI', subcategory: 'Appeals',
    source: 'CIC', authority: 'Central Information Commission', url: 'https://cic.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'PU_RTI', forum: 'F_CIC', panIndia: true, confirmed: true,
    keywords: ['cic', 'second appeal rti', 'information commission', 'rti appeal decision'],
    notes: [
      'The order is: application to the PIO, first appeal to the First Appellate Authority within 30 days, second appeal to the Commission within 90 days of the first appellate order.',
      'Commission decisions are searchable and are the practical law on what counts as an exemption under section 8.',
    ],
  },
  {
    slug: 'cpgrams-grievance', title: 'CPGRAMS — public grievance against any government department',
    description: 'The centralised public grievance redress and monitoring system for central ministries, departments and their organisations.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_APPLICATIONS', subcategory: 'Grievance & redress',
    source: 'PGPORTAL', authority: 'Department of Administrative Reforms and Public Grievances',
    url: 'https://pgportal.gov.in/', docFormat: 'portal', trustLevel: 1, matter: 'PU_SERVICE', panIndia: true, confirmed: true,
    keywords: ['cpgrams', 'government complaint', 'public grievance', 'pgportal', 'complaint against department'],
    notes: [
      'The right route for administrative inaction — a pending file, an unpaid claim, a decision nobody will make.',
      'Not for matters that are sub judice, service matters of government employees, or RTI requests, each of which has its own channel.',
    ],
  },
  {
    slug: 'nhrc-complaint', title: 'National Human Rights Commission — complaint procedure',
    description: 'How to complain to the NHRC about a violation of human rights by a public servant, and what it can do.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_RIGHTS', subcategory: 'Human rights',
    source: 'NHRC_SOURCE', authority: 'National Human Rights Commission', url: 'https://nhrc.nic.in/',
    docFormat: 'html', trustLevel: 1, matter: 'R_HUMAN_RIGHTS', forum: 'F_NHRC', panIndia: true, confirmed: true,
    keywords: ['nhrc complaint', 'human rights', 'custodial death', 'police excess', 'human rights commission'],
    notes: [
      'There is no fee and no prescribed form; a plain complaint by post, email or the portal is enough.',
      'The Commission’s recommendations are not self-executing, but a recorded finding carries weight in later proceedings.',
      'A State Human Rights Commission may be closer and has concurrent jurisdiction in many matters.',
    ],
  },
  {
    slug: 'ncw-complaint', title: 'National Commission for Women — complaint routes',
    description: 'The Commission’s complaint mechanism and the categories of grievance it takes up.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_RIGHTS', subcategory: 'Women',
    source: 'NCW', authority: 'National Commission for Women', url: 'https://www.ncw.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'F_DV', panIndia: true, confirmed: true,
    keywords: ['ncw complaint', 'women commission', 'complaint against harassment', 'dowry complaint'],
    notes: [
      'The Commission can take up a complaint with the police or employer and hold hearings. It does not itself decide a criminal case.',
      'State Commissions for Women exist in most states and are often faster to reach.',
    ],
  },
  {
    slug: 'passport-seva', title: 'Passport Seva — applications, annexures and police verification',
    description: 'Passport application and re-issue, the annexures, and the document advisor that tells you what your case needs.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_APPLICATIONS', subcategory: 'Certificates & records',
    source: 'PASSPORT', authority: 'Ministry of External Affairs', url: 'https://www.passportindia.gov.in/psp',
    docFormat: 'portal', trustLevel: 1, matter: 'IM_PASSPORT', forum: 'F_PASSPORT_OFFICE', panIndia: true, confirmed: true,
    keywords: ['passport application', 'annexure', 'police verification', 'passport name change', 'tatkaal'],
    notes: [
      'The document advisor is the part worth using: it lists the exact annexure for your circumstances, including name change after marriage or divorce and pending criminal proceedings.',
      'A name change in a passport ordinarily requires the deed of change and newspaper publication, which is why the name-change affidavit in this library exists.',
    ],
  },
  {
    slug: 'parivahan-services', title: 'Parivahan Sewa — licence, registration and accident services',
    description: 'Driving licence, vehicle registration, transfer of ownership, challans and the road-accident reporting scheme.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_MOTOR', subcategory: 'Licence & registration',
    source: 'PARIVAHAN', authority: 'Ministry of Road Transport and Highways', url: 'https://parivahan.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'MO_CHALLAN', forum: 'F_RTO', panIndia: true, confirmed: true,
    keywords: ['driving licence', 'rc transfer', 'challan payment', 'vehicle registration', 'echallan'],
    notes: [
      'Transfer of ownership within the prescribed period after sale matters: until it is recorded, the registered owner keeps carrying the exposure.',
      'The detailed accident report scheme requires the police to file a report within a fixed timetable — it is the backbone of a motor accident claim.',
    ],
  },
  {
    slug: 'ngt', title: 'National Green Tribunal',
    description: 'The tribunal for environmental matters: its practice, orders and the route to approach it.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_PORTALS', subcategory: 'Courts & tribunals',
    source: 'NGT', authority: 'National Green Tribunal', url: 'https://www.greentribunal.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'EN_POLLUTION', forum: 'F_NGT', panIndia: true, confirmed: true,
    keywords: ['ngt', 'environment tribunal', 'pollution complaint', 'environmental clearance challenge'],
    notes: [
      'The NGT can be approached by any person aggrieved, and its jurisdiction covers the specified environmental statutes only.',
      'Applications generally carry a limitation of six months from the cause of action.',
    ],
  },
  {
    slug: 'cat-central-administrative-tribunal', title: 'Central Administrative Tribunal',
    description: 'The tribunal for service matters of central government employees.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_PORTALS', subcategory: 'Courts & tribunals',
    source: 'CAT', authority: 'Central Administrative Tribunal', url: 'https://cgat.gov.in/',
    docFormat: 'html', trustLevel: 1, matter: 'PU_SERVICE', forum: 'F_CAT', panIndia: true, confirmed: true,
    keywords: ['cat', 'service matter', 'government employee dispute', 'administrative tribunal', 'oa'],
    notes: [
      'A central government servant with a service grievance goes here, not to the civil court.',
      'You must ordinarily exhaust the departmental representation route first, and the application has a limitation period running from the order complained of.',
    ],
  },
  {
    slug: 'tdsat', title: 'TDSAT — Telecom Disputes Settlement and Appellate Tribunal',
    description: 'The tribunal for telecom, broadcasting, cable and cyber appeals.',
    type: 'TRIBUNAL_FORM', officialStatus: 'OFFICIAL', category: 'RC_PORTALS', subcategory: 'Courts & tribunals',
    source: 'TRAI', authority: 'TDSAT', url: 'https://tdsat.gov.in/', docFormat: 'html', trustLevel: 1,
    matter: 'C_TELECOM', forum: 'F_TDSAT', panIndia: true, confirmed: true,
    keywords: ['tdsat', 'telecom dispute', 'broadcasting dispute', 'cyber appellate'],
    notes: [
      'TDSAT hears disputes between a licensor and licensee, between service providers, and between a provider and a group of consumers — not an individual consumer complaint.',
      'An individual telecom grievance goes to the operator and then the consumer commission.',
    ],
  },
  {
    slug: 'ncrb-crime-data', title: 'National Crime Records Bureau — data and the CCTNS framework',
    description: 'Official crime statistics and the national framework behind online FIR and complaint services.',
    type: 'REPORT', officialStatus: 'OFFICIAL', category: 'RC_CRIMINAL', subcategory: 'Rights & procedure',
    source: 'NCRB', authority: 'National Crime Records Bureau', url: 'https://www.ncrb.gov.in/',
    docFormat: 'html', trustLevel: 1, practiceArea: 'CRIMINAL', panIndia: true, confirmed: true,
    keywords: ['ncrb', 'crime statistics', 'cctns', 'crime in india report'],
    notes: ['Useful for context and for policy argument, not for an individual case.'],
  },
  {
    slug: 'digital-police-citizen-services', title: 'Police citizen services — FIR status, complaints and verification',
    description: 'The national police portal linking to each state’s citizen services: FIR view, complaint registration, tenant and character verification.',
    type: 'RESOURCE_LINK', officialStatus: 'OFFICIAL', category: 'RC_CRIMINAL', subcategory: 'FIR & complaints',
    source: 'MHA', authority: 'Ministry of Home Affairs', url: 'https://police.gov.in/',
    docFormat: 'portal', trustLevel: 1, matter: 'CR_FIR', forum: 'F_POLICE', panIndia: true, confirmed: true,
    keywords: ['fir status', 'online police complaint', 'tenant verification', 'police clearance', 'e-fir'],
    notes: [
      'Tenant police verification is offered by several state police forces online. Where it exists, landlords should use it — and the tenancy checklist in this library says why.',
      'An online complaint is not always an FIR. If a cognizable offence is disclosed and the police will not register an FIR, the remedy is a complaint to the Superintendent of Police and then to the Magistrate.',
    ],
  },
];

// ===========================================================================
// ELECTRICITY — central layer. State DISCOMs live in resource-catalog-states.ts
// ===========================================================================

const ELECTRICITY: ResourceCatalogSeed[] = [
  {
    slug: 'cerc-regulations', title: 'Central Electricity Regulatory Commission',
    description: 'Central electricity regulations, tariff orders and the framework the state commissions work within.',
    type: 'REGULATION', officialStatus: 'OFFICIAL', category: 'RC_ELECTRICITY', subcategory: 'Regulators & ombudsmen',
    source: 'CERC', authority: 'Central Electricity Regulatory Commission', url: 'https://cercind.gov.in/',
    docFormat: 'html', trustLevel: 2, matter: 'E_TARIFF', forum: 'F_ELEC_CERC', panIndia: true, confirmed: true,
    keywords: ['cerc', 'electricity regulation', 'tariff order', 'inter state transmission'],
    notes: [
      'CERC governs inter-state generation and transmission. A household billing dispute is not its subject — that belongs to your state commission and your distribution company’s grievance forum.',
      'Its regulations still matter for open access and for large consumers.',
    ],
  },
  {
    slug: 'electricity-consumer-rights-framework', title: 'Electricity consumer rights — the statutory framework',
    description: 'How the Electricity Act and the consumer-rights rules structure billing complaints, new connections, meters and compensation for failures of supply.',
    type: 'OFFICIAL_GUIDE', officialStatus: 'OFFICIAL', category: 'RC_ELECTRICITY', subcategory: 'Billing disputes',
    source: 'CERC', authority: 'Ministry of Power', url: 'https://cercind.gov.in/',
    docFormat: 'html', trustLevel: 2, matter: 'E_BILL_EXCESS', forum: 'F_ELEC_CGRF', panIndia: true, confirmed: true,
    keywords: ['electricity rights', 'consumer rights rules', 'new connection timeline', 'compensation electricity'],
    notes: [
      'The escalation ladder is fixed: distribution company complaint centre, then the Consumer Grievance Redressal Forum of that company, then the Electricity Ombudsman for that state.',
      'The rules prescribe maximum timelines for a new connection and provide automatic compensation for specified failures. Most consumers never claim it because nobody tells them it exists.',
      'An allegation of theft under section 135 is a criminal matter heard by a Special Court, and is a different track from a billing dispute — do not let the two be conflated.',
    ],
  },
];

export const CATALOG_CENTRAL: ResourceCatalogSeed[] = [
  ...COURTS, ...LEGAL_AID, ...WORK, ...CONSUMER, ...MONEY, ...TAX, ...BUSINESS, ...PUBLIC, ...ELECTRICITY,
];
