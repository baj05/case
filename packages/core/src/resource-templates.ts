/**
 * Platform-authored document templates.
 *
 * These are written by Lexhall. They are NOT official government or court
 * forms, and the library must never present them as such — `official_status`
 * is 'PLATFORM_TEMPLATE' for every one of them and the badge is not optional.
 * Where an official form exists (a consumer complaint, a gratuity claim, an RTI
 * application to a central authority), the template is a covering document or a
 * plain-language equivalent and the entry links to the official form as well.
 *
 * Placeholders are [[UPPER_SNAKE]] and are listed in `fields` so the preview can
 * label them. Stamp duty, registration and limitation vary by state, so every
 * template carries jurisdiction notes rather than pretending to be national.
 */
export interface TemplateField { key: string; label: string; hint?: string }

export interface ResourceTemplateSeed {
  slug: string;
  title: string;
  description: string;
  type:
    | 'AGREEMENT_TEMPLATE' | 'NOTICE_TEMPLATE' | 'APPLICATION_TEMPLATE'
    | 'AFFIDAVIT_TEMPLATE' | 'LEGAL_TEMPLATE' | 'CHECKLIST' | 'GUIDE';
  /** legal_matter code this belongs to. */
  matter?: string;
  /** practice_area code, used when no single matter fits. */
  practiceArea?: string;
  /** forum code this document is addressed to, when it is addressed anywhere. */
  forum?: string;
  panIndia: boolean;
  /** State slug when the document is genuinely state-specific. */
  stateSlug?: string;
  keywords: string[];
  fields: TemplateField[];
  beforeYouUse: string[];
  jurisdictionNotes: Array<{ heading: string; body: string }>;
  /** Links to the official form or portal this document accompanies. */
  officialLinks?: Array<{ label: string; url: string; publisher: string }>;
  body: string;
  version: string;
}

const PARTIES: TemplateField[] = [
  { key: 'DATE', label: 'Date of the document' },
  { key: 'PLACE', label: 'Place of execution', hint: 'The city where it is signed — it decides the stamp duty regime' },
];

export const TENANCY_TEMPLATES: ResourceTemplateSeed[] = [
  {
    slug: 'residential-rent-agreement-11-month',
    title: 'Residential rent agreement (11 months)',
    description:
      'A plain-language eleven-month residential tenancy agreement covering rent, deposit, notice, maintenance and the condition of the premises. Eleven months is the common term because a lease of a year or more attracts compulsory registration in most states.',
    type: 'AGREEMENT_TEMPLATE',
    matter: 'P_RENT_AGREEMENT',
    panIndia: true,
    keywords: ['rent agreement', 'rental agreement', 'tenancy agreement', 'kiraya nama', '11 month rent agreement', 'house rent agreement format'],
    fields: [
      ...PARTIES,
      { key: 'LANDLORD_NAME', label: 'Landlord full name' },
      { key: 'LANDLORD_ADDRESS', label: 'Landlord address' },
      { key: 'TENANT_NAME', label: 'Tenant full name' },
      { key: 'TENANT_ADDRESS', label: 'Tenant permanent address' },
      { key: 'PREMISES', label: 'Full address of the premises', hint: 'Include flat number, floor, building, locality, city and PIN' },
      { key: 'CARPET_AREA', label: 'Carpet area', hint: 'In square feet, as measured, not as advertised' },
      { key: 'RENT', label: 'Monthly rent in rupees' },
      { key: 'RENT_DAY', label: 'Day of the month rent falls due' },
      { key: 'DEPOSIT', label: 'Security deposit in rupees' },
      { key: 'START_DATE', label: 'Tenancy start date' },
      { key: 'END_DATE', label: 'Tenancy end date' },
      { key: 'NOTICE_MONTHS', label: 'Notice period in months' },
      { key: 'ESCALATION_PERCENT', label: 'Rent escalation on renewal, per cent' },
      { key: 'MAINTENANCE_PAYER', label: 'Who pays society maintenance', hint: 'Landlord or tenant — say which' },
      { key: 'PURPOSE', label: 'Permitted use', hint: 'Residence of the tenant and immediate family' },
      { key: 'WITNESS_1', label: 'Witness 1 name and address' },
      { key: 'WITNESS_2', label: 'Witness 2 name and address' },
    ],
    beforeYouUse: [
      'Check the landlord actually owns the premises — ask for the sale deed or the latest property tax receipt and the society NOC.',
      'Buy stamp paper of the value your state prescribes for a lease, before signing. Stamping after execution attracts a penalty.',
      'Photograph the flat, the meter readings and every existing damage on the day you take possession, and attach the photographs as an annexure both parties sign.',
      'Record the electricity and water meter numbers and their readings in the agreement itself.',
      'If the term is twelve months or more, or the state law requires it regardless of term, get the agreement registered at the Sub-Registrar office.',
      'Keep every rent payment traceable — bank transfer or a signed receipt. Cash without a receipt is the most common cause of deposit disputes.',
    ],
    jurisdictionNotes: [
      { heading: 'Registration', body: 'Under section 17 of the Registration Act, 1908, a lease of immovable property from year to year, or for a term exceeding one year, must be registered. This is why eleven-month agreements are common. Several states — Maharashtra and Karnataka among them — require registration of leave and licence or tenancy agreements irrespective of the eleven-month term. Check your state law before relying on the term alone.' },
      { heading: 'Stamp duty', body: 'Stamp duty on a lease is a state subject and differs sharply: some states charge a percentage of the annual rent plus deposit, others a slab. Under-stamping does not void the document but makes it inadmissible in evidence until the deficit and penalty are paid, which is exactly when you need it.' },
      { heading: 'Rent control and the model tenancy law', body: 'Older rent control legislation still governs some premises and can override contractual terms on eviction and rent increase. States that have adopted a Model Tenancy Act framework require the tenancy to be reported to a Rent Authority within a fixed period. Both are state-specific.' },
      { heading: 'Notice and eviction', body: 'A landlord cannot evict by locking the premises, cutting off electricity or water, or removing belongings. Recovery of possession is through the forum your state prescribes — a Rent Controller, a Rent Authority or a civil court.' },
    ],
    version: '1.0',
    body: `RENT AGREEMENT

This Rent Agreement is made at [[PLACE]] on [[DATE]]

BETWEEN

[[LANDLORD_NAME]], residing at [[LANDLORD_ADDRESS]], hereinafter called the "LANDLORD", which expression shall include the landlord's heirs, executors, administrators and permitted assigns, of the ONE PART;

AND

[[TENANT_NAME]], residing at [[TENANT_ADDRESS]], hereinafter called the "TENANT", which expression shall include the tenant's heirs, executors and administrators, of the OTHER PART.

WHEREAS the Landlord is the owner of and otherwise well and sufficiently entitled to the premises described in the Schedule below, and the Tenant has approached the Landlord to take the said premises on rent for residential use, and the Landlord has agreed to let the same on the terms recorded below.

NOW THIS AGREEMENT WITNESSES AS FOLLOWS:

1. PREMISES
   The Landlord lets and the Tenant takes on rent the premises at [[PREMISES]], admeasuring approximately [[CARPET_AREA]] square feet of carpet area, together with the fixtures and fittings listed in Annexure A ("the Premises").

2. TERM
   The tenancy is for a period of eleven (11) months commencing on [[START_DATE]] and ending on [[END_DATE]]. The tenancy does not renew automatically. Any renewal shall be by a fresh written agreement.

3. RENT
   3.1 The Tenant shall pay rent of Rs. [[RENT]] per month, payable in advance on or before the [[RENT_DAY]] day of each English calendar month.
   3.2 Rent shall be paid by bank transfer to the account the Landlord notifies in writing. Where rent is paid in cash the Landlord shall issue a signed receipt on the same day.
   3.3 On renewal, if any, the rent may be increased by not more than [[ESCALATION_PERCENT]] per cent of the then rent.

4. SECURITY DEPOSIT
   4.1 The Tenant has paid Rs. [[DEPOSIT]] as an interest-free refundable security deposit, the receipt of which the Landlord acknowledges.
   4.2 The deposit shall be refunded within fifteen (15) days of the Tenant handing over vacant possession, after deducting only (a) unpaid rent, (b) unpaid utility charges for the period of occupation, and (c) the cost of repairing damage caused by the Tenant beyond normal wear and tear.
   4.3 Every deduction shall be itemised in writing with supporting bills. The deposit shall not be applied towards repainting or routine maintenance unless the damage is attributable to the Tenant.

5. UTILITIES AND OUTGOINGS
   5.1 The Tenant shall pay electricity, water, gas, internet and other consumption charges for the period of the tenancy, on the basis of the meter readings recorded in Annexure A.
   5.2 Society maintenance charges shall be borne by the [[MAINTENANCE_PAYER]].
   5.3 Municipal property tax and any charge in the nature of a capital contribution to the society shall be borne by the Landlord.

6. USE
   The Premises shall be used only for [[PURPOSE]]. The Tenant shall not use the Premises for any commercial, unlawful or immoral purpose, or for storing hazardous goods.

7. THE TENANT'S OBLIGATIONS
   7.1 To pay rent and utility charges when due.
   7.2 To keep the Premises in the same condition as at the commencement, normal wear and tear excepted.
   7.3 Not to make any structural alteration or permanent fixture without the Landlord's written consent.
   7.4 Not to sublet, assign or part with possession of the Premises or any part of it.
   7.5 To permit the Landlord or the Landlord's authorised representative to inspect the Premises on at least twenty-four (24) hours' written notice, at a reasonable hour.
   7.6 To observe the lawful rules of the housing society or apartment association.

8. THE LANDLORD'S OBLIGATIONS
   8.1 To hand over the Premises in habitable condition with functioning electricity, water supply and sanitary fittings.
   8.2 To carry out structural repairs and repairs to the building, and to attend to leakage, seepage and failure of the building's common services, at the Landlord's cost.
   8.3 To pay all outgoings that are the owner's liability, so that the Tenant's possession is not disturbed.
   8.4 Not to interfere with the Tenant's peaceful enjoyment of the Premises during the term.

9. NOTICE AND TERMINATION
   9.1 Either party may terminate this Agreement by giving [[NOTICE_MONTHS]] month(s) written notice to the other, or by paying rent for the notice period in lieu.
   9.2 The Landlord may terminate on fifteen (15) days' written notice if rent remains unpaid for two consecutive months, or if the Tenant breaches clause 6 or 7.4 and fails to remedy the breach within that notice period.
   9.3 On termination the Tenant shall hand over vacant, peaceful possession together with all keys and access devices.

10. NO SELF-HELP
    Nothing in this Agreement entitles the Landlord to recover possession otherwise than in accordance with law. The Landlord shall not disconnect electricity or water, change the locks, or remove the Tenant's belongings.

11. DISPUTES
    The parties shall first attempt to resolve any dispute by discussion, and thereafter by mediation. Failing resolution, the courts and authorities at [[PLACE]] shall have jurisdiction, subject to any special forum prescribed by the applicable state tenancy law.

12. ENTIRE AGREEMENT
    This Agreement, with Annexure A, records the entire understanding between the parties and supersedes all prior discussions. Any amendment shall be in writing and signed by both parties.

THE SCHEDULE
The Premises: [[PREMISES]], carpet area approximately [[CARPET_AREA]] sq. ft., together with the fittings listed in Annexure A.

ANNEXURE A — CONDITION, FIXTURES AND METER READINGS
(To be completed and signed on the date possession is handed over.)
Electricity meter number: ____________  Reading: ____________
Water meter number: ____________  Reading: ____________
Fixtures and fittings handed over: ____________________________________
Existing damage noted: ________________________________________________
Photographs taken and initialled by both parties: Yes / No

IN WITNESS WHEREOF the parties have signed this Agreement on the date first written above.

LANDLORD                                TENANT

_______________________                 _______________________
[[LANDLORD_NAME]]                        [[TENANT_NAME]]

WITNESSES

1. _______________________               2. _______________________
   [[WITNESS_1]]                            [[WITNESS_2]]`,
  },
  {
    slug: 'commercial-shop-lease-agreement',
    title: 'Commercial shop or office lease agreement',
    description:
      'A lease for shop, office or godown premises, with the clauses commercial tenancies actually need: permitted use and signage, lock-in, fit-out, escalation, GST, and who bears which statutory charge.',
    type: 'AGREEMENT_TEMPLATE',
    matter: 'P_LEASE_COMMERCIAL',
    practiceArea: 'PROPERTY',
    panIndia: true,
    keywords: ['commercial lease', 'shop rent agreement', 'office lease agreement', 'godown rent agreement', 'lock in period lease'],
    fields: [
      ...PARTIES,
      { key: 'LESSOR_NAME', label: 'Lessor (owner) name' },
      { key: 'LESSEE_NAME', label: 'Lessee (business) name' },
      { key: 'LESSEE_CONSTITUTION', label: 'Lessee constitution', hint: 'Proprietorship, partnership, LLP or company, with registration number' },
      { key: 'PREMISES', label: 'Full address of the premises' },
      { key: 'AREA', label: 'Area', hint: 'State whether carpet, built-up or super built-up' },
      { key: 'RENT', label: 'Monthly rent in rupees' },
      { key: 'DEPOSIT', label: 'Security deposit in rupees' },
      { key: 'TERM_YEARS', label: 'Term in years' },
      { key: 'LOCK_IN_MONTHS', label: 'Lock-in period in months' },
      { key: 'ESCALATION_PERCENT', label: 'Escalation per cent' },
      { key: 'ESCALATION_YEARS', label: 'Escalation every how many years' },
      { key: 'NOTICE_MONTHS', label: 'Notice period in months' },
      { key: 'PERMITTED_USE', label: 'Permitted business use' },
      { key: 'FIT_OUT_DAYS', label: 'Rent-free fit-out period in days' },
    ],
    beforeYouUse: [
      'Verify the property is permitted for commercial use under the local development control rules — a residential flat let as an office invites sealing.',
      'Check the title, the latest property tax receipt, and any mortgage: a lender may require consent to the lease.',
      'A lease for a term exceeding one year must be registered; commercial leases are usually long enough to require it.',
      'Agree the fit-out period, the electricity load available, and who obtains which licence, before signing.',
      'If the rent crosses the threshold, TDS on rent applies and the tenant must deduct and deposit it.',
    ],
    jurisdictionNotes: [
      { heading: 'Registration and stamp duty', body: 'A lease exceeding one year requires registration under section 17 of the Registration Act, 1908. Stamp duty is state-specific and for commercial leases is usually computed on the average annual rent and the deposit taken together. An unregistered long lease is not enforceable as a lease and is difficult to rely on in a possession dispute.' },
      { heading: 'GST', body: 'Renting of commercial immovable property is a taxable supply. Where the lessor is registered, GST is charged on the rent in addition. Reverse charge can apply in specific situations. Say explicitly in the agreement whether the stated rent is inclusive or exclusive of tax.' },
      { heading: 'Rent control does not usually apply', body: 'Many state rent control statutes exclude premises above a rent threshold or exclude commercial tenancies. Which forum hears an eviction dispute therefore depends on the state and the rent.' },
      { heading: "Licences remain the occupier's responsibility", body: 'Shop and establishment registration, trade licence, fire NOC and food licence are obligations of the business occupying the premises, not of the owner, unless the agreement says otherwise.' },
    ],
    version: '1.0',
    body: `LEASE DEED (COMMERCIAL PREMISES)

This Lease Deed is executed at [[PLACE]] on [[DATE]]

BETWEEN

[[LESSOR_NAME]] ("the Lessor"), of the ONE PART;

AND

[[LESSEE_NAME]], a [[LESSEE_CONSTITUTION]] ("the Lessee"), of the OTHER PART.

1. DEMISE AND TERM
   1.1 The Lessor demises to the Lessee the premises at [[PREMISES]], admeasuring approximately [[AREA]] ("the Premises"), for a term of [[TERM_YEARS]] year(s) from the Commencement Date.
   1.2 The Lessee shall have a rent-free fit-out period of [[FIT_OUT_DAYS]] days from handover, during which the Lessee may carry out non-structural interior work. The Commencement Date is the day after the fit-out period ends.

2. RENT, ESCALATION AND TAXES
   2.1 Rent is Rs. [[RENT]] per month, payable in advance by the seventh day of each month, exclusive of Goods and Services Tax, which shall be charged and paid as applicable.
   2.2 Rent shall escalate by [[ESCALATION_PERCENT]] per cent every [[ESCALATION_YEARS]] year(s) over the rent then payable.
   2.3 The Lessee shall deduct tax at source on the rent where required by law and furnish the certificate to the Lessor within the statutory period.

3. SECURITY DEPOSIT
   3.1 The Lessee has paid an interest-free refundable deposit of Rs. [[DEPOSIT]].
   3.2 The deposit shall be refunded within thirty (30) days of handover of vacant possession, after deducting arrears of rent, unpaid utility charges and the cost of repairing damage other than normal wear and tear, each item to be supported by a bill.
   3.3 The deposit shall not be adjusted against rent during the term without the Lessor's written consent.

4. LOCK-IN
   4.1 Neither party may terminate this Lease during the first [[LOCK_IN_MONTHS]] months except for breach.
   4.2 If the Lessee vacates during the lock-in, rent for the balance of the lock-in period becomes payable. If the Lessor terminates during the lock-in otherwise than for breach, the Lessor shall pay the Lessee an equivalent amount.

5. PERMITTED USE, SIGNAGE AND LICENCES
   5.1 The Premises shall be used only for [[PERMITTED_USE]] and for no other purpose.
   5.2 The Lessee may display signage at the position the Lessor approves, in compliance with municipal rules, and shall bear the cost of removal and restoration on exit.
   5.3 The Lessee shall obtain and maintain at its own cost every registration and licence required for its business, including shop and establishment registration, trade licence and fire clearance where applicable.

6. UTILITIES, OUTGOINGS AND ELECTRICITY LOAD
   6.1 The Lessor confirms an available sanctioned electricity load sufficient for the permitted use, and shall cooperate in any application by the Lessee for enhancement, at the Lessee's cost.
   6.2 The Lessee shall pay electricity, water and other consumption charges on actuals against the meter serving the Premises.
   6.3 Municipal property tax, and any levy in the nature of an owner's charge, shall be borne by the Lessor.

7. REPAIRS AND ALTERATIONS
   7.1 The Lessor shall maintain the structure, the roof, the external walls and the common services, and attend to leakage and seepage.
   7.2 The Lessee shall maintain the interior and its own installations, and shall not carry out structural alteration without the Lessor's prior written consent.
   7.3 The Lessee's removable fixtures remain the Lessee's property and may be removed on exit, making good any damage caused by removal.

8. INSURANCE
   The Lessor shall insure the building. The Lessee shall insure its own stock, contents, installations and third-party liability.

9. ASSIGNMENT AND SUBLETTING
   The Lessee shall not assign, sublet or part with possession without the Lessor's prior written consent, save that the Lessee may permit occupation by a company within the same group on written intimation to the Lessor.

10. TERMINATION
    10.1 After the lock-in, either party may terminate on [[NOTICE_MONTHS]] months' written notice.
    10.2 The Lessor may terminate on thirty (30) days' notice if rent remains unpaid for two consecutive months, or on any other material breach not remedied within that period.
    10.3 On expiry or termination the Lessee shall hand over vacant possession, remove its signage and installations, and make good all damage.

11. FORCE MAJEURE
    If the Premises become unusable for the permitted use by reason of an event beyond either party's control, rent shall abate proportionately for the period the Premises remain unusable, and either party may terminate if that period exceeds ninety (90) days.

12. DISPUTES
    Disputes shall be referred to a sole arbitrator appointed by agreement, under the Arbitration and Conciliation Act, 1996, seated at [[PLACE]]. The courts at [[PLACE]] shall have jurisdiction for interim relief.

IN WITNESS WHEREOF the parties have executed this Lease Deed on the date first written above.

LESSOR                                  LESSEE

_______________________                 _______________________
[[LESSOR_NAME]]                          [[LESSEE_NAME]]

WITNESSES
1. _______________________              2. _______________________`,
  },
  {
    slug: 'rent-receipt',
    title: 'Rent receipt',
    description:
      'A rent receipt that actually works as proof: it identifies the premises, the period, the mode of payment and the landlord\'s PAN where the rent crosses the threshold at which an employer must collect it for HRA.',
    type: 'LEGAL_TEMPLATE',
    matter: 'P_RENT_AGREEMENT',
    panIndia: true,
    keywords: ['rent receipt', 'rent receipt format', 'hra rent receipt', 'kiraya rasid'],
    fields: [
      { key: 'RECEIPT_NO', label: 'Receipt number' },
      { key: 'DATE', label: 'Date of receipt' },
      { key: 'AMOUNT', label: 'Amount received in rupees' },
      { key: 'AMOUNT_WORDS', label: 'Amount in words' },
      { key: 'TENANT_NAME', label: 'Tenant name' },
      { key: 'PREMISES', label: 'Premises address' },
      { key: 'PERIOD', label: 'Period the rent covers', hint: 'For example 1 April 2026 to 30 April 2026' },
      { key: 'MODE', label: 'Mode of payment', hint: 'Bank transfer with UTR, cheque number, UPI reference or cash' },
      { key: 'LANDLORD_NAME', label: 'Landlord name' },
      { key: 'LANDLORD_PAN', label: 'Landlord PAN', hint: 'Needed by the tenant employer when annual rent exceeds Rs 1,00,000' },
    ],
    beforeYouUse: [
      'One receipt per period. A single consolidated receipt for a year is weak evidence and employers usually reject it for HRA.',
      'Record the payment mode and its reference number — a bank trail is what settles a deposit dispute.',
      'Where annual rent exceeds Rs 1,00,000, the tenant\'s employer will ask for the landlord\'s PAN to allow the HRA exemption.',
      'Revenue stamp practice varies; affix one where the local practice or the payer requires it for cash payments.',
    ],
    jurisdictionNotes: [
      { heading: 'HRA exemption', body: 'Income tax rules allow an exemption for house rent allowance on the basis of rent actually paid. Employers ordinarily require monthly receipts, and the landlord\'s PAN where annual rent exceeds Rs 1,00,000. Where the landlord has no PAN, a declaration is usually asked for instead.' },
      { heading: 'TDS on rent', body: 'A tenant paying rent above the prescribed monthly threshold must deduct tax at source and deposit it. The obligation is the tenant\'s, and it is separate from the receipt.' },
    ],
    version: '1.0',
    body: `RENT RECEIPT

Receipt No.: [[RECEIPT_NO]]                          Date: [[DATE]]

Received with thanks from [[TENANT_NAME]] the sum of Rs. [[AMOUNT]]
(Rupees [[AMOUNT_WORDS]] only) towards rent for the premises at

    [[PREMISES]]

for the period [[PERIOD]].

Mode of payment: [[MODE]]

This receipt is issued without prejudice to any amount that may remain due,
and does not by itself acknowledge that all dues for earlier periods stand paid.

Landlord: [[LANDLORD_NAME]]
PAN: [[LANDLORD_PAN]]

Signature: _______________________

(Affix revenue stamp where local practice requires it for cash payments.)`,
  },
  {
    slug: 'notice-to-tenant-to-vacate',
    title: 'Notice to a tenant to vacate',
    description:
      'A landlord\'s notice terminating a tenancy and calling for vacant possession, with the arrears and the notice period stated precisely — the two things a court looks at first.',
    type: 'NOTICE_TEMPLATE',
    matter: 'P_EVICTION',
    practiceArea: 'PROPERTY',
    panIndia: true,
    keywords: ['notice to vacate', 'eviction notice', 'notice to tenant', 'makan khali karne ka notice'],
    fields: [
      ...PARTIES,
      { key: 'LANDLORD_NAME', label: 'Landlord name' },
      { key: 'TENANT_NAME', label: 'Tenant name' },
      { key: 'PREMISES', label: 'Premises address' },
      { key: 'AGREEMENT_DATE', label: 'Date of the rent agreement' },
      { key: 'RENT', label: 'Monthly rent in rupees' },
      { key: 'ARREARS', label: 'Arrears of rent in rupees, if any' },
      { key: 'ARREARS_PERIOD', label: 'Period the arrears relate to' },
      { key: 'NOTICE_DAYS', label: 'Notice period in days' },
      { key: 'VACATE_DATE', label: 'Date by which possession is required' },
      { key: 'GROUND', label: 'Ground for termination', hint: 'Expiry of term, default in rent, breach of a specific clause, or bona fide requirement' },
    ],
    beforeYouUse: [
      'Match the notice period to the agreement and to the applicable state tenancy law — the longer of the two is the safe course.',
      'Send it by registered post with acknowledgement due AND email, and keep the tracking record and the postal receipt.',
      'State the arrears figure and the period precisely. A vague demand weakens a later suit.',
      'Do not cut electricity or water and do not change the locks. Recovery of possession is only through the forum the law prescribes.',
      'If the tenancy is governed by rent control legislation, the grounds for eviction are limited to those the statute lists.',
    ],
    jurisdictionNotes: [
      { heading: 'Notice under the Transfer of Property Act', body: 'Section 106 of the Transfer of Property Act, 1882 provides fifteen days\' notice for a month-to-month tenancy and six months for a lease from year to year, in the absence of a contract to the contrary. A written agreement usually supplies its own notice period.' },
      { heading: 'Rent control statutes override the contract', body: 'Where a state Rent Control Act applies, eviction is permitted only on the statutory grounds and only by the Rent Controller. A contractual notice does not create a right to evict.' },
      { heading: 'Model Tenancy Act states', body: 'States that have adopted a Model Tenancy Act framework route tenancy disputes to a Rent Authority and then a Rent Tribunal, with timelines of their own.' },
    ],
    version: '1.0',
    body: `NOTICE TO VACATE

By Registered Post A.D. and by email

Date: [[DATE]]
Place: [[PLACE]]

To,
[[TENANT_NAME]]
Tenant of the premises at [[PREMISES]]

Subject: Termination of tenancy and notice to deliver vacant possession of the premises at [[PREMISES]]

Sir/Madam,

1. I, [[LANDLORD_NAME]], am the owner of the premises at [[PREMISES]] ("the Premises").

2. You were let into occupation of the Premises as a tenant under a rent agreement dated [[AGREEMENT_DATE]], at a monthly rent of Rs. [[RENT]].

3. The tenancy stands terminated on the following ground: [[GROUND]].

4. Arrears: A sum of Rs. [[ARREARS]] remains due and payable towards rent for the period [[ARREARS_PERIOD]], despite repeated requests. You are called upon to pay this amount together with the electricity and other utility charges outstanding for your period of occupation.

5. You are hereby called upon to deliver vacant, peaceful possession of the Premises to me on or before [[VACATE_DATE]], being [[NOTICE_DAYS]] days from the receipt of this notice, together with all keys and access devices, and to clear the arrears mentioned above.

6. Please note that on handover the security deposit will be refunded to you after deducting only the arrears of rent, the unpaid utility charges, and the cost of repairing damage beyond normal wear and tear, each supported by a bill and itemised in writing.

7. Should you fail to comply, I shall be constrained to initiate proceedings before the competent authority for recovery of possession, arrears of rent and mesne profits, at your risk as to costs and consequences.

8. This notice is issued without prejudice to my rights and remedies, all of which are expressly reserved.

Yours faithfully,

_______________________
[[LANDLORD_NAME]]
Landlord`,
  },
  {
    slug: 'notice-for-return-of-security-deposit',
    title: 'Notice for return of a security deposit',
    description:
      'A tenant\'s demand for a withheld deposit: it fixes the handover date, calls for itemised deductions with bills, and sets a deadline before the consumer or civil route.',
    type: 'NOTICE_TEMPLATE',
    matter: 'P_DEPOSIT',
    practiceArea: 'PROPERTY',
    panIndia: true,
    keywords: ['security deposit not returned', 'deposit refund notice', 'landlord not returning deposit', 'deposit wapas nahi kiya'],
    fields: [
      ...PARTIES,
      { key: 'TENANT_NAME', label: 'Tenant name' },
      { key: 'TENANT_ADDRESS', label: 'Tenant current address' },
      { key: 'LANDLORD_NAME', label: 'Landlord name' },
      { key: 'LANDLORD_ADDRESS', label: 'Landlord address' },
      { key: 'PREMISES', label: 'Premises address' },
      { key: 'AGREEMENT_DATE', label: 'Date of the rent agreement' },
      { key: 'DEPOSIT', label: 'Deposit paid in rupees' },
      { key: 'HANDOVER_DATE', label: 'Date vacant possession was handed over' },
      { key: 'REFUND_DUE_DAYS', label: 'Refund period the agreement allows, in days' },
      { key: 'DEDUCTIONS_CLAIMED', label: 'Deductions the landlord claims, if any' },
      { key: 'DEADLINE_DAYS', label: 'Days allowed to comply' },
    ],
    beforeYouUse: [
      'Attach the rent agreement, the deposit receipt or bank transfer proof, the final meter readings and the handover photographs.',
      'If the landlord claims deductions, ask for bills. A deduction without a bill is not a deduction.',
      'Send by registered post with acknowledgement due and by email, and keep both proofs.',
      'Note the limitation period: a suit for recovery of money is ordinarily to be filed within three years of the refusal.',
    ],
    jurisdictionNotes: [
      { heading: 'Which forum', body: 'A withheld deposit is recoverable as a money claim in the civil court of appropriate pecuniary jurisdiction. In states with a Rent Authority under a Model Tenancy framework, the deposit dispute goes there. A consumer complaint is possible where the landlord provided a service for consideration, but tenancy is not automatically a consumer transaction, so take advice on the forum before filing.' },
      { heading: 'Interest', body: 'Where the agreement is silent, interest may still be claimed on the withheld amount from the date it became payable, at the rate the forum considers reasonable.' },
    ],
    version: '1.0',
    body: `LEGAL NOTICE FOR RETURN OF SECURITY DEPOSIT

By Registered Post A.D. and by email

Date: [[DATE]]
Place: [[PLACE]]

To,
[[LANDLORD_NAME]]
[[LANDLORD_ADDRESS]]

From,
[[TENANT_NAME]]
[[TENANT_ADDRESS]]

Subject: Demand for refund of the security deposit of Rs. [[DEPOSIT]] in respect of the premises at [[PREMISES]]

Sir/Madam,

1. I occupied the premises at [[PREMISES]] as your tenant under a rent agreement dated [[AGREEMENT_DATE]], and paid you an interest-free refundable security deposit of Rs. [[DEPOSIT]].

2. I handed over vacant and peaceful possession of the premises to you on [[HANDOVER_DATE]], along with the keys, after clearing all rent and utility charges for my period of occupation. The final meter readings were recorded on that date.

3. Under the agreement the deposit was refundable within [[REFUND_DUE_DAYS]] days of handover, after deducting only arrears, unpaid utility charges, and the cost of repairing damage beyond normal wear and tear, each supported by a bill.

4. Despite the above, and despite repeated reminders, the deposit has not been refunded to me. [[DEDUCTIONS_CLAIMED]]

5. I call upon you to refund the sum of Rs. [[DEPOSIT]] within [[DEADLINE_DAYS]] days of receipt of this notice. If any deduction is claimed, furnish within the same period an itemised statement with supporting bills, so that the claim can be examined.

6. Should you fail to comply, I shall initiate proceedings before the appropriate forum for recovery of the deposit together with interest, compensation for the loss and inconvenience caused, and the costs of the proceedings, entirely at your risk.

7. This notice is without prejudice to my rights and remedies, all of which are reserved.

Yours faithfully,

_______________________
[[TENANT_NAME]]

Enclosures: (1) copy of the rent agreement; (2) proof of payment of the deposit; (3) photographs and meter readings recorded at handover; (4) copies of reminders sent.`,
  },
];

export const NOTICE_TEMPLATES: ResourceTemplateSeed[] = [
  {
    slug: 'legal-notice-cheque-bounce',
    title: 'Legal notice for a bounced cheque',
    description:
      'The statutory demand that must be sent before a complaint under section 138 of the Negotiable Instruments Act. The timeline is unforgiving — thirty days from the bank memo to send this, fifteen days for payment, one month after that to file.',
    type: 'NOTICE_TEMPLATE',
    matter: 'B_CHEQUE',
    forum: 'F_MAGISTRATE',
    panIndia: true,
    keywords: ['cheque bounce notice', 'section 138 notice', 'ni act notice', 'cheque dishonour legal notice', 'cheque bounce ka notice'],
    fields: [
      ...PARTIES,
      { key: 'PAYEE_NAME', label: 'Your name (the payee)' },
      { key: 'PAYEE_ADDRESS', label: 'Your address' },
      { key: 'DRAWER_NAME', label: 'Name of the person or company who issued the cheque' },
      { key: 'DRAWER_ADDRESS', label: 'Their address' },
      { key: 'CHEQUE_NO', label: 'Cheque number' },
      { key: 'CHEQUE_DATE', label: 'Date on the cheque' },
      { key: 'AMOUNT', label: 'Cheque amount in rupees' },
      { key: 'AMOUNT_WORDS', label: 'Amount in words' },
      { key: 'BANK_NAME', label: 'Drawer bank and branch' },
      { key: 'LIABILITY', label: 'What the cheque was given for', hint: 'The legally enforceable debt — a loan, an invoice, goods supplied' },
      { key: 'PRESENTED_DATE', label: 'Date you presented the cheque' },
      { key: 'RETURN_DATE', label: 'Date of the bank return memo' },
      { key: 'RETURN_REASON', label: 'Reason stated in the return memo', hint: 'For example funds insufficient, or payment stopped by drawer' },
    ],
    beforeYouUse: [
      'Send within thirty days of receiving the bank return memo. Beyond that the statutory demand is out of time and the criminal complaint fails.',
      'Attach a copy of the cheque and the original bank return memo. Keep the original memo safe — it is the primary evidence.',
      'Send by registered post with acknowledgement due to the address in your records, and keep the postal receipt and tracking. Also send by email and courier if you have those details.',
      'The cheque must have been given for a legally enforceable debt. A cheque given as a gift, or for a time-barred debt, does not attract section 138.',
      'If payment does not arrive within fifteen days of receipt of this notice, the complaint must be filed within one month of the end of that fifteen-day period.',
    ],
    jurisdictionNotes: [
      { heading: 'Statutory timeline', body: 'Section 138 of the Negotiable Instruments Act, 1881 requires the cheque to be presented within its validity, the demand notice to be issued within thirty days of receipt of information of dishonour, fifteen days to be allowed for payment, and the complaint to be filed within one month of the cause of action arising. Each limb is strictly construed.' },
      { heading: 'Where the complaint is filed', body: 'The complaint is filed before the Magistrate having jurisdiction over the place where the payee maintains the bank branch in which the cheque was presented.' },
      { heading: 'A civil claim runs in parallel', body: 'The criminal complaint does not recover the money by itself. A summary suit for recovery of the amount can be filed in addition, and the two proceed independently.' },
    ],
    version: '1.0',
    body: `LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

By Registered Post A.D. and by email

Date: [[DATE]]
Place: [[PLACE]]

To,
[[DRAWER_NAME]]
[[DRAWER_ADDRESS]]

From,
[[PAYEE_NAME]]
[[PAYEE_ADDRESS]]

Subject: Statutory demand for payment of Rs. [[AMOUNT]] on dishonour of cheque no. [[CHEQUE_NO]] dated [[CHEQUE_DATE]]

Sir/Madam,

Under instructions from and on behalf of my client, I serve upon you the following notice:

1. You issued to my client cheque no. [[CHEQUE_NO]] dated [[CHEQUE_DATE]] for Rs. [[AMOUNT]] (Rupees [[AMOUNT_WORDS]] only), drawn on [[BANK_NAME]].

2. The said cheque was issued by you in discharge of a legally enforceable debt and liability, namely [[LIABILITY]].

3. My client presented the said cheque for encashment on [[PRESENTED_DATE]] through their banker in the ordinary course of business.

4. The said cheque was returned unpaid on [[RETURN_DATE]] with the endorsement "[[RETURN_REASON]]". The bank return memo is enclosed.

5. The dishonour of the said cheque establishes that you did not maintain sufficient funds in the said account, or that you stopped payment, and that the cheque was issued without the intention of honouring it. Your conduct constitutes an offence punishable under section 138 of the Negotiable Instruments Act, 1881.

6. You are hereby called upon to pay to my client the sum of Rs. [[AMOUNT]] (Rupees [[AMOUNT_WORDS]] only) within fifteen (15) days of the receipt of this notice, by demand draft or by bank transfer to the account my client will notify on request.

7. Should you fail to make payment within the said period of fifteen days, my client shall be constrained to file a criminal complaint against you before the competent Court under section 138 of the Negotiable Instruments Act, 1881, and shall additionally institute civil proceedings for recovery of the said amount together with interest and costs, entirely at your risk and expense.

8. A copy of this notice is retained in my office for further necessary action.

Yours faithfully,

_______________________
Advocate for [[PAYEE_NAME]]

Enclosures: (1) photocopy of cheque no. [[CHEQUE_NO]]; (2) bank return memo dated [[RETURN_DATE]].`,
  },
  {
    slug: 'legal-notice-money-recovery',
    title: 'Legal notice for recovery of money',
    description:
      'A demand notice for an unpaid loan, invoice or advance. It states the amount, the basis, the acknowledgements relied on and the limitation position, then gives a deadline before suit.',
    type: 'NOTICE_TEMPLATE',
    matter: 'CV_RECOVERY',
    panIndia: true,
    keywords: ['money recovery notice', 'legal notice for payment', 'unpaid invoice notice', 'udhar wapas notice', 'demand notice'],
    fields: [
      ...PARTIES,
      { key: 'CLAIMANT_NAME', label: 'Your name' },
      { key: 'CLAIMANT_ADDRESS', label: 'Your address' },
      { key: 'DEBTOR_NAME', label: 'Name of the person or business who owes the money' },
      { key: 'DEBTOR_ADDRESS', label: 'Their address' },
      { key: 'AMOUNT', label: 'Principal amount due in rupees' },
      { key: 'AMOUNT_WORDS', label: 'Amount in words' },
      { key: 'BASIS', label: 'Basis of the claim', hint: 'A loan advanced, invoices raised, goods supplied, or an advance paid' },
      { key: 'TRANSACTION_DATE', label: 'Date of the loan, invoice or advance' },
      { key: 'DUE_DATE', label: 'Date payment fell due' },
      { key: 'LAST_ACKNOWLEDGEMENT', label: 'Last acknowledgement of the debt', hint: 'A part payment, a message admitting the dues, or a signed confirmation, with its date' },
      { key: 'INTEREST_RATE', label: 'Interest claimed, per cent per annum' },
      { key: 'DEADLINE_DAYS', label: 'Days allowed to pay' },
    ],
    beforeYouUse: [
      'Collect the evidence first: bank statements showing the money going out, the invoices, the delivery challans, and any message in which the other side admits the debt.',
      'A suit for recovery of money is ordinarily to be filed within three years of the date the money became payable. A written acknowledgement or a part payment within that period starts the three years again.',
      'For a commercial claim above the statutory threshold, pre-institution mediation under the Commercial Courts Act may be mandatory unless urgent interim relief is sought.',
      'For an MSME supplier, the MSEFC route under the MSMED Act is usually faster than a civil suit.',
    ],
    jurisdictionNotes: [
      { heading: 'Limitation', body: 'Article 19 and related articles of the Limitation Act, 1963 prescribe three years for money lent and for the price of goods sold. Section 18 allows a fresh period to run from a written acknowledgement, and section 19 from a part payment.' },
      { heading: 'Summary suit', body: 'Order XXXVII of the Code of Civil Procedure allows a summary suit on a written contract, a bill of exchange or a promissory note, in which the defendant must obtain leave to defend. It is materially faster than an ordinary suit.' },
      { heading: 'MSME dues', body: 'A supplier registered as a micro or small enterprise can refer a payment dispute to the Micro and Small Enterprises Facilitation Council, which must ordinarily decide within ninety days, and interest under the MSMED Act runs at a compound rate.' },
    ],
    version: '1.0',
    body: `LEGAL NOTICE FOR RECOVERY OF MONEY

By Registered Post A.D. and by email

Date: [[DATE]]
Place: [[PLACE]]

To,
[[DEBTOR_NAME]]
[[DEBTOR_ADDRESS]]

From,
[[CLAIMANT_NAME]]
[[CLAIMANT_ADDRESS]]

Subject: Demand for payment of Rs. [[AMOUNT]] with interest

Sir/Madam,

1. My client, [[CLAIMANT_NAME]], states that on [[TRANSACTION_DATE]] the following transaction took place between you and my client: [[BASIS]].

2. In consequence, a sum of Rs. [[AMOUNT]] (Rupees [[AMOUNT_WORDS]] only) became due and payable by you to my client on [[DUE_DATE]].

3. The said amount has not been paid despite repeated oral and written requests. You last acknowledged the said liability as follows: [[LAST_ACKNOWLEDGEMENT]].

4. Your failure to pay is a breach of your obligation and has caused my client financial loss, including the cost of funds withheld from my client's own use.

5. You are hereby called upon to pay to my client, within [[DEADLINE_DAYS]] days of the receipt of this notice, the sum of Rs. [[AMOUNT]] together with interest at [[INTEREST_RATE]] per cent per annum from [[DUE_DATE]] until realisation.

6. Should you fail to comply, my client shall be constrained to institute proceedings against you for recovery of the said amount, interest and costs, including a summary suit where maintainable, and to pursue every other remedy available in law, entirely at your risk and expense.

7. This notice is issued without prejudice to my client's rights and contentions, all of which are expressly reserved.

Yours faithfully,

_______________________
Advocate for [[CLAIMANT_NAME]]

Enclosures: statement of account, copies of invoices or transfer records, and copies of the correspondence relied upon.`,
  },
  {
    slug: 'consumer-complaint-district-commission',
    title: 'Consumer complaint (District Commission)',
    description:
      'A complaint in the form the District Consumer Disputes Redressal Commission expects, with the cause of action, the deficiency alleged and the relief claimed set out separately. File it online through e-Daakhil or in person.',
    type: 'APPLICATION_TEMPLATE',
    matter: 'C_DEFECTIVE',
    forum: 'F_CONSUMER_DIST',
    panIndia: true,
    keywords: ['consumer complaint format', 'consumer court complaint', 'district commission complaint', 'consumer forum complaint', 'e-daakhil'],
    fields: [
      ...PARTIES,
      { key: 'COMMISSION', label: 'Name of the District Commission' },
      { key: 'COMPLAINANT_NAME', label: 'Complainant name' },
      { key: 'COMPLAINANT_ADDRESS', label: 'Complainant address' },
      { key: 'OPPOSITE_PARTY', label: 'Opposite party name' },
      { key: 'OPPOSITE_PARTY_ADDRESS', label: 'Opposite party address' },
      { key: 'GOODS_OR_SERVICE', label: 'Goods bought or service availed' },
      { key: 'PURCHASE_DATE', label: 'Date of purchase or of availing the service' },
      { key: 'AMOUNT_PAID', label: 'Amount paid in rupees' },
      { key: 'INVOICE_NO', label: 'Invoice or order number' },
      { key: 'DEFICIENCY', label: 'What went wrong', hint: 'The defect in the goods or the deficiency in the service, stated factually' },
      { key: 'COMPLAINT_HISTORY', label: 'Complaints already made', hint: 'Dates, ticket numbers and what the opposite party said' },
      { key: 'REFUND_CLAIMED', label: 'Refund or replacement claimed in rupees' },
      { key: 'COMPENSATION_CLAIMED', label: 'Compensation claimed in rupees' },
    ],
    beforeYouUse: [
      'Check pecuniary jurisdiction: the District Commission hears complaints up to the statutory value of the goods or services paid for; above that it is the State or National Commission.',
      'File within two years of the cause of action. Delay beyond that needs a condonation application with reasons.',
      'Attach the invoice, the warranty card, the payment proof and every complaint reference number — the file is decided on documents.',
      'A written complaint to the opposite party first is not mandatory but it makes the deficiency very hard to deny.',
      'e-Daakhil allows online filing and fee payment; the fee depends on the value claimed.',
    ],
    officialLinks: [
      { label: 'e-Daakhil online filing portal', url: 'https://edaakhil.nic.in/', publisher: 'National Consumer Disputes Redressal Commission' },
      { label: 'National Consumer Helpline', url: 'https://consumerhelpline.gov.in/', publisher: 'Department of Consumer Affairs' },
    ],
    jurisdictionNotes: [
      { heading: 'Jurisdiction', body: 'Under the Consumer Protection Act, 2019 a complaint may be filed where the complainant resides or works for gain, which was a significant change from the earlier law. Pecuniary limits are prescribed by the Act and have been revised by notification; check the current threshold before filing.' },
      { heading: 'Limitation', body: 'Section 69 requires a complaint within two years of the cause of action, with power to condone delay for sufficient cause recorded in writing.' },
      { heading: 'Mediation', body: 'The Commission may refer the matter to mediation at the admission stage with the consent of both parties, which often resolves a refund dispute faster than a contested hearing.' },
    ],
    version: '1.0',
    body: `BEFORE THE [[COMMISSION]]

CONSUMER COMPLAINT NO. ________ OF ________

[[COMPLAINANT_NAME]]
[[COMPLAINANT_ADDRESS]]                                          ... COMPLAINANT

VERSUS

[[OPPOSITE_PARTY]]
[[OPPOSITE_PARTY_ADDRESS]]                                  ... OPPOSITE PARTY

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019

MOST RESPECTFULLY SHOWETH:

1. PARTIES
   The Complainant is a consumer within the meaning of section 2(7) of the Consumer Protection Act, 2019, having availed the goods or services described below for consideration and for personal use.
   The Opposite Party is engaged in the business of supplying such goods or providing such services.

2. THE TRANSACTION
   On [[PURCHASE_DATE]] the Complainant purchased or availed [[GOODS_OR_SERVICE]] from the Opposite Party for a consideration of Rs. [[AMOUNT_PAID]], against invoice or order number [[INVOICE_NO]]. A copy of the invoice is annexed.

3. THE DEFECT OR DEFICIENCY
   [[DEFICIENCY]]

4. COMPLAINTS MADE AND THE RESPONSE
   [[COMPLAINT_HISTORY]]
   Despite the above, the Opposite Party has failed and neglected to redress the grievance, which amounts to a defect in the goods and a deficiency in service within the meaning of sections 2(10) and 2(11) of the Act, and to an unfair trade practice.

5. CAUSE OF ACTION
   The cause of action arose on [[PURCHASE_DATE]] and continued on each occasion the Opposite Party refused to redress the grievance. The complaint is within the period of two years prescribed by section 69 of the Act.

6. JURISDICTION
   The Complainant resides and works for gain within the territorial jurisdiction of this Commission, and the value of the goods or services paid as consideration is within its pecuniary jurisdiction.

7. RELIEF CLAIMED
   The Complainant therefore prays that this Commission may be pleased to:
   (a) direct the Opposite Party to refund Rs. [[REFUND_CLAIMED]], or to replace the goods or render the service free of defect;
   (b) award compensation of Rs. [[COMPENSATION_CLAIMED]] for the mental agony, harassment and financial loss caused;
   (c) award the cost of these proceedings; and
   (d) pass such further order as the facts and circumstances may require.

VERIFICATION
I, [[COMPLAINANT_NAME]], the Complainant above named, verify that the contents of paragraphs 1 to 7 are true to my personal knowledge and the documents annexed are true copies of their originals.

Verified at [[PLACE]] on [[DATE]].

_______________________
[[COMPLAINANT_NAME]]
Complainant

ANNEXURES
A. Copy of invoice or order confirmation.
B. Copy of the warranty or terms of service.
C. Proof of payment.
D. Copies of complaints made and the replies received.`,
  },
  {
    slug: 'electricity-billing-complaint-discom',
    title: 'Complaint to a DISCOM about an excess electricity bill',
    description:
      'The first step in any electricity billing dispute: a written complaint to the distribution licensee that asks for the meter reading history, the basis of the assessment and a corrected bill, and preserves your position on the disputed amount.',
    type: 'APPLICATION_TEMPLATE',
    matter: 'E_BILL_EXCESS',
    forum: 'F_DISCOM_GRIEVANCE',
    panIndia: true,
    keywords: ['electricity bill complaint', 'bijli bill complaint', 'discom complaint letter', 'wrong electricity bill complaint', 'excess bill complaint format'],
    fields: [
      ...PARTIES,
      { key: 'DISCOM_NAME', label: 'Name of the distribution company' },
      { key: 'OFFICE', label: 'Office or division address' },
      { key: 'CONSUMER_NAME', label: 'Consumer name as printed on the bill' },
      { key: 'CONSUMER_NO', label: 'Consumer number or account ID' },
      { key: 'METER_NO', label: 'Meter number' },
      { key: 'PREMISES', label: 'Address of the connection' },
      { key: 'CATEGORY', label: 'Tariff category on the bill', hint: 'Domestic, commercial, industrial or agricultural' },
      { key: 'SANCTIONED_LOAD', label: 'Sanctioned load' },
      { key: 'BILL_NO', label: 'Disputed bill number' },
      { key: 'BILL_MONTH', label: 'Billing month in dispute' },
      { key: 'BILL_AMOUNT', label: 'Disputed bill amount in rupees' },
      { key: 'BILL_UNITS', label: 'Units billed' },
      { key: 'NORMAL_UNITS', label: 'Your usual monthly consumption in units' },
      { key: 'GROUNDS', label: 'Why the bill is wrong', hint: 'Average billing without a reading, arrears added without explanation, a vacant premises, a wrong tariff, or a faulty meter' },
    ],
    beforeYouUse: [
      'Photograph the meter with the current reading, and keep the photograph dated. It is the single most useful piece of evidence.',
      'Attach the last twelve months of bills to show what your normal consumption looks like.',
      'Ask in writing for the meter reading history and, if the bill is on an assessment, for the basis of that assessment.',
      'Ask for a meter test if the meter is suspected to be faulty. A testing fee usually applies and is refunded if the meter is found defective.',
      'Pay the undisputed portion and record that you are doing so under protest as to the balance — non-payment can lead to disconnection while the dispute is pending.',
      'If the DISCOM does not resolve it, the Consumer Grievance Redressal Forum and then the Electricity Ombudsman are the next steps, and both are free.',
    ],
    jurisdictionNotes: [
      { heading: 'The statutory ladder', body: 'Section 42 of the Electricity Act, 2003 requires every distribution licensee to establish a Consumer Grievance Redressal Forum, with an appeal to an Ombudsman appointed by the State Electricity Regulatory Commission. Approaching the CGRF ordinarily requires the licensee to have been given the chance to resolve the complaint first.' },
      { heading: 'Assessment for unauthorised use is different', body: 'A provisional assessment under section 126, or a case under section 135 alleging theft, follows a separate route with its own appellate authority and strict timelines. Do not treat such a notice as an ordinary billing complaint.' },
      { heading: 'Disconnection during a dispute', body: 'State supply codes generally permit disconnection for non-payment after notice, even where a dispute is pending, unless the disputed amount is deposited or a protective order is obtained. Paying the undisputed portion under protest is the usual protective step.' },
      { heading: 'The consumer forum route also exists', body: 'A billing dispute can also be taken to a Consumer Commission, and courts have held that a consumer complaint against a licensee is maintainable for deficiency in service, though not where the case is really one of alleged theft.' },
    ],
    version: '1.0',
    body: `COMPLAINT REGARDING AN EXCESSIVE AND INCORRECT ELECTRICITY BILL

Date: [[DATE]]
Place: [[PLACE]]

To,
The Executive Engineer / Assistant Engineer (Commercial)
[[DISCOM_NAME]]
[[OFFICE]]

Subject: Dispute of bill no. [[BILL_NO]] for [[BILL_MONTH]] amounting to Rs. [[BILL_AMOUNT]] — consumer no. [[CONSUMER_NO]] — request for correction and for the meter reading history

Sir/Madam,

1. CONNECTION DETAILS
   Consumer name: [[CONSUMER_NAME]]
   Consumer number: [[CONSUMER_NO]]
   Meter number: [[METER_NO]]
   Address of connection: [[PREMISES]]
   Tariff category: [[CATEGORY]]
   Sanctioned load: [[SANCTIONED_LOAD]]

2. THE DISPUTED BILL
   Bill number [[BILL_NO]] for the month of [[BILL_MONTH]] demands Rs. [[BILL_AMOUNT]] for [[BILL_UNITS]] units. My consumption in this premises has historically been in the region of [[NORMAL_UNITS]] units a month, as the enclosed bills for the preceding twelve months show.

3. GROUNDS OF THE DISPUTE
   [[GROUNDS]]

4. WHAT I REQUEST
   4.1 A copy of the meter reading history for this connection for the last twelve billing cycles, showing the reading taken on each occasion and the name of the reader.
   4.2 The basis of the disputed bill, and if any part of it is an assessment or an arrear, a statement showing how it has been computed and the period to which it relates.
   4.3 Testing of the meter in my presence, and a copy of the test report. I am willing to deposit the prescribed testing fee.
   4.4 A revised bill on the basis of actual consumption, and withdrawal of the excess demand together with any late payment surcharge levied on it.

5. PAYMENT UNDER PROTEST
   Without prejudice to this dispute, I am paying the undisputed portion of the bill, that is the amount corresponding to my normal consumption, strictly under protest. This payment shall not be treated as acceptance of the disputed demand. I request that the supply not be disconnected while this complaint is under consideration.

6. FURTHER STEPS
   Kindly register this complaint and provide me the complaint number and the name of the officer dealing with it. If the matter is not resolved within the period prescribed by the applicable Supply Code and Standards of Performance regulations, I shall approach the Consumer Grievance Redressal Forum and thereafter the Electricity Ombudsman.

Yours faithfully,

_______________________
[[CONSUMER_NAME]]
Consumer no. [[CONSUMER_NO]]

Enclosures: (1) copy of the disputed bill; (2) copies of bills for the preceding twelve months; (3) dated photograph of the meter showing the present reading; (4) proof of payment of the undisputed amount.`,
  },
  {
    slug: 'rti-application',
    title: 'RTI application',
    description:
      'A right to information application drafted the way the Act intends: specific, answerable questions rather than a demand for opinions, with the fee and the exemption position handled up front.',
    type: 'APPLICATION_TEMPLATE',
    matter: 'PU_RTI',
    forum: 'F_PIO',
    panIndia: true,
    keywords: ['rti application', 'rti format', 'right to information application', 'rti kaise likhen', 'rti application sample'],
    fields: [
      ...PARTIES,
      { key: 'PIO_DESIGNATION', label: 'Public Information Officer designation' },
      { key: 'PUBLIC_AUTHORITY', label: 'Public authority name' },
      { key: 'AUTHORITY_ADDRESS', label: 'Public authority address' },
      { key: 'APPLICANT_NAME', label: 'Your name' },
      { key: 'APPLICANT_ADDRESS', label: 'Your address with PIN' },
      { key: 'PHONE', label: 'Phone number' },
      { key: 'EMAIL', label: 'Email address' },
      { key: 'SUBJECT', label: 'Subject of the information sought' },
      { key: 'PERIOD', label: 'Period the information relates to' },
      { key: 'QUESTIONS', label: 'The information sought, numbered', hint: 'Ask for documents, file notings, dates and figures — not for reasons or opinions' },
      { key: 'FEE_MODE', label: 'How the fee is paid', hint: 'Indian postal order, demand draft, court fee stamp or online payment' },
      { key: 'BPL_STATUS', label: 'Below poverty line', hint: 'Yes with card number if the fee exemption is claimed, otherwise No' },
    ],
    beforeYouUse: [
      'Ask for information and documents, not for reasons or opinions. "Why was my file rejected" is not answerable under the Act; "provide copies of the file notings and the rejection order" is.',
      'Address it to the Public Information Officer of the correct public authority. A misdirected application must be transferred, but that costs weeks.',
      'The prescribed application fee is ordinarily Rs 10 for central authorities and varies for states. Applicants below the poverty line are exempt on production of proof.',
      'The PIO must respond within thirty days, or forty-eight hours where life or liberty is concerned. Silence is a deemed refusal and starts the appeal clock.',
      'A first appeal lies to the First Appellate Authority within thirty days of the refusal or of the expiry of the response period; a second appeal lies to the Information Commission.',
    ],
    officialLinks: [
      { label: 'RTI Online (central public authorities)', url: 'https://rtionline.gov.in/', publisher: 'Department of Personnel and Training' },
      { label: 'Central Information Commission', url: 'https://cic.gov.in/', publisher: 'Central Information Commission' },
    ],
    jurisdictionNotes: [
      { heading: 'Timelines', body: 'Section 7 of the Right to Information Act, 2005 requires a decision within thirty days of receipt, extended to forty-five days where a third party is involved, and within forty-eight hours where the information concerns the life or liberty of a person.' },
      { heading: 'Fee and exemptions', body: 'Fees are prescribed by rules made by the appropriate government, so state fees differ from central fees. Section 7(5) exempts persons below the poverty line from the fee.' },
      { heading: 'Exempt information', body: 'Section 8 lists exemptions including national security, commercial confidence, and personal information the disclosure of which has no relationship to any public activity. Section 8(2) allows disclosure even of exempt information where the public interest outweighs the protected interest.' },
    ],
    version: '1.0',
    body: `APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005

Date: [[DATE]]
Place: [[PLACE]]

To,
[[PIO_DESIGNATION]]
[[PUBLIC_AUTHORITY]]
[[AUTHORITY_ADDRESS]]

Subject: Request for information regarding [[SUBJECT]]

Sir/Madam,

1. APPLICANT DETAILS
   Name: [[APPLICANT_NAME]]
   Address: [[APPLICANT_ADDRESS]]
   Phone: [[PHONE]]
   Email: [[EMAIL]]
   Citizen of India: Yes
   Below poverty line: [[BPL_STATUS]]

2. INFORMATION SOUGHT
   The information sought relates to [[SUBJECT]] for the period [[PERIOD]]:

[[QUESTIONS]]

3. FORM OF SUPPLY
   Kindly supply the information as certified photocopies of the documents, or by email at the address above where the record is held electronically. Where any document is voluminous, kindly permit inspection of the record under section 2(j)(i) and supply copies of the pages identified during inspection.

4. FEE
   The prescribed application fee has been paid by [[FEE_MODE]]. I undertake to pay any further fee for photocopying on intimation of the amount, and request an intimation under section 7(3) before the copies are prepared.

5. IF ANY PART IS REFUSED
   If any part of the information is held to be exempt, kindly (a) identify the specific clause of section 8 or 9 relied upon, (b) sever and supply the remainder under section 10, and (c) furnish the name and designation of the First Appellate Authority together with the period within which an appeal may be filed.

6. THIRD PARTY INFORMATION
   Where the record contains information relating to a third party, kindly follow the procedure under section 11 and inform me of the outcome.

Yours faithfully,

_______________________
[[APPLICANT_NAME]]

Note: this application seeks existing records held by the public authority. It does not ask for opinions, explanations or the creation of new information.`,
  },
  {
    slug: 'epfo-grievance-pf-not-deposited',
    title: 'EPFO grievance — employer has not deposited PF',
    description:
      'A grievance to the Regional Provident Fund Commissioner where deductions appear on the salary slip but not in the passbook, asking for an inquiry under section 7A and for recovery with damages.',
    type: 'APPLICATION_TEMPLATE',
    matter: 'PF_NOT_DEPOSITED',
    forum: 'F_EPFO',
    panIndia: true,
    keywords: ['pf not deposited complaint', 'epfo grievance', 'epfigms complaint', 'pf nahi jama hua', 'employer not depositing pf'],
    fields: [
      ...PARTIES,
      { key: 'RPFC_OFFICE', label: 'Regional PF Office' },
      { key: 'EMPLOYEE_NAME', label: 'Your name' },
      { key: 'UAN', label: 'Universal Account Number' },
      { key: 'PF_NUMBER', label: 'PF account number' },
      { key: 'EMPLOYER_NAME', label: 'Employer name' },
      { key: 'EMPLOYER_ADDRESS', label: 'Employer address' },
      { key: 'ESTABLISHMENT_CODE', label: 'Establishment code, if known' },
      { key: 'JOINING_DATE', label: 'Date you joined' },
      { key: 'MISSING_PERIOD', label: 'Period for which contributions are missing' },
      { key: 'MONTHLY_DEDUCTION', label: 'Monthly deduction shown on the salary slip in rupees' },
      { key: 'TOTAL_MISSING', label: 'Total amount not deposited in rupees' },
    ],
    beforeYouUse: [
      'Download your EPF passbook and take a dated screenshot showing the missing months — that is the core evidence.',
      'Collect salary slips for the same months showing the deduction. Deduction without deposit is the whole complaint.',
      'File the grievance on EPFiGMS as well as in writing; the portal generates a registration number you can chase.',
      'Non-deposit of a deducted contribution is not merely a civil default; it also carries penal consequences for the employer.',
      'Keep working with the same UAN if you change jobs — a transfer does not extinguish the earlier default.',
    ],
    officialLinks: [
      { label: 'EPFiGMS grievance portal', url: 'https://epfigms.gov.in/', publisher: 'EPFO' },
      { label: 'EPFO member passbook', url: 'https://passbook.epfindia.gov.in/', publisher: 'EPFO' },
    ],
    jurisdictionNotes: [
      { heading: 'Inquiry and recovery', body: 'Section 7A of the Employees Provident Funds and Miscellaneous Provisions Act, 1952 empowers the authority to determine the amount due from an employer after inquiry. Section 14B provides for damages and section 7Q for interest on belated payment.' },
      { heading: 'Deducted but not deposited', body: 'Where the employee share has been deducted from wages and not deposited, the amount is held in trust for the employee, and the default attracts prosecution in addition to recovery.' },
      { heading: 'Appeal', body: 'An order under section 7A is appealable to the Central Government Industrial Tribunal exercising the powers of the EPF Appellate Tribunal.' },
    ],
    version: '1.0',
    body: `GRIEVANCE REGARDING NON-DEPOSIT OF PROVIDENT FUND CONTRIBUTIONS

Date: [[DATE]]
Place: [[PLACE]]

To,
The Regional Provident Fund Commissioner
[[RPFC_OFFICE]]

Subject: Non-deposit of provident fund contributions deducted from my wages by [[EMPLOYER_NAME]] for the period [[MISSING_PERIOD]] — request for inquiry under section 7A and for recovery

Sir/Madam,

1. MEMBER DETAILS
   Name: [[EMPLOYEE_NAME]]
   UAN: [[UAN]]
   PF account number: [[PF_NUMBER]]
   Date of joining: [[JOINING_DATE]]

2. EMPLOYER DETAILS
   Establishment: [[EMPLOYER_NAME]]
   Address: [[EMPLOYER_ADDRESS]]
   Establishment code: [[ESTABLISHMENT_CODE]]

3. THE GRIEVANCE
   3.1 My employer has deducted the employee share of provident fund contribution from my wages every month, at Rs. [[MONTHLY_DEDUCTION]] per month, as the enclosed salary slips show.
   3.2 My EPF passbook, however, shows no credit of contributions for the period [[MISSING_PERIOD]]. The aggregate amount deducted and not deposited is approximately Rs. [[TOTAL_MISSING]], apart from the employer share.
   3.3 The deducted amount was held by the employer in trust for me and was required to be deposited within the statutory period. The failure to do so has deprived me of the contribution, of the interest that would have accrued on it, and of pensionable service.

4. WHAT I REQUEST
   4.1 That an inquiry be initiated under section 7A of the Employees Provident Funds and Miscellaneous Provisions Act, 1952 to determine the amount due from the establishment in respect of my account and of other employees similarly placed.
   4.2 That the employer be directed to deposit the entire amount due, both the employee and the employer share, for the period in question.
   4.3 That interest under section 7Q and damages under section 14B be levied on the belated payment.
   4.4 That my passbook be updated once the amounts are credited, and that I be informed of the outcome of the inquiry.
   4.5 That prosecution be considered in respect of the amount deducted from wages and not deposited.

5. I confirm that this grievance has also been registered on the EPFiGMS portal, and I shall furnish the registration number and any further document required.

Yours faithfully,

_______________________
[[EMPLOYEE_NAME]]
UAN [[UAN]]

Enclosures: (1) EPF passbook extract showing the missing period; (2) salary slips for the period [[MISSING_PERIOD]]; (3) appointment letter; (4) identity proof.`,
  },
  {
    slug: 'labour-commissioner-unpaid-wages',
    title: 'Complaint to the Labour Commissioner for unpaid wages',
    description:
      'A complaint for unpaid salary, overtime or full and final settlement, addressed to the authority with jurisdiction, setting out the period, the amount and the demands already made.',
    type: 'APPLICATION_TEMPLATE',
    matter: 'L_UNPAID',
    forum: 'F_LABOUR_COMMISSIONER',
    panIndia: true,
    keywords: ['unpaid salary complaint', 'labour commissioner complaint', 'salary not paid complaint', 'salary nahi mili complaint', 'full and final settlement not paid'],
    fields: [
      ...PARTIES,
      { key: 'AUTHORITY', label: 'Authority addressed', hint: 'Labour Commissioner or the Authority under the Payment of Wages Act for the area' },
      { key: 'AUTHORITY_ADDRESS', label: 'Office address' },
      { key: 'EMPLOYEE_NAME', label: 'Your name' },
      { key: 'EMPLOYEE_ADDRESS', label: 'Your address' },
      { key: 'DESIGNATION', label: 'Your designation' },
      { key: 'EMPLOYER_NAME', label: 'Employer name' },
      { key: 'EMPLOYER_ADDRESS', label: 'Employer address' },
      { key: 'JOINING_DATE', label: 'Date of joining' },
      { key: 'LAST_WORKING_DATE', label: 'Last working day, if you have left' },
      { key: 'MONTHLY_WAGE', label: 'Monthly wage in rupees' },
      { key: 'UNPAID_PERIOD', label: 'Period for which wages are unpaid' },
      { key: 'AMOUNT_DUE', label: 'Total amount due in rupees' },
      { key: 'COMPONENTS', label: 'What makes up the claim', hint: 'Basic wages, overtime, leave encashment, gratuity, notice pay or reimbursements' },
      { key: 'DEMANDS_MADE', label: 'Demands already made', hint: 'Dates of emails, letters or meetings and what was said' },
    ],
    beforeYouUse: [
      'Gather the appointment letter, salary slips, bank statements showing when payments stopped, and every email asking for the money.',
      'Which authority applies depends on your wage level and the statute — the Payment of Wages Act authority, the Minimum Wages authority, or the Labour Commissioner as conciliation officer.',
      'There are time limits: a claim under the Payment of Wages Act is ordinarily to be made within twelve months of the wage becoming due, extendable for sufficient cause.',
      'Gratuity is claimed separately under the Payment of Gratuity Act through Form I to the employer and then the Controlling Authority.',
      'If you were dismissed rather than merely unpaid, an industrial dispute may be the stronger route; take advice before choosing.',
    ],
    jurisdictionNotes: [
      { heading: 'Which forum', body: 'The Payment of Wages Act, 1936 provides a summary claim before a prescribed authority for delayed or deducted wages, with power to award compensation. The Industrial Disputes Act, 1947 route through the conciliation officer is used where the dispute is about termination or conditions of service. State rules under the new labour codes are being notified progressively and may change the designated authority.' },
      { heading: 'Gratuity', body: 'Gratuity for five years of continuous service is claimed by Form I to the employer, and on refusal by an application to the Controlling Authority under the Payment of Gratuity Act, 1972, which can award interest.' },
      { heading: 'Managerial employees', body: 'Some statutes exclude employees above a wage threshold or in a managerial capacity. Where the labour route is not available, a civil suit for recovery of the wage remains.' },
    ],
    version: '1.0',
    body: `COMPLAINT REGARDING NON-PAYMENT OF WAGES

Date: [[DATE]]
Place: [[PLACE]]

To,
[[AUTHORITY]]
[[AUTHORITY_ADDRESS]]

Subject: Non-payment of wages amounting to Rs. [[AMOUNT_DUE]] by [[EMPLOYER_NAME]] for the period [[UNPAID_PERIOD]]

Sir/Madam,

1. COMPLAINANT
   Name: [[EMPLOYEE_NAME]]
   Address: [[EMPLOYEE_ADDRESS]]
   Designation: [[DESIGNATION]]
   Date of joining: [[JOINING_DATE]]
   Last working day: [[LAST_WORKING_DATE]]
   Monthly wage: Rs. [[MONTHLY_WAGE]]

2. EMPLOYER
   [[EMPLOYER_NAME]]
   [[EMPLOYER_ADDRESS]]

3. THE CLAIM
   3.1 I was employed by the above establishment on the terms recorded in my appointment letter, a copy of which is enclosed.
   3.2 Wages for the period [[UNPAID_PERIOD]] have not been paid to me. The total amount due is Rs. [[AMOUNT_DUE]], comprising: [[COMPONENTS]].
   3.3 The amount has been withheld without any lawful authorisation or deduction permitted by law, and without any communication of a reason.

4. DEMANDS ALREADY MADE
   [[DEMANDS_MADE]]
   Despite the above the employer has neither paid the amount nor given any reason for withholding it.

5. WHAT I REQUEST
   5.1 That the employer be directed to pay the wages due of Rs. [[AMOUNT_DUE]] forthwith.
   5.2 That compensation be awarded for the delay, as the applicable statute permits.
   5.3 That interest be awarded on the amount from the date each instalment fell due.
   5.4 That a date be fixed for conciliation, and that the employer be directed to produce the wage register, the attendance record and the salary slips for the period in question.

6. I am willing to appear on any date fixed and to produce every document in my possession.

Yours faithfully,

_______________________
[[EMPLOYEE_NAME]]

Enclosures: (1) appointment letter; (2) salary slips; (3) bank statement showing the last salary credited; (4) copies of emails and letters demanding payment; (5) identity proof.`,
  },
  {
    slug: 'affidavit-name-change',
    title: 'Affidavit for change of name',
    description:
      'A sworn declaration of a change of name, in the form banks, schools, passport offices and gazette publication ordinarily accept, with the old and new name and the reason stated.',
    type: 'AFFIDAVIT_TEMPLATE',
    matter: 'CV_AFFIDAVIT',
    forum: 'F_NOTARY',
    panIndia: true,
    keywords: ['name change affidavit', 'affidavit format name change', 'naam badalne ka halafnama', 'change of name declaration'],
    fields: [
      ...PARTIES,
      { key: 'DEPONENT_NAME', label: 'Your name as it will now be' },
      { key: 'OLD_NAME', label: 'Your name as it appears in existing records' },
      { key: 'PARENT_NAME', label: 'Father or mother name' },
      { key: 'AGE', label: 'Age' },
      { key: 'ADDRESS', label: 'Full residential address' },
      { key: 'REASON', label: 'Reason for the change', hint: 'Numerology, marriage, correction of a spelling, or personal preference' },
      { key: 'ID_TYPE', label: 'Identity document relied upon' },
      { key: 'ID_NUMBER', label: 'Its number' },
    ],
    beforeYouUse: [
      'An affidavit alone rarely completes a name change: most institutions want the affidavit, a newspaper publication and, for many purposes, a Gazette notification.',
      'Have it typed on stamp paper of the value your state prescribes for an affidavit, and sworn before a notary or an oath commissioner.',
      'Carry the original identity document to the notary — the notary must satisfy themselves of who you are.',
      'Update the name in the same order institutions expect: Gazette, then PAN and Aadhaar, then bank and employment records.',
    ],
    jurisdictionNotes: [
      { heading: 'Gazette publication', body: 'Publication in the Gazette of India or the state gazette is the step most authorities treat as conclusive. The Department of Publication handles central gazette notifications and each state has its own government press.' },
      { heading: 'Stamp value', body: 'The stamp value for an affidavit is fixed by state stamp legislation and is usually small. An affidavit on stamp paper of the wrong value can be rejected at the counter.' },
      { heading: 'Minors', body: 'For a person below eighteen, the affidavit is sworn by a parent or guardian, and school records are ordinarily changed on the basis of the affidavit and the gazette notification together.' },
    ],
    officialLinks: [
      { label: 'Department of Publication (Gazette of India)', url: 'https://egazette.gov.in/', publisher: 'Government of India' },
    ],
    version: '1.0',
    body: `AFFIDAVIT

(To be typed on stamp paper of the value prescribed by the applicable state stamp law and sworn before a notary or oath commissioner.)

I, [[DEPONENT_NAME]], son/daughter of [[PARENT_NAME]], aged [[AGE]] years, residing at [[ADDRESS]], do hereby solemnly affirm and declare as follows:

1. That I am a citizen of India and am competent to swear this affidavit.

2. That my name has hitherto been recorded and known as [[OLD_NAME]] in my documents and records.

3. That I have changed my name from [[OLD_NAME]] to [[DEPONENT_NAME]] with effect from the date of this affidavit, for the following reason: [[REASON]].

4. That both the said names refer to one and the same person, that is to say myself.

5. That my identity is established by [[ID_TYPE]] bearing number [[ID_NUMBER]], a copy of which is annexed.

6. That henceforth I shall be known, called and distinguished by the name [[DEPONENT_NAME]] in all records, dealings and transactions, and I request all authorities, banks, institutions and persons concerned to record the change accordingly.

7. That this change of name is not made with any intention of defrauding any person or authority, of evading any liability, or of concealing any proceeding, and no proceeding is pending against me in which my identity is in question.

8. That the contents of this affidavit are true to my personal knowledge and nothing material has been concealed.

DEPONENT

_______________________
[[DEPONENT_NAME]]

VERIFICATION

Verified at [[PLACE]] on [[DATE]] that the contents of the above affidavit are true and correct to my knowledge, and that no part of it is false.

_______________________
DEPONENT`,
  },
];
