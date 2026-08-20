/**
 * Level 3: LEGAL MATTERS — the specific problem, in the words a person uses.
 *
 * `pa` is the practice-area code. `syn` are plain-language phrases the intake
 * classifier matches. `party` says who typically brings it, which lets the UI
 * ask the right follow-up. `forums` are forum codes from taxonomy-forums.ts.
 * `svc` are matter_type codes (level 5).
 */

export interface MatterSeed {
  code: string; pa: string; name: string; slug: string;
  summary?: string;
  party?: 'individual' | 'employee' | 'employer' | 'business' | 'landlord' | 'tenant'
    | 'consumer' | 'government' | 'any'
    // Added by the second pass: roles that do not map onto the list above.
    | 'either' | 'applicant' | 'complainant' | 'investor' | 'company';
  urgency?: 'normal' | 'urgent' | 'emergency';
  syn?: string[];
  issues?: string[];
  svc?: string[];
  forums?: string[];
}

const M = (
  code: string, pa: string, name: string, slug: string,
  o: Partial<MatterSeed> = {},
): MatterSeed => ({ code, pa, name, slug, ...o });

export const LEGAL_MATTERS: MatterSeed[] = [
  // ================================================== ELECTRICITY & POWER
  M('E_BILL_EXCESS', 'ELECTRICITY', 'Excess or wrong electricity bill', 'excess-electricity-bill', {
    party: 'consumer', summary: 'A bill far higher than your usual consumption, or billed for units you did not use.',
    syn: ['wrong electricity bill', 'excess electricity bill', 'high electricity bill', 'inflated bill',
      'electricity bill too high', 'bijli bill zyada', 'overbilling electricity', 'huge electricity bill'],
    issues: ['Average billing applied without reading', 'Arrears added without explanation',
      'Bill for a vacant premises', 'Duplicate billing', 'Wrong tariff category applied'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_DISCOM_GRIEVANCE', 'F_ELEC_CGRF', 'F_ELEC_OMBUDSMAN', 'F_CONSUMER_DIST'] }),
  M('E_METER', 'ELECTRICITY', 'Meter or smart meter dispute', 'electricity-meter-dispute', {
    party: 'consumer', summary: 'A meter running fast, stopped, faulty, or a disputed smart-meter installation.',
    syn: ['meter fast', 'faulty meter', 'meter not working', 'smart meter problem', 'meter testing',
      'defective electricity meter', 'meter replacement dispute'],
    issues: ['Meter running fast', 'Stopped or dead meter', 'Smart meter installed without consent', 'Meter testing refused'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_DISCOM_GRIEVANCE', 'F_ELEC_CGRF', 'F_ELEC_OMBUDSMAN'] }),
  M('E_DISCONNECT', 'ELECTRICITY', 'Disconnection or reconnection dispute', 'electricity-disconnection', {
    party: 'consumer', urgency: 'urgent', summary: 'Supply cut off, or a refusal to restore it after payment.',
    syn: ['electricity disconnected', 'power cut off', 'supply disconnected', 'reconnection refused',
      'electricity cut without notice', 'connection cut'],
    issues: ['Disconnected without notice', 'Disconnected during a pending dispute', 'Reconnection delayed after payment'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_DISCOM_GRIEVANCE', 'F_ELEC_CGRF', 'F_ELEC_OMBUDSMAN', 'F_HC'] }),
  M('E_NEW_CONNECTION', 'ELECTRICITY', 'New connection refused or delayed', 'electricity-new-connection', {
    party: 'consumer', summary: 'A new or additional connection refused, delayed, or made conditional.',
    syn: ['new electricity connection', 'connection refused', 'connection not given', 'load sanction refused',
      'new meter application'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_DISCOM_GRIEVANCE', 'F_ELEC_CGRF', 'F_ELEC_SERC'] }),
  M('E_THEFT', 'ELECTRICITY', 'Electricity theft or unauthorised use allegation', 'electricity-theft-allegation', {
    party: 'consumer', urgency: 'urgent', summary: 'A notice or prosecution alleging theft or unauthorised use of electricity.',
    syn: ['electricity theft case', 'bijli chori case', 'unauthorised use of electricity', 'section 135 electricity',
      'electricity theft notice', 'vigilance raid electricity', 'provisional assessment electricity'],
    issues: ['Provisional assessment order', 'Vigilance raid', 'Compounding of offence', 'Criminal prosecution'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_ELEC_SPECIAL_COURT', 'F_ELEC_ASSESSING_OFFICER', 'F_ELEC_APPELLATE', 'F_HC'] }),
  M('E_TARIFF', 'ELECTRICITY', 'Tariff or category dispute', 'electricity-tariff-dispute', {
    party: 'business', summary: 'Charged under the wrong tariff category, or a disputed tariff revision.',
    syn: ['wrong tariff', 'tariff category', 'commercial tariff on residential', 'tariff revision',
      'fixed charges dispute', 'demand charges'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT'], forums: ['F_ELEC_SERC', 'F_ELEC_APPELLATE'] }),
  M('E_SUPPLY_QUALITY', 'ELECTRICITY', 'Supply interruption or voltage problem', 'electricity-supply-quality', {
    party: 'consumer', summary: 'Frequent outages, low or fluctuating voltage, or damage caused by supply quality.',
    syn: ['power cuts frequent', 'low voltage', 'voltage fluctuation', 'appliances damaged by voltage',
      'transformer problem', 'no electricity for days'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_DISCOM_GRIEVANCE', 'F_ELEC_CGRF', 'F_CONSUMER_DIST'] }),
  M('E_SOLAR', 'ELECTRICITY', 'Rooftop solar and net metering', 'rooftop-solar-net-metering', {
    party: 'consumer', summary: 'Net-metering approval, credit adjustment, or a refused solar connection.',
    syn: ['rooftop solar', 'net metering', 'solar connection', 'solar credit not adjusted', 'solar approval delay'],
    svc: ['CONSULT', 'COMPLIANCE'], forums: ['F_ELEC_SERC', 'F_DISCOM_GRIEVANCE'] }),
  M('E_PPA', 'ELECTRICITY', 'Power purchase and generation disputes', 'power-purchase-agreement', {
    party: 'business', summary: 'PPA interpretation, curtailment, open access, transmission or generation disputes.',
    syn: ['power purchase agreement', 'ppa dispute', 'open access', 'wheeling charges', 'curtailment',
      'captive power', 'transmission dispute', 'generation dispute'],
    svc: ['OPINION', 'REPRESENT', 'ARBITRATE'], forums: ['F_ELEC_SERC', 'F_ELEC_CERC', 'F_ELEC_APPELLATE'] }),
  M('E_DUES', 'ELECTRICITY', 'Electricity dues recovery', 'electricity-dues-recovery', {
    party: 'consumer', summary: 'Recovery of old arrears, dues of a previous occupant, or a disputed demand.',
    syn: ['electricity arrears', 'old electricity dues', 'previous owner electricity dues', 'electricity recovery notice'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_ELEC_CGRF', 'F_ELEC_OMBUDSMAN', 'F_HC'] }),

  // ============================================== PF / EPF
  M('PF_NOT_DEPOSITED', 'PF', 'Employer has not deposited PF', 'pf-not-deposited', {
    party: 'employee', urgency: 'urgent', summary: 'PF deducted from salary but not credited to your account.',
    syn: ['pf not deposited', 'employer not depositing pf', 'pf not credited', 'pf deducted but not paid',
      'pf missing', 'epf not deposited', 'company not paying pf'],
    issues: ['Deducted but not remitted', 'Partially remitted', 'No UAN allotted', 'Wages under-declared'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_EPFO', 'F_EPF_APPELLATE', 'F_CGIT', 'F_HC'] }),
  M('PF_WITHDRAWAL', 'PF', 'PF withdrawal or claim rejected', 'pf-withdrawal-rejected', {
    party: 'employee', summary: 'A withdrawal or transfer claim rejected, stuck or delayed.',
    syn: ['pf withdrawal rejected', 'pf claim rejected', 'pf not withdrawn', 'pf claim stuck',
      'pf settlement delay', 'pf transfer not done'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_EPFO', 'F_EPF_APPELLATE'] }),
  M('PF_KYC', 'PF', 'PF account, UAN or KYC correction', 'pf-uan-kyc-correction', {
    party: 'employee', summary: 'Name, date of birth, Aadhaar or service-period corrections in EPFO records.',
    syn: ['uan problem', 'pf kyc', 'pf name correction', 'pf date of birth correction', 'two uan numbers',
      'pf account merge'],
    svc: ['CONSULT'], forums: ['F_EPFO'] }),
  M('PF_EMPLOYER_ASSESS', 'PF', 'PF assessment, damages or recovery against employer', 'pf-assessment-employer', {
    party: 'employer', summary: 'Section 7A assessment, damages, interest or recovery proceedings by EPFO.',
    syn: ['7a proceedings', 'pf assessment', 'pf damages', 'pf interest demand', 'epfo notice to employer',
      'pf inspection', 'pf recovery notice'],
    svc: ['CONSULT', 'REPRESENT', 'COMPLIANCE'], forums: ['F_EPFO', 'F_EPF_APPELLATE', 'F_CGIT', 'F_HC'] }),
  M('PF_PENSION', 'PF', 'EPS pension dispute', 'eps-pension-dispute', {
    party: 'individual', summary: 'Pension calculation, higher-pension option, or a rejected pension claim.',
    syn: ['eps pension', 'pf pension', 'higher pension', 'pension not started', 'pension calculation wrong',
      'eps 95 pension'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_EPFO', 'F_EPF_APPELLATE', 'F_HC'] }),

  // ============================================== ESI
  M('ESI_CONTRIB', 'ESI', 'ESI contribution or coverage dispute', 'esi-contribution-dispute', {
    party: 'employer', summary: 'Coverage, contribution assessment, inspection or recovery under the ESI Act.',
    syn: ['esi contribution', 'esi notice', 'esi assessment', 'esi inspection', 'esi recovery', 'esic notice',
      'esi coverage dispute'],
    svc: ['CONSULT', 'REPRESENT', 'COMPLIANCE'], forums: ['F_ESIC', 'F_ESI_COURT'] }),
  M('ESI_BENEFIT', 'ESI', 'ESI benefit claim rejected', 'esi-benefit-rejected', {
    party: 'employee', summary: 'Sickness, maternity, disablement or dependants benefit refused or delayed.',
    syn: ['esi claim rejected', 'esi benefit not given', 'esi maternity benefit', 'esi sickness benefit',
      'esi disablement', 'esi treatment refused'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_ESIC', 'F_ESI_COURT'] }),

  // ============================================== LABOUR & EMPLOYMENT
  M('L_TERMINATION', 'LABOUR', 'Wrongful termination or dismissal', 'wrongful-termination', {
    party: 'employee', urgency: 'urgent', summary: 'Dismissed, forced to resign, or terminated without due process.',
    syn: ['wrongful termination', 'fired unfairly', 'terminated without notice', 'forced to resign',
      'illegal termination', 'sacked', 'job terminated', 'removed from job'],
    issues: ['No notice or pay in lieu', 'No domestic enquiry', 'Forced resignation', 'Retrenchment without compliance'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_LABOUR_COURT', 'F_CGIT', 'F_LABOUR_COMMISSIONER', 'F_HC'] }),
  M('L_UNPAID', 'LABOUR', 'Unpaid salary, wages or dues', 'unpaid-salary-wages', {
    party: 'employee', urgency: 'urgent', summary: 'Salary, overtime, bonus, gratuity or final settlement not paid.',
    syn: ['salary not paid', 'unpaid wages', 'salary pending', 'full and final settlement not paid',
      'company not paying salary', 'overtime not paid', 'bonus not paid', 'salary withheld'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_LABOUR_COMMISSIONER', 'F_LABOUR_COURT', 'F_CONTROLLING_AUTH'] }),
  M('L_GRATUITY', 'LABOUR', 'Gratuity not paid', 'gratuity-not-paid', {
    party: 'employee', summary: 'Gratuity refused, underpaid or delayed after five years of service.',
    syn: ['gratuity not paid', 'gratuity refused', 'gratuity calculation', 'gratuity delay'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CONTROLLING_AUTH', 'F_LABOUR_COMMISSIONER', 'F_HC'] }),
  M('L_DISCIPLINE', 'LABOUR', 'Disciplinary action or domestic enquiry', 'disciplinary-domestic-enquiry', {
    party: 'employee', summary: 'Charge sheet, suspension, enquiry or punishment at work.',
    syn: ['charge sheet at work', 'domestic enquiry', 'suspended from job', 'show cause notice job',
      'disciplinary action', 'misconduct allegation'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_LABOUR_COURT', 'F_CGIT'] }),
  M('L_INDUSTRIAL', 'LABOUR', 'Industrial dispute, strike or lockout', 'industrial-dispute', {
    party: 'any', summary: 'Collective disputes, retrenchment, closure, strike or lockout.',
    syn: ['industrial dispute', 'strike', 'lockout', 'retrenchment', 'layoff', 'factory closure',
      'union dispute', 'workers dispute'],
    svc: ['CONSULT', 'REPRESENT', 'MEDIATE'], forums: ['F_CONCILIATION', 'F_LABOUR_COURT', 'F_INDUSTRIAL_TRIBUNAL', 'F_CGIT'] }),
  M('L_POSH', 'POSH', 'Workplace sexual harassment (POSH)', 'workplace-sexual-harassment', {
    party: 'employee', urgency: 'urgent', summary: 'Harassment at work, an Internal Committee complaint, or an IC enquiry.',
    syn: ['sexual harassment at work', 'posh complaint', 'harassment by boss', 'internal committee complaint',
      'workplace harassment', 'inappropriate behaviour at office'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_POSH_IC', 'F_POSH_LC', 'F_HC'] }),
  M('L_CONTRACT_LABOUR', 'LABOUR_COMPLIANCE', 'Contract labour and principal employer liability', 'contract-labour', {
    party: 'employer', summary: 'Registration, licensing and liability for contract workers.',
    syn: ['contract labour', 'contractor workers', 'principal employer liability', 'clra licence',
      'manpower agency dispute'],
    svc: ['CONSULT', 'COMPLIANCE', 'AUDIT'], forums: ['F_LABOUR_COMMISSIONER', 'F_LABOUR_COURT'] }),
  M('L_AUDIT', 'LABOUR_COMPLIANCE', 'Labour compliance audit or inspection', 'labour-compliance-audit', {
    party: 'employer', summary: 'Statutory registers, returns, licences and inspection readiness.',
    syn: ['labour compliance', 'labour inspection', 'labour audit', 'statutory registers', 'labour licence',
      'shops and establishment registration', 'factory licence'],
    svc: ['COMPLIANCE', 'AUDIT', 'OPINION'], forums: ['F_LABOUR_COMMISSIONER'] }),
  M('L_WC', 'LABOUR', 'Workmen compensation for injury at work', 'workmen-compensation', {
    party: 'employee', urgency: 'urgent', summary: 'Compensation for injury, disablement or death during employment.',
    syn: ['injury at work', 'workmen compensation', 'accident at factory', 'employee died at work',
      'workplace injury compensation', 'employee compensation act'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_WC_COMMISSIONER', 'F_LABOUR_COURT', 'F_HC'] }),

  // ============================================== PROPERTY & RENT
  M('P_DEPOSIT', 'PROPERTY', 'Security deposit not returned', 'security-deposit-not-returned', {
    party: 'tenant', summary: 'A landlord withholding the deposit after you vacated.',
    syn: ['landlord not returning deposit', 'security deposit not returned', 'deposit withheld',
      'advance not returned', 'landlord keeping deposit'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_RENT_AUTHORITY', 'F_CIVIL_COURT', 'F_CONSUMER_DIST', 'F_LOK_ADALAT'] }),
  M('P_EVICTION', 'PROPERTY', 'Eviction of a tenant', 'eviction-of-tenant', {
    party: 'landlord', summary: 'Recovering possession from a tenant who will not vacate or pay.',
    syn: ['tenant not vacating', 'eviction', 'tenant not paying rent', 'remove tenant', 'evict tenant',
      'illegal occupation by tenant'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_RENT_CONTROLLER', 'F_RENT_AUTHORITY', 'F_CIVIL_COURT'] }),
  M('P_RENT_INCREASE', 'PROPERTY', 'Rent increase or rent control dispute', 'rent-increase-dispute', {
    party: 'tenant', summary: 'An unlawful increase, or a dispute over standard rent.',
    syn: ['rent increased illegally', 'rent control', 'standard rent', 'landlord increasing rent',
      'rent hike dispute'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_RENT_CONTROLLER', 'F_RENT_AUTHORITY'] }),
  M('P_TITLE', 'PROPERTY', 'Title or ownership dispute', 'title-ownership-dispute', {
    party: 'individual', summary: 'Competing claims to ownership, defective title, or a disputed sale deed.',
    syn: ['title dispute', 'ownership dispute', 'property dispute', 'defective title', 'sale deed dispute',
      'double sale of property', 'fake sale deed'],
    svc: ['CONSULT', 'DILIGENCE', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_HC'] }),
  M('P_POSSESSION', 'PROPERTY', 'Illegal possession or encroachment', 'illegal-possession-encroachment', {
    party: 'individual', urgency: 'urgent', summary: 'Someone occupying your property, or encroaching on your land.',
    syn: ['illegal possession', 'encroachment', 'someone occupied my property', 'land grabbing',
      'neighbour encroaching', 'boundary dispute'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_REVENUE_AUTHORITY', 'F_POLICE'] }),
  M('P_PARTITION', 'PROPERTY', 'Partition of family or joint property', 'partition-family-property', {
    party: 'individual', summary: 'Dividing ancestral or jointly held property between co-owners.',
    syn: ['partition', 'property division', 'ancestral property share', 'brother not giving share',
      'joint property division', 'family property partition'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT', 'MEDIATE'], forums: ['F_CIVIL_COURT', 'F_LOK_ADALAT'] }),
  M('P_MUTATION', 'PROPERTY', 'Mutation and revenue record correction', 'mutation-revenue-records', {
    party: 'individual', summary: 'Getting land or property records updated in your name.',
    syn: ['mutation', 'dakhil kharij', 'revenue record correction', 'khata transfer', 'property record name change',
      'land record correction'],
    svc: ['CONSULT', 'DRAFT'], forums: ['F_REVENUE_AUTHORITY', 'F_TEHSILDAR'] }),
  M('P_STAMP', 'PROPERTY', 'Stamp duty and registration dispute', 'stamp-duty-registration', {
    party: 'individual', summary: 'Under-valuation notices, penalty, impounded documents or refused registration.',
    syn: ['stamp duty notice', 'undervaluation', 'registration refused', 'stamp duty penalty',
      'document impounded', 'circle rate dispute'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_REGISTRAR', 'F_COLLECTOR_STAMPS', 'F_HC'] }),
  M('P_LEASE_COMMERCIAL', 'PROPERTY', 'Commercial lease dispute', 'commercial-lease-dispute', {
    party: 'business', summary: 'Lock-in, escalation, termination or possession disputes in a commercial lease.',
    syn: ['commercial lease dispute', 'shop rent dispute', 'office lease', 'lock in period', 'lease termination'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT', 'ARBITRATE'], forums: ['F_CIVIL_COURT', 'F_COMMERCIAL_COURT'] }),

  // ============================================== REAL ESTATE / RERA
  M('RE_POSSESSION_DELAY', 'REALESTATE', 'Builder delay in possession', 'builder-possession-delay', {
    party: 'consumer', summary: 'A flat or plot not delivered on time, with interest or refund claimed.',
    syn: ['builder delay', 'possession not given', 'flat not delivered', 'project delayed', 'builder not handing over',
      'delayed possession compensation', 'rera complaint builder'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_RERA', 'F_RERA_APPELLATE', 'F_CONSUMER_STATE', 'F_NCLT'] }),
  M('RE_REFUND', 'REALESTATE', 'Refund from builder', 'builder-refund', {
    party: 'consumer', summary: 'Withdrawing from a project and recovering money paid, with interest.',
    syn: ['builder refund', 'money back from builder', 'cancel booking refund', 'builder not refunding',
      'withdraw from project'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_RERA', 'F_CONSUMER_STATE', 'F_NCLT'] }),
  M('RE_DEFECT', 'REALESTATE', 'Defective construction or structural defect', 'defective-construction', {
    party: 'consumer', summary: 'Poor workmanship, seepage, structural defects within the defect-liability period.',
    syn: ['defective construction', 'seepage in flat', 'poor quality construction', 'structural defect',
      'builder not repairing'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_RERA', 'F_CONSUMER_DIST'] }),
  M('RE_SOCIETY', 'REALESTATE', 'Housing society or RWA dispute', 'housing-society-dispute', {
    party: 'individual', summary: 'Maintenance, common areas, elections, or arbitrary society action.',
    syn: ['society dispute', 'rwa dispute', 'maintenance charges dispute', 'society not giving noc',
      'parking dispute society', 'society election dispute'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT', 'MEDIATE'], forums: ['F_REGISTRAR_SOCIETIES', 'F_COOP_COURT', 'F_CONSUMER_DIST'] }),

  // ============================================== FAMILY
  M('F_DIVORCE_MUTUAL', 'FAMILY', 'Mutual consent divorce', 'mutual-consent-divorce', {
    party: 'individual', summary: 'Both spouses agree to separate and want it formalised.',
    syn: ['mutual divorce', 'mutual consent divorce', 'divorce by agreement', 'both want divorce',
      'quick divorce', 'settlement divorce'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT', 'MEDIATE'], forums: ['F_FAMILY_COURT', 'F_MEDIATION_CENTRE'] }),
  M('F_DIVORCE_CONTESTED', 'FAMILY', 'Contested divorce', 'contested-divorce', {
    party: 'individual', summary: 'One spouse seeks divorce and the other opposes it.',
    syn: ['contested divorce', 'divorce case', 'wife filed divorce', 'husband filed divorce',
      'divorce on cruelty', 'divorce petition'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_FAMILY_COURT', 'F_HC'] }),
  M('F_MAINTENANCE', 'FAMILY', 'Maintenance or alimony', 'maintenance-alimony', {
    party: 'individual', urgency: 'urgent', summary: 'Claiming or contesting monthly support for a spouse or child.',
    syn: ['maintenance', 'alimony', 'wife maintenance', 'child maintenance', 'interim maintenance',
      'husband not paying maintenance', '125 crpc maintenance'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_FAMILY_COURT', 'F_MAGISTRATE', 'F_HC'] }),
  M('F_CUSTODY', 'FAMILY', 'Child custody and visitation', 'child-custody-visitation', {
    party: 'individual', urgency: 'urgent', summary: 'Who the child lives with, and contact arrangements.',
    syn: ['child custody', 'custody of child', 'visitation rights', 'wife took my child',
      'husband took my child', 'guardianship of child', 'child access'],
    svc: ['CONSULT', 'REPRESENT', 'MEDIATE'], forums: ['F_FAMILY_COURT', 'F_GUARDIAN_COURT', 'F_HC'] }),
  M('F_DV', 'FAMILY', 'Domestic violence', 'domestic-violence', {
    party: 'individual', urgency: 'emergency', summary: 'Protection, residence and monetary orders against abuse at home.',
    syn: ['domestic violence', 'beaten by husband', 'harassment by in laws', 'protection order',
      'dv act case', 'abuse at home', 'residence order'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MAGISTRATE', 'F_PROTECTION_OFFICER', 'F_FAMILY_COURT'] }),
  M('F_498A', 'FAMILY', 'Dowry harassment or cruelty complaint', 'dowry-harassment-cruelty', {
    party: 'individual', urgency: 'urgent', summary: 'A cruelty or dowry complaint — whether bringing or defending one.',
    syn: ['498a', 'dowry case', 'dowry harassment', 'false 498a', 'cruelty case', 'dowry demand'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MAGISTRATE', 'F_SESSIONS', 'F_HC'] }),
  M('F_MARRIAGE_REG', 'FAMILY', 'Marriage registration', 'marriage-registration', {
    party: 'individual', summary: 'Registering a marriage, or a court/special marriage.',
    syn: ['marriage registration', 'court marriage', 'special marriage act', 'marriage certificate',
      'register my marriage'],
    svc: ['CONSULT', 'DRAFT'], forums: ['F_MARRIAGE_REGISTRAR'] }),
  M('F_ADOPTION', 'FAMILY', 'Adoption and guardianship', 'adoption-guardianship', {
    party: 'individual', summary: 'Adopting a child, or being appointed guardian.',
    syn: ['adoption', 'adopt a child', 'guardianship', 'cara adoption', 'legal guardian'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_FAMILY_COURT', 'F_GUARDIAN_COURT', 'F_CARA'] }),
  M('F_NRI', 'FAMILY', 'NRI matrimonial dispute', 'nri-matrimonial-dispute', {
    party: 'individual', summary: 'Cross-border divorce, custody or recognition of a foreign decree.',
    syn: ['nri divorce', 'foreign divorce', 'husband abroad divorce', 'international custody',
      'foreign decree recognition', 'spouse left country'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT'], forums: ['F_FAMILY_COURT', 'F_HC'] }),

  // ============================================== SUCCESSION
  M('S_WILL', 'SUCCESSION', 'Will dispute or probate', 'will-dispute-probate', {
    party: 'individual', summary: 'Proving, challenging or executing a will.',
    syn: ['will dispute', 'probate', 'challenge will', 'fake will', 'letters of administration',
      'executor dispute', 'will not being followed'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_HC'] }),
  M('S_CERTIFICATE', 'SUCCESSION', 'Succession or legal heir certificate', 'succession-legal-heir-certificate', {
    party: 'individual', summary: 'Establishing who inherits, for banks, shares or property transfer.',
    syn: ['succession certificate', 'legal heir certificate', 'heirship certificate', 'bank not releasing money after death',
      'transfer after death'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_CIVIL_COURT', 'F_TEHSILDAR'] }),
  M('S_INTESTATE', 'SUCCESSION', 'Inheritance without a will', 'inheritance-without-will', {
    party: 'individual', summary: 'Dividing an estate where the deceased left no will.',
    syn: ['no will inheritance', 'intestate succession', 'father died without will', 'property after death',
      'daughter share in property', 'coparcenary share'],
    svc: ['CONSULT', 'REPRESENT', 'MEDIATE'], forums: ['F_CIVIL_COURT', 'F_LOK_ADALAT'] }),

  // ============================================== CONSUMER
  M('C_DEFECTIVE', 'CONSUMER', 'Defective product', 'defective-product', {
    party: 'consumer', summary: 'A product that is faulty, not as described, or unsafe.',
    syn: ['defective product', 'faulty product', 'product not working', 'replacement refused',
      'warranty not honoured', 'company not repairing'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CONSUMER_DIST', 'F_NCH'] }),
  M('C_SERVICE', 'CONSUMER', 'Deficient service', 'deficient-service', {
    party: 'consumer', summary: 'A paid service not delivered, or delivered badly.',
    syn: ['deficiency in service', 'poor service', 'service not provided', 'paid but no service',
      'refund not given', 'company not responding'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CONSUMER_DIST', 'F_NCH'] }),
  M('C_ECOMMERCE', 'CONSUMER', 'Online shopping or e-commerce dispute', 'ecommerce-dispute', {
    party: 'consumer', summary: 'Wrong item, non-delivery, refused refund or a marketplace dispute.',
    syn: ['online order problem', 'ecommerce complaint', 'amazon complaint', 'flipkart complaint',
      'wrong item delivered', 'refund not received online', 'order not delivered'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CONSUMER_DIST', 'F_NCH'] }),
  M('C_TELECOM', 'UTILITIES', 'Telecom or internet billing dispute', 'telecom-billing-dispute', {
    party: 'consumer', summary: 'Wrong mobile or broadband bills, service disruption, or porting problems.',
    syn: ['mobile bill wrong', 'telecom complaint', 'broadband not working', 'internet bill dispute',
      'number portability problem', 'sim blocked'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_TELECOM_GRIEVANCE', 'F_TRAI', 'F_CONSUMER_DIST', 'F_TDSAT'] }),
  M('C_WATER', 'UTILITIES', 'Water supply or billing dispute', 'water-supply-billing', {
    party: 'consumer', summary: 'No supply, contaminated water, or a wrong water bill.',
    syn: ['water bill wrong', 'no water supply', 'water connection', 'dirty water supply',
      'water board complaint', 'sewerage problem'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_WATER_BOARD', 'F_MUNICIPAL', 'F_CONSUMER_DIST'] }),

  // ============================================== MUNICIPAL
  M('MU_TAX', 'MUNICIPAL', 'House tax or property tax dispute', 'house-property-tax-dispute', {
    party: 'individual', summary: 'A wrong assessment, arrears demand or penalty on municipal tax.',
    syn: ['house tax', 'property tax notice', 'property tax wrong', 'municipal tax arrears',
      'property tax assessment', 'nagar nigam tax'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_MUNICIPAL', 'F_MUNICIPAL_TRIBUNAL', 'F_HC'] }),
  M('MU_DEMOLITION', 'MUNICIPAL', 'Demolition or sealing notice', 'demolition-sealing-notice', {
    party: 'individual', urgency: 'emergency', summary: 'A notice threatening demolition, sealing or removal.',
    syn: ['demolition notice', 'sealing notice', 'building demolition', 'illegal construction notice',
      'mcd notice', 'bulldozer notice'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MUNICIPAL', 'F_HC'] }),
  M('MU_PERMISSION', 'MUNICIPAL', 'Building permission or trade licence', 'building-permission-trade-licence', {
    party: 'business', summary: 'Sanction, completion certificate or a licence refused or delayed.',
    syn: ['building permission', 'building plan approval', 'completion certificate', 'trade licence',
      'shop licence', 'occupancy certificate'],
    svc: ['CONSULT', 'COMPLIANCE'], forums: ['F_MUNICIPAL'] }),

  // ============================================== BANKING & MONEY
  M('B_CHEQUE', 'BANKING', 'Cheque bounce', 'cheque-bounce', {
    party: 'any', urgency: 'urgent', summary: 'A dishonoured cheque — recovering on it, or defending a case.',
    syn: ['cheque bounce', 'cheque dishonour', 'cheque returned', '138 ni act', 'cheque case',
      'insufficient funds cheque'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_MAGISTRATE', 'F_LOK_ADALAT'] }),
  M('B_RECOVERY', 'BANKING', 'Bank loan recovery or SARFAESI action', 'bank-recovery-sarfaesi', {
    party: 'individual', urgency: 'urgent', summary: 'Recovery notices, possession of secured assets, or auction.',
    syn: ['bank recovery notice', 'sarfaesi notice', 'loan default', 'bank taking my property',
      'auction notice bank', 'npa account', 'recovery agents harassing'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_DRT', 'F_DRAT', 'F_HC'] }),
  M('B_FRAUD', 'BANKING', 'Unauthorised transaction or banking fraud', 'unauthorised-transaction-fraud', {
    party: 'consumer', urgency: 'emergency', summary: 'Money debited without authorisation, or a fraudulent transfer.',
    syn: ['money debited', 'unauthorised transaction', 'bank fraud', 'upi fraud', 'money stolen from account',
      'card fraud', 'otp fraud', 'account hacked money gone'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_BANK_GRIEVANCE', 'F_RBI_OMBUDSMAN', 'F_CYBERCRIME', 'F_CONSUMER_DIST'] }),
  M('B_LOAN_DISPUTE', 'BANKING', 'Loan terms, EMI or foreclosure dispute', 'loan-emi-dispute', {
    party: 'individual', summary: 'Wrong interest, hidden charges, refused foreclosure or a CIBIL error.',
    syn: ['loan dispute', 'emi problem', 'hidden charges loan', 'foreclosure charges',
      'cibil score wrong', 'credit report error', 'loan restructuring'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_BANK_GRIEVANCE', 'F_RBI_OMBUDSMAN', 'F_CONSUMER_DIST'] }),
  M('I_CLAIM_REJECTED', 'INSURANCE', 'Insurance claim rejected', 'insurance-claim-rejected', {
    party: 'consumer', summary: 'A health, life, motor or property claim refused or short-settled.',
    syn: ['insurance claim rejected', 'claim denied', 'mediclaim rejected', 'insurance not paying',
      'policy claim refused', 'partial settlement insurance'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_INSURER_GRIEVANCE', 'F_INSURANCE_OMBUDSMAN', 'F_CONSUMER_DIST'] }),

  // ============================================== MOTOR
  M('MO_ACCIDENT', 'MOTOR', 'Road accident compensation', 'road-accident-compensation', {
    party: 'individual', urgency: 'urgent', summary: 'Compensation for injury or death in a motor accident.',
    syn: ['road accident', 'accident compensation', 'mact claim', 'accident case', 'hit by car',
      'accident death compensation', 'injury in accident'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MACT', 'F_HC'] }),
  M('MO_CHALLAN', 'MOTOR', 'Traffic challan or vehicle seizure', 'traffic-challan-vehicle-seizure', {
    party: 'individual', summary: 'Disputing a challan, or recovering a seized vehicle.',
    syn: ['traffic challan', 'challan dispute', 'vehicle seized', 'car towed', 'licence suspended',
      'wrong challan'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MAGISTRATE', 'F_RTO', 'F_TRAFFIC_POLICE'] }),

  // ============================================== CRIMINAL
  M('CR_BAIL', 'CRIMINAL', 'Bail application', 'bail-application', {
    party: 'individual', urgency: 'emergency', summary: 'Securing release for someone arrested or facing arrest.',
    syn: ['bail', 'anticipatory bail', 'arrested', 'in custody', 'police arrested', 'need bail urgently',
      'regular bail', 'default bail', 'jail se nikalna'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MAGISTRATE', 'F_SESSIONS', 'F_HC', 'F_SC'] }),
  M('CR_FIR', 'CRIMINAL', 'FIR registration or quashing', 'fir-registration-quashing', {
    party: 'individual', urgency: 'urgent', summary: 'Getting an FIR registered, or getting a false one quashed.',
    syn: ['fir', 'police not registering fir', 'false fir', 'quash fir', 'fir against me',
      'zero fir', 'police complaint not taken'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_POLICE', 'F_MAGISTRATE', 'F_HC'] }),
  M('CR_FRAUD', 'CRIMINAL', 'Cheating, fraud or criminal breach of trust', 'cheating-fraud-breach-of-trust', {
    party: 'individual', summary: 'Being defrauded of money or property, or defending such an allegation.',
    syn: ['cheating case', 'fraud case', '420 case', 'money cheated', 'criminal breach of trust',
      'forgery case', 'someone took my money'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_POLICE', 'F_MAGISTRATE', 'F_SESSIONS'] }),
  M('CR_TRIAL', 'CRIMINAL', 'Criminal trial representation', 'criminal-trial-representation', {
    party: 'individual', summary: 'Representation through investigation, trial, appeal or revision.',
    syn: ['criminal case', 'court case criminal', 'criminal trial', 'criminal appeal', 'criminal revision',
      'charge framed', 'discharge application'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MAGISTRATE', 'F_SESSIONS', 'F_HC', 'F_SC'] }),

  // ============================================== CYBER
  M('CY_FRAUD', 'TECH', 'Online or UPI fraud', 'online-upi-fraud', {
    party: 'individual', urgency: 'emergency', summary: 'Money lost to an online scam, phishing or a fake link.',
    syn: ['online fraud', 'upi fraud', 'cyber fraud', 'scammed online', 'phishing', 'fake website fraud',
      'lost money online', 'otp scam', 'digital arrest scam'],
    svc: ['CONSULT', 'NOTICE'], forums: ['F_CYBERCRIME', 'F_POLICE', 'F_RBI_OMBUDSMAN'] }),
  M('CY_HARASSMENT', 'TECH', 'Online harassment or impersonation', 'online-harassment-impersonation', {
    party: 'individual', urgency: 'urgent', summary: 'Abuse, stalking, fake profiles or non-consensual content online.',
    syn: ['online harassment', 'cyber stalking', 'fake profile', 'someone impersonating me',
      'morphed photos', 'social media abuse', 'obscene content about me', 'deepfake'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CYBERCRIME', 'F_POLICE', 'F_IT_GRIEVANCE'] }),
  M('CY_DATA', 'TECH', 'Data breach or privacy complaint', 'data-breach-privacy', {
    party: 'any', summary: 'Personal data leaked, misused, or processed without a lawful basis.',
    syn: ['data breach', 'data leak', 'privacy violation', 'my data misused', 'dpdp complaint',
      'personal data shared'],
    svc: ['CONSULT', 'OPINION', 'COMPLIANCE'], forums: ['F_DPB', 'F_IT_GRIEVANCE', 'F_CERTIN'] }),

  // ============================================== TAX & GST
  M('T_IT_NOTICE', 'TAX', 'Income tax notice or assessment', 'income-tax-notice', {
    party: 'any', urgency: 'urgent', summary: 'A notice, scrutiny, reassessment or demand from the income tax department.',
    syn: ['income tax notice', 'it notice', 'tax demand', '143(2) notice', '148 notice', 'tax scrutiny',
      'income tax department notice', 'tax penalty'],
    svc: ['CONSULT', 'REPRESENT', 'OPINION'], forums: ['F_INCOME_TAX', 'F_CIT_APPEALS', 'F_ITAT', 'F_HC'] }),
  M('T_TDS', 'TAX', 'TDS dispute or credit mismatch', 'tds-dispute', {
    party: 'any', summary: 'TDS deducted but not reflected, or a wrongly deducted amount.',
    syn: ['tds not reflected', 'tds mismatch', 'form 26as mismatch', 'tds deducted not deposited',
      'tds refund'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_INCOME_TAX', 'F_CIT_APPEALS'] }),
  M('T_GST_NOTICE', 'TAX', 'GST notice, demand or audit', 'gst-notice-demand', {
    party: 'business', urgency: 'urgent', summary: 'A show-cause notice, demand, audit or investigation under GST.',
    syn: ['gst notice', 'gst demand', 'gst audit', 'gst show cause', 'drc-01', 'gst investigation',
      'gst penalty', 'gst summons'],
    svc: ['CONSULT', 'REPRESENT', 'COMPLIANCE'], forums: ['F_GST_OFFICER', 'F_GST_APPELLATE', 'F_GSTAT', 'F_HC'] }),
  M('T_GST_ITC', 'TAX', 'Input tax credit blocked or denied', 'gst-input-tax-credit', {
    party: 'business', summary: 'ITC reversed, blocked, or denied for supplier default.',
    syn: ['input tax credit blocked', 'itc denied', 'itc reversal', 'gst credit not available',
      'supplier not filed gst'],
    svc: ['CONSULT', 'OPINION', 'REPRESENT'], forums: ['F_GST_OFFICER', 'F_GST_APPELLATE', 'F_HC'] }),
  M('T_GST_REG', 'TAX', 'GST registration or cancellation', 'gst-registration-cancellation', {
    party: 'business', summary: 'Registration refused, suspended or cancelled, and revocation.',
    syn: ['gst registration cancelled', 'gst cancellation', 'gst registration rejected',
      'gst suspended', 'revocation of gst'],
    svc: ['CONSULT', 'COMPLIANCE', 'REPRESENT'], forums: ['F_GST_OFFICER', 'F_GST_APPELLATE'] }),
  M('T_GST_REFUND', 'TAX', 'GST refund stuck', 'gst-refund', {
    party: 'business', summary: 'Export, inverted-duty or excess-payment refunds delayed or rejected.',
    syn: ['gst refund', 'refund not received gst', 'export refund', 'inverted duty refund'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_GST_OFFICER', 'F_GST_APPELLATE'] }),
  M('T_CUSTOMS', 'TAX', 'Customs valuation, classification or seizure', 'customs-dispute', {
    party: 'business', summary: 'Goods detained, duty demanded, or classification disputed.',
    syn: ['customs notice', 'goods seized customs', 'customs duty demand', 'classification dispute',
      'customs valuation', 'import duty dispute'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_CUSTOMS', 'F_CESTAT', 'F_HC'] }),

  // ============================================== BUSINESS & CORPORATE
  M('CO_INCORP', 'CORPORATE', 'Company or LLP incorporation', 'company-incorporation', {
    party: 'business', summary: 'Setting up a company, LLP or partnership correctly.',
    syn: ['company registration', 'incorporate company', 'start a company', 'llp registration',
      'private limited registration', 'startup setup'],
    svc: ['CONSULT', 'DRAFT', 'COMPLIANCE'], forums: ['F_ROC', 'F_MCA'] }),
  M('CO_SHAREHOLDER', 'CORPORATE', 'Shareholder or founder dispute', 'shareholder-founder-dispute', {
    party: 'business', summary: 'Deadlock, exclusion, share transfer or oppression between owners.',
    syn: ['shareholder dispute', 'founder dispute', 'partner cheated me', 'oppression mismanagement',
      'share transfer dispute', 'board deadlock', 'co founder issue'],
    svc: ['CONSULT', 'REPRESENT', 'ARBITRATE', 'MEDIATE'], forums: ['F_NCLT', 'F_NCLAT', 'F_COMMERCIAL_COURT'] }),
  M('CO_ROC', 'CORPORATE', 'ROC compliance, penalty or strike off', 'roc-compliance-strike-off', {
    party: 'business', summary: 'Late filings, penalties, director disqualification or restoring a struck-off company.',
    syn: ['roc penalty', 'company struck off', 'director disqualified', 'annual filing not done',
      'company restoration', 'mca notice'],
    svc: ['CONSULT', 'COMPLIANCE', 'REPRESENT'], forums: ['F_ROC', 'F_NCLT', 'F_RD'] }),
  M('CO_INSOLVENCY', 'INSOLVENCY', 'Insolvency proceedings (IBC)', 'insolvency-ibc', {
    party: 'business', urgency: 'urgent', summary: 'Initiating or defending CIRP, or filing a claim as a creditor.',
    syn: ['insolvency', 'ibc case', 'nclt insolvency', 'company not paying us', 'section 9 application',
      'cirp', 'liquidation', 'operational creditor claim'],
    svc: ['CONSULT', 'REPRESENT', 'OPINION'], forums: ['F_NCLT', 'F_NCLAT', 'F_SC'] }),
  M('CN_BREACH', 'CONTRACT', 'Breach of contract', 'breach-of-contract', {
    party: 'business', summary: 'The other side has not performed — recovery, damages or specific performance.',
    syn: ['breach of contract', 'contract not honoured', 'vendor not delivering', 'client not paying',
      'agreement violated', 'contract dispute', 'payment not received business'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT', 'ARBITRATE'], forums: ['F_CIVIL_COURT', 'F_COMMERCIAL_COURT', 'F_ARBITRATION'] }),
  M('CN_REVIEW', 'CONTRACT', 'Contract drafting or review', 'contract-drafting-review', {
    party: 'business', summary: 'Getting an agreement drafted, reviewed or negotiated before signing.',
    syn: ['contract review', 'draft agreement', 'review my contract', 'vet agreement', 'nda review',
      'agreement drafting', 'check this contract'],
    svc: ['REVIEW', 'DRAFT', 'OPINION'], forums: [] }),
  M('CO_MSME_PAYMENT', 'CORPORATE', 'MSME delayed payment', 'msme-delayed-payment', {
    party: 'business', summary: 'Recovering overdue payments as a registered MSME supplier.',
    syn: ['msme payment', 'delayed payment msme', 'samadhaan', 'buyer not paying msme',
      'msme recovery'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_MSEFC', 'F_COMMERCIAL_COURT'] }),

  // ============================================== IP
  M('IP_TM_FILE', 'IP', 'Trade mark registration or objection', 'trademark-registration-objection', {
    party: 'business', summary: 'Filing a mark, or replying to an examination report or opposition.',
    syn: ['trademark registration', 'trademark objection', 'examination report trademark',
      'trademark opposition', 'brand name registration', 'logo registration', 'tm application'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_TM_REGISTRY', 'F_IPAB_HC'] }),
  M('IP_INFRINGE', 'IP', 'IP infringement or passing off', 'ip-infringement-passing-off', {
    party: 'business', urgency: 'urgent', summary: 'Someone copying your brand, content, design or invention.',
    syn: ['trademark infringement', 'copyright infringement', 'someone copied my brand',
      'logo copied', 'content stolen', 'patent infringement', 'passing off', 'counterfeit products'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_COMMERCIAL_COURT', 'F_HC'] }),
  M('IP_COPYRIGHT', 'IP', 'Copyright registration or licensing', 'copyright-registration-licensing', {
    party: 'any', summary: 'Registering, assigning or licensing creative work.',
    syn: ['copyright registration', 'copyright my work', 'music rights', 'film rights',
      'content licensing', 'ip assignment'],
    svc: ['CONSULT', 'DRAFT'], forums: ['F_COPYRIGHT_OFFICE'] }),
  M('IP_PATENT', 'IP', 'Patent filing or opposition', 'patent-filing-opposition', {
    party: 'business', summary: 'Filing, prosecuting or opposing a patent application.',
    syn: ['patent filing', 'patent application', 'patent objection', 'patent opposition', 'invention protection'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_PATENT_OFFICE', 'F_IPAB_HC'] }),

  // ============================================== PUBLIC LAW
  M('PU_WRIT', 'CONSTITUTIONAL', 'Writ petition against government action', 'writ-petition', {
    party: 'any', urgency: 'urgent', summary: 'Challenging an unlawful order, inaction or rights violation.',
    syn: ['writ petition', 'article 226', 'article 32', 'challenge government order',
      'government not acting', 'fundamental rights violation', 'mandamus', 'habeas corpus'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_HC', 'F_SC'] }),
  M('PU_SERVICE', 'ADMIN_SERVICE', 'Government service matter', 'government-service-matter', {
    party: 'individual', summary: 'Promotion, seniority, transfer, suspension or departmental action.',
    syn: ['service matter', 'promotion denied', 'seniority dispute', 'transfer order challenge',
      'departmental enquiry', 'government employee case', 'suspension government'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_CAT', 'F_STATE_TRIBUNAL', 'F_HC'] }),
  M('PU_PENSION', 'ADMIN_SERVICE', 'Pension or retirement benefits', 'pension-retirement-benefits', {
    party: 'individual', summary: 'Pension not sanctioned, wrongly calculated, or recovery ordered.',
    syn: ['pension not received', 'pension calculation', 'family pension', 'retirement benefits',
      'gratuity government', 'pension recovery', 'arrears of pension'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_CAT', 'F_STATE_TRIBUNAL', 'F_HC'] }),
  M('PU_RTI', 'RTI', 'RTI application or appeal', 'rti-application-appeal', {
    party: 'any', summary: 'Seeking information, or appealing a refusal.',
    syn: ['rti', 'rti application', 'information denied', 'rti first appeal', 'rti second appeal',
      'pio not replying'],
    svc: ['CONSULT', 'DRAFT', 'REPRESENT'], forums: ['F_PIO', 'F_SIC', 'F_CIC'] }),
  M('PU_LAND_ACQ', 'CONSTITUTIONAL', 'Land acquisition and compensation', 'land-acquisition-compensation', {
    party: 'individual', summary: 'Government acquisition, objections, and enhanced compensation.',
    syn: ['land acquisition', 'land acquired by government', 'acquisition compensation',
      'enhanced compensation land', 'land acquisition objection', 'rehabilitation'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_LAND_ACQ_OFFICER', 'F_LAND_TRIBUNAL', 'F_HC'] }),

  // ============================================== ADR
  M('A_ARBITRATION', 'ARBITRATION', 'Arbitration proceedings', 'arbitration-proceedings', {
    party: 'business', summary: 'Invoking arbitration, appointment, or conducting the reference.',
    syn: ['arbitration', 'invoke arbitration', 'arbitrator appointment', 'section 11 application',
      'arbitration notice', 'arbitral proceedings'],
    svc: ['CONSULT', 'DRAFT', 'ARBITRATE', 'REPRESENT'], forums: ['F_ARBITRATION', 'F_HC'] }),
  M('A_AWARD', 'ARBITRATION', 'Challenge or enforce an arbitral award', 'arbitral-award-challenge-enforcement', {
    party: 'business', urgency: 'urgent', summary: 'Setting aside an award, or executing one.',
    syn: ['set aside award', 'section 34', 'challenge arbitration award', 'enforce award',
      'execution of award', 'section 36'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_COMMERCIAL_COURT', 'F_HC'] }),
  M('A_MEDIATION', 'MEDIATION', 'Mediation or settlement', 'mediation-settlement', {
    party: 'any', summary: 'Resolving a dispute with a neutral mediator instead of litigating.',
    syn: ['mediation', 'settlement', 'want to settle', 'pre litigation mediation', 'mediator',
      'out of court settlement', 'compromise'],
    svc: ['MEDIATE', 'CONSULT', 'DRAFT'], forums: ['F_MEDIATION_CENTRE', 'F_LOK_ADALAT'] }),
  M('A_LEGAL_AID', 'LEGALAID', 'Free legal aid', 'free-legal-aid', {
    party: 'individual', summary: 'Legal representation at state expense for those who qualify.',
    syn: ['free legal aid', 'cannot afford lawyer', 'legal aid application', 'nalsa legal aid',
      'free lawyer', 'dlsa help', 'legal services authority'],
    svc: ['CONSULT'], forums: ['F_DLSA', 'F_SLSA', 'F_NALSA', 'F_LOK_ADALAT'] }),

  // ============================================== ENVIRONMENT
  M('EN_POLLUTION', 'ENVIRONMENT', 'Pollution or environmental damage', 'pollution-environmental-damage', {
    party: 'any', summary: 'Air, water, noise or waste pollution, and compensation for damage.',
    syn: ['pollution complaint', 'factory pollution', 'air pollution', 'water pollution',
      'noise pollution', 'garbage dumping', 'environment damage'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_PCB', 'F_NGT', 'F_HC'] }),
  M('EN_CLEARANCE', 'ENVIRONMENT', 'Environmental clearance or consent', 'environmental-clearance-consent', {
    party: 'business', summary: 'Consent to establish or operate, EIA, and clearance conditions.',
    syn: ['environmental clearance', 'consent to operate', 'pollution board consent', 'eia',
      'cte cto', 'clearance condition'],
    svc: ['CONSULT', 'COMPLIANCE', 'REPRESENT'], forums: ['F_PCB', 'F_MOEF', 'F_NGT'] }),

  // ============================================== RIGHTS
  M('R_SENIOR', 'FAMILY', 'Senior citizen maintenance or protection', 'senior-citizen-maintenance', {
    party: 'individual', urgency: 'urgent', summary: 'Maintenance from children, or protecting a parent from eviction or abuse.',
    syn: ['senior citizen maintenance', 'parents maintenance', 'son not looking after parents',
      'elder abuse', 'parents thrown out of house', 'senior citizen act'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_MAINTENANCE_TRIBUNAL', 'F_MAGISTRATE'] }),
  M('R_DISABILITY', 'ADMIN_SERVICE', 'Disability rights and accessibility', 'disability-rights-accessibility', {
    party: 'individual', summary: 'Certification, reservation, accessibility and discrimination.',
    syn: ['disability certificate', 'disability rights', 'accessibility complaint', 'disability reservation',
      'discrimination disability', 'rpwd act'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_DISABILITY_COMMISSIONER', 'F_HC'] }),
  M('R_DEFAMATION', 'MEDIA', 'Defamation', 'defamation', {
    party: 'any', summary: 'False statements damaging your reputation — or defending against a claim.',
    syn: ['defamation', 'defamed me', 'false allegations public', 'reputation damaged',
      'defamation notice', 'slander', 'libel'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_MAGISTRATE', 'F_CIVIL_COURT', 'F_HC'] }),
  M('R_HUMAN_RIGHTS', 'CONSTITUTIONAL', 'Human rights violation', 'human-rights-violation', {
    party: 'individual', urgency: 'urgent', summary: 'Custodial violence, illegal detention or abuse of authority.',
    syn: ['human rights', 'custodial violence', 'police beating', 'illegal detention',
      'nhrc complaint', 'police abuse'],
    svc: ['CONSULT', 'REPRESENT'], forums: ['F_NHRC', 'F_SHRC', 'F_HC'] }),

  // ============================================== MEDICAL / EDUCATION
  M('H_NEGLIGENCE', 'MEDICAL', 'Medical negligence', 'medical-negligence', {
    party: 'consumer', summary: 'Harm caused by substandard treatment or a hospital failure.',
    syn: ['medical negligence', 'wrong treatment', 'hospital negligence', 'doctor mistake',
      'surgery went wrong', 'patient died negligence', 'wrong diagnosis'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_CONSUMER_STATE', 'F_MEDICAL_COUNCIL', 'F_CIVIL_COURT'] }),
  M('ED_DISPUTE', 'EDUCATION', 'School, college or university dispute', 'education-institution-dispute', {
    party: 'individual', summary: 'Admission, fees, results, certificates or disciplinary action.',
    syn: ['school dispute', 'college problem', 'fee refund college', 'admission cancelled',
      'certificate not given', 'result withheld', 'university dispute', 'ragging complaint'],
    svc: ['CONSULT', 'NOTICE', 'REPRESENT'], forums: ['F_UNIVERSITY_GRIEVANCE', 'F_UGC', 'F_CONSUMER_DIST', 'F_HC'] }),

  // ============================================== LPO / OPS
  M('LP_RESEARCH', 'LPO', 'Legal research support', 'legal-research-support', {
    party: 'business', summary: 'Researched notes on a point of law, with authorities.',
    syn: ['legal research', 'case law research', 'research support', 'legal opinion research'],
    svc: ['RESEARCH', 'OPINION'], forums: [] }),
  M('LP_BULK_REVIEW', 'LPO', 'Bulk contract or document review', 'bulk-contract-document-review', {
    party: 'business', summary: 'High-volume review or abstraction to a defined standard.',
    syn: ['bulk contract review', 'document review', 'contract abstraction', 'due diligence documents',
      'e discovery', 'review 200 contracts'],
    svc: ['BULK_REVIEW', 'REVIEW'], forums: [] }),
  M('LP_COMPLIANCE_OPS', 'LPO', 'Ongoing compliance support', 'ongoing-compliance-support', {
    party: 'business', summary: 'Recurring statutory filings, registers and compliance calendars.',
    syn: ['compliance support', 'compliance outsourcing', 'statutory compliance service',
      'compliance calendar', 'retainer compliance'],
    svc: ['COMPLIANCE', 'AUDIT'], forums: [] }),
];

/** Extra services (level 5) beyond the original 14 matter types. */
export const EXTRA_MATTER_TYPES = [
  { code: 'ARBITRATE_ACT', name: 'Act as arbitrator', slug: 'act-as-arbitrator', category: 'adr' as const,
    plainSummary: 'Sit as the arbitral tribunal determining the dispute.', sortOrder: 125 },
  { code: 'REGISTER', name: 'Registration or filing', slug: 'registration-filing', category: 'compliance' as const,
    plainSummary: 'Prepare and lodge an application with an authority or registry.', sortOrder: 95 },
  { code: 'GRIEVANCE', name: 'Grievance or complaint', slug: 'grievance-complaint', category: 'advisory' as const,
    plainSummary: 'Escalate a complaint to a grievance cell, ombudsman or regulator.', sortOrder: 35 },
];
