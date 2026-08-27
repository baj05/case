/**
 * Platform-authored templates, second set: employment, corporate, court
 * documents, checklists and process guides.
 *
 * Same rule as the first set — every one of these is `PLATFORM_TEMPLATE`. None
 * is a prescribed form. Where a prescribed form exists (a consumer complaint, a
 * trade mark application, a PF claim), the entry carries `officialLinks` to it
 * and the covering document is what the template actually is.
 */

import type { ResourceTemplateSeed } from './resource-templates.ts';

const EXEC = [
  { key: 'DATE', label: 'Date of the document' },
  { key: 'PLACE', label: 'Place of execution', hint: 'The city where it is signed — it decides the stamp duty regime' },
];

// ===========================================================================
// EMPLOYMENT
// ===========================================================================

export const EMPLOYMENT_TEMPLATES: ResourceTemplateSeed[] = [
  {
    slug: 'employment-agreement',
    title: 'Employment agreement',
    description:
      'A full-time employment agreement covering role, remuneration, working hours, leave, confidentiality, intellectual '
      + 'property, notice and the statutory benefits that apply regardless of what the contract says.',
    type: 'AGREEMENT_TEMPLATE',
    matter: 'L_EMPLOYMENT_CONTRACT',
    panIndia: true,
    keywords: ['employment agreement', 'employment contract', 'appointment letter', 'job contract', 'offer letter format'],
    fields: [
      ...EXEC,
      { key: 'EMPLOYER_NAME', label: 'Employer name' },
      { key: 'EMPLOYER_ADDRESS', label: 'Employer registered address' },
      { key: 'EMPLOYEE_NAME', label: 'Employee full name' },
      { key: 'EMPLOYEE_ADDRESS', label: 'Employee address' },
      { key: 'DESIGNATION', label: 'Designation' },
      { key: 'REPORTING_TO', label: 'Reports to' },
      { key: 'WORK_LOCATION', label: 'Place of work' },
      { key: 'START_DATE', label: 'Date of joining' },
      { key: 'CTC', label: 'Annual cost to company in rupees' },
      { key: 'PROBATION_MONTHS', label: 'Probation period in months' },
      { key: 'NOTICE_DAYS', label: 'Notice period in days after confirmation' },
      { key: 'PROBATION_NOTICE_DAYS', label: 'Notice period in days during probation' },
      { key: 'WORK_HOURS', label: 'Working hours' },
      { key: 'LEAVE_DAYS', label: 'Annual paid leave in days' },
      { key: 'CONFIDENTIALITY_YEARS', label: 'Confidentiality survival period in years' },
    ],
    beforeYouUse: [
      'Attach the salary breakdown as an annexure rather than burying it in a clause — it is the part both sides will read again.',
      'Statutory benefits are not negotiable by contract. Provident fund, ESI where applicable, gratuity after the qualifying period, maternity benefit and the statutory minimum wage apply whatever this document says.',
      'A restraint on working for a competitor after employment ends is void in India under section 27 of the Indian Contract Act. Protect confidential information and customer data instead — that is enforceable.',
      'If the employee will create anything — code, designs, written material — say clearly that it vests in the employer, and remember that an assignment of copyright must be in writing.',
      'Give the employee a signed copy. An unsigned or unshared contract is the employer’s problem, not the employee’s.',
    ],
    jurisdictionNotes: [
      { heading: 'Shops and establishments registration', body: 'Working hours, weekly rest, leave and the conditions of employment are governed by the Shops and Commercial Establishments Act of the state where the workplace is, and those provisions override a contract that gives less. The registration itself is a state obligation on the employer.' },
      { heading: 'Which employees are "workmen"', body: 'Employees in a supervisory or managerial capacity above a wage threshold fall outside the definition of workman under industrial relations legislation, and therefore outside its protections against retrenchment and its dispute machinery. The classification is decided by what a person actually does, not by the designation printed on the letter.' },
      { heading: 'Gratuity', body: 'Gratuity becomes payable after the qualifying period of continuous service on resignation, retirement, death or disablement. It is a statutory liability and cannot be contracted away, and interest runs on delayed payment.' },
      { heading: 'Stamping', body: 'An employment agreement generally attracts nominal stamp duty as an agreement, at the rate the state prescribes. Under-stamping does not void it but makes it inadmissible until made good.' },
    ],
    officialLinks: [
      { label: 'EPFO — member portal and claim forms', url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/', publisher: 'EPFO' },
      { label: 'Chief Labour Commissioner (Central)', url: 'https://clc.gov.in/', publisher: 'Ministry of Labour and Employment' },
    ],
    version: '1.0',
    body: `EMPLOYMENT AGREEMENT

This Employment Agreement is made at [[PLACE]] on [[DATE]]

BETWEEN

[[EMPLOYER_NAME]], having its registered office at [[EMPLOYER_ADDRESS]] (the "Company");

AND

[[EMPLOYEE_NAME]], residing at [[EMPLOYEE_ADDRESS]] (the "Employee").

1. APPOINTMENT
   1.1 The Company appoints the Employee as [[DESIGNATION]] with effect from [[START_DATE]]. The Employee shall report to [[REPORTING_TO]].
   1.2 The place of work is [[WORK_LOCATION]]. The Company may require the Employee to work at another location within the same city on reasonable notice; a transfer to another city requires the Employee's written consent.

2. PROBATION AND CONFIRMATION
   2.1 The Employee is on probation for [[PROBATION_MONTHS]] months from the date of joining.
   2.2 Confirmation shall be by written communication. If no communication is issued at the end of probation and the Employee continues in service, the Employee is deemed confirmed.

3. REMUNERATION
   3.1 The Employee shall be paid a cost to company of Rs. [[CTC]] per annum, broken down in Annexure A.
   3.2 Salary is payable monthly, on or before the seventh day of the following month, after statutory deductions.
   3.3 The Company shall deduct and deposit provident fund contributions, professional tax and income tax as required by law, and shall issue a Form 16 within the prescribed time.

4. HOURS AND LEAVE
   4.1 Normal working hours are [[WORK_HOURS]], subject to the Shops and Establishments legislation of the state in which the workplace is situated.
   4.2 The Employee is entitled to [[LEAVE_DAYS]] days of paid leave in each calendar year, in addition to the public holidays the Company notifies and to any leave the law requires the Company to grant.
   4.3 Nothing in this clause reduces an entitlement the Employee has under any applicable statute.

5. CONFIDENTIALITY
   5.1 The Employee shall not, during employment or for [[CONFIDENTIALITY_YEARS]] years after it ends, disclose or use for any purpose other than the Company's business any confidential information of the Company, its clients or its employees.
   5.2 Confidential information does not include information that is public, that the Employee already lawfully held, or that the Employee is required by law or by an authority to disclose.
   5.3 On the employment ending, the Employee shall return every document, device and credential belonging to the Company.

6. INTELLECTUAL PROPERTY
   6.1 All intellectual property created by the Employee in the course of employment and relating to the Company's business shall vest in the Company.
   6.2 The Employee assigns to the Company all right, title and interest in such intellectual property, and shall sign any document reasonably required to record that assignment.
   6.3 This clause does not extend to anything the Employee creates outside working hours, without Company resources, and unrelated to the Company's business.

7. CONDUCT AND POLICIES
   7.1 The Employee shall comply with the Company's policies as notified from time to time, including its policy on prevention of sexual harassment.
   7.2 The Company shall make its policies available to the Employee. A policy that has not been communicated cannot be enforced against the Employee.

8. TERMINATION
   8.1 Either party may terminate this Agreement by [[NOTICE_DAYS]] days' written notice after confirmation, or [[PROBATION_NOTICE_DAYS]] days' written notice during probation.
   8.2 The Company may pay salary in lieu of notice. The Employee may, with the Company's written agreement, buy out the notice period.
   8.3 The Company may terminate without notice for proven misconduct, following an inquiry at which the Employee is given the charge in writing, an opportunity to respond and a reasoned decision.
   8.4 On termination the Company shall pay all salary due, encashable leave, and gratuity if the Employee has completed the qualifying period, and shall issue a relieving letter and the statutory forms.

9. GRIEVANCES AND DISPUTES
   9.1 The Employee may raise a grievance in writing with [[REPORTING_TO]], and if unresolved, with the Company's designated grievance officer.
   9.2 This Agreement is governed by Indian law. Nothing in it prevents either party from approaching the forum that a statute provides.

10. ENTIRE AGREEMENT
    This Agreement, with its annexures, records the whole of what is agreed and replaces every earlier offer, letter or understanding on the same subject.

IN WITNESS WHEREOF the parties have signed this Agreement on the date first written above.

For [[EMPLOYER_NAME]]                          EMPLOYEE

_______________________                        _______________________
Authorised signatory                           [[EMPLOYEE_NAME]]

ANNEXURE A — SALARY BREAKDOWN
(Set out basic, allowances, employer provident fund contribution, gratuity provision, variable pay and the resulting gross and net.)`,
  },
  {
    slug: 'consultant-agreement',
    title: 'Consultant or contractor agreement',
    description:
      'An independent-contractor engagement: scope, deliverables, fees, taxes, intellectual property and the clauses that '
      + 'keep the arrangement from being treated as employment.',
    type: 'AGREEMENT_TEMPLATE',
    matter: 'CT_SERVICE_AGREEMENT',
    panIndia: true,
    keywords: ['consultant agreement', 'contractor agreement', 'freelancer agreement', 'consultancy contract', 'retainer agreement'],
    fields: [
      ...EXEC,
      { key: 'CLIENT_NAME', label: 'Client name' },
      { key: 'CLIENT_ADDRESS', label: 'Client address' },
      { key: 'CONSULTANT_NAME', label: 'Consultant name' },
      { key: 'CONSULTANT_ADDRESS', label: 'Consultant address' },
      { key: 'CONSULTANT_GSTIN', label: 'Consultant GSTIN', hint: 'Leave blank if unregistered' },
      { key: 'SCOPE', label: 'Scope of services', hint: 'Be specific. Vague scope is the source of most disputes' },
      { key: 'DELIVERABLES', label: 'Deliverables and dates' },
      { key: 'FEE', label: 'Fee in rupees' },
      { key: 'FEE_BASIS', label: 'Fee basis', hint: 'Per month, per milestone, or fixed for the engagement' },
      { key: 'PAYMENT_DAYS', label: 'Payment days from invoice' },
      { key: 'TERM_MONTHS', label: 'Term in months' },
      { key: 'NOTICE_DAYS', label: 'Termination notice in days' },
    ],
    beforeYouUse: [
      'The label does not decide the relationship. If the client controls how, when and where the work is done, supplies the tools and integrates the person into its team, a court or a labour authority may find employment whatever this document calls it — with provident fund, gratuity and termination protection following.',
      'Say who owns the output, and say it in an assignment clause. Without one, copyright in a commissioned work can remain with the author.',
      'Deal with tax deduction at source explicitly: professional fees attract TDS at the prescribed rate, and the consultant should receive the certificate.',
      'If the consultant is GST-registered, the fee should state whether it is inclusive or exclusive of GST. This single omission causes more invoice disputes than any other.',
    ],
    jurisdictionNotes: [
      { heading: 'Non-compete', body: 'A clause restraining the consultant from working for competitors after the engagement ends is void under section 27 of the Indian Contract Act, 1872. Restrictions during the engagement, and protection of confidential information at any time, are enforceable.' },
      { heading: 'MSME delayed payment', body: 'If the consultant is a registered micro or small enterprise, the MSMED Act caps the payment period and makes compound interest payable on delay, irrespective of the payment terms in this agreement. That statutory right cannot be contracted away.' },
      { heading: 'Stamp duty', body: 'An agreement of this kind attracts stamp duty at the rate the state of execution prescribes for an agreement. Where a fixed nominal duty applies, pay it — it is small, and an unstamped agreement is inadmissible until it is made good.' },
    ],
    officialLinks: [
      { label: 'MSME Samadhaan — delayed payment reference', url: 'https://samadhaan.msme.gov.in/', publisher: 'Ministry of MSME' },
      { label: 'Udyam registration', url: 'https://udyamregistration.gov.in/', publisher: 'Ministry of MSME' },
    ],
    version: '1.0',
    body: `CONSULTANCY AGREEMENT

This Agreement is made at [[PLACE]] on [[DATE]]

BETWEEN [[CLIENT_NAME]], of [[CLIENT_ADDRESS]] (the "Client")
AND [[CONSULTANT_NAME]], of [[CONSULTANT_ADDRESS]], GSTIN [[CONSULTANT_GSTIN]] (the "Consultant").

1. SERVICES
   1.1 The Consultant shall provide the following services: [[SCOPE]].
   1.2 The deliverables and their dates are: [[DELIVERABLES]].
   1.3 The Consultant shall provide the services with reasonable skill and care and in accordance with applicable law.

2. INDEPENDENT CONTRACTOR
   2.1 The Consultant is an independent contractor. Nothing in this Agreement creates employment, partnership or agency.
   2.2 The Consultant decides the manner and method of performing the services, and is free to work for others, subject to clause 5.
   2.3 The Consultant is responsible for the Consultant's own taxes, insurance and statutory registrations, and is not entitled to leave, provident fund, gratuity or other employee benefits from the Client.

3. FEES AND PAYMENT
   3.1 The Client shall pay Rs. [[FEE]] [[FEE_BASIS]], against invoice.
   3.2 Payment is due within [[PAYMENT_DAYS]] days of a correct invoice.
   3.3 The fee is exclusive of goods and services tax, which the Consultant shall charge where liable, and exclusive of pre-approved expenses supported by receipts.
   3.4 The Client shall deduct tax at source at the rate the Income-tax Act prescribes and shall furnish the certificate of deduction within the prescribed time.

4. TERM AND TERMINATION
   4.1 The term is [[TERM_MONTHS]] months from the date of this Agreement.
   4.2 Either party may terminate by [[NOTICE_DAYS]] days' written notice.
   4.3 Either party may terminate immediately on a material breach that is not cured within fifteen days of written notice of it.
   4.4 On termination the Client shall pay for services performed and accepted up to the date of termination, and the Consultant shall deliver up all work in progress and all Client material.

5. CONFIDENTIALITY
   The Consultant shall keep the Client's confidential information confidential during the term and for three years after it, and shall not use it except to perform this Agreement.

6. INTELLECTUAL PROPERTY
   6.1 On payment in full for the relevant deliverable, the Consultant assigns to the Client all right, title and interest, including copyright, in the deliverables created for the Client under this Agreement.
   6.2 The Consultant retains ownership of tools, libraries, know-how and materials that existed before this Agreement or that the Consultant develops generally, and grants the Client a perpetual, non-exclusive licence to use them to the extent embedded in a deliverable.
   6.3 The Consultant warrants that the deliverables do not infringe a third party's intellectual property.

7. LIABILITY
   7.1 Neither party is liable for indirect or consequential loss.
   7.2 The Consultant's aggregate liability under this Agreement is limited to the fees paid under it, except for a breach of confidentiality, an infringement of intellectual property, or fraud.

8. GOVERNING LAW AND DISPUTES
   8.1 This Agreement is governed by Indian law and the courts at [[PLACE]] have jurisdiction.
   8.2 The parties shall first attempt to resolve any dispute by discussion, and then by mediation, before commencing proceedings.

SIGNED

For [[CLIENT_NAME]]                            [[CONSULTANT_NAME]]

_______________________                        _______________________`,
  },
  {
    slug: 'posh-policy',
    title: 'Policy on prevention of sexual harassment at the workplace',
    description:
      'A workplace policy under the POSH Act: definitions, the Internal Committee, how a complaint is made and handled, '
      + 'timelines, confidentiality, protection against retaliation and the annual reporting obligation.',
    type: 'LEGAL_TEMPLATE',
    matter: 'L_POSH',
    forum: 'F_POSH_IC',
    panIndia: true,
    keywords: ['posh policy', 'sexual harassment policy', 'internal committee', 'icc policy', 'posh compliance'],
    fields: [
      { key: 'COMPANY_NAME', label: 'Employer name' },
      { key: 'EFFECTIVE_DATE', label: 'Effective date' },
      { key: 'IC_PRESIDING', label: 'Presiding Officer of the Internal Committee', hint: 'Must be a woman employed at a senior level' },
      { key: 'IC_MEMBERS', label: 'Internal Committee members' },
      { key: 'IC_EXTERNAL', label: 'External member', hint: 'From an NGO or familiar with issues relating to sexual harassment' },
      { key: 'IC_CONTACT', label: 'Internal Committee contact address and email' },
      { key: 'HR_CONTACT', label: 'Human resources contact' },
    ],
    beforeYouUse: [
      'Constituting the Internal Committee is the obligation, not writing the policy. An employer with ten or more workers must have one, its Presiding Officer must be a woman at a senior level, and at least one member must be external.',
      'Display the penal consequences of sexual harassment and the Committee’s composition at the workplace. That display is itself a statutory requirement.',
      'File the annual report with the District Officer. Employers routinely forget this and it is the easiest non-compliance for an inspector to find.',
      'Train the Committee. An inquiry conducted badly is set aside, and the complainant has then been through it for nothing.',
      'This policy does not displace the criminal law. A complainant may go to the police at any time, and the Committee cannot discourage it.',
    ],
    jurisdictionNotes: [
      { heading: 'Scope of "workplace"', body: 'The Act’s definition extends beyond the office to any place visited by the employee arising out of or during employment, including transport provided by the employer. Remote and client-site work is covered.' },
      { heading: 'Who is protected', body: 'Protection extends to every woman at the workplace, whatever her employment status — employee, contract worker, intern, apprentice or visitor. It is not limited to those on the payroll.' },
      { heading: 'Time limits', body: 'A complaint must ordinarily be made within three months of the incident, or of the last incident in a series, and the Committee may extend that by a further three months for reasons recorded in writing. The inquiry must be completed within ninety days.' },
      { heading: 'Local Committee', body: 'Where there is no Internal Committee, or the complaint is against the employer, the complaint goes to the Local Committee constituted by the District Officer.' },
    ],
    officialLinks: [
      { label: 'SHe-Box — government complaint portal', url: 'https://shebox.wcd.gov.in/', publisher: 'Ministry of Women and Child Development' },
      { label: 'Ministry of Women and Child Development', url: 'https://wcd.gov.in/', publisher: 'Government of India' },
    ],
    version: '1.0',
    body: `POLICY ON PREVENTION OF SEXUAL HARASSMENT AT THE WORKPLACE
[[COMPANY_NAME]] — effective [[EFFECTIVE_DATE]]

1. PURPOSE AND COMMITMENT
   [[COMPANY_NAME]] will not tolerate sexual harassment at its workplace in any form. This policy states what sexual harassment is, how to complain, how a complaint is dealt with, and what protection a complainant has. It is issued under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 and the rules made under it.

2. SCOPE
   2.1 This policy applies to every person at the workplace, whatever their status — permanent, temporary, contractual, probationary, apprentice, intern, consultant or visitor.
   2.2 "Workplace" includes our premises, any place visited by an employee arising out of or during employment, transport provided by the Company, and virtual meetings and Company communication channels.

3. WHAT SEXUAL HARASSMENT MEANS
   3.1 Sexual harassment includes any of the following unwelcome acts or behaviour, whether directly or by implication:
       (a) physical contact and advances;
       (b) a demand or request for sexual favours;
       (c) sexually coloured remarks;
       (d) showing pornography;
       (e) any other unwelcome physical, verbal or non-verbal conduct of a sexual nature.
   3.2 The following circumstances, if they occur in relation to or connected with any sexual act or behaviour, also amount to sexual harassment: an implied or explicit promise of preferential treatment; a threat of detrimental treatment; a threat about present or future employment status; interference that creates a hostile work environment; and humiliating treatment likely to affect health or safety.
   3.3 Whether conduct is unwelcome is judged from the perspective of the person subjected to it.

4. INTERNAL COMMITTEE
   4.1 The Internal Committee is:
       Presiding Officer: [[IC_PRESIDING]]
       Members: [[IC_MEMBERS]]
       External member: [[IC_EXTERNAL]]
   4.2 The Committee may be reached at [[IC_CONTACT]]. A complaint may also be routed through Human Resources at [[HR_CONTACT]], who will refer it to the Committee without delay.
   4.3 At least half the members are women. No member of the Committee shall take part in a matter in which that member has an interest.

5. MAKING A COMPLAINT
   5.1 A complaint may be made in writing to the Internal Committee at the address above, within three months of the incident or of the last of a series of incidents. The Committee may extend that period by up to three further months for reasons it records.
   5.2 If the complainant cannot make the complaint in writing, any member of the Committee shall render reasonable assistance to put it in writing.
   5.3 Where the complainant is unable to complain because of physical or mental incapacity or death, a person authorised under the rules may complain on her behalf.
   5.4 A complaint against the employer, or where there is no Internal Committee, may be made to the Local Committee constituted by the District Officer.

6. HOW A COMPLAINT IS HANDLED
   6.1 On receiving a complaint the Committee shall, if the complainant so requests, first attempt conciliation. No monetary settlement shall be made the basis of conciliation.
   6.2 If conciliation is not requested or does not succeed, the Committee shall inquire into the complaint. It shall send a copy of the complaint to the respondent within seven working days, and the respondent shall reply with documents within ten working days.
   6.3 The Committee shall follow the principles of natural justice. Both parties shall be heard. Neither party may bring a legal practitioner to represent them before the Committee.
   6.4 The inquiry shall be completed within ninety days. The report shall be given to the employer within ten days of completion and shall be made available to both parties.
   6.5 During the inquiry the Committee may recommend interim relief, including transfer of either party, leave for the complainant, or restraining the respondent from reporting on the complainant's work.

7. ACTION ON THE FINDINGS
   7.1 If the allegation is proved, the Committee shall recommend action in accordance with the Company's service rules, which may include a written apology, warning, withholding of promotion or increment, counselling, or termination.
   7.2 The Committee may recommend that compensation be paid to the complainant, having regard to the loss of career opportunity, medical expenses, the income of the respondent and the feasibility of payment.
   7.3 The employer shall act on the recommendation within sixty days.
   7.4 If the Committee concludes that the complaint was made maliciously or on knowingly false evidence, it may recommend action against the complainant. An inability to substantiate a complaint is not, by itself, malice, and shall not attract action.

8. CONFIDENTIALITY
   The identity of the parties and witnesses, the contents of the complaint, the inquiry proceedings and the recommendations shall not be published or disclosed to anyone outside the process. Breach of confidentiality attracts action under this policy.

9. PROTECTION AGAINST RETALIATION
   No person shall be subjected to any detriment for making a complaint in good faith, for giving evidence, or for assisting a complainant. Retaliation is itself misconduct under this policy.

10. AWARENESS, TRAINING AND REPORTING
    10.1 The Company shall display the penal consequences of sexual harassment and the composition of the Internal Committee conspicuously at the workplace.
    10.2 The Company shall conduct awareness programmes for employees and orientation for Committee members.
    10.3 The Company shall include the number of complaints received and disposed of in its annual report, and shall file the annual return with the District Officer.

11. OTHER REMEDIES
    Nothing in this policy limits any person's right to make a criminal complaint to the police, or to any other remedy in law, at any time.`,
  },
  {
    slug: 'resignation-and-relieving-request',
    title: 'Resignation letter with request for full and final settlement',
    description:
      'A resignation that also asks, in writing and on the record, for the relieving letter, experience certificate, '
      + 'full and final settlement, PF transfer support and Form 16 — the documents people discover they need only later.',
    type: 'LEGAL_TEMPLATE',
    matter: 'L_TERMINATION',
    panIndia: true,
    keywords: ['resignation letter', 'relieving letter request', 'full and final settlement', 'notice period', 'experience certificate'],
    fields: [
      { key: 'DATE', label: 'Date' },
      { key: 'EMPLOYEE_NAME', label: 'Your name' },
      { key: 'EMPLOYEE_ID', label: 'Employee code' },
      { key: 'DESIGNATION', label: 'Your designation' },
      { key: 'MANAGER_NAME', label: 'Addressed to' },
      { key: 'COMPANY_NAME', label: 'Employer name' },
      { key: 'NOTICE_DAYS', label: 'Notice period in days as per your contract' },
      { key: 'LAST_DAY', label: 'Proposed last working day' },
      { key: 'JOIN_DATE', label: 'Date you joined' },
      { key: 'LEAVE_BALANCE', label: 'Leave balance you believe is due' },
    ],
    beforeYouUse: [
      'Send it by email to your manager and to HR, and keep the sent copy. A resignation handed over verbally is a resignation nobody can prove.',
      'State the last working day by reference to the notice period in your contract. Do not agree to a longer period out of politeness — and do not simply stop attending, which converts a clean exit into abandonment.',
      'Ask for the documents now, in the same letter. Requesting a relieving letter six months later, when a new employer asks for it, is a much weaker position.',
      'Gratuity is payable if you have completed the qualifying period of continuous service. It is statutory and does not depend on the employer’s goodwill.',
      'Do not sign a blanket "no dues and no claims" declaration before you have received the settlement statement and checked it.',
    ],
    jurisdictionNotes: [
      { heading: 'Notice period and buy-out', body: 'A notice period is a contractual term. An employer may accept payment in lieu; it cannot ordinarily compel you to serve beyond the contractual period, and a demand for a longer period than the contract states has no basis.' },
      { heading: 'Withholding documents', body: 'An employer may adjust a genuine dues claim against the settlement, but withholding a relieving letter or experience certificate as leverage is not a remedy the law provides. Where it happens, the labour authority of the state is the practical route.' },
      { heading: 'Provident fund', body: 'The provident fund account follows you through the Universal Account Number; it is transferred, not closed. The employer must update the date of exit, and it is worth checking the member portal a month later to confirm it was done.' },
    ],
    officialLinks: [
      { label: 'EPFO member portal — check date of exit and passbook', url: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/', publisher: 'EPFO' },
      { label: 'EPFiGMS — PF grievance', url: 'https://epfigms.gov.in/', publisher: 'EPFO' },
    ],
    version: '1.0',
    body: `[[DATE]]

To
[[MANAGER_NAME]]
[[COMPANY_NAME]]

Copy to: Human Resources

Subject: Resignation from the post of [[DESIGNATION]], and request for relieving and settlement documents

Dear [[MANAGER_NAME]],

1. I resign from my position as [[DESIGNATION]] (employee code [[EMPLOYEE_ID]]), which I have held since [[JOIN_DATE]].

2. My contract provides for a notice period of [[NOTICE_DAYS]] days. Counting from the date of this letter, my last working day will accordingly be [[LAST_DAY]]. I will serve the notice period and complete a proper handover.

3. I will prepare a written handover note covering my current work, its status, the files and credentials in my possession, and the people who will need to be briefed. Please tell me to whom the handover should be made.

4. I request that the following be provided on or before my last working day, or as soon after it as the Company's process allows:

   (a) a relieving letter recording the dates of my employment and that I have been relieved;
   (b) an experience certificate stating my designation and period of service;
   (c) the full and final settlement statement, showing salary due to the last working day, encashment of my leave balance of [[LEAVE_BALANCE]] days, reimbursements, and any deduction the Company proposes, with the basis for each;
   (d) payment of gratuity, if I have completed the qualifying period of continuous service;
   (e) Form 16 for the current financial year, within the time the Income-tax Rules prescribe;
   (f) updating of my date of exit in the provident fund records, so that the transfer of my account is not delayed.

5. Please let me know if anything further is required from me to complete these formalities. I would be grateful for the settlement statement in writing before any acknowledgement of receipt is signed.

6. I am grateful for the opportunity to have worked here and for what I have learnt. I am glad to help with the transition after my last day where that is practical.

Yours sincerely,

[[EMPLOYEE_NAME]]
[[DESIGNATION]]`,
  },
];

// ===========================================================================
// CORPORATE AND COMMERCIAL
// ===========================================================================

export const CORPORATE_TEMPLATES: ResourceTemplateSeed[] = [
  {
    slug: 'mutual-nda',
    title: 'Mutual non-disclosure agreement',
    description:
      'A two-way confidentiality agreement for discussions that have not yet become a deal: what is protected, what is not, '
      + 'how long it lasts and what happens to the material afterwards.',
    type: 'AGREEMENT_TEMPLATE',
    matter: 'CT_NDA',
    panIndia: true,
    keywords: ['nda', 'non disclosure agreement', 'confidentiality agreement', 'mutual nda', 'nda format india'],
    fields: [
      ...EXEC,
      { key: 'PARTY_A', label: 'First party name' },
      { key: 'PARTY_A_ADDRESS', label: 'First party address' },
      { key: 'PARTY_B', label: 'Second party name' },
      { key: 'PARTY_B_ADDRESS', label: 'Second party address' },
      { key: 'PURPOSE', label: 'Purpose of the disclosure', hint: 'Be specific — the purpose limits what the other side may use it for' },
      { key: 'TERM_YEARS', label: 'Term in years' },
      { key: 'SURVIVAL_YEARS', label: 'Confidentiality obligation survives for, in years' },
      { key: 'COURTS', label: 'City whose courts have jurisdiction' },
    ],
    beforeYouUse: [
      'Write the purpose narrowly. An NDA whose purpose is "exploring a business relationship" permits almost any use; one whose purpose is "evaluating the acquisition of the shares of X" does not.',
      'Mark what you disclose. Many NDAs only protect information identified as confidential, and unmarked material then falls outside.',
      'An NDA is not a substitute for restraint: do not disclose your most valuable material at a first meeting merely because a document has been signed.',
      'Agree what happens at the end — return, destruction, or retention for legal and audit purposes — and say so.',
      'Injunctive relief is the remedy that matters; damages for leaked information are hard to prove. Say expressly that damages alone are not adequate.',
    ],
    jurisdictionNotes: [
      { heading: 'Stamp duty', body: 'An NDA attracts stamp duty as an agreement at the rate prescribed by the state of execution. The amount is usually nominal; the consequence of not paying it is that the document is inadmissible in evidence until the deficit and penalty are made good, which is precisely when you need it.' },
      { heading: 'Personal data', body: 'Where confidential information includes personal data, obligations under India’s data protection law apply in addition to this agreement, and they are owed to the individuals concerned rather than to the disclosing party. An NDA does not discharge them.' },
      { heading: 'Enforcement', body: 'Confidentiality obligations are enforceable in India, including by injunction. What is not enforceable is a clause restraining the recipient from carrying on a lawful trade after the agreement ends — section 27 of the Indian Contract Act makes such a restraint void.' },
    ],
    version: '1.0',
    body: `MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is made at [[PLACE]] on [[DATE]]

BETWEEN [[PARTY_A]], of [[PARTY_A_ADDRESS]]
AND [[PARTY_B]], of [[PARTY_B_ADDRESS]]

(each a "Party"; the Party disclosing information is the "Disclosing Party" and the Party receiving it the "Receiving Party").

1. PURPOSE
   The Parties wish to discuss [[PURPOSE]] (the "Purpose") and in the course of doing so each may disclose confidential information to the other.

2. CONFIDENTIAL INFORMATION
   2.1 "Confidential Information" means information disclosed by or on behalf of the Disclosing Party, in any form, that is identified as confidential at the time of disclosure or that a reasonable person would understand to be confidential from its nature or the circumstances of its disclosure. It includes business plans, financial information, customer and supplier information, technical information, source code, designs, and the existence and content of the discussions themselves.
   2.2 Confidential Information does not include information that:
       (a) is or becomes public without breach of this Agreement;
       (b) the Receiving Party already lawfully held without an obligation of confidence;
       (c) the Receiving Party lawfully receives from a third party free of any obligation of confidence; or
       (d) the Receiving Party independently develops without use of the Confidential Information.

3. OBLIGATIONS
   3.1 The Receiving Party shall keep the Confidential Information confidential, use it only for the Purpose, and protect it with at least the care it applies to its own confidential information.
   3.2 The Receiving Party may disclose Confidential Information only to those of its employees, directors and professional advisers who need it for the Purpose, and only where they are bound by obligations of confidence at least as protective as these. The Receiving Party remains responsible for their compliance.
   3.3 The Receiving Party shall not reverse engineer, decompile or disassemble anything disclosed to it.

4. COMPELLED DISCLOSURE
   If the Receiving Party is required by law, by a court or by a regulator to disclose Confidential Information, it may do so, but shall (where lawful and practicable) notify the Disclosing Party first so that protection may be sought, and shall disclose only what is required.

5. NO LICENCE, NO WARRANTY, NO OBLIGATION TO PROCEED
   5.1 No licence or right in any intellectual property is granted by this Agreement. All Confidential Information remains the property of the Disclosing Party.
   5.2 Confidential Information is disclosed as is. Neither Party warrants its accuracy or completeness.
   5.3 Neither Party is obliged to proceed with any transaction, and either may end the discussions at any time.

6. RETURN AND DESTRUCTION
   On the Disclosing Party's written request, or on the discussions ending, the Receiving Party shall return or destroy the Confidential Information and confirm in writing that it has done so, except for one copy retained by its legal or compliance function, and copies in routine backups, which remain subject to this Agreement.

7. TERM
   7.1 This Agreement applies to disclosures made during [[TERM_YEARS]] years from the date of this Agreement.
   7.2 The obligations of confidence continue for [[SURVIVAL_YEARS]] years from the date of each disclosure, and indefinitely in respect of anything that constitutes a trade secret.

8. REMEDIES
   The Parties agree that damages alone may be an inadequate remedy for a breach of this Agreement, and that the Disclosing Party is entitled to seek injunctive relief in addition to any other remedy.

9. NO RESTRAINT OF TRADE
   Nothing in this Agreement restrains either Party from carrying on any lawful business, or from working with any person, including a competitor of the other Party.

10. GENERAL
    10.1 This Agreement is governed by Indian law, and the courts at [[COURTS]] have exclusive jurisdiction.
    10.2 It may not be assigned without the other Party's written consent.
    10.3 It records the whole of what is agreed on its subject and may be amended only in writing signed by both Parties.

SIGNED

For [[PARTY_A]]                                For [[PARTY_B]]

_______________________                        _______________________
Name:                                          Name:
Designation:                                   Designation:`,
  },
  {
    slug: 'founders-agreement',
    title: 'Founders’ agreement',
    description:
      'The arrangement between founders before the cap table matters: equity split, vesting, roles, decision-making, '
      + 'intellectual property, what happens when a founder leaves and how a deadlock is broken.',
    type: 'AGREEMENT_TEMPLATE',
    matter: 'CO_FOUNDERS',
    panIndia: true,
    keywords: ['founders agreement', 'co-founder agreement', 'equity split', 'vesting', 'startup founders'],
    fields: [
      ...EXEC,
      { key: 'COMPANY_NAME', label: 'Company name', hint: 'Or the proposed name if not yet incorporated' },
      { key: 'FOUNDER_LIST', label: 'Founders and their equity percentages' },
      { key: 'ROLES', label: 'Role of each founder' },
      { key: 'VESTING_YEARS', label: 'Vesting period in years' },
      { key: 'CLIFF_MONTHS', label: 'Cliff in months' },
      { key: 'RESERVED_MATTERS', label: 'Decisions requiring unanimous consent' },
      { key: 'COURTS', label: 'City whose courts have jurisdiction' },
    ],
    beforeYouUse: [
      'Sign it before the company is worth anything. The conversation is easy while the equity is worthless and nearly impossible afterwards.',
      'Vest the founder shares, including your own. A founder who leaves in month four holding a quarter of the company is a problem no investor will accept and no remaining founder should.',
      'Assign the intellectual property to the company expressly, in writing. Work done before incorporation belongs to the individual until it is assigned, and diligence will find it.',
      'Once the company is incorporated, the substance of this agreement should be reflected in the articles of association and, where investors come in, in the shareholders’ agreement. An agreement inconsistent with the articles creates argument about which prevails.',
      'Decide the deadlock mechanism while you still like each other.',
    ],
    jurisdictionNotes: [
      { heading: 'Companies Act and the articles', body: 'Restrictions on the transfer of shares in a private company are enforceable if they are in the articles of association. A restriction that exists only in a founders’ agreement may bind the founders as a contract but may not bind the company or a transferee who is not a party.' },
      { heading: 'Share transfer stamp duty', body: 'Transfer of shares attracts stamp duty on the instrument of transfer at the rate prescribed. Buy-back and transfer on a founder’s exit therefore have a cost that should be anticipated.' },
      { heading: 'Employment status of founders', body: 'A founder who draws a salary is an employee for the purposes of provident fund and other labour legislation, whatever the agreement calls them. This affects compliance from the first payroll.' },
    ],
    officialLinks: [
      { label: 'Ministry of Corporate Affairs — incorporation and filings', url: 'https://www.mca.gov.in/', publisher: 'MCA' },
      { label: 'National Single Window System — approvals a new business needs', url: 'https://www.nsws.gov.in/', publisher: 'DPIIT' },
    ],
    version: '1.0',
    body: `FOUNDERS' AGREEMENT

This Agreement is made at [[PLACE]] on [[DATE]] between the persons named below (each a "Founder") in relation to [[COMPANY_NAME]] (the "Company").

FOUNDERS AND SHAREHOLDING
[[FOUNDER_LIST]]

1. THE BUSINESS AND THE FOUNDERS' COMMITMENT
   1.1 The Founders will carry on the business of the Company and will devote their working time to it, save as the Founders agree in writing.
   1.2 The role of each Founder is: [[ROLES]]. Roles may be changed by agreement of all Founders in writing.
   1.3 No Founder shall, while a Founder, engage in a business that competes with the Company.

2. EQUITY AND VESTING
   2.1 The Founders shall hold shares in the proportions set out above.
   2.2 Each Founder's shares shall vest over [[VESTING_YEARS]] years from the date of this Agreement, with a cliff of [[CLIFF_MONTHS]] months, and monthly thereafter.
   2.3 If a Founder ceases to be engaged with the Company before the shares have fully vested, the unvested portion shall be transferred to the Company or to the remaining Founders, in proportion to their holdings, at the lower of the subscription price and fair value.
   2.4 Where a Founder ceases to be engaged by reason of death or permanent disability, the shares shall be treated as fully vested.
   2.5 Where a Founder is removed for proven fraud, wilful misconduct or a material breach of this Agreement, the unvested shares shall be forfeited and the vested shares may be acquired at the subscription price.

3. INTELLECTUAL PROPERTY
   3.1 Each Founder assigns to the Company all intellectual property created by that Founder, before or after this Agreement, that relates to the Company's business.
   3.2 Each Founder shall sign any further document required to record that assignment, including with any registry.
   3.3 A Founder who leaves takes no right in the Company's intellectual property.

4. DECISION-MAKING
   4.1 Day-to-day decisions are taken by the Founder responsible for that area.
   4.2 The following require the written consent of all Founders: [[RESERVED_MATTERS]].
   4.3 Each Founder shall be entitled to be a director of the Company for so long as that Founder holds the shareholding threshold the Founders agree.

5. FUNDING AND DILUTION
   5.1 No Founder is obliged to contribute further capital.
   5.2 Where the Company raises capital, dilution shall be borne by all Founders in proportion to their holdings, unless all Founders agree otherwise in writing.
   5.3 An employee share option pool shall be created in the size the Founders agree, and dilution for it shall be borne by all Founders in proportion.

6. TRANSFER OF SHARES
   6.1 No Founder shall transfer or encumber any share except in accordance with this Agreement and the articles of association.
   6.2 A Founder wishing to transfer shares shall first offer them to the other Founders in proportion to their holdings, at the price and on the terms offered by the proposed transferee.
   6.3 On a sale of the Company approved by the Founders holding the agreed majority, all Founders shall sell on the same terms.

7. A FOUNDER LEAVING
   7.1 A Founder may resign on three months' written notice.
   7.2 On leaving, a Founder shall resign every office held in the Company, return all Company property, and cease to represent the Company.
   7.3 The Founder's shares shall be dealt with under clause 2.
   7.4 A departing Founder remains bound by clauses 3, 8 and 9.

8. CONFIDENTIALITY
   Each Founder shall keep the Company's confidential information confidential, during and after the engagement, and shall use it only for the Company's business.

9. DEADLOCK AND DISPUTES
   9.1 Where the Founders cannot agree on a reserved matter, they shall first meet and attempt to resolve it, and then refer it to a mediator agreed between them.
   9.2 Failing resolution, the dispute shall be resolved by arbitration by a sole arbitrator appointed by agreement, seated at [[PLACE]], under the Arbitration and Conciliation Act, 1996.
   9.3 Subject to clause 9.2, the courts at [[COURTS]] have jurisdiction.

10. INCORPORATION AND ARTICLES
    The Founders shall procure that the substance of this Agreement is reflected in the Company's articles of association, and that on any external investment the terms of this Agreement are carried into the shareholders' agreement so far as they are consistent with it.

11. GENERAL
    11.1 This Agreement is governed by Indian law.
    11.2 It may be amended only in writing signed by all Founders.
    11.3 If any provision is unenforceable, the rest continues in force.

SIGNED by the Founders

_______________________     _______________________     _______________________`,
  },
  {
    slug: 'board-resolution-general',
    title: 'Board resolution (general form)',
    description:
      'A correctly framed resolution of the board of directors, with the quorum, the notice, the disclosure of interest '
      + 'and the certification a bank or registry will actually accept.',
    type: 'LEGAL_TEMPLATE',
    matter: 'CO_ROC',
    forum: 'F_ROC',
    panIndia: true,
    keywords: ['board resolution', 'resolution format', 'certified true copy', 'directors resolution', 'bank resolution'],
    fields: [
      { key: 'COMPANY_NAME', label: 'Company name' },
      { key: 'CIN', label: 'Corporate identity number' },
      { key: 'REG_OFFICE', label: 'Registered office address' },
      { key: 'MEETING_DATE', label: 'Date of the meeting' },
      { key: 'MEETING_TIME', label: 'Time of the meeting' },
      { key: 'MEETING_PLACE', label: 'Place or mode of the meeting' },
      { key: 'DIRECTORS_PRESENT', label: 'Directors present' },
      { key: 'CHAIR', label: 'Chair of the meeting' },
      { key: 'SUBJECT', label: 'Subject of the resolution' },
      { key: 'RESOLUTION_TEXT', label: 'What is being resolved' },
      { key: 'AUTHORISED_PERSON', label: 'Person authorised to act' },
      { key: 'SIGNATORY', label: 'Person certifying the copy' },
      { key: 'SIGNATORY_DIN', label: 'Director identification number of the certifying director' },
    ],
    beforeYouUse: [
      'Check that the board actually has the power. Some decisions require a shareholders’ resolution, and some require a special resolution — a board resolution for those is worth nothing.',
      'Record the quorum. A resolution passed without quorum is not a resolution.',
      'A director interested in the matter must disclose the interest and must not participate or vote. Record both facts.',
      'Certify the copy properly. A bank or a registry will reject an uncertified extract, and the certification should identify the certifier by name and DIN.',
      'File the form where filing is required, within the prescribed period. Late filing attracts additional fees that accumulate daily.',
    ],
    jurisdictionNotes: [
      { heading: 'Notice and minutes', body: 'The Companies Act, 2013 and the secretarial standards require notice of the meeting to every director, a minimum number of board meetings each year, and minutes entered and signed within the prescribed time. A resolution that cannot be traced to compliant minutes is fragile.' },
      { heading: 'Resolutions by circulation', body: 'Certain matters may be passed by circulation, and certain matters may not — those are specified and must be dealt with at a meeting.' },
      { heading: 'Related party transactions', body: 'A transaction with a related party may require board approval at a meeting, may require shareholder approval, and must be disclosed. Treating it as ordinary business is a common and expensive error.' },
    ],
    officialLinks: [
      { label: 'Ministry of Corporate Affairs', url: 'https://www.mca.gov.in/', publisher: 'MCA' },
    ],
    version: '1.0',
    body: `[[COMPANY_NAME]]
CIN: [[CIN]]
Registered office: [[REG_OFFICE]]

CERTIFIED TRUE COPY OF THE RESOLUTION PASSED AT THE MEETING OF THE BOARD OF DIRECTORS HELD ON [[MEETING_DATE]] AT [[MEETING_TIME]] AT [[MEETING_PLACE]]

PRESENT: [[DIRECTORS_PRESENT]]
IN THE CHAIR: [[CHAIR]]

The Chair confirmed that notice of the meeting had been given to every director in accordance with section 173 of the Companies Act, 2013, and that the requisite quorum was present throughout.

Each director present confirmed that there was no change in the disclosure of interest already made under section 184, save as recorded in the minutes. No director interested in the matter below participated in the discussion or voted on it.

ITEM: [[SUBJECT]]

The Chair placed before the Board the matter set out above and explained its purpose and effect. After discussion, the Board passed the following resolution:

"RESOLVED THAT [[RESOLUTION_TEXT]].

RESOLVED FURTHER THAT [[AUTHORISED_PERSON]] be and is hereby severally authorised to do all such acts, deeds and things, to sign and submit all such applications, forms, agreements, declarations and documents, and to make all such payments, as may be necessary or expedient to give effect to this resolution, and to represent the Company before any authority in connection with it.

RESOLVED FURTHER THAT a certified true copy of this resolution be furnished to any person requiring it."

There being no further business, the meeting concluded with a vote of thanks to the Chair.

Certified to be a true copy of the resolution passed by the Board of Directors.

For [[COMPANY_NAME]]

_______________________
[[SIGNATORY]]
Director
DIN: [[SIGNATORY_DIN]]

Date: [[MEETING_DATE]]`,
  },
];

// ===========================================================================
// COURT DOCUMENTS
// ===========================================================================

export const COURT_TEMPLATES: ResourceTemplateSeed[] = [
  {
    slug: 'vakalatnama',
    title: 'Vakalatnama (authority to an advocate)',
    description:
      'The instrument by which a party authorises an advocate to appear. Courts prescribe their own form, so this is a '
      + 'sample of the standard contents rather than a substitute for the court’s printed form.',
    type: 'LEGAL_TEMPLATE',
    matter: 'CV_APPEAL',
    forum: 'F_CIVIL_COURT',
    panIndia: true,
    keywords: ['vakalatnama', 'vakalat', 'authorise advocate', 'power to advocate', 'vakalatnama format'],
    fields: [
      { key: 'COURT_NAME', label: 'Court or forum' },
      { key: 'CASE_TYPE', label: 'Case type and number', hint: 'Leave the number blank if the case is not yet filed' },
      { key: 'PLAINTIFF', label: 'Plaintiff, petitioner or applicant' },
      { key: 'DEFENDANT', label: 'Defendant or respondent' },
      { key: 'CLIENT_NAME', label: 'Name of the party executing this' },
      { key: 'CLIENT_CAPACITY', label: 'Capacity', hint: 'Self, authorised signatory, guardian, power of attorney holder' },
      { key: 'ADVOCATE_NAME', label: 'Advocate name' },
      { key: 'ENROLMENT_NO', label: 'Advocate enrolment number' },
      { key: 'ADVOCATE_ADDRESS', label: 'Advocate address for service' },
      { key: 'DATE', label: 'Date' },
      { key: 'PLACE', label: 'Place' },
    ],
    beforeYouUse: [
      'Most courts require their own printed Vakalatnama, on the prescribed paper and with the prescribed court-fee stamp or welfare stamp. Ask the advocate or the filing counter — do not print this and assume it will be accepted.',
      'A Vakalatnama for a company must be executed by a person authorised by a board resolution, and the resolution is usually asked for.',
      'Read the endorsement about receiving money. If you do not want the advocate to receive money on your behalf, strike that authority out before signing and initial the change.',
      'Keep a copy. The Vakalatnama is also the record of what you authorised.',
      'The Supreme Court Legal Services Committee and several state legal services authorities publish their own Vakalatnama for aided matters — use theirs where legal aid has been granted.',
    ],
    jurisdictionNotes: [
      { heading: 'The court’s own form governs', body: 'Order III of the Code of Civil Procedure and each High Court’s rules govern appointment of a pleader, and the High Court rules prescribe the form and the stamp. Where the court prescribes a form, that form prevails over any sample.' },
      { heading: 'Advocates’ welfare stamp', body: 'Most states levy an advocates’ welfare fund stamp on a Vakalatnama under state legislation. It is affixed and cancelled at the time of filing.' },
      { heading: 'Change of advocate', body: 'An advocate already on record does not simply stop being on record. Substitution ordinarily requires a no-objection from the previous advocate or leave of the court.' },
    ],
    officialLinks: [
      { label: 'Supreme Court of India — forms', url: 'https://www.sci.gov.in/forms', publisher: 'Supreme Court of India' },
      { label: 'Kerala State Legal Services Authority — Vakalatnama and legal aid forms', url: 'https://kerala.nalsa.gov.in/download-forms/', publisher: 'KELSA' },
    ],
    version: '1.0',
    body: `IN THE [[COURT_NAME]]

[[CASE_TYPE]]

[[PLAINTIFF]]                                                        ... Plaintiff / Petitioner
                                    VERSUS
[[DEFENDANT]]                                                        ... Defendant / Respondent

VAKALATNAMA

KNOW ALL MEN BY THESE PRESENTS that I/We, [[CLIENT_NAME]], acting in the capacity of [[CLIENT_CAPACITY]], being a party to the above proceeding, do hereby appoint and retain [[ADVOCATE_NAME]], Advocate, enrolment number [[ENROLMENT_NO]], of [[ADVOCATE_ADDRESS]], to be my/our Advocate in the above matter, and authorise the said Advocate:

1. to appear, act and plead for me/us in the above proceeding, and in any proceeding arising out of or connected with it, before this Court or any court to which it may be transferred;

2. to sign, verify, present and file pleadings, applications, affidavits, appeals, petitions, objections and other documents on my/our behalf;

3. to receive notices and processes on my/our behalf, service on the said Advocate being good service on me/us;

4. to engage or instruct any other Advocate to assist, and to authorise such Advocate to exercise the powers conferred by this Vakalatnama;

5. to make and receive statements on my/our behalf, to consent to and oppose applications, and to take such steps as may be necessary in the conduct of the proceeding;

6. to compromise, withdraw or settle the proceeding, and to refer any matter to arbitration, only with my/our express instructions in writing;

7. to receive money, cheques or property payable to me/us in the proceeding, and to grant a valid receipt for the same.
   [Strike out clause 7 if this authority is not given. Any deletion to be initialled by the executant.]

AND I/We agree:

(a) to pay the fees and charges of the said Advocate as agreed, and to be responsible for the costs of the proceeding;
(b) that the said Advocate shall be at liberty to withdraw from the proceeding on giving me/us reasonable notice, in accordance with the rules of professional conduct;
(c) that all acts lawfully done by the said Advocate under this Vakalatnama shall be binding on me/us.

IN WITNESS WHEREOF I/We have signed this Vakalatnama at [[PLACE]] on [[DATE]].

_______________________
[[CLIENT_NAME]]
([[CLIENT_CAPACITY]])
Executant

ACCEPTED

_______________________
[[ADVOCATE_NAME]], Advocate
Enrolment No. [[ENROLMENT_NO]]
Address for service: [[ADVOCATE_ADDRESS]]

(Affix the court-fee and advocates' welfare fund stamps prescribed by the rules of this Court.)`,
  },
  {
    slug: 'application-for-certified-copy',
    title: 'Application for a certified copy of an order or judgment',
    description:
      'The application for a certified copy — the document you actually need to file an appeal, prove an order or produce '
      + 'a decree, and the one most people ask for too late.',
    type: 'APPLICATION_TEMPLATE',
    matter: 'CV_APPEAL',
    forum: 'F_CIVIL_COURT',
    panIndia: true,
    keywords: ['certified copy', 'certified copy application', 'copy of judgment', 'decree copy', 'copying section'],
    fields: [
      { key: 'COURT_NAME', label: 'Court' },
      { key: 'CASE_TYPE', label: 'Case type and number' },
      { key: 'PARTIES', label: 'Parties' },
      { key: 'APPLICANT_NAME', label: 'Applicant name' },
      { key: 'APPLICANT_CAPACITY', label: 'Applicant capacity', hint: 'Party, advocate for a party, or authorised person' },
      { key: 'DOCUMENT_SOUGHT', label: 'Document sought', hint: 'Order dated …, judgment dated …, decree, deposition of …' },
      { key: 'ORDER_DATE', label: 'Date of the order or judgment' },
      { key: 'PURPOSE', label: 'Purpose', hint: 'For filing an appeal, for execution, for a record' },
      { key: 'URGENT', label: 'Ordinary or urgent copy' },
      { key: 'DATE', label: 'Date' },
      { key: 'ADDRESS', label: 'Address and phone for collection' },
    ],
    beforeYouUse: [
      'Apply the same week the order is passed. The period of limitation for an appeal excludes the time taken to obtain a certified copy — but only if you actually applied, and the exclusion runs from the date of the application.',
      'Ask for everything you will need: the judgment, the decree, and any deposition or exhibit you will rely on. A second application costs another wait.',
      'Court fees and copying charges are prescribed and are paid at the copying section. An urgent copy costs more and is issued faster.',
      'Keep the receipt. It is the proof of the date of application, and that date is what the limitation calculation turns on.',
      'Many courts now issue certified copies through their e-services. Check before queuing.',
    ],
    jurisdictionNotes: [
      { heading: 'Limitation and the time for obtaining a copy', body: 'Section 12 of the Limitation Act, 1963 excludes the time requisite for obtaining a copy of the decree or order appealed from, when computing the period of limitation for an appeal. The exclusion depends on having applied — delay before applying is not excluded.' },
      { heading: 'Prescribed fees', body: 'Copying fees, folio charges and the difference between an ordinary and an urgent copy are fixed by the High Court rules of each state. Ask at the copying section; they are usually displayed.' },
      { heading: 'Who may apply', body: 'A party to the proceeding, or an advocate on record for a party, may apply as of right. A third party ordinarily requires the leave of the court, showing why the copy is needed.' },
    ],
    officialLinks: [
      { label: 'Supreme Court of India — application for certified copy', url: 'https://www.sci.gov.in/forms', publisher: 'Supreme Court of India' },
      { label: 'eCourts services — case status and orders', url: 'https://services.ecourts.gov.in/ecourtindia_v6/', publisher: 'eCommittee, Supreme Court of India' },
    ],
    version: '1.0',
    body: `IN THE [[COURT_NAME]]

[[CASE_TYPE]]
[[PARTIES]]

APPLICATION FOR CERTIFIED COPY

To
The Officer in charge, Copying Section
[[COURT_NAME]]

Sir/Madam,

1. I, [[APPLICANT_NAME]], am the [[APPLICANT_CAPACITY]] in the above matter.

2. I apply for a certified copy of the following: [[DOCUMENT_SOUGHT]], passed or recorded on [[ORDER_DATE]].

3. The copy is required for the purpose of [[PURPOSE]].

4. I request that the copy be issued as an [[URGENT]] copy.

5. I undertake to pay the copying and folio charges prescribed by the rules of this Court, and I have deposited the requisite fee.

6. My address for communication is [[ADDRESS]]. I request that I be informed when the copy is ready for collection.

Date: [[DATE]]

_______________________
[[APPLICANT_NAME]]
[[APPLICANT_CAPACITY]]

(For office use — date of application, fee paid, date copy ready, date delivered. Retain the receipt: the date of this application is what determines the exclusion of time under section 12 of the Limitation Act, 1963.)`,
  },
];

// ===========================================================================
// CHECKLISTS AND GUIDES — short, practical, and the things people actually
// get wrong. Rendered as documents so they can be printed and carried.
// ===========================================================================

export const CHECKLIST_TEMPLATES: ResourceTemplateSeed[] = [
  {
    slug: 'tenant-checklist',
    title: 'Tenant’s checklist — before you pay the deposit',
    description:
      'What to verify, photograph and put in writing before money changes hands, ordered by when you can still walk away.',
    type: 'CHECKLIST',
    matter: 'P_RENT_AGREEMENT',
    panIndia: true,
    keywords: ['tenant checklist', 'before renting', 'rent checklist', 'security deposit', 'renting a flat'],
    fields: [],
    beforeYouUse: [
      'Work through it before you transfer the deposit. Almost every item becomes impossible to fix afterwards.',
      'Photograph everything on the day of possession, with the date visible, and email the photographs to the landlord the same day so the record is shared.',
    ],
    jurisdictionNotes: [
      { heading: 'Deposit limits', body: 'Some states cap the security deposit for a residential tenancy by statute. Where a cap exists, an agreement for more is unenforceable to that extent. Check your state’s tenancy law.' },
      { heading: 'Registration', body: 'In several states registration of the tenancy or leave and licence agreement is compulsory irrespective of the eleven-month term, and in some the tenancy must additionally be reported to a Rent Authority.' },
    ],
    version: '1.0',
    body: `TENANT'S CHECKLIST — BEFORE YOU PAY THE DEPOSIT

A. THE LANDLORD AND THE TITLE
   [ ] Ask who owns the flat, and see proof: the sale deed, or the latest property tax receipt in the landlord's name.
   [ ] If the person you are dealing with is not the owner, see the power of attorney or the owner's written authority. An agent's word is not authority.
   [ ] If the flat is jointly owned, all owners should sign, or one should hold written authority from the others.
   [ ] Ask for the society's no-objection certificate where the building requires one. Some societies will not allow you to move furniture in without it.
   [ ] Check whether the flat is mortgaged. A bank's permission is sometimes required to let it.

B. THE PREMISES
   [ ] Visit at a different time of day than the first viewing. Water pressure, noise, parking and light all change.
   [ ] Run every tap, flush every toilet, switch on every light, point and fan, and test the geyser.
   [ ] Open and close every window and door. Note what does not lock.
   [ ] Look for damp on ceilings and around windows, especially in the corners of bathrooms and along external walls.
   [ ] Note the water source and supply timings, and whether there is a tank and a pump.
   [ ] Confirm the parking: which slot, in writing, and whether it is included in the rent.
   [ ] Check mobile signal in the rooms you will actually use.

C. THE METERS AND THE BILLS
   [ ] Record the electricity meter number and its reading. Photograph both.
   [ ] Record the water and gas meter readings if separately metered.
   [ ] Ask to see the last three electricity bills. An unusually high bill is either a faulty meter or a load you are about to inherit.
   [ ] Confirm who pays the society maintenance, and how much it is. Get the figure, not an assurance.
   [ ] Confirm who pays property tax. It is the owner's liability; make sure it is not being passed to you by silence.

D. THE MONEY
   [ ] Get the rent, the deposit, the maintenance and the escalation in writing before you pay anything.
   [ ] Pay by bank transfer. If you must pay cash, take a signed receipt the same day, every time.
   [ ] Do not pay a "token" to an agent without a written receipt identifying the flat and the terms.
   [ ] Check whether your state caps the security deposit for a residential tenancy.
   [ ] Agree in writing when and how the deposit is returned, and what may be deducted from it.

E. THE AGREEMENT
   [ ] Read every clause. Ask about anything you do not understand before signing, not after.
   [ ] Check the notice period, and that it is the same for both sides.
   [ ] Check the lock-in period. A lock-in with no matching obligation on the landlord is one-sided.
   [ ] Check who is responsible for repairs, and where the line is drawn between minor and structural.
   [ ] Check the entry clause. A landlord should give reasonable notice before entering.
   [ ] Check the permitted use, and whether guests, pets or working from home are restricted.
   [ ] Ensure the agreement is stamped before it is signed, at the value your state prescribes.
   [ ] Register it if your state requires registration, and confirm who bears the cost.
   [ ] Attach an inventory of the fixtures, appliances and furniture, signed by both parties.
   [ ] Attach the photographs of existing damage as an annexure both parties sign.

F. AFTER YOU MOVE IN
   [ ] Complete police tenant verification where your state police offers it. It protects both parties.
   [ ] Get the electricity account transferred or the name recorded, if the agreement says you must.
   [ ] Keep every rent receipt and every bill in one place for the whole tenancy.
   [ ] Diarise the date three months before the end of the term. That is when the conversation about renewal or return of the deposit should start, not the last week.`,
  },
  {
    slug: 'landlord-checklist',
    title: 'Landlord’s checklist — before you hand over the keys',
    description: 'Verification, documentation and the statutory steps that decide whether a bad tenancy is recoverable.',
    type: 'CHECKLIST',
    matter: 'P_RENT_AGREEMENT',
    panIndia: true,
    keywords: ['landlord checklist', 'letting a flat', 'tenant verification', 'rent agreement landlord'],
    fields: [],
    beforeYouUse: [
      'The items in section A are the ones that decide whether you can recover possession without a fight.',
      'Never take the law into your own hands later. Locking out a tenant, or cutting off electricity or water, is unlawful whatever the tenant has done, and it converts your good case into a bad one.',
    ],
    jurisdictionNotes: [
      { heading: 'Which law governs eviction', body: 'Where rent control legislation applies to the premises, eviction is only on the grounds that statute allows and only through the Rent Controller or Rent Authority. Where it does not apply, the tenancy is governed by the contract and the Transfer of Property Act, and possession is recovered by civil suit.' },
      { heading: 'Registration and reporting', body: 'Several states require registration of the tenancy or leave and licence agreement, and some require the tenancy to be reported to a Rent Authority within a fixed period. Non-compliance is the landlord’s problem, not the tenant’s.' },
    ],
    version: '1.0',
    body: `LANDLORD'S CHECKLIST — BEFORE YOU HAND OVER THE KEYS

A. VERIFY THE TENANT
   [ ] See original photo identity and proof of the tenant's permanent address, and keep copies.
   [ ] For an employed tenant, see the employment letter or the last three salary slips. For a self-employed tenant, see the business registration or the last return filed.
   [ ] Take two references with telephone numbers, and actually telephone them.
   [ ] Complete police tenant verification where your state police provides the facility online.
   [ ] Record the names of every person who will live in the flat, in the agreement. A tenancy for two that houses eight is a dispute waiting to happen.

B. THE DOCUMENT
   [ ] Put the whole arrangement in writing, including the maintenance, the parking slot, the escalation and the notice period.
   [ ] Buy the stamp paper of the value your state prescribes, and have the agreement stamped before execution.
   [ ] Register the agreement where your state requires it, whatever the term.
   [ ] Report the tenancy to the Rent Authority where your state's tenancy legislation requires it, within the prescribed period.
   [ ] Have two witnesses sign, with their addresses.
   [ ] Give the tenant a signed copy, and keep one.

C. THE PREMISES
   [ ] Photograph every room, the bathrooms, the kitchen, the balconies and every existing damage, on the day of handover.
   [ ] Record the meter numbers and readings for electricity, water and gas. Photograph the meters.
   [ ] Prepare an inventory of fixtures, appliances and furniture, with their condition, and have the tenant sign it.
   [ ] Hand over the number of keys recorded in the inventory, and record it.
   [ ] Confirm the society formalities are complete, including the no-objection certificate and the intimation of the tenant's details.

D. THE MONEY
   [ ] Take the deposit and rent by bank transfer, into an account in your own name.
   [ ] Check whether your state caps the deposit for a residential tenancy.
   [ ] Issue a receipt for every payment, and keep a copy.
   [ ] Declare the rental income. Rent received is taxable, and a tenant claiming house rent allowance will report your PAN.
   [ ] Confirm in writing what may be deducted from the deposit, and what may not.

E. DURING THE TENANCY
   [ ] Attend to structural repairs promptly. A landlord in default on repairs is in a weak position on everything else.
   [ ] Give reasonable written notice before visiting.
   [ ] Keep every communication in writing, including WhatsApp — it is evidence.
   [ ] If rent is unpaid, send a written demand promptly and keep the proof of dispatch. Silence for months undermines a later case.

F. AT THE END
   [ ] Give notice in the form and within the period the agreement requires.
   [ ] Inspect jointly, with the inventory and the handover photographs in hand.
   [ ] Settle the deposit within the period the agreement fixes, with a written statement of any deduction and the reason for it.
   [ ] Take back all keys, and get the meter readings recorded and signed.
   [ ] Never resort to locking out, cutting off supply, or removing belongings. Recovery of possession is through the forum your state prescribes, and self-help destroys your case.`,
  },
  {
    slug: 'property-purchase-due-diligence-checklist',
    title: 'Property purchase — title and due diligence checklist',
    description:
      'What to examine before paying an advance on a flat, plot or house: title, encumbrance, approvals, taxes, possession '
      + 'and the documents a bank will insist on anyway.',
    type: 'CHECKLIST',
    matter: 'P_TITLE',
    panIndia: true,
    keywords: ['property due diligence', 'title check', 'encumbrance certificate', 'buying a flat', 'sale deed checklist'],
    fields: [],
    beforeYouUse: [
      'Do this before the advance, not before registration. Money paid on a token is the hardest to recover.',
      'Have an advocate in the district where the property is do the title search. A search is not a formality — it is the only part of this transaction that cannot be redone later.',
    ],
    jurisdictionNotes: [
      { heading: 'Stamp duty and circle rates', body: 'Stamp duty on a conveyance is a state levy, calculated on the higher of the consideration and the government-notified value for the locality. Under-valuation invites a reference to the Collector of Stamps and a demand with penalty.' },
      { heading: 'Registration', body: 'A sale of immovable property above the statutory value must be by registered instrument. An agreement to sell is not a conveyance, and possession under an unregistered document does not transfer title.' },
      { heading: 'RERA', body: 'For a project required to be registered, the promoter must be registered with the state RERA authority and must file quarterly progress. The register is public and is the cheapest verification available.' },
    ],
    officialLinks: [
      { label: 'MahaRERA — project register', url: 'https://maharera.maharashtra.gov.in/', publisher: 'MahaRERA' },
      { label: 'Karnataka RERA', url: 'https://rera.karnataka.gov.in/', publisher: 'K-RERA' },
    ],
    version: '1.0',
    body: `PROPERTY PURCHASE — TITLE AND DUE DILIGENCE CHECKLIST

A. TITLE
   [ ] Obtain the parent document and the chain of title for the period your state's practice requires — commonly thirty years.
   [ ] Verify that each transfer in the chain is by a registered instrument, and that the seller in each was competent to sell.
   [ ] Obtain the encumbrance certificate for the same period from the sub-registrar, and read it, not just the summary.
   [ ] Check for a mortgage, a charge, a lis pendens entry, or an attachment.
   [ ] Where the property is inherited, obtain the succession or legal heirship document and confirm every heir has joined. A missing heir is the most common latent defect in Indian title.
   [ ] Where a woman's or a minor's interest is involved, check that the disposal was lawful — a minor's property cannot be sold without the court's permission.
   [ ] Confirm the identity of the seller against the title documents, not merely against an identity card.

B. THE PROPERTY ITSELF
   [ ] Match the description, boundaries and area in the title documents with what is actually on the ground. Measure it.
   [ ] Obtain the survey sketch or the approved plan and check the built-up structure against it. Unauthorised construction is the buyer's problem after registration.
   [ ] Check the land use and zoning. Agricultural land requires conversion before non-agricultural use in most states.
   [ ] Check for an access road, and whether the access is a legal right or a courtesy.
   [ ] Ask about litigation. Then check the court records yourself for the property and the seller's name.

C. APPROVALS AND COMPLIANCE
   [ ] Obtain the building plan sanction, the commencement certificate and the completion or occupancy certificate.
   [ ] For a project, verify the RERA registration and read the quarterly progress reports the promoter itself filed.
   [ ] For a flat, obtain the society share certificate, the no-objection certificate and confirmation that maintenance is paid up.
   [ ] Check the water, electricity and sewerage connections are sanctioned, not informal.
   [ ] For a resale flat, get the last three maintenance receipts and the society's dues certificate.

D. TAXES AND DUES
   [ ] Obtain the latest property tax receipt, and check the name and the assessment.
   [ ] Check for arrears of water, electricity and maintenance. They attach to the property in practice, whoever owes them.
   [ ] Confirm the stamp duty and registration charges, calculated on the higher of the consideration and the notified value for the locality.
   [ ] Where the consideration crosses the threshold, plan for tax deduction at source on the payment to the seller, and issue the certificate.
   [ ] If the seller is a non-resident, the withholding obligation is different and higher. Establish residence status in writing before paying.

E. THE DOCUMENTS
   [ ] Have the agreement to sell drafted before any substantial payment, recording the schedule of payment, the date of completion and what happens if either side defaults.
   [ ] Record in the agreement that the seller will hand over the original title documents at registration.
   [ ] Provide for the position if a bank loan is not sanctioned.
   [ ] Ensure the sale deed recites the full chain, the encumbrance position, and the seller's covenant as to title.
   [ ] Register the sale deed, and collect the registered original. An unregistered sale does not transfer title.

F. AFTER REGISTRATION
   [ ] Apply for mutation in the revenue or municipal records. Registration transfers title; mutation records it for tax and for utilities.
   [ ] Transfer the electricity and water connections and the society membership.
   [ ] Keep the registered deed, the receipts and the approvals together. The next buyer will ask for all of them.`,
  },
];

export const TEMPLATES_SET_2: ResourceTemplateSeed[] = [
  ...EMPLOYMENT_TEMPLATES, ...CORPORATE_TEMPLATES, ...COURT_TEMPLATES, ...CHECKLIST_TEMPLATES,
];
