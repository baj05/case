/**
 * Taxonomy addendum.
 *
 * Three gaps found after seeding the first pass and driving real queries
 * through the intake classifier:
 *
 *   1. Five practice areas had no matters at all (civil litigation,
 *      competition, election, immigration, securities).
 *   2. There were no DOCUMENT matters — nobody could express "I need a rent
 *      agreement", which is the single most common thing a member of the
 *      public actually wants, and the anchor for the resource library.
 *   3. Colloquial and Hinglish phrasings were missing, so real sentences
 *      ("meter jal gaya", "company fired me") fell back to the practice area.
 *
 * Kept separate from taxonomy-matters.ts so the provenance of each batch stays
 * legible; both are merged by the seeder.
 */
import type { MatterSeed } from './taxonomy-matters.ts';
import type { ForumSeed } from './taxonomy-forums.ts';

export const ADDITIONAL_FORUMS: ForumSeed[] = [
  { code: 'F_CCI', name: 'Competition Commission of India', short: 'CCI', slug: 'competition-commission-of-india', kind: 'regulator', level: 'central', statute: 'Competition Act, 2002', escalates: 'F_NCLAT', url: 'https://www.cci.gov.in/' },
  { code: 'F_SEBI', name: 'Securities and Exchange Board of India', short: 'SEBI', slug: 'sebi', kind: 'regulator', level: 'central', statute: 'SEBI Act, 1992', escalates: 'F_SAT', url: 'https://www.sebi.gov.in/' },
  { code: 'F_SEBI_SCORES', name: 'SEBI SCORES investor grievance portal', short: 'SCORES', slug: 'sebi-scores', kind: 'grievance_cell', level: 'central', escalates: 'F_SEBI', url: 'https://scores.sebi.gov.in/' },
  { code: 'F_ECI', name: 'Election Commission of India', short: 'ECI', slug: 'election-commission-of-india', kind: 'authority', level: 'central', statute: 'Representation of the People Act, 1951', escalates: 'F_HC', url: 'https://www.eci.gov.in/' },
  { code: 'F_RETURNING_OFFICER', name: 'Returning Officer', short: 'RO', slug: 'returning-officer', kind: 'authority', level: 'district', statute: 'Representation of the People Act, 1951', escalates: 'F_ECI' },
  { code: 'F_FRRO', name: 'Foreigners Regional Registration Office', short: 'FRRO', slug: 'frro', kind: 'authority', level: 'state', statute: 'Foreigners Act, 1946', escalates: 'F_MHA', url: 'https://indianfrro.gov.in/' },
  { code: 'F_MHA', name: 'Ministry of Home Affairs (Foreigners Division)', short: 'MHA', slug: 'ministry-of-home-affairs', kind: 'department', level: 'central', escalates: 'F_HC', url: 'https://www.mha.gov.in/' },
  { code: 'F_PASSPORT_OFFICE', name: 'Regional Passport Office', short: 'RPO', slug: 'regional-passport-office', kind: 'authority', level: 'state', statute: 'Passports Act, 1967', escalates: 'F_HC', url: 'https://www.passportindia.gov.in/' },
  { code: 'F_NOTARY', name: 'Notary Public', slug: 'notary-public', kind: 'authority', level: 'district', statute: 'Notaries Act, 1952' },
];

/** Shorthand mirroring taxonomy-matters.ts. */
const M = (
  code: string,
  pa: string,
  name: string,
  slug: string,
  rest: Omit<MatterSeed, 'code' | 'pa' | 'name' | 'slug'>,
): MatterSeed => ({ code, pa, name, slug, ...rest });

export const ADDITIONAL_MATTERS: MatterSeed[] = [
  // ---------------------------------------------------------------- civil
  M('CV_RECOVERY', 'CIVIL', 'Money recovery suit', 'money-recovery-suit', {
    party: 'either', summary: 'Recovering money owed under a loan, invoice, advance or unpaid dues through a civil suit.',
    syn: ['money recovery', 'recovery suit', 'suit for recovery of money', 'paisa wapas nahi kiya', 'lent money not returned', 'unpaid invoice recovery', 'udhar diya paisa'],
    issues: ['Loan given to a friend or relative not repaid', 'Unpaid invoices from a business customer', 'Advance paid but goods or services never delivered', 'Limitation period running out', 'Recovery against a guarantor'],
    svc: ['CONSULT', 'NOTICE', 'DRAFT', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_COMMERCIAL_COURT', 'F_HC'] }),
  M('CV_INJUNCTION', 'CIVIL', 'Injunction or stay', 'injunction-or-stay', {
    party: 'either', urgency: 'urgent', summary: 'Asking a court to stop something happening — construction, dispossession, a transfer, a disclosure — while a dispute is decided.',
    syn: ['injunction', 'stay order', 'temporary injunction', 'stop construction order', 'restraining order', 'status quo order', 'stay lena hai'],
    issues: ['Property about to be sold or transferred', 'Construction going on despite objection', 'Threat of dispossession', 'Breach of a negative covenant', 'Urgent ex parte relief needed'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_HC'] }),
  M('CV_SPECIFIC_PERF', 'CIVIL', 'Specific performance of an agreement', 'specific-performance', {
    party: 'either', summary: 'Compelling the other side to actually perform an agreement — most often to execute a sale deed — instead of only paying damages.',
    syn: ['specific performance', 'seller refusing to execute sale deed', 'agreement to sell not honoured', 'force sale deed registration', 'baina karar par amal'],
    issues: ['Seller refuses to execute the sale deed after taking advance', 'Readiness and willingness to perform', 'Agreement is unregistered', 'Third party purchaser in the meantime', 'Limitation of three years'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_HC'] }),
  M('CV_DECLARATION', 'CIVIL', 'Declaratory suit on title or status', 'declaratory-suit', {
    party: 'either', summary: 'Asking a court to declare a legal right or status — ownership, a document being void, or a relationship.',
    syn: ['declaratory suit', 'declaration of title', 'suit to declare sale deed void', 'cancellation of sale deed', 'document ko rad karana'],
    issues: ['Forged or fraudulent sale deed', 'Cloud on title', 'Declaration of ownership share', 'Cancellation of a registered document', 'Consequential injunction sought'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_HC'] }),
  M('CV_EXECUTION', 'CIVIL', 'Execution of a decree or award', 'execution-of-decree', {
    party: 'either', summary: 'Getting a court order, decree or arbitral award actually enforced when the losing side does not comply.',
    syn: ['execution petition', 'decree not being followed', 'enforce court order', 'attachment of property', 'execution of arbitral award', 'order ka palan nahi'],
    issues: ['Judgment debtor untraceable or has no assets', 'Attachment and sale of property', 'Garnishee against a bank account', 'Objections filed by the debtor', 'Transfer of decree to another district'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_COMMERCIAL_COURT', 'F_HC'] }),
  M('CV_APPEAL', 'CIVIL', 'Civil appeal, revision or review', 'civil-appeal', {
    party: 'either', urgency: 'urgent', summary: 'Challenging a civil judgment or order in a higher court, or seeking review of one.',
    syn: ['civil appeal', 'first appeal', 'second appeal', 'revision petition', 'review petition', 'appeal against judgment', 'faisle ke khilaf appeal'],
    issues: ['Limitation for filing the appeal', 'Condonation of delay', 'Stay of the decree pending appeal', 'Additional evidence at the appellate stage', 'Substantial question of law'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT'], forums: ['F_HC', 'F_SC'] }),
  M('CV_AFFIDAVIT', 'CIVIL', 'Affidavit, undertaking or declaration', 'affidavit-or-undertaking', {
    party: 'either', summary: 'A sworn written statement for a court, an authority, a school, an employer or a bank.',
    syn: ['affidavit', 'notarised affidavit', 'name change affidavit', 'address proof affidavit', 'undertaking letter', 'self declaration', 'halafnama'],
    issues: ['Name or date of birth correction', 'Address proof for a bank or school', 'Income or dependency declaration', 'Lost document declaration', 'Notarisation and stamp value'],
    svc: ['DRAFT', 'REVIEW', 'CONSULT'], forums: ['F_NOTARY'] }),

  // ---------------------------------------------------------- competition
  M('CP_CARTEL', 'COMPETITION', 'Cartel, bid rigging or price fixing', 'cartel-or-bid-rigging', {
    party: 'either', summary: 'Agreements between competitors that fix prices, share markets or rig tenders, and the investigations that follow.',
    syn: ['cartel', 'bid rigging', 'price fixing', 'tender collusion', 'anti competitive agreement', 'cci investigation', 'leniency application'],
    issues: ['Dawn raid or search by the DG', 'Leniency or lesser penalty application', 'Trade association conduct', 'Penalty calculated on relevant turnover', 'Individual liability of officers'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT', 'DILIGENCE'], forums: ['F_CCI', 'F_NCLAT', 'F_SC'] }),
  M('CP_DOMINANCE', 'COMPETITION', 'Abuse of dominant position', 'abuse-of-dominance', {
    party: 'either', summary: 'A dominant enterprise imposing unfair prices or conditions, denying market access or tying products.',
    syn: ['abuse of dominance', 'abuse of dominant position', 'unfair pricing by dominant firm', 'denial of market access', 'tying and bundling', 'cci complaint against platform'],
    issues: ['Defining the relevant market', 'Exclusivity or tying conditions', 'Predatory pricing allegation', 'Platform self preferencing', 'Interim relief during inquiry'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT'], forums: ['F_CCI', 'F_NCLAT', 'F_SC'] }),
  M('CP_COMBINATION', 'COMPETITION', 'Merger or acquisition clearance', 'merger-clearance', {
    party: 'either', summary: 'Notifying and clearing a merger, acquisition or amalgamation that crosses the statutory thresholds.',
    syn: ['merger notification', 'combination filing', 'cci approval for acquisition', 'green channel filing', 'gun jumping'],
    issues: ['Whether thresholds are crossed', 'Green channel eligibility', 'Form I or Form II', 'Remedies or modifications offered', 'Gun jumping penalty'],
    svc: ['CONSULT', 'OPINION', 'DILIGENCE', 'COMPLIANCE'], forums: ['F_CCI', 'F_NCLAT'] }),

  // ------------------------------------------------------------- election
  M('EL_PETITION', 'ELECTION', 'Election petition against a result', 'election-petition', {
    party: 'either', urgency: 'urgent', summary: 'Challenging a declared election result on grounds such as corrupt practice, improper acceptance of nomination or irregular counting.',
    syn: ['election petition', 'challenge election result', 'corrupt practice in election', 'recount petition', 'chunav yachika'],
    issues: ['Forty five day limitation from declaration', 'Pleading material facts of corrupt practice', 'Recount of votes', 'Disqualification as consequential relief', 'Security deposit with the petition'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT'], forums: ['F_HC', 'F_SC'] }),
  M('EL_NOMINATION', 'ELECTION', 'Nomination rejection or candidature dispute', 'nomination-dispute', {
    party: 'either', urgency: 'emergency', summary: 'Rejection or acceptance of a nomination paper, affidavit defects and candidature eligibility.',
    syn: ['nomination rejected', 'nomination paper rejection', 'candidature challenge', 'form 26 affidavit defect', 'namankan rad'],
    issues: ['Defect in the nomination affidavit', 'Non disclosure of assets or cases', 'Age or domicile eligibility', 'Same day scrutiny timeline', 'Writ against the Returning Officer'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_RETURNING_OFFICER', 'F_ECI', 'F_HC'] }),
  M('EL_DISQUALIFICATION', 'ELECTION', 'Disqualification or defection', 'election-disqualification', {
    party: 'either', summary: 'Disqualification of a member on conviction, office of profit, or defection under the Tenth Schedule.',
    syn: ['disqualification of mla', 'anti defection', 'tenth schedule', 'office of profit', 'dal badal kanoon'],
    issues: ['Speaker or Chairman proceedings', 'Conviction based disqualification', 'Office of profit test', 'Split or merger defence', 'Judicial review of the decision'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT'], forums: ['F_ECI', 'F_HC', 'F_SC'] }),
  M('EL_MCC', 'ELECTION', 'Model code of conduct complaint', 'model-code-complaint', {
    party: 'complainant', urgency: 'urgent', summary: 'Complaints about paid news, hate speech, freebies, misuse of official machinery or expenditure limits during an election.',
    syn: ['model code of conduct', 'mcc violation', 'paid news complaint', 'election expenditure limit', 'achar sanhita ullanghan'],
    issues: ['Expenditure exceeding the ceiling', 'Hate or communal speech', 'Misuse of government resources', 'Surrogate advertising', 'cVIGIL complaint follow up'],
    svc: ['CONSULT', 'GRIEVANCE', 'REPRESENT'], forums: ['F_RETURNING_OFFICER', 'F_ECI', 'F_HC'] }),

    // --------------------------------------------------------- immigration
  M('IM_VISA', 'IMMIGRATION', 'Visa refusal, extension or overstay', 'visa-refusal-or-overstay', {
    party: 'either', urgency: 'urgent', summary: 'Refused or expired Indian visas, extensions, conversions and penalties for overstaying.',
    syn: ['visa refused', 'visa extension', 'visa overstay penalty', 'employment visa problem', 'exit permit', 'visa rejection appeal'],
    issues: ['Overstay penalty and exit permit', 'Conversion from tourist to employment visa', 'Refusal without reasons', 'Blacklisting or lookout circular', 'Registration with the FRRO'],
    svc: ['CONSULT', 'COMPLIANCE', 'REPRESENT'], forums: ['F_FRRO', 'F_MHA', 'F_HC'] }),
  M('IM_CITIZENSHIP', 'IMMIGRATION', 'Citizenship, OCI or PIO status', 'citizenship-or-oci', {
    party: 'applicant', summary: 'Applications, refusals and cancellations relating to Indian citizenship, OCI cards and renunciation.',
    syn: ['citizenship application', 'oci card', 'oci cancellation', 'renunciation of citizenship', 'naturalisation india', 'nagrikta'],
    issues: ['Proof of continuous residence', 'OCI card cancellation notice', 'Citizenship by descent for a child born abroad', 'Renunciation certificate for a foreign passport', 'Delay beyond the service timeline'],
    svc: ['CONSULT', 'COMPLIANCE', 'REPRESENT'], forums: ['F_MHA', 'F_FRRO', 'F_HC'] }),
  M('IM_PASSPORT', 'IMMIGRATION', 'Passport refusal, impounding or police clearance', 'passport-problem', {
    party: 'applicant', urgency: 'urgent', summary: 'Passport refused, impounded or held up in police verification, and no objection certificates when a case is pending.',
    syn: ['passport refused', 'passport impounded', 'police verification adverse', 'noc for passport pending case', 'police clearance certificate', 'passport nahi mil raha'],
    issues: ['Adverse police verification report', 'Pending criminal case and court NOC', 'Impounding without a hearing', 'Tatkal rejection', 'Correction of name or date of birth'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_PASSPORT_OFFICE', 'F_HC'] }),
  M('IM_DEPORTATION', 'IMMIGRATION', 'Deportation, detention or lookout circular', 'deportation-or-detention', {
    party: 'either', urgency: 'emergency', summary: 'Detention of a foreign national, deportation orders, lookout circulars and bail in Foreigners Act cases.',
    syn: ['deportation order', 'detention of foreigner', 'lookout circular', 'foreigners act case', 'detention centre', 'quit india notice'],
    issues: ['Habeas corpus for unlawful detention', 'Bail in a Foreigners Act prosecution', 'Quashing a lookout circular', 'Refugee or asylum claim', 'Travel documents from the embassy'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MHA', 'F_HC', 'F_SC'] }),

  // ----------------------------------------------------------- securities
  M('SE_INVESTOR', 'SECURITIES', 'Investor complaint against a broker or company', 'investor-complaint', {
    party: 'investor', summary: 'Unauthorised trades, unpaid dividends, transfer or demat failures, and broker default.',
    syn: ['broker did unauthorised trades', 'investor complaint sebi', 'dividend not received', 'share transfer not done', 'demat problem', 'broker default'],
    issues: ['Unauthorised trading in the account', 'Dividend or bonus not credited', 'Transmission of shares after death', 'Broker defaulted and was expelled', 'Investor protection fund claim'],
    svc: ['CONSULT', 'GRIEVANCE', 'NOTICE', 'REPRESENT'], forums: ['F_SEBI_SCORES', 'F_SEBI', 'F_SAT'] }),
  M('SE_INSIDER', 'SECURITIES', 'Insider trading or disclosure proceedings', 'insider-trading', {
    party: 'either', summary: 'SEBI proceedings on insider trading, front running, and disclosure or code of conduct breaches.',
    syn: ['insider trading notice', 'sebi show cause notice', 'front running', 'upsi breach', 'pit regulations', 'trading window violation'],
    issues: ['Show cause notice under the PIT Regulations', 'Trading window closure breach', 'Structured digital database', 'Settlement or consent application', 'Disgorgement and debarment'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT', 'COMPLIANCE'], forums: ['F_SEBI', 'F_SAT', 'F_SC'] }),
  M('SE_LISTING', 'SECURITIES', 'Listing, IPO or disclosure compliance', 'listing-compliance', {
    party: 'company', summary: 'LODR disclosures, IPO documentation, related party transactions and stock exchange penalties.',
    syn: ['lodr compliance', 'listing regulations penalty', 'ipo disclosure', 'related party transaction approval', 'stock exchange fine'],
    issues: ['Delayed or deficient disclosure', 'Material event determination', 'Related party transaction approvals', 'Exchange penalty and waiver', 'Offer document liability'],
    svc: ['CONSULT', 'COMPLIANCE', 'OPINION', 'AUDIT'], forums: ['F_SEBI', 'F_SAT'] }),
  M('SE_MISSELLING', 'SECURITIES', 'Mis-selling of a financial product', 'financial-product-misselling', {
    party: 'investor', summary: 'Mutual funds, ULIPs, portfolio schemes or bonds sold on wrong information or without suitability.',
    syn: ['mutual fund misselling', 'ulip missold', 'portfolio management losses', 'unauthorised switching of funds', 'guaranteed return promised'],
    issues: ['Suitability and risk profiling not done', 'Guaranteed returns promised verbally', 'Churning for commission', 'Signature obtained on blank forms', 'Compensation and refund claim'],
    svc: ['CONSULT', 'GRIEVANCE', 'NOTICE', 'REPRESENT'], forums: ['F_SEBI_SCORES', 'F_CONSUMER_DIST', 'F_SEBI'] }),

  // --------------------------------------------- documents people ask for
  M('P_RENT_AGREEMENT', 'PROPERTY', 'Rent or lease agreement', 'rent-agreement', {
    party: 'either', summary: 'Drafting, reviewing, stamping and registering a residential or commercial rent or lease agreement.',
    syn: ['rent agreement', 'rental agreement', 'lease agreement', 'leave and license agreement', 'eleven month agreement', 'kiraya nama', 'rent agreement format', 'shop rent agreement', 'tenancy agreement'],
    issues: ['Eleven month term versus registration', 'Stamp duty in the relevant state', 'Security deposit and lock in clause', 'Maintenance, society charges and utilities', 'Notice period and renewal or escalation'],
    svc: ['DRAFT', 'REVIEW', 'REGISTER', 'CONSULT'], forums: ['F_REGISTRAR', 'F_RENT_AUTHORITY'] }),
  M('P_SALE_DEED', 'PROPERTY', 'Sale deed or agreement to sell', 'sale-deed', {
    party: 'either', summary: 'Drafting and registering an agreement to sell or a sale deed, with title checks and stamp duty.',
    syn: ['sale deed', 'agreement to sell', 'sale deed draft', 'property registration', 'bainama', 'registry karana', 'stamp duty on sale deed'],
    issues: ['Title chain and encumbrance check', 'Circle rate and stamp duty', 'Payment schedule and TDS on property', 'Possession and handover clause', 'Registration appointment and witnesses'],
    svc: ['DRAFT', 'REVIEW', 'DILIGENCE', 'REGISTER'], forums: ['F_REGISTRAR', 'F_COLLECTOR_STAMPS'] }),
  M('P_GIFT_RELINQUISH', 'PROPERTY', 'Gift deed or relinquishment deed', 'gift-or-relinquishment-deed', {
    party: 'either', summary: 'Transferring property within a family without sale — gift, release or relinquishment of a share.',
    syn: ['gift deed', 'relinquishment deed', 'release deed', 'transfer property to son', 'daan patra', 'haq tyag'],
    issues: ['Stamp duty concession for blood relatives', 'Acceptance during the donor lifetime', 'Revocation of a gift', 'Share of other legal heirs', 'Mutation after registration'],
    svc: ['DRAFT', 'REVIEW', 'REGISTER', 'CONSULT'], forums: ['F_REGISTRAR', 'F_REVENUE_AUTHORITY'] }),
  M('P_POA', 'PROPERTY', 'Power of attorney', 'power-of-attorney', {
    party: 'either', summary: 'General or special power of attorney for property, banking or litigation, including for people living abroad.',
    syn: ['power of attorney', 'general power of attorney', 'special power of attorney', 'poa for nri', 'mukhtarnama', 'apostille power of attorney'],
    issues: ['General versus special authority', 'Execution abroad and apostille or consular attestation', 'Registration where property is involved', 'Revocation and notice to third parties', 'Continuation after death of the principal'],
    svc: ['DRAFT', 'REVIEW', 'REGISTER', 'CONSULT'], forums: ['F_REGISTRAR', 'F_NOTARY'] }),
  M('S_WILL_DRAFT', 'SUCCESSION', 'Will drafting and probate readiness', 'will-drafting', {
    party: 'either', summary: 'Writing a valid will, choosing executors and witnesses, and keeping it hard to challenge.',
    syn: ['will drafting', 'make a will', 'vasiyat', 'testament', 'will registration', 'executor appointment', 'will format'],
    issues: ['Two witnesses and attestation', 'Registration is optional but useful', 'Bequest of self acquired versus ancestral property', 'Executor and residuary clause', 'Later codicil or revocation'],
    svc: ['DRAFT', 'REVIEW', 'REGISTER', 'CONSULT'], forums: ['F_REGISTRAR', 'F_CIVIL_COURT'] }),
  M('CT_NDA', 'CONTRACT', 'NDA or confidentiality agreement', 'nda-confidentiality-agreement', {
    party: 'either', summary: 'One way or mutual confidentiality agreements for hiring, vendors, investors and product discussions.',
    syn: ['nda', 'non disclosure agreement', 'confidentiality agreement', 'mutual nda', 'nda format', 'secrecy agreement'],
    issues: ['One way versus mutual obligations', 'Definition and carve outs of confidential information', 'Term and survival period', 'Injunctive relief and governing law', 'Residual knowledge clause'],
    svc: ['DRAFT', 'REVIEW', 'CONSULT'], forums: [] }),
  M('CT_SERVICE_AGREEMENT', 'CONTRACT', 'Service, vendor or consultancy agreement', 'service-agreement', {
    party: 'either', summary: 'Contracts for services, vendors, consultants and freelancers — scope, payment, liability and exit.',
    syn: ['service agreement', 'vendor agreement', 'consultancy agreement', 'freelance contract', 'msa', 'work order agreement', 'contract format'],
    issues: ['Scope of work and deliverables', 'Payment milestones and interest on delay', 'Limitation of liability and indemnity', 'IP ownership of deliverables', 'Termination and transition assistance'],
    svc: ['DRAFT', 'REVIEW', 'CONSULT', 'BULK_REVIEW'], forums: [] }),
  M('CO_PARTNERSHIP', 'CORPORATE', 'Partnership deed or LLP agreement', 'partnership-deed', {
    party: 'either', summary: 'Setting up or amending a partnership or LLP — capital, profit share, management and exit.',
    syn: ['partnership deed', 'llp agreement', 'partnership firm registration', 'partner exit deed', 'saajhedari'],
    issues: ['Capital contribution and profit sharing ratio', 'Admission, retirement and death of a partner', 'Authority and banking mandate', 'Registration of the firm', 'Dispute resolution between partners'],
    svc: ['DRAFT', 'REVIEW', 'REGISTER', 'CONSULT'], forums: ['F_REGISTRAR', 'F_ROC'] }),
  M('CO_FOUNDERS', 'CORPORATE', 'Founders or shareholders agreement', 'shareholders-agreement', {
    party: 'either', summary: 'Founder vesting, shareholder rights, board composition, transfer restrictions and investor protections.',
    syn: ['shareholders agreement', 'founders agreement', 'ssha', 'share subscription agreement', 'esop policy', 'cap table agreement'],
    issues: ['Founder vesting and leaver provisions', 'Reserved matters and board seats', 'Right of first refusal and tag or drag along', 'Anti dilution and liquidation preference', 'Articles of association alignment'],
    svc: ['DRAFT', 'REVIEW', 'OPINION', 'CONSULT'], forums: ['F_ROC', 'F_NCLT'] }),
  M('L_EMPLOYMENT_CONTRACT', 'LABOUR', 'Employment contract, offer letter or HR policy', 'employment-contract', {
    party: 'either', summary: 'Offer letters, appointment letters, employment agreements and the handbook that sits behind them.',
    syn: ['employment contract', 'offer letter', 'appointment letter', 'employment agreement review', 'hr policy', 'employee handbook', 'notice period clause', 'non compete clause'],
    issues: ['Notice period and buyout', 'Non compete and non solicit enforceability', 'Probation and confirmation', 'Salary structure and statutory deductions', 'Bond or training cost recovery'],
    svc: ['DRAFT', 'REVIEW', 'CONSULT', 'COMPLIANCE'], forums: ['F_LABOUR_COMMISSIONER'] }),
];

/**
 * Extra plain-language and Hinglish phrasings for matters seeded in the first
 * pass. Every entry was added because a realistic sentence failed to route.
 */
export const ADDITIONAL_MATTER_SYNONYMS: Record<string, string[]> = {
  E_BILL_EXCESS: ['electricity bill', 'bijli bill', 'light bill', 'bill zyada aaya', 'arrears in electricity bill', 'average billing without reading', 'electricity bill wrong amount', 'bill for empty house'],
  E_METER: ['meter jal gaya', 'meter burnt', 'meter jala diya', 'meter chori ka aarop', 'smart meter forced', 'meter reading galat'],
  E_DISCONNECT: ['electricity cut without notice', 'bijli kat gayi', 'supply cut without notice', 'reconnection not being done', 'connection cut for arrears'],
  E_THEFT: ['bijli chori ka case', 'section 135 electricity act', 'electricity theft notice', 'vigilance raid electricity'],
  L_TERMINATION: ['company fired me', 'fired from job', 'nikal diya job se', 'terminated without enquiry', 'forced resignation letter', 'job se nikala'],
  F_DV: ['husband beats me', 'husband hits me', 'pati marta hai', 'sasural me pareshan', 'in laws harassing me'],
  P_RENT_INCREASE: ['landlord increasing rent', 'rent badha diya', 'unfair rent hike'],
  L_UNPAID: ['salary not paid', 'salary nahi mili', 'wages withheld', 'full and final settlement pending'],
  PF_NOT_DEPOSITED: ['pf nahi jama hua', 'employer not depositing pf', 'pf missing in passbook'],
};
