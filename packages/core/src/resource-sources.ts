/**
 * Official source directory for the resource library.
 *
 * Every entry is a real publisher of Indian legal material. `mirrorPermitted`
 * is 0 everywhere: we have not obtained or verified permission to rehost any of
 * these files, so the library links to the original and stores only metadata.
 * Changing that flag for a source requires recording the basis in `rightsNote`.
 *
 * `trustLevel` 1 is the issuing authority itself; 6 is unverified third party.
 */
export interface ResourceSourceSeed {
  code: string;
  name: string;
  publisher: string;
  baseUrl: string;
  trustLevel: 1 | 2 | 3 | 4 | 5 | 6;
  category:
    | 'central_government' | 'state_government' | 'court' | 'tribunal'
    | 'legal_services_authority' | 'regulator' | 'statutory_body' | 'institution';
  rightsNote: string;
}

export const RESOURCE_SOURCES: ResourceSourceSeed[] = [
  // ---- law itself --------------------------------------------------------
  { code: 'INDIA_CODE', name: 'India Code', publisher: 'Legislative Department, Ministry of Law and Justice', baseUrl: 'https://www.indiacode.nic.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Central and state legislation published by the Legislative Department. Linked, not mirrored.' },
  { code: 'EGAZETTE', name: 'e-Gazette', publisher: 'Department of Publication, Government of India', baseUrl: 'https://egazette.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Authoritative text of notifications. Linked only.' },
  { code: 'PRS', name: 'PRS Legislative Research', publisher: 'PRS Legislative Research', baseUrl: 'https://prsindia.org/', trustLevel: 3, category: 'institution', rightsNote: 'Bill tracking and legislative briefs by a research institution, not a government source.' },

  // ---- courts ------------------------------------------------------------
  { code: 'SCI', name: 'Supreme Court of India', publisher: 'Supreme Court of India', baseUrl: 'https://www.sci.gov.in/', trustLevel: 1, category: 'court', rightsNote: 'Judgments, rules and forms of the Supreme Court. Linked only.' },
  { code: 'ECOURTS', name: 'eCourts Services', publisher: 'eCommittee, Supreme Court of India', baseUrl: 'https://ecourts.gov.in/', trustLevel: 1, category: 'court', rightsNote: 'Case status, cause lists and district court services. Linked only.' },
  { code: 'EFILING', name: 'eFiling (District and High Courts)', publisher: 'eCommittee, Supreme Court of India', baseUrl: 'https://efiling.ecourts.gov.in/', trustLevel: 1, category: 'court', rightsNote: 'Electronic filing portal and its user guides. Linked only.' },
  { code: 'NJDG', name: 'National Judicial Data Grid', publisher: 'eCommittee, Supreme Court of India', baseUrl: 'https://njdg.ecourts.gov.in/', trustLevel: 1, category: 'court', rightsNote: 'Pendency statistics. Aggregate data, linked only.' },

  // ---- legal aid ---------------------------------------------------------
  { code: 'NALSA', name: 'National Legal Services Authority', publisher: 'NALSA', baseUrl: 'https://nalsa.gov.in/', trustLevel: 1, category: 'legal_services_authority', rightsNote: 'Free legal aid eligibility, schemes and Lok Adalat material. Linked only.' },
  { code: 'DOJ', name: 'Department of Justice', publisher: 'Department of Justice, Ministry of Law and Justice', baseUrl: 'https://doj.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Tele-Law, Nyaya Bandhu and access-to-justice schemes. Linked only.' },

  // ---- labour and social security ---------------------------------------
  { code: 'EPFO', name: 'Employees Provident Fund Organisation', publisher: 'EPFO, Ministry of Labour and Employment', baseUrl: 'https://www.epfindia.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'PF forms, circulars and the EPFiGMS grievance route. Linked only.' },
  { code: 'ESIC', name: 'Employees State Insurance Corporation', publisher: 'ESIC, Ministry of Labour and Employment', baseUrl: 'https://www.esic.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'ESI registration, benefit and grievance material. Linked only.' },
  { code: 'LABOUR_MIN', name: 'Ministry of Labour and Employment', publisher: 'Ministry of Labour and Employment', baseUrl: 'https://labour.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Labour codes, rules and the Shram Suvidha portal. Linked only.' },

  // ---- tax ---------------------------------------------------------------
  { code: 'INCOME_TAX', name: 'Income Tax Department', publisher: 'Central Board of Direct Taxes', baseUrl: 'https://www.incometax.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Return forms, circulars and appeal forms. Linked only.' },
  { code: 'GST', name: 'GST Portal', publisher: 'Goods and Services Tax Network', baseUrl: 'https://www.gst.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'GST registration, returns and appeal forms. Linked only.' },
  { code: 'CBIC', name: 'Central Board of Indirect Taxes and Customs', publisher: 'CBIC', baseUrl: 'https://www.cbic.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Indirect tax notifications and circulars. Linked only.' },

  // ---- consumer, utilities, telecom -------------------------------------
  { code: 'CONSUMER_HELPLINE', name: 'National Consumer Helpline', publisher: 'Department of Consumer Affairs', baseUrl: 'https://consumerhelpline.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Consumer complaint routing and guidance. Linked only.' },
  { code: 'EDAAKHIL', name: 'e-Daakhil', publisher: 'National Consumer Disputes Redressal Commission', baseUrl: 'https://edaakhil.nic.in/', trustLevel: 1, category: 'tribunal', rightsNote: 'Online filing of consumer complaints. Linked only.' },
  { code: 'NCDRC', name: 'National Consumer Disputes Redressal Commission', publisher: 'NCDRC', baseUrl: 'https://ncdrc.nic.in/', trustLevel: 1, category: 'tribunal', rightsNote: 'Consumer case law, rules and forms. Linked only.' },
  { code: 'CERC', name: 'Central Electricity Regulatory Commission', publisher: 'CERC', baseUrl: 'https://cercind.gov.in/', trustLevel: 1, category: 'regulator', rightsNote: 'Central electricity regulations and orders. Linked only.' },
  { code: 'TRAI', name: 'Telecom Regulatory Authority of India', publisher: 'TRAI', baseUrl: 'https://www.trai.gov.in/', trustLevel: 1, category: 'regulator', rightsNote: 'Telecom regulations and consumer redress material. Linked only.' },

  // ---- property, company, securities ------------------------------------
  { code: 'MCA', name: 'Ministry of Corporate Affairs', publisher: 'MCA', baseUrl: 'https://www.mca.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Company and LLP forms, filings and circulars. Linked only.' },
  { code: 'SEBI', name: 'Securities and Exchange Board of India', publisher: 'SEBI', baseUrl: 'https://www.sebi.gov.in/', trustLevel: 1, category: 'regulator', rightsNote: 'Securities regulations, circulars and the SCORES route. Linked only.' },
  { code: 'RBI', name: 'Reserve Bank of India', publisher: 'RBI', baseUrl: 'https://www.rbi.org.in/', trustLevel: 1, category: 'regulator', rightsNote: 'Banking directions and the ombudsman scheme. Linked only.' },
  { code: 'CCI', name: 'Competition Commission of India', publisher: 'CCI', baseUrl: 'https://www.cci.gov.in/', trustLevel: 1, category: 'regulator', rightsNote: 'Competition regulations, forms and orders. Linked only.' },
  { code: 'RERA_CENTRAL', name: 'RERA (central resources)', publisher: 'Ministry of Housing and Urban Affairs', baseUrl: 'https://mohua.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'RERA Act and model rules. State authorities publish their own forms.' },

  // ---- citizen services --------------------------------------------------
  { code: 'RTI_ONLINE', name: 'RTI Online', publisher: 'Department of Personnel and Training', baseUrl: 'https://rtionline.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'RTI filing for central public authorities. Linked only.' },
  { code: 'CIC', name: 'Central Information Commission', publisher: 'CIC', baseUrl: 'https://cic.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'RTI second appeal decisions and forms. Linked only.' },
  { code: 'CYBERCRIME', name: 'National Cyber Crime Reporting Portal', publisher: 'Ministry of Home Affairs', baseUrl: 'https://cybercrime.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Cyber crime and financial fraud reporting. Linked only.' },
  { code: 'PASSPORT', name: 'Passport Seva', publisher: 'Ministry of External Affairs', baseUrl: 'https://www.passportindia.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Passport application, annexures and police verification material. Linked only.' },
  { code: 'PARIVAHAN', name: 'Parivahan Sewa', publisher: 'Ministry of Road Transport and Highways', baseUrl: 'https://parivahan.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Vehicle, licence and accident-related services. Linked only.' },
  { code: 'ECI_SOURCE', name: 'Election Commission of India', publisher: 'ECI', baseUrl: 'https://www.eci.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'Electoral forms, the model code and candidate affidavits. Linked only.' },
  { code: 'NCW', name: 'National Commission for Women', publisher: 'NCW', baseUrl: 'https://ncw.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'Complaint routes and guidance for women. Linked only.' },
  { code: 'NHRC_SOURCE', name: 'National Human Rights Commission', publisher: 'NHRC', baseUrl: 'https://nhrc.nic.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'Human rights complaint procedure and forms. Linked only.' },
  { code: 'SHE_BOX', name: 'SHe-Box', publisher: 'Ministry of Women and Child Development', baseUrl: 'https://shebox.wcd.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Workplace sexual harassment complaint route under the POSH Act. Linked only.' },

  // ---- intellectual property ---------------------------------------------
  { code: 'IPINDIA', name: 'Intellectual Property India', publisher: 'Office of the Controller General of Patents, Designs and Trade Marks', baseUrl: 'https://ipindia.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'Prescribed forms and fee schedules for patents, designs and trade marks. Linked only.' },
  { code: 'COPYRIGHT', name: 'Copyright Office', publisher: 'Copyright Office, DPIIT', baseUrl: 'https://copyright.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'Copyright registration procedure and forms. Linked only.' },

  // ---- business and enterprise -------------------------------------------
  { code: 'MSME', name: 'Ministry of Micro, Small and Medium Enterprises', publisher: 'Ministry of MSME', baseUrl: 'https://msme.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Udyam registration, the Samadhaan delayed-payment route and scheme guidelines. Linked only.' },
  { code: 'NSWS', name: 'National Single Window System', publisher: 'Department for Promotion of Industry and Internal Trade', baseUrl: 'https://www.nsws.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Approvals and licence discovery for businesses. Linked only.' },

  // ---- tribunals ---------------------------------------------------------
  { code: 'CAT', name: 'Central Administrative Tribunal', publisher: 'Central Administrative Tribunal', baseUrl: 'https://cgat.gov.in/', trustLevel: 1, category: 'tribunal', rightsNote: 'Service matters of central government employees. Linked only.' },
  { code: 'NGT', name: 'National Green Tribunal', publisher: 'National Green Tribunal', baseUrl: 'https://www.greentribunal.gov.in/', trustLevel: 1, category: 'tribunal', rightsNote: 'Environmental applications, appeals and orders. Linked only.' },
  { code: 'DRT', name: 'Debts Recovery Tribunals', publisher: 'Ministry of Finance', baseUrl: 'https://drt.gov.in/', trustLevel: 1, category: 'tribunal', rightsNote: 'Recovery applications and SARFAESI proceedings. Linked only.' },

  // ---- home affairs, policing and cyber ----------------------------------
  { code: 'MHA', name: 'Ministry of Home Affairs', publisher: 'Ministry of Home Affairs', baseUrl: 'https://www.mha.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Policing, citizen services and internal security material. Linked only.' },
  { code: 'NCRB', name: 'National Crime Records Bureau', publisher: 'NCRB', baseUrl: 'https://www.ncrb.gov.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'Crime statistics and the CCTNS framework. Aggregate data, linked only.' },
  { code: 'CERTIN', name: 'CERT-In', publisher: 'Indian Computer Emergency Response Team, MeitY', baseUrl: 'https://www.cert-in.org.in/', trustLevel: 1, category: 'statutory_body', rightsNote: 'Cyber incident reporting directions and advisories. Linked only.' },

  // ---- grievance and insurance ------------------------------------------
  { code: 'PGPORTAL', name: 'CPGRAMS', publisher: 'Department of Administrative Reforms and Public Grievances', baseUrl: 'https://pgportal.gov.in/', trustLevel: 1, category: 'central_government', rightsNote: 'Centralised public grievance redress for central departments. Linked only.' },
  { code: 'IRDAI', name: 'Insurance Regulatory and Development Authority of India', publisher: 'IRDAI', baseUrl: 'https://irdai.gov.in/', trustLevel: 2, category: 'regulator', rightsNote: 'Insurance regulations, policyholder protection and the Bima Bharosa grievance route. Linked only.' },

  // ---- state-level publisher classes ------------------------------------
  // These three are umbrella sources: a resource records the specific authority
  // in `authority_name`, while the source records the class of publisher and the
  // rights position that applies to all of them.
  { code: 'DISCOM', name: 'Electricity distribution licensees', publisher: 'State electricity distribution companies', baseUrl: 'https://powermin.gov.in/', trustLevel: 2, category: 'statutory_body', rightsNote: 'Consumer portals, tariff schedules and grievance procedures of individual distribution licensees. Linked only; each licensee is named on the resource.' },
  { code: 'SERC', name: 'State electricity regulatory commissions', publisher: 'State Electricity Regulatory Commissions', baseUrl: 'https://cercind.gov.in/', trustLevel: 2, category: 'regulator', rightsNote: 'Supply codes, tariff orders and consumer grievance regulations of individual state commissions. Linked only.' },
  { code: 'RERA', name: 'Real Estate Regulatory Authorities', publisher: 'State Real Estate Regulatory Authorities', baseUrl: 'https://mohua.gov.in/', trustLevel: 2, category: 'regulator', rightsNote: 'Project registers, orders and complaint procedures of individual state authorities. Linked only.' },
];
