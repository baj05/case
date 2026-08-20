/**
 * Level 6: FORUMS — where a matter is actually heard or escalated.
 *
 * Deliberately separate from `court`, because most forums a member of the
 * public meets are not courts: EPFO, a DISCOM grievance cell, an ombudsman, a
 * regulatory commission, a Lok Adalat. Treating "forum" and "court" as the same
 * thing is what makes legal directories useless for real problems.
 *
 * `escalates` encodes the ordinary escalation path, so the platform can tell a
 * user "start here, then here" rather than dropping them at a tribunal they
 * cannot approach directly.
 *
 * Institutional facts only — names, kinds, statutes, official sites. No claims
 * about outcomes, timelines or quality.
 */

export interface ForumSeed {
  code: string; name: string; short?: string; slug: string;
  kind: 'court' | 'tribunal' | 'appellate_tribunal' | 'commission' | 'regulator'
      | 'ombudsman' | 'authority' | 'grievance_cell' | 'adr' | 'department' | 'police';
  level?: 'central' | 'state' | 'district' | 'local';
  /** Slug of an existing `court` row, where the forum IS a court. */
  courtSlug?: string;
  statute?: string;
  url?: string;
  /** Forum code this ordinarily escalates to. */
  escalates?: string;
}

const F = (
  code: string, name: string, slug: string, kind: ForumSeed['kind'], o: Partial<ForumSeed> = {},
): ForumSeed => ({ code, name, slug, kind, level: 'central', ...o });

export const FORUMS: ForumSeed[] = [
  // ---------------------------------------------------------------- courts
  F('F_SC', 'Supreme Court of India', 'supreme-court', 'court', { short: 'Supreme Court', courtSlug: 'supreme-court-of-india', url: 'https://www.sci.gov.in/' }),
  F('F_HC', 'High Court', 'high-court', 'court', { level: 'state', short: 'High Court', escalates: 'F_SC' }),
  F('F_CIVIL_COURT', 'Civil Court', 'civil-court', 'court', { level: 'district', escalates: 'F_HC' }),
  F('F_COMMERCIAL_COURT', 'Commercial Court', 'commercial-court', 'court', { level: 'district', statute: 'Commercial Courts Act, 2015', escalates: 'F_HC' }),
  F('F_MAGISTRATE', 'Magistrate Court', 'magistrate-court', 'court', { level: 'district', escalates: 'F_SESSIONS' }),
  F('F_SESSIONS', 'Sessions Court', 'sessions-court', 'court', { level: 'district', escalates: 'F_HC' }),
  F('F_FAMILY_COURT', 'Family Court', 'family-court', 'court', { level: 'district', statute: 'Family Courts Act, 1984', escalates: 'F_HC' }),
  F('F_GUARDIAN_COURT', 'Guardian Court', 'guardian-court', 'court', { level: 'district', statute: 'Guardians and Wards Act, 1890', escalates: 'F_HC' }),
  F('F_ESI_COURT', 'Employees Insurance Court', 'employees-insurance-court', 'court', { level: 'state', statute: 'ESI Act, 1948', escalates: 'F_HC' }),
  F('F_ELEC_SPECIAL_COURT', 'Special Court (Electricity)', 'special-court-electricity', 'court', { level: 'state', statute: 'Electricity Act, 2003', escalates: 'F_HC' }),
  F('F_COOP_COURT', 'Cooperative Court / Registrar', 'cooperative-court', 'court', { level: 'state', escalates: 'F_HC' }),

  // ------------------------------------------------------------- tribunals
  F('F_NCLT', 'National Company Law Tribunal', 'nclt', 'tribunal', { short: 'NCLT', statute: 'Companies Act, 2013 / IBC, 2016', url: 'https://nclt.gov.in/', escalates: 'F_NCLAT' }),
  F('F_NCLAT', 'National Company Law Appellate Tribunal', 'nclat', 'appellate_tribunal', { short: 'NCLAT', url: 'https://nclat.nic.in/', escalates: 'F_SC' }),
  F('F_DRT', 'Debts Recovery Tribunal', 'drt', 'tribunal', { short: 'DRT', statute: 'RDDBFI Act, 1993', escalates: 'F_DRAT' }),
  F('F_DRAT', 'Debts Recovery Appellate Tribunal', 'drat', 'appellate_tribunal', { short: 'DRAT', escalates: 'F_HC' }),
  F('F_CAT', 'Central Administrative Tribunal', 'cat', 'tribunal', { short: 'CAT', statute: 'Administrative Tribunals Act, 1985', url: 'https://cgat.gov.in/', escalates: 'F_HC' }),
  F('F_STATE_TRIBUNAL', 'State Administrative Tribunal', 'state-administrative-tribunal', 'tribunal', { level: 'state', escalates: 'F_HC' }),
  F('F_ITAT', 'Income Tax Appellate Tribunal', 'itat', 'appellate_tribunal', { short: 'ITAT', url: 'https://itat.gov.in/', escalates: 'F_HC' }),
  F('F_CESTAT', 'Customs, Excise and Service Tax Appellate Tribunal', 'cestat', 'appellate_tribunal', { short: 'CESTAT', url: 'https://cestat.gov.in/', escalates: 'F_HC' }),
  F('F_GSTAT', 'GST Appellate Tribunal', 'gstat', 'appellate_tribunal', { short: 'GSTAT', statute: 'CGST Act, 2017', escalates: 'F_HC' }),
  F('F_NGT', 'National Green Tribunal', 'ngt', 'tribunal', { short: 'NGT', statute: 'NGT Act, 2010', url: 'https://www.greentribunal.gov.in/', escalates: 'F_SC' }),
  F('F_TDSAT', 'Telecom Disputes Settlement and Appellate Tribunal', 'tdsat', 'appellate_tribunal', { short: 'TDSAT', url: 'https://tdsat.gov.in/', escalates: 'F_SC' }),
  F('F_SAT', 'Securities Appellate Tribunal', 'sat', 'appellate_tribunal', { short: 'SAT', url: 'https://sat.gov.in/', escalates: 'F_SC' }),
  F('F_ELEC_APPELLATE', 'Appellate Tribunal for Electricity', 'aptel', 'appellate_tribunal', { short: 'APTEL', statute: 'Electricity Act, 2003', url: 'https://aptel.gov.in/', escalates: 'F_SC' }),
  F('F_AFT', 'Armed Forces Tribunal', 'armed-forces-tribunal', 'tribunal', { short: 'AFT', url: 'https://aftdelhi.nic.in/', escalates: 'F_SC' }),
  F('F_RCT', 'Railway Claims Tribunal', 'railway-claims-tribunal', 'tribunal', { short: 'RCT', escalates: 'F_HC' }),
  F('F_CGIT', 'Central Government Industrial Tribunal-cum-Labour Court', 'cgit', 'tribunal', { short: 'CGIT', statute: 'Industrial Disputes Act, 1947', escalates: 'F_HC' }),
  F('F_INDUSTRIAL_TRIBUNAL', 'Industrial Tribunal', 'industrial-tribunal', 'tribunal', { level: 'state', escalates: 'F_HC' }),
  F('F_LABOUR_COURT', 'Labour Court', 'labour-court', 'tribunal', { level: 'state', statute: 'Industrial Disputes Act, 1947', escalates: 'F_HC' }),
  F('F_EPF_APPELLATE', 'EPF Appellate Authority (CGIT)', 'epf-appellate', 'appellate_tribunal', { statute: 'EPF & MP Act, 1952', escalates: 'F_HC' }),
  F('F_MACT', 'Motor Accident Claims Tribunal', 'mact', 'tribunal', { level: 'district', statute: 'Motor Vehicles Act, 1988', escalates: 'F_HC' }),
  F('F_MAINTENANCE_TRIBUNAL', 'Maintenance Tribunal (Senior Citizens)', 'maintenance-tribunal', 'tribunal', { level: 'district', statute: 'Maintenance and Welfare of Parents and Senior Citizens Act, 2007', escalates: 'F_HC' }),
  F('F_LAND_TRIBUNAL', 'Land Acquisition Authority / Tribunal', 'land-acquisition-tribunal', 'tribunal', { level: 'state', escalates: 'F_HC' }),
  F('F_MUNICIPAL_TRIBUNAL', 'Municipal Tribunal / Appellate Authority', 'municipal-tribunal', 'tribunal', { level: 'local', escalates: 'F_HC' }),
  F('F_RERA_APPELLATE', 'RERA Appellate Tribunal', 'rera-appellate-tribunal', 'appellate_tribunal', { level: 'state', statute: 'RERA, 2016', escalates: 'F_HC' }),
  F('F_MSEFC', 'MSE Facilitation Council', 'msefc', 'tribunal', { level: 'state', statute: 'MSMED Act, 2006', url: 'https://samadhaan.msme.gov.in/', escalates: 'F_COMMERCIAL_COURT' }),
  F('F_IPAB_HC', 'High Court (IP appeals)', 'high-court-ip-appeals', 'court', { level: 'state', escalates: 'F_SC' }),

  // ----------------------------------------------------------- commissions
  F('F_CONSUMER_DIST', 'District Consumer Disputes Redressal Commission', 'district-consumer-commission', 'commission', { level: 'district', statute: 'Consumer Protection Act, 2019', escalates: 'F_CONSUMER_STATE' }),
  F('F_CONSUMER_STATE', 'State Consumer Disputes Redressal Commission', 'state-consumer-commission', 'commission', { level: 'state', escalates: 'F_CONSUMER_NAT' }),
  F('F_CONSUMER_NAT', 'National Consumer Disputes Redressal Commission', 'ncdrc', 'commission', { short: 'NCDRC', url: 'https://ncdrc.nic.in/', escalates: 'F_SC' }),
  F('F_ELEC_SERC', 'State Electricity Regulatory Commission', 'state-electricity-regulatory-commission', 'commission', { level: 'state', short: 'SERC', statute: 'Electricity Act, 2003', escalates: 'F_ELEC_APPELLATE' }),
  F('F_ELEC_CERC', 'Central Electricity Regulatory Commission', 'cerc', 'commission', { short: 'CERC', url: 'https://cercind.gov.in/', escalates: 'F_ELEC_APPELLATE' }),
  F('F_ELEC_CGRF', 'Consumer Grievance Redressal Forum (Electricity)', 'electricity-cgrf', 'commission', { level: 'state', statute: 'Electricity Act, 2003 s.42(5)', escalates: 'F_ELEC_OMBUDSMAN' }),
  F('F_NHRC', 'National Human Rights Commission', 'nhrc', 'commission', { url: 'https://nhrc.nic.in/' }),
  F('F_SHRC', 'State Human Rights Commission', 'shrc', 'commission', { level: 'state', escalates: 'F_NHRC' }),
  F('F_CIC', 'Central Information Commission', 'cic', 'commission', { statute: 'RTI Act, 2005', url: 'https://cic.gov.in/' }),
  F('F_SIC', 'State Information Commission', 'sic', 'commission', { level: 'state', statute: 'RTI Act, 2005' }),
  F('F_MEDICAL_COUNCIL', 'National Medical Commission / State Medical Council', 'medical-council', 'commission', { url: 'https://www.nmc.org.in/' }),
  F('F_DISABILITY_COMMISSIONER', 'Chief Commissioner for Persons with Disabilities', 'disability-commissioner', 'commission', { statute: 'RPwD Act, 2016', url: 'https://ccdisabilities.nic.in/' }),
  F('F_UGC', 'University Grants Commission', 'ugc', 'commission', { url: 'https://www.ugc.gov.in/' }),

  // ------------------------------------------------------------ regulators
  F('F_TRAI', 'Telecom Regulatory Authority of India', 'trai', 'regulator', { url: 'https://www.trai.gov.in/', escalates: 'F_TDSAT' }),
  F('F_RERA', 'Real Estate Regulatory Authority', 'rera', 'regulator', { level: 'state', statute: 'RERA, 2016', escalates: 'F_RERA_APPELLATE' }),
  F('F_PCB', 'Pollution Control Board', 'pollution-control-board', 'regulator', { level: 'state', escalates: 'F_NGT' }),
  F('F_MOEF', 'Ministry of Environment, Forest and Climate Change', 'moefcc', 'department', { url: 'https://moef.gov.in/', escalates: 'F_NGT' }),
  F('F_MCA', 'Ministry of Corporate Affairs', 'mca', 'department', { url: 'https://www.mca.gov.in/' }),
  F('F_ROC', 'Registrar of Companies', 'registrar-of-companies', 'authority', { level: 'state', escalates: 'F_NCLT' }),
  F('F_RD', 'Regional Director (MCA)', 'regional-director-mca', 'authority', { escalates: 'F_NCLT' }),
  F('F_DPB', 'Data Protection Board of India', 'data-protection-board', 'authority', { statute: 'DPDP Act, 2023' }),
  F('F_CERTIN', 'CERT-In', 'cert-in', 'authority', { url: 'https://www.cert-in.org.in/' }),

  // ------------------------------------------------------------ ombudsmen
  F('F_RBI_OMBUDSMAN', 'RBI Integrated Ombudsman', 'rbi-ombudsman', 'ombudsman', { url: 'https://cms.rbi.org.in/', escalates: 'F_CONSUMER_DIST' }),
  F('F_INSURANCE_OMBUDSMAN', 'Insurance Ombudsman', 'insurance-ombudsman', 'ombudsman', { url: 'https://www.cioins.co.in/', escalates: 'F_CONSUMER_DIST' }),
  F('F_ELEC_OMBUDSMAN', 'Electricity Ombudsman', 'electricity-ombudsman', 'ombudsman', { level: 'state', statute: 'Electricity Act, 2003 s.42(6)', escalates: 'F_ELEC_SERC' }),

  // ---------------------------------------------------------- authorities
  F('F_EPFO', 'Employees Provident Fund Organisation', 'epfo', 'authority', { statute: 'EPF & MP Act, 1952', url: 'https://www.epfindia.gov.in/', escalates: 'F_EPF_APPELLATE' }),
  F('F_ESIC', 'Employees State Insurance Corporation', 'esic', 'authority', { statute: 'ESI Act, 1948', url: 'https://www.esic.gov.in/', escalates: 'F_ESI_COURT' }),
  F('F_LABOUR_COMMISSIONER', 'Labour Commissioner', 'labour-commissioner', 'authority', { level: 'state', escalates: 'F_LABOUR_COURT' }),
  F('F_CONCILIATION', 'Conciliation Officer (Labour)', 'conciliation-officer', 'authority', { level: 'state', statute: 'Industrial Disputes Act, 1947', escalates: 'F_LABOUR_COURT' }),
  F('F_CONTROLLING_AUTH', 'Controlling Authority (Gratuity)', 'controlling-authority-gratuity', 'authority', { level: 'state', statute: 'Payment of Gratuity Act, 1972', escalates: 'F_LABOUR_COMMISSIONER' }),
  F('F_WC_COMMISSIONER', 'Commissioner for Employee Compensation', 'employee-compensation-commissioner', 'authority', { level: 'state', statute: 'Employee Compensation Act, 1923', escalates: 'F_HC' }),
  F('F_POSH_IC', 'Internal Committee (POSH)', 'posh-internal-committee', 'authority', { level: 'local', statute: 'POSH Act, 2013', escalates: 'F_POSH_LC' }),
  F('F_POSH_LC', 'Local Committee (POSH)', 'posh-local-committee', 'authority', { level: 'district', statute: 'POSH Act, 2013', escalates: 'F_HC' }),
  F('F_INCOME_TAX', 'Income Tax Department (Assessing Officer)', 'income-tax-department', 'department', { url: 'https://www.incometax.gov.in/', escalates: 'F_CIT_APPEALS' }),
  F('F_CIT_APPEALS', 'Commissioner of Income Tax (Appeals)', 'cit-appeals', 'authority', { escalates: 'F_ITAT' }),
  F('F_GST_OFFICER', 'GST Proper Officer', 'gst-officer', 'authority', { statute: 'CGST Act, 2017', url: 'https://www.gst.gov.in/', escalates: 'F_GST_APPELLATE' }),
  F('F_GST_APPELLATE', 'GST Appellate Authority', 'gst-appellate-authority', 'authority', { escalates: 'F_GSTAT' }),
  F('F_CUSTOMS', 'Customs Authority', 'customs-authority', 'authority', { url: 'https://www.cbic.gov.in/', escalates: 'F_CESTAT' }),
  F('F_REGISTRAR', 'Sub-Registrar (Registration)', 'sub-registrar', 'authority', { level: 'district', statute: 'Registration Act, 1908', escalates: 'F_COLLECTOR_STAMPS' }),
  F('F_COLLECTOR_STAMPS', 'Collector of Stamps', 'collector-of-stamps', 'authority', { level: 'district', escalates: 'F_HC' }),
  F('F_REVENUE_AUTHORITY', 'Revenue Authority', 'revenue-authority', 'authority', { level: 'district', escalates: 'F_HC' }),
  F('F_TEHSILDAR', 'Tehsildar / Revenue Officer', 'tehsildar', 'authority', { level: 'district', escalates: 'F_REVENUE_AUTHORITY' }),
  F('F_RENT_CONTROLLER', 'Rent Controller', 'rent-controller', 'authority', { level: 'district', escalates: 'F_HC' }),
  F('F_RENT_AUTHORITY', 'Rent Authority (Tenancy)', 'rent-authority', 'authority', { level: 'district', escalates: 'F_RENT_CONTROLLER' }),
  F('F_REGISTRAR_SOCIETIES', 'Registrar of Cooperative Societies', 'registrar-societies', 'authority', { level: 'state', escalates: 'F_COOP_COURT' }),
  F('F_MUNICIPAL', 'Municipal Corporation / Local Body', 'municipal-corporation', 'authority', { level: 'local', escalates: 'F_MUNICIPAL_TRIBUNAL' }),
  F('F_WATER_BOARD', 'Water Supply and Sewerage Board', 'water-board', 'authority', { level: 'local', escalates: 'F_CONSUMER_DIST' }),
  F('F_LAND_ACQ_OFFICER', 'Land Acquisition Officer', 'land-acquisition-officer', 'authority', { level: 'district', escalates: 'F_LAND_TRIBUNAL' }),
  F('F_MARRIAGE_REGISTRAR', 'Marriage Registrar', 'marriage-registrar', 'authority', { level: 'district' }),
  F('F_CARA', 'Central Adoption Resource Authority', 'cara', 'authority', { url: 'https://cara.wcd.gov.in/' }),
  F('F_PROTECTION_OFFICER', 'Protection Officer (Domestic Violence)', 'protection-officer', 'authority', { level: 'district', statute: 'PWDVA, 2005', escalates: 'F_MAGISTRATE' }),
  F('F_RTO', 'Regional Transport Office', 'rto', 'authority', { level: 'district' }),
  F('F_TM_REGISTRY', 'Trade Marks Registry', 'trade-marks-registry', 'authority', { url: 'https://ipindia.gov.in/', escalates: 'F_IPAB_HC' }),
  F('F_PATENT_OFFICE', 'Patent Office', 'patent-office', 'authority', { url: 'https://ipindia.gov.in/', escalates: 'F_IPAB_HC' }),
  F('F_COPYRIGHT_OFFICE', 'Copyright Office', 'copyright-office', 'authority', { url: 'https://copyright.gov.in/' }),
  F('F_PIO', 'Public Information Officer', 'public-information-officer', 'authority', { statute: 'RTI Act, 2005', escalates: 'F_SIC' }),
  F('F_ELEC_ASSESSING_OFFICER', 'Assessing Officer (Electricity)', 'electricity-assessing-officer', 'authority', { level: 'state', statute: 'Electricity Act, 2003 s.126', escalates: 'F_ELEC_APPELLATE' }),

  // -------------------------------------------------------- grievance cells
  F('F_DISCOM_GRIEVANCE', 'DISCOM Consumer Grievance Cell', 'discom-grievance-cell', 'grievance_cell', { level: 'state', escalates: 'F_ELEC_CGRF' }),
  F('F_BANK_GRIEVANCE', 'Bank Internal Grievance Redressal', 'bank-grievance', 'grievance_cell', { escalates: 'F_RBI_OMBUDSMAN' }),
  F('F_INSURER_GRIEVANCE', 'Insurer Grievance Redressal Officer', 'insurer-grievance', 'grievance_cell', { escalates: 'F_INSURANCE_OMBUDSMAN' }),
  F('F_TELECOM_GRIEVANCE', 'Telecom Operator Appellate Authority', 'telecom-grievance', 'grievance_cell', { escalates: 'F_TRAI' }),
  F('F_UNIVERSITY_GRIEVANCE', 'University Grievance Redressal Committee', 'university-grievance', 'grievance_cell', { escalates: 'F_UGC' }),
  F('F_IT_GRIEVANCE', 'Grievance Officer (Intermediary)', 'intermediary-grievance-officer', 'grievance_cell', { statute: 'IT Rules, 2021', escalates: 'F_CERTIN' }),
  F('F_NCH', 'National Consumer Helpline', 'national-consumer-helpline', 'grievance_cell', { url: 'https://consumerhelpline.gov.in/', escalates: 'F_CONSUMER_DIST' }),

  // ------------------------------------------------------------------- ADR
  F('F_LOK_ADALAT', 'Lok Adalat', 'lok-adalat', 'adr', { level: 'district', statute: 'Legal Services Authorities Act, 1987' }),
  F('F_MEDIATION_CENTRE', 'Court-annexed Mediation Centre', 'mediation-centre', 'adr', { level: 'district', statute: 'Mediation Act, 2023' }),
  F('F_ARBITRATION', 'Arbitral Tribunal', 'arbitral-tribunal', 'adr', { statute: 'Arbitration and Conciliation Act, 1996', escalates: 'F_COMMERCIAL_COURT' }),
  F('F_NALSA', 'National Legal Services Authority', 'nalsa', 'authority', { statute: 'Legal Services Authorities Act, 1987', url: 'https://nalsa.gov.in/' }),
  F('F_SLSA', 'State Legal Services Authority', 'slsa', 'authority', { level: 'state', escalates: 'F_NALSA' }),
  F('F_DLSA', 'District Legal Services Authority', 'dlsa', 'authority', { level: 'district', escalates: 'F_SLSA' }),

  // ---------------------------------------------------------------- police
  F('F_POLICE', 'Police Station', 'police-station', 'police', { level: 'local', escalates: 'F_MAGISTRATE' }),
  F('F_CYBERCRIME', 'National Cyber Crime Reporting Portal', 'cybercrime-portal', 'police', { url: 'https://cybercrime.gov.in/', escalates: 'F_POLICE' }),
  F('F_TRAFFIC_POLICE', 'Traffic Police', 'traffic-police', 'police', { level: 'local', escalates: 'F_MAGISTRATE' }),
];
