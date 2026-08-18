/**
 * Seed taxonomy: practice areas, plain-language synonyms, matter types,
 * languages. This is CONFIGURATION, not fabricated records — it describes
 * categories of law, not people. No advocate, firm, judgment or credential is
 * ever hardcoded anywhere in this codebase (spec §96).
 *
 * `synonyms` is what lets a stressed non-lawyer type "my employer hasn't paid
 * my PF" and reach the right professional without knowing the phrase
 * "provident fund dispute".
 */

export interface PracticeAreaSeed {
  code: string;
  name: string;
  slug: string;
  plainSummary: string;
  parent?: string;
  sortOrder?: number;
  /** [phrase, weight, kind] — higher weight is a stronger signal. */
  synonyms: Array<[string, number, 'plain' | 'term' | 'statute']>;
}

export const PRACTICE_AREAS: PracticeAreaSeed[] = [
  // ---------------------------------------------------------------- LABOUR
  {
    code: 'LABOUR', name: 'Labour & Employment', slug: 'labour-employment', sortOrder: 10,
    plainSummary: 'Disputes and compliance between employers and employees — wages, dismissal, provident fund, insurance and workplace conditions.',
    synonyms: [['labour law', 9, 'term'], ['labor law', 9, 'term'], ['employment law', 9, 'term'],
      ['employment lawyer', 8, 'plain'], ['labour lawyer', 9, 'plain'], ['industrial dispute', 8, 'term'],
      ['workplace dispute', 7, 'plain'], ['my employer', 6, 'plain'], ['fired from job', 7, 'plain'],
      ['sacked', 6, 'plain'], ['terminated', 6, 'plain'], ['salary not paid', 7, 'plain'],
      ['unpaid wages', 8, 'plain'], ['industrial disputes act', 9, 'statute']],
  },
  {
    code: 'PF', name: 'Provident Fund (PF)', slug: 'provident-fund', parent: 'LABOUR', sortOrder: 11,
    plainSummary: 'Employee provident fund — contributions not deposited, withdrawal problems, employer default and EPFO proceedings.',
    synonyms: [['pf', 10, 'plain'], ['provident fund', 10, 'term'], ['epf', 10, 'term'], ['epfo', 10, 'term'],
      ['pf not deposited', 10, 'plain'], ['pf dispute', 10, 'plain'], ['pf withdrawal', 9, 'plain'],
      ['employer not depositing pf', 10, 'plain'], ['pf not credited', 10, 'plain'],
      ['provident fund act', 9, 'statute'], ['ep&mp act', 8, 'statute'], ['pf compliance', 9, 'plain']],
  },
  {
    code: 'ESI', name: 'Employees State Insurance (ESI)', slug: 'employees-state-insurance', parent: 'LABOUR', sortOrder: 12,
    plainSummary: 'ESI registration, contributions, benefit claims, inspections and disputes under the Employees State Insurance Act.',
    synonyms: [['esi', 10, 'plain'], ['esic', 10, 'term'], ['employees state insurance', 10, 'term'],
      ['esi compliance', 10, 'plain'], ['esi claim', 9, 'plain'], ['esi contribution', 9, 'plain'],
      ['esi act', 9, 'statute'], ['medical benefit claim', 6, 'plain']],
  },
  {
    code: 'LABOUR_COMPLIANCE', name: 'Labour Compliance & Audits', slug: 'labour-compliance', parent: 'LABOUR', sortOrder: 13,
    plainSummary: 'Statutory registers, returns, licences, inspections and audits across central and state labour legislation.',
    synonyms: [['labour compliance', 10, 'plain'], ['statutory compliance', 9, 'plain'],
      ['labour audit', 9, 'plain'], ['labour inspection', 9, 'plain'], ['shops and establishments', 8, 'statute'],
      ['contract labour', 8, 'term'], ['minimum wages', 8, 'statute'], ['payment of wages', 8, 'statute'],
      ['gratuity', 8, 'term'], ['bonus act', 7, 'statute'], ['factories act', 8, 'statute'],
      ['pf esi compliance', 10, 'plain'], ['labour licence', 8, 'plain']],
  },
  {
    code: 'POSH', name: 'Workplace Harassment (POSH)', slug: 'workplace-harassment-posh', parent: 'LABOUR', sortOrder: 14,
    plainSummary: 'Prevention of sexual harassment at the workplace — internal committees, inquiries and compliance.',
    synonyms: [['posh', 10, 'term'], ['sexual harassment at workplace', 10, 'plain'],
      ['posh act', 10, 'statute'], ['internal committee', 8, 'term'], ['icc', 7, 'term'],
      ['harassment at work', 9, 'plain']],
  },
  // --------------------------------------------------------------- CORPORATE
  {
    code: 'CORPORATE', name: 'Corporate & Commercial', slug: 'corporate-commercial', sortOrder: 20,
    plainSummary: 'Company formation and governance, commercial agreements, shareholder matters and regulatory filings.',
    synonyms: [['corporate law', 10, 'term'], ['corporate lawyer', 10, 'plain'], ['commercial law', 9, 'term'],
      ['company law', 9, 'term'], ['companies act', 9, 'statute'], ['business lawyer', 8, 'plain'],
      ['shareholder dispute', 8, 'plain'], ['startup lawyer', 8, 'plain'], ['corporate governance', 8, 'term'],
      ['due diligence', 7, 'term'], ['mergers', 8, 'term'], ['m&a', 9, 'term'], ['acquisition', 7, 'term']],
  },
  {
    code: 'CONTRACT', name: 'Contracts', slug: 'contracts', parent: 'CORPORATE', sortOrder: 21,
    plainSummary: 'Drafting, reviewing and negotiating agreements, and acting on breach of contract.',
    synonyms: [['contract', 10, 'plain'], ['contract law', 10, 'term'], ['agreement drafting', 10, 'plain'],
      ['contract review', 10, 'plain'], ['nda', 9, 'plain'], ['vendor agreement', 9, 'plain'],
      ['breach of contract', 10, 'plain'], ['service agreement', 8, 'plain'],
      ['contract act', 8, 'statute'], ['review my contract', 10, 'plain'], ['msa', 7, 'term']],
  },
  {
    code: 'INSOLVENCY', name: 'Insolvency & Bankruptcy', slug: 'insolvency-bankruptcy', parent: 'CORPORATE', sortOrder: 22,
    plainSummary: 'Corporate insolvency resolution, liquidation, creditor claims and proceedings before the NCLT.',
    synonyms: [['insolvency', 10, 'term'], ['ibc', 10, 'statute'], ['bankruptcy', 10, 'plain'],
      ['nclt', 9, 'term'], ['liquidation', 9, 'term'], ['corporate insolvency', 10, 'term'],
      ['winding up', 8, 'term'], ['recovery of debt', 7, 'plain'], ['cirp', 8, 'term']],
  },
  {
    code: 'TAX', name: 'Tax', slug: 'tax', sortOrder: 30,
    plainSummary: 'Direct and indirect tax advice, assessments, appeals and litigation including GST and income tax.',
    synonyms: [['tax', 10, 'plain'], ['tax lawyer', 10, 'plain'], ['gst', 10, 'term'],
      ['income tax', 10, 'term'], ['tax notice', 10, 'plain'], ['tax appeal', 9, 'plain'],
      ['itat', 8, 'term'], ['tax assessment', 9, 'plain'], ['customs', 7, 'term'], ['excise', 7, 'term'],
      ['tds', 8, 'term'], ['tax evasion notice', 8, 'plain']],
  },
  // ---------------------------------------------------------------- DISPUTES
  {
    code: 'CIVIL', name: 'Civil Litigation', slug: 'civil-litigation', sortOrder: 40,
    plainSummary: 'Civil suits, recovery, injunctions, declarations and appeals before civil courts.',
    synonyms: [['civil case', 10, 'plain'], ['civil lawyer', 10, 'plain'], ['civil litigation', 10, 'term'],
      ['civil suit', 10, 'term'], ['recovery suit', 9, 'plain'], ['injunction', 8, 'term'],
      ['money recovery', 9, 'plain'], ['someone owes me money', 8, 'plain'], ['cpc', 8, 'statute']],
  },
  {
    code: 'CRIMINAL', name: 'Criminal', slug: 'criminal', sortOrder: 41,
    plainSummary: 'Bail, FIR and investigation, trial defence, quashing and criminal appeals.',
    synonyms: [['criminal lawyer', 10, 'plain'], ['criminal case', 10, 'plain'], ['bail', 10, 'plain'],
      ['fir', 10, 'plain'], ['arrested', 10, 'plain'], ['police case', 9, 'plain'],
      ['anticipatory bail', 10, 'plain'], ['quashing', 8, 'term'], ['bns', 8, 'statute'],
      ['ipc', 8, 'statute'], ['bnss', 7, 'statute'], ['cheating case', 8, 'plain'], ['420', 7, 'plain']],
  },
  {
    code: 'FAMILY', name: 'Family', slug: 'family', sortOrder: 42,
    plainSummary: 'Divorce, maintenance, child custody, guardianship, adoption and matrimonial disputes.',
    synonyms: [['divorce', 10, 'plain'], ['divorce lawyer', 10, 'plain'], ['family lawyer', 10, 'plain'],
      ['maintenance', 9, 'plain'], ['child custody', 10, 'plain'], ['custody', 9, 'plain'],
      ['alimony', 9, 'plain'], ['matrimonial', 9, 'term'], ['mutual consent divorce', 10, 'plain'],
      ['domestic violence', 10, 'plain'], ['498a', 8, 'plain'], ['guardianship', 8, 'term'],
      ['adoption', 8, 'plain'], ['my wife', 5, 'plain'], ['my husband', 5, 'plain']],
  },
  {
    code: 'PROPERTY', name: 'Property & Real Estate', slug: 'property-real-estate', sortOrder: 43,
    plainSummary: 'Title, sale and purchase, tenancy and eviction, partition, builder disputes and RERA matters.',
    synonyms: [['property', 10, 'plain'], ['property lawyer', 10, 'plain'], ['real estate', 10, 'term'],
      ['landlord', 10, 'plain'], ['tenant', 10, 'plain'], ['eviction', 10, 'plain'],
      ['rent agreement', 9, 'plain'], ['security deposit', 10, 'plain'],
      ['landlord not returning deposit', 10, 'plain'], ['rera', 10, 'term'], ['builder delay', 10, 'plain'],
      ['possession not given', 9, 'plain'], ['partition', 8, 'term'], ['title verification', 8, 'plain'],
      ['sale deed', 8, 'plain'], ['mutation', 7, 'term']],
  },
  {
    code: 'CONSUMER', name: 'Consumer', slug: 'consumer', sortOrder: 44,
    plainSummary: 'Defective goods, deficient services, unfair trade practices and consumer commission complaints.',
    synonyms: [['consumer', 10, 'plain'], ['consumer court', 10, 'plain'], ['consumer complaint', 10, 'plain'],
      ['defective product', 9, 'plain'], ['refund not given', 9, 'plain'],
      ['consumer protection act', 9, 'statute'], ['insurance claim rejected', 9, 'plain'],
      ['deficiency in service', 8, 'term']],
  },
  // ---------------------------------------------------------------- IP / TECH
  {
    code: 'IP', name: 'Intellectual Property', slug: 'intellectual-property', sortOrder: 50,
    plainSummary: 'Trade marks, copyright, patents and designs — registration, opposition and infringement.',
    synonyms: [['trademark', 10, 'plain'], ['trade mark', 10, 'term'], ['ip lawyer', 10, 'plain'],
      ['intellectual property', 10, 'term'], ['copyright', 10, 'plain'], ['patent', 10, 'plain'],
      ['brand name registration', 9, 'plain'], ['infringement', 9, 'term'], ['passing off', 7, 'term'],
      ['design registration', 8, 'plain'], ['logo copied', 8, 'plain']],
  },
  {
    code: 'TECH', name: 'Technology, Data & Cyber', slug: 'technology-data-cyber', sortOrder: 51,
    plainSummary: 'Data protection, IT Act matters, cybercrime, online fraud, platform and technology contracts.',
    synonyms: [['cyber', 10, 'plain'], ['cyber crime', 10, 'plain'], ['cyber lawyer', 10, 'plain'],
      ['data protection', 10, 'term'], ['dpdp', 10, 'statute'], ['privacy', 8, 'plain'],
      ['online fraud', 10, 'plain'], ['it act', 9, 'statute'], ['hacking', 9, 'plain'],
      ['defamation online', 8, 'plain'], ['social media case', 8, 'plain'], ['upi fraud', 9, 'plain']],
  },
  // ----------------------------------------------------------------- PUBLIC
  {
    code: 'CONSTITUTIONAL', name: 'Constitutional & Writs', slug: 'constitutional-writs', sortOrder: 60,
    plainSummary: 'Writ petitions, fundamental rights, judicial review and public interest litigation.',
    synonyms: [['writ', 10, 'term'], ['writ petition', 10, 'term'], ['constitutional', 10, 'term'],
      ['fundamental rights', 9, 'term'], ['pil', 10, 'term'], ['public interest litigation', 10, 'term'],
      ['article 226', 9, 'statute'], ['article 32', 9, 'statute'], ['government action', 6, 'plain']],
  },
  {
    code: 'ADMIN_SERVICE', name: 'Administrative & Service', slug: 'administrative-service', sortOrder: 61,
    plainSummary: 'Government service matters, promotions, pensions, disciplinary proceedings and tribunal cases.',
    synonyms: [['service matter', 10, 'term'], ['cat', 9, 'term'], ['pension', 9, 'plain'],
      ['departmental enquiry', 9, 'plain'], ['promotion dispute', 8, 'plain'],
      ['government employee', 8, 'plain'], ['administrative tribunal', 9, 'term'], ['suspension', 7, 'plain']],
  },
  {
    code: 'BANKING', name: 'Banking & Finance', slug: 'banking-finance', sortOrder: 62,
    plainSummary: 'Loan and recovery proceedings, SARFAESI, DRT matters, guarantees and financial regulation.',
    synonyms: [['banking', 10, 'term'], ['loan recovery', 10, 'plain'], ['sarfaesi', 10, 'statute'],
      ['drt', 9, 'term'], ['bank notice', 9, 'plain'], ['npa', 8, 'term'],
      ['cheque bounce', 10, 'plain'], ['138 ni act', 9, 'statute'], ['guarantee', 7, 'term']],
  },
  {
    code: 'ENVIRONMENT', name: 'Environment', slug: 'environment', sortOrder: 63,
    plainSummary: 'Environmental clearances, pollution control, NGT proceedings and compliance.',
    synonyms: [['environment', 10, 'term'], ['ngt', 10, 'term'], ['pollution', 9, 'plain'],
      ['environmental clearance', 9, 'plain'], ['green tribunal', 9, 'term']],
  },
  {
    code: 'COMPETITION', name: 'Competition', slug: 'competition', sortOrder: 64,
    plainSummary: 'Anti-competitive agreements, abuse of dominance, merger control and CCI proceedings.',
    synonyms: [['competition law', 10, 'term'], ['cci', 10, 'term'], ['antitrust', 10, 'term'],
      ['abuse of dominance', 9, 'term'], ['merger control', 8, 'term']],
  },
  // -------------------------------------------------------------------- ADR
  {
    code: 'ARBITRATION', name: 'Arbitration', slug: 'arbitration', sortOrder: 70,
    plainSummary: 'Domestic and international arbitration, enforcement and setting aside of awards.',
    synonyms: [['arbitration', 10, 'term'], ['arbitrator', 10, 'plain'], ['arbitral award', 9, 'term'],
      ['section 34', 8, 'statute'], ['section 11', 8, 'statute'], ['institutional arbitration', 8, 'term'],
      ['arbitration and conciliation act', 9, 'statute']],
  },
  {
    code: 'MEDIATION', name: 'Mediation', slug: 'mediation', sortOrder: 71,
    plainSummary: 'Facilitated settlement of disputes through a neutral mediator, including pre-litigation mediation.',
    synonyms: [['mediation', 10, 'term'], ['mediator', 10, 'plain'], ['settlement', 8, 'plain'],
      ['mediation act', 9, 'statute'], ['pre litigation mediation', 9, 'term'], ['conciliation', 8, 'term']],
  },
  {
    code: 'LPO', name: 'Legal Process Outsourcing', slug: 'legal-process-outsourcing', sortOrder: 80,
    plainSummary: 'Outsourced legal support — research, document review, contract abstraction, compliance and litigation support.',
    synonyms: [['lpo', 10, 'term'], ['legal process outsourcing', 10, 'term'],
      ['document review', 9, 'plain'], ['legal research support', 9, 'plain'],
      ['contract abstraction', 9, 'term'], ['e-discovery', 8, 'term'], ['litigation support', 9, 'plain'],
      ['legal back office', 8, 'plain'], ['paralegal support', 8, 'plain']],
  },
];

export interface MatterTypeSeed {
  code: string; name: string; slug: string;
  category: 'advisory' | 'transactional' | 'litigation' | 'compliance' | 'adr' | 'outsourcing';
  plainSummary: string; sortOrder: number;
}

export const MATTER_TYPES: MatterTypeSeed[] = [
  { code: 'CONSULT', name: 'Consultation', slug: 'consultation', category: 'advisory', sortOrder: 10, plainSummary: 'A conversation to understand your position and options.' },
  { code: 'OPINION', name: 'Legal opinion', slug: 'legal-opinion', category: 'advisory', sortOrder: 20, plainSummary: 'A written view on a specific legal question.' },
  { code: 'NOTICE', name: 'Legal notice', slug: 'legal-notice', category: 'advisory', sortOrder: 30, plainSummary: 'A formal notice sent on your behalf before proceedings.' },
  { code: 'DRAFT', name: 'Drafting', slug: 'drafting', category: 'transactional', sortOrder: 40, plainSummary: 'Preparation of an agreement, deed or application.' },
  { code: 'REVIEW', name: 'Document review', slug: 'document-review', category: 'transactional', sortOrder: 50, plainSummary: 'Review of a document you already have, with risks flagged.' },
  { code: 'DILIGENCE', name: 'Due diligence', slug: 'due-diligence', category: 'transactional', sortOrder: 60, plainSummary: 'Investigation of a company, property or transaction.' },
  { code: 'REPRESENT', name: 'Court representation', slug: 'court-representation', category: 'litigation', sortOrder: 70, plainSummary: 'Appearance and conduct of a case before a court or tribunal.' },
  { code: 'LOCAL_COUNSEL', name: 'Local counsel', slug: 'local-counsel', category: 'litigation', sortOrder: 80, plainSummary: 'A professional in another jurisdiction acting alongside your existing counsel.' },
  { code: 'COMPLIANCE', name: 'Compliance support', slug: 'compliance-support', category: 'compliance', sortOrder: 90, plainSummary: 'Ongoing statutory compliance, filings and registers.' },
  { code: 'AUDIT', name: 'Compliance audit', slug: 'compliance-audit', category: 'compliance', sortOrder: 100, plainSummary: 'A review of current compliance posture with a remediation plan.' },
  { code: 'MEDIATE', name: 'Mediation', slug: 'mediation-service', category: 'adr', sortOrder: 110, plainSummary: 'A neutral mediator helping the parties reach settlement.' },
  { code: 'ARBITRATE', name: 'Arbitration', slug: 'arbitration-service', category: 'adr', sortOrder: 120, plainSummary: 'Determination of the dispute by an arbitral tribunal.' },
  { code: 'RESEARCH', name: 'Legal research', slug: 'legal-research', category: 'outsourcing', sortOrder: 130, plainSummary: 'Researched note on a point of law, with authorities.' },
  { code: 'BULK_REVIEW', name: 'Bulk document review', slug: 'bulk-document-review', category: 'outsourcing', sortOrder: 140, plainSummary: 'High-volume review or abstraction of documents to a defined standard.' },
];

export const LANGUAGES: Array<{ iso639: string; name: string; nativeName: string; sortOrder: number }> = [
  { iso639: 'en', name: 'English', nativeName: 'English', sortOrder: 1 },
  { iso639: 'hi', name: 'Hindi', nativeName: 'हिन्दी', sortOrder: 2 },
  { iso639: 'bn', name: 'Bengali', nativeName: 'বাংলা', sortOrder: 3 },
  { iso639: 'mr', name: 'Marathi', nativeName: 'मराठी', sortOrder: 4 },
  { iso639: 'te', name: 'Telugu', nativeName: 'తెలుగు', sortOrder: 5 },
  { iso639: 'ta', name: 'Tamil', nativeName: 'தமிழ்', sortOrder: 6 },
  { iso639: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', sortOrder: 7 },
  { iso639: 'ur', name: 'Urdu', nativeName: 'اردو', sortOrder: 8 },
  { iso639: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', sortOrder: 9 },
  { iso639: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', sortOrder: 10 },
  { iso639: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', sortOrder: 11 },
  { iso639: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', sortOrder: 12 },
  { iso639: 'as', name: 'Assamese', nativeName: 'অসমীয়া', sortOrder: 13 },
];
