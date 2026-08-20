/**
 * Resource kits — curated collections assembled around an intent rather than a
 * category.
 *
 * "I am starting a company" and "I am renting a house in Mumbai" are not
 * categories; they are situations, and each pulls documents from four or five
 * different categories at once. A library organised only by category makes the
 * user assemble that themselves, which is exactly the work they came to avoid.
 *
 * Every kit carries its own disclaimer, because the risk a kit creates is
 * specific: a bundle looks complete. It is not. `disclaimer` says so on the
 * page, not in a footer.
 */

export interface ResourceKitSeed {
  slug: string;
  title: string;
  description: string;
  /** The sentence a user would actually say, used for intent matching. */
  intentPhrase: string;
  /** Alternative phrasings the search should route to this kit. */
  intentSynonyms: string[];
  /** Legal domain code, for placement. */
  domain?: string;
  /** Resource slugs, in the order a person would actually need them. */
  items: Array<{ slug: string; note: string }>;
  /** Category codes to pull additional state-specific resources from. */
  pullCategories?: string[];
  /** True when the kit's content should be filtered to the user's state. */
  stateAware: boolean;
  disclaimer: string;
  sortOrder: number;
}

export const RESOURCE_KITS: ResourceKitSeed[] = [
  {
    slug: 'renting-a-home',
    title: 'Renting a home',
    description:
      'The documents and checks a tenancy actually needs, in the order they matter — verification before money, '
      + 'money before keys, and the state rule that decides whether your agreement has to be registered.',
    intentPhrase: 'I am renting a house',
    intentSynonyms: [
      'renting a home', 'renting a flat', 'i need a rent agreement', 'taking a house on rent',
      'moving into a rented flat', 'new tenancy', 'rent agreement for my flat',
    ],
    domain: 'D_PROPERTY',
    stateAware: true,
    sortOrder: 10,
    items: [
      { slug: 'tenant-checklist', note: 'Work through this before you transfer the deposit. Most of it cannot be fixed afterwards.' },
      { slug: 'residential-rent-agreement-11-month', note: 'The agreement itself. Eleven months is the common term, but your state may require registration regardless.' },
      { slug: 'rent-receipt', note: 'Every payment, receipted. This is what settles a deposit dispute two years later.' },
      { slug: 'landlord-checklist', note: 'If you are the landlord, this is the other side of the same transaction.' },
      { slug: 'notice-for-return-of-security-deposit', note: 'For when the tenancy ends and the deposit does not come back.' },
    ],
    pullCategories: ['RC_PROPERTY'],
    disclaimer:
      'This kit is a starting point, not a complete legal position. Tenancy law, stamp duty and registration '
      + 'requirements are state subjects and differ sharply — a document that is sufficient in one state may be '
      + 'unenforceable or unstamped in another. Read the state note for your state, and have anything you are '
      + 'about to sign reviewed by an advocate practising there.',
  },
  {
    slug: 'starting-a-company',
    title: 'Starting a company in India',
    description:
      'What a new company signs in its first year: the founders’ arrangement, the employment and contractor documents, '
      + 'the confidentiality agreement, and the registrations that are not optional.',
    intentPhrase: 'I am starting a company',
    intentSynonyms: [
      'starting a business', 'incorporating a company', 'startup legal documents', 'founding a startup',
      'new company documents', 'company registration', 'founders agreement',
    ],
    domain: 'D_BUSINESS',
    stateAware: false,
    sortOrder: 20,
    items: [
      { slug: 'founders-agreement', note: 'Sign it while the equity is worthless. The conversation is impossible later.' },
      { slug: 'mca-portal', note: 'Incorporation itself runs through SPICe+ on the MCA portal, which bundles PAN, TAN, EPFO, ESIC and GST.' },
      { slug: 'mutual-nda', note: 'For every conversation that happens before a contract exists.' },
      { slug: 'employment-agreement', note: 'Your first employee. Statutory benefits apply from the first payroll, whatever the contract says.' },
      { slug: 'consultant-agreement', note: 'For contractors — and note the clauses that keep it from being treated as employment.' },
      { slug: 'posh-policy', note: 'Required once you have ten workers, and the Internal Committee matters more than the policy.' },
      { slug: 'board-resolution-general', note: 'The form a bank or a registry will actually accept.' },
      { slug: 'nsws-single-window', note: 'The "know your approvals" tool lists the licences that actually apply to your sector and state.' },
      { slug: 'ipindia-portal', note: 'Run the trade mark search before you commit to a name. It is free.' },
      { slug: 'udyam-registration', note: 'Free, and it is what unlocks the statutory delayed-payment remedy later.' },
    ],
    pullCategories: ['RC_CORPORATE', 'RC_AGREEMENTS'],
    disclaimer:
      'A bundle of documents is not compliance. What a particular business must register for, and what it must file, '
      + 'depends on its structure, its sector, its turnover, its headcount and the states it operates in. Nothing in '
      + 'this kit determines any of that, and it does not amount to advice on your company.',
  },
  {
    slug: 'pf-problem',
    title: 'My PF has not been deposited',
    description:
      'The route when provident fund is deducted from your salary and never appears in your account: what to check, '
      + 'what to file, and the difference between a grievance and an assessment.',
    intentPhrase: 'I have a PF problem',
    intentSynonyms: [
      'pf not deposited', 'employer not paying pf', 'pf missing from passbook', 'epf complaint',
      'pf withdrawal problem', 'pf grievance', 'provident fund not credited',
    ],
    domain: 'D_EMPLOYMENT',
    stateAware: false,
    sortOrder: 30,
    items: [
      { slug: 'epfo-member-portal', note: 'Start here. The passbook shows month-by-month credits, and it is your evidence.' },
      { slug: 'epfo-grievance-pf-not-deposited', note: 'The written complaint. Send it to the employer and the Regional Provident Fund Commissioner.' },
      { slug: 'epfigms-grievance', note: 'File it formally on EPFiGMS and keep the registration number.' },
      { slug: 'epfo-which-claim-form', note: 'If the problem is a claim rather than a credit, this is how to pick the right form.' },
      { slug: 'labour-commissioner-unpaid-wages', note: 'Where the same employer is also short on wages, this is the parallel route.' },
    ],
    pullCategories: ['RC_PF_ESI'],
    disclaimer:
      'A grievance to EPFO is an administrative step. Determining what an employer actually owes is done in an '
      + 'inquiry under section 7A of the Employees’ Provident Funds and Miscellaneous Provisions Act, 1952, and '
      + 'recovery follows from that. The timelines and the outcome depend on facts this kit knows nothing about.',
  },
  {
    slug: 'electricity-bill-problem',
    title: 'My electricity bill is wrong',
    description:
      'The escalation ladder for a billing or meter dispute, routed to your own distribution company and your state '
      + 'regulator — because the answer is different in every state.',
    intentPhrase: 'I have an electricity bill problem',
    intentSynonyms: [
      'electricity bill too high', 'wrong electricity bill', 'meter is fast', 'excess electricity bill',
      'discom complaint', 'power bill dispute', 'bijli bill galat',
    ],
    domain: 'D_ELECTRICITY',
    stateAware: true,
    sortOrder: 40,
    items: [
      { slug: 'electricity-billing-complaint-discom', note: 'The written complaint to the licensee. Send it before you stop paying anything.' },
      { slug: 'electricity-consumer-rights-framework', note: 'The statutory ladder: licensee, then its Consumer Grievance Redressal Forum, then the state Electricity Ombudsman.' },
      { slug: 'cerc-regulations', note: 'Central regulation, for context. Your dispute is almost certainly a state matter.' },
    ],
    pullCategories: ['RC_ELECTRICITY'],
    disclaimer:
      'Which distribution licensee bills you, which forum hears your complaint, and what compensation the rules '
      + 'provide are all decided by the state you are in and the licence area you fall within. Showing you another '
      + 'state’s authority would be worse than showing none, so this kit filters by state — and where we do not hold '
      + 'a verified entry for your state, it says so rather than guessing. An allegation of theft under section 135 of '
      + 'the Electricity Act is a criminal matter on an entirely different track.',
  },
  {
    slug: 'hr-compliance',
    title: 'HR compliance for a growing company',
    description:
      'The documents and registrations an employer needs once it has employees rather than founders: contracts, '
      + 'policies, POSH, provident fund, ESI and the exit paperwork.',
    intentPhrase: 'I need HR compliance',
    intentSynonyms: [
      'hr compliance', 'employment compliance', 'hr policies', 'labour compliance checklist',
      'posh compliance', 'employee handbook', 'hiring documents',
    ],
    domain: 'D_EMPLOYMENT',
    stateAware: false,
    sortOrder: 50,
    items: [
      { slug: 'employment-agreement', note: 'The base contract. Attach the salary breakdown as an annexure.' },
      { slug: 'consultant-agreement', note: 'For contractors, with the clauses that keep the engagement from being read as employment.' },
      { slug: 'posh-policy', note: 'Mandatory at ten workers. Constituting the Internal Committee is the obligation; the policy is the easy part.' },
      { slug: 'shebox-posh-complaint', note: 'The government channel a complainant may use instead of, or after, your Internal Committee.' },
      { slug: 'epfo-documents-downloads', note: 'The Act, the schemes, the contribution rates and the circulars that bind EPFO’s own offices.' },
      { slug: 'esic-portal', note: 'ESI registration and administration, where the establishment and wage thresholds are met.' },
      { slug: 'chief-labour-commissioner', note: 'The conciliation machinery, and the central-versus-state sphere question.' },
      { slug: 'resignation-and-relieving-request', note: 'The exit side, from the employee’s perspective — worth reading before you design your own process.' },
    ],
    pullCategories: ['RC_EMPLOYMENT', 'RC_PF_ESI'],
    disclaimer:
      'Labour compliance in India is layered: central statutes, state Shops and Establishments legislation, and rules '
      + 'that differ by state and by headcount. This kit does not tell you which apply to your establishment, and '
      + 'nothing in it is a compliance opinion.',
  },
  {
    slug: 'consumer-complaint',
    title: 'I was sold something defective',
    description:
      'The consumer route in order: complain to the seller, escalate to the helpline, and file before the Commission '
      + 'through e-Daakhil if it is still unresolved.',
    intentPhrase: 'I have a consumer complaint',
    intentSynonyms: [
      'defective product', 'consumer court', 'refund not given', 'ecommerce complaint',
      'service was bad', 'file consumer case', 'consumer forum complaint',
    ],
    domain: 'D_CONSUMER',
    stateAware: false,
    sortOrder: 60,
    items: [
      { slug: 'consumer-complaint-district-commission', note: 'The complaint itself, in the structure the Commission expects.' },
      { slug: 'national-consumer-helpline', note: 'Try this first. It is free, fast, and the record of the attempt is useful later.' },
      { slug: 'edaakhil-consumer-filing', note: 'File electronically — no travel, and the fee is paid online.' },
      { slug: 'ncdrc-rules-orders', note: 'How complaints like yours are actually decided, in the Commission’s own orders.' },
      { slug: 'consumer-affairs-department', note: 'The e-commerce rules, if the seller was a marketplace.' },
    ],
    pullCategories: ['RC_CONSUMER'],
    disclaimer:
      'A consumer complaint must ordinarily be filed within two years of the cause of action, and before the '
      + 'Commission with pecuniary jurisdiction over the value paid. Both are facts about your case, not about this kit.',
  },
  {
    slug: 'money-owed-to-me',
    title: 'Someone owes me money',
    description:
      'The sequence that recovers money without a suit where possible: the demand notice, the statutory route if a '
      + 'cheque bounced, and the MSME remedy if you are a registered small enterprise.',
    intentPhrase: 'Someone owes me money',
    intentSynonyms: [
      'recover money', 'client not paying', 'cheque bounced', 'payment not received',
      'legal notice for payment', 'money recovery', 'buyer not paying invoice',
    ],
    domain: 'D_MONEY',
    stateAware: false,
    sortOrder: 70,
    items: [
      { slug: 'legal-notice-money-recovery', note: 'The demand notice. Send it by registered post and keep the receipt.' },
      { slug: 'legal-notice-cheque-bounce', note: 'If a cheque was dishonoured, the statutory notice has a hard time limit — read this first.' },
      { slug: 'msme-samadhaan', note: 'If you are a registered micro or small enterprise, the statutory interest is not negotiable.' },
      { slug: 'udyam-registration', note: 'Free registration, and it is the precondition for the MSME remedy.' },
      { slug: 'drt-recovery', note: 'Where a bank is involved on either side.' },
    ],
    pullCategories: ['RC_LEGAL_NOTICES', 'RC_BANKING'],
    disclaimer:
      'Limitation matters more than anything else here. A money claim ordinarily has to be brought within three years '
      + 'of when it became due, and the statutory notice on a dishonoured cheque has a much shorter window measured in '
      + 'days. Missing either is usually fatal and is not curable by a better notice.',
  },
  {
    slug: 'i-need-a-free-lawyer',
    title: 'I cannot afford a lawyer',
    description:
      'Free legal aid actually exists and is a statutory entitlement, not a favour. This is who qualifies, where to '
      + 'apply, and the forms your own state authority publishes.',
    intentPhrase: 'I cannot afford a lawyer',
    intentSynonyms: [
      'free lawyer', 'legal aid', 'no money for lawyer', 'nalsa application',
      'free legal help', 'lok adalat', 'legal aid application form',
    ],
    domain: 'D_ADR',
    stateAware: true,
    sortOrder: 80,
    items: [
      { slug: 'nalsa-legal-aid-eligibility', note: 'Entitlement is by category as well as by income. Read this before assuming you do not qualify.' },
      { slug: 'nalsa-legal-aid-faqs', note: 'The authority’s own answers on cost, choice of advocate and what happens after you apply.' },
      { slug: 'tele-law', note: 'For advice before there is a case at all.' },
      { slug: 'nalsa-lok-adalat', note: 'Settlement without a trial — and no court fee, with a refund of fee already paid.' },
      { slug: 'supreme-court-legal-services-committee', note: 'For a matter in the Supreme Court, including the middle-income group scheme.' },
    ],
    pullCategories: ['RC_LEGAL_AID'],
    disclaimer:
      'Eligibility for free legal services is determined by the legal services institution you apply to, under '
      + 'section 12 of the Legal Services Authorities Act, 1987 and the rules and regulations made under it. Nothing '
      + 'here decides your entitlement, and the income ceiling differs between states.',
  },
  {
    slug: 'i-was-defrauded-online',
    title: 'I lost money to an online fraud',
    description:
      'The first hour decides how much comes back. This is the order to act in: the reporting portal, the bank, and '
      + 'the written record that supports both.',
    intentPhrase: 'I lost money to online fraud',
    intentSynonyms: [
      'upi fraud', 'online fraud', 'money debited fraud', 'cyber fraud complaint',
      'account hacked', 'bank fraud', 'scammed online', 'phishing',
    ],
    domain: 'D_TECH',
    stateAware: false,
    sortOrder: 90,
    items: [
      { slug: 'cybercrime-reporting', note: 'Do this first. Call 1930 or file online — funds still in transit can be held, and that window is hours.' },
      { slug: 'rbi-main', note: 'The customer-liability circular. Your liability turns on how quickly you reported it to the bank in writing.' },
      { slug: 'rbi-cms-complaint', note: 'If the bank does not resolve it in 30 days, or rejects it, the Ombudsman is next.' },
      { slug: 'sanchar-saathi', note: 'Check what mobile connections exist in your name, and block a lost handset by IMEI.' },
      { slug: 'cert-in-incident', note: 'If you run a service and this was a breach rather than a personal loss, reporting obligations apply within hours.' },
    ],
    pullCategories: ['RC_CYBER', 'RC_BANKING'],
    disclaimer:
      'Act on the reporting steps immediately and read the rest afterwards. Nothing in this kit is advice about your '
      + 'liability, and the recovery of money depends on facts and timing outside our knowledge.',
  },
];

export function kitBySlug(slug: string): ResourceKitSeed | undefined {
  return RESOURCE_KITS.find((k) => k.slug === slug);
}

/**
 * Intent matching for the kit suggestions on the resource hub and in search.
 * Deterministic phrase overlap — no model, same discipline as everything else
 * in the routing path.
 */
export function matchKits(query: string, limit = 3): Array<{ kit: ResourceKitSeed; score: number }> {
  const q = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  if (q.length === 0) return [];
  const scored = RESOURCE_KITS.map((kit) => {
    const haystack = [kit.intentPhrase, ...kit.intentSynonyms, kit.title].join(' ').toLowerCase();
    let score = 0;
    for (const word of q) if (haystack.includes(word)) score += 1;
    // A whole-phrase match is worth far more than scattered words.
    for (const phrase of [kit.intentPhrase, ...kit.intentSynonyms]) {
      if (query.toLowerCase().includes(phrase.toLowerCase())) score += 5;
    }
    return { kit, score: score / Math.max(1, q.length) };
  });
  return scored.filter((s) => s.score >= 0.5).sort((a, b) => b.score - a.score).slice(0, limit);
}
