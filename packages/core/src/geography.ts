/**
 * India reference geography and court hierarchy.
 *
 * Factual public-administrative data (states, union territories, the cities
 * where courts sit, and the constitutional courts themselves). This is
 * configuration describing institutions — not records about people, and not
 * fabricated. Structure is country-agnostic; adding another country is another
 * data file, not a schema change. ADR-004.
 */

export interface StateSeed { code: string; name: string; kind: 'state' | 'union_territory'; aliases?: string[] }

export const INDIA_STATES: StateSeed[] = [
  { code: 'AP', name: 'Andhra Pradesh', kind: 'state' },
  { code: 'AR', name: 'Arunachal Pradesh', kind: 'state' },
  { code: 'AS', name: 'Assam', kind: 'state' },
  { code: 'BR', name: 'Bihar', kind: 'state' },
  { code: 'CT', name: 'Chhattisgarh', kind: 'state' },
  { code: 'GA', name: 'Goa', kind: 'state' },
  { code: 'GJ', name: 'Gujarat', kind: 'state' },
  { code: 'HR', name: 'Haryana', kind: 'state' },
  { code: 'HP', name: 'Himachal Pradesh', kind: 'state' },
  { code: 'JH', name: 'Jharkhand', kind: 'state' },
  { code: 'KA', name: 'Karnataka', kind: 'state', aliases: ['mysore state'] },
  { code: 'KL', name: 'Kerala', kind: 'state' },
  { code: 'MP', name: 'Madhya Pradesh', kind: 'state', aliases: ['mp'] },
  { code: 'MH', name: 'Maharashtra', kind: 'state' },
  { code: 'MN', name: 'Manipur', kind: 'state' },
  { code: 'ML', name: 'Meghalaya', kind: 'state' },
  { code: 'MZ', name: 'Mizoram', kind: 'state' },
  { code: 'NL', name: 'Nagaland', kind: 'state' },
  { code: 'OR', name: 'Odisha', kind: 'state', aliases: ['orissa'] },
  { code: 'PB', name: 'Punjab', kind: 'state' },
  { code: 'RJ', name: 'Rajasthan', kind: 'state' },
  { code: 'SK', name: 'Sikkim', kind: 'state' },
  { code: 'TN', name: 'Tamil Nadu', kind: 'state' },
  { code: 'TG', name: 'Telangana', kind: 'state' },
  { code: 'TR', name: 'Tripura', kind: 'state' },
  { code: 'UP', name: 'Uttar Pradesh', kind: 'state', aliases: ['up'] },
  { code: 'UK', name: 'Uttarakhand', kind: 'state', aliases: ['uttaranchal'] },
  { code: 'WB', name: 'West Bengal', kind: 'state' },
  { code: 'AN', name: 'Andaman and Nicobar Islands', kind: 'union_territory' },
  { code: 'CH', name: 'Chandigarh', kind: 'union_territory' },
  { code: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu', kind: 'union_territory' },
  { code: 'DL', name: 'Delhi', kind: 'union_territory', aliases: ['new delhi', 'nct of delhi', 'ncr'] },
  { code: 'JK', name: 'Jammu and Kashmir', kind: 'union_territory' },
  { code: 'LA', name: 'Ladakh', kind: 'union_territory' },
  { code: 'LD', name: 'Lakshadweep', kind: 'union_territory' },
  { code: 'PY', name: 'Puducherry', kind: 'union_territory', aliases: ['pondicherry'] },
];

export interface CitySeed { name: string; state: string; aliases?: string[]; isDistrict?: boolean }

/** Cities that matter for legal discovery: court seats, benches and metros. */
export const INDIA_CITIES: CitySeed[] = [
  { name: 'New Delhi', state: 'DL', aliases: ['delhi'] },
  { name: 'Tis Hazari', state: 'DL' }, { name: 'Saket', state: 'DL' },
  { name: 'Karkardooma', state: 'DL' }, { name: 'Rohini', state: 'DL' },
  { name: 'Patiala House', state: 'DL' }, { name: 'Dwarka', state: 'DL' },
  { name: 'Noida', state: 'UP', aliases: ['gautam buddha nagar', 'gautam budh nagar'] },
  { name: 'Ghaziabad', state: 'UP' }, { name: 'Prayagraj', state: 'UP', aliases: ['allahabad'] },
  { name: 'Lucknow', state: 'UP' }, { name: 'Kanpur', state: 'UP' }, { name: 'Varanasi', state: 'UP' },
  { name: 'Gurugram', state: 'HR', aliases: ['gurgaon'] }, { name: 'Faridabad', state: 'HR' },
  { name: 'Mumbai', state: 'MH', aliases: ['bombay'] }, { name: 'Pune', state: 'MH' },
  { name: 'Nagpur', state: 'MH' }, { name: 'Aurangabad', state: 'MH', aliases: ['chhatrapati sambhajinagar'] },
  { name: 'Thane', state: 'MH' }, { name: 'Nashik', state: 'MH' },
  { name: 'Bengaluru', state: 'KA', aliases: ['bangalore'] }, { name: 'Dharwad', state: 'KA' },
  { name: 'Kalaburagi', state: 'KA', aliases: ['gulbarga'] }, { name: 'Mysuru', state: 'KA', aliases: ['mysore'] },
  { name: 'Chennai', state: 'TN', aliases: ['madras'] }, { name: 'Madurai', state: 'TN' },
  { name: 'Coimbatore', state: 'TN' },
  { name: 'Kolkata', state: 'WB', aliases: ['calcutta'] }, { name: 'Jalpaiguri', state: 'WB' },
  { name: 'Hyderabad', state: 'TG' }, { name: 'Amaravati', state: 'AP' },
  { name: 'Visakhapatnam', state: 'AP', aliases: ['vizag'] },
  { name: 'Ahmedabad', state: 'GJ' }, { name: 'Surat', state: 'GJ' }, { name: 'Vadodara', state: 'GJ' },
  { name: 'Jabalpur', state: 'MP' }, { name: 'Indore', state: 'MP' },
  { name: 'Gwalior', state: 'MP' }, { name: 'Bhopal', state: 'MP' },
  { name: 'Jaipur', state: 'RJ' }, { name: 'Jodhpur', state: 'RJ' },
  { name: 'Chandigarh', state: 'CH' }, { name: 'Patna', state: 'BR' },
  { name: 'Ranchi', state: 'JH' }, { name: 'Bilaspur', state: 'CT' }, { name: 'Raipur', state: 'CT' },
  { name: 'Cuttack', state: 'OR' }, { name: 'Bhubaneswar', state: 'OR' },
  { name: 'Ernakulam', state: 'KL', aliases: ['kochi', 'cochin'] }, { name: 'Thiruvananthapuram', state: 'KL', aliases: ['trivandrum'] },
  { name: 'Guwahati', state: 'AS' }, { name: 'Shimla', state: 'HP' },
  { name: 'Srinagar', state: 'JK' }, { name: 'Jammu', state: 'JK' },
  { name: 'Nainital', state: 'UK' }, { name: 'Dehradun', state: 'UK' },
  { name: 'Shillong', state: 'ML' }, { name: 'Imphal', state: 'MN' },
  { name: 'Agartala', state: 'TR' }, { name: 'Gangtok', state: 'SK' },
  { name: 'Aizawl', state: 'MZ' }, { name: 'Kohima', state: 'NL' },
  { name: 'Itanagar', state: 'AR' }, { name: 'Port Blair', state: 'AN' },
  { name: 'Panaji', state: 'GA', aliases: ['panjim'] }, { name: 'Puducherry', state: 'PY' },
  { name: 'Leh', state: 'LA' },
];

export interface CourtSeed {
  name: string; shortName?: string; tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  kind: string; state?: string; seat?: string; aliases?: string[]; isBench?: boolean; parent?: string;
}

/**
 * Tier 1 apex, 2 high court, 3 district, 4 tribunal, 5 consumer forum,
 * 6 special court, 7 arbitral institution.
 */
export const INDIA_COURTS: CourtSeed[] = [
  { name: 'Supreme Court of India', shortName: 'Supreme Court', tier: 1, kind: 'apex', state: 'DL', seat: 'New Delhi', aliases: ['sci', 'apex court', 'hon\'ble supreme court'] },

  // The 25 High Courts.
  { name: 'Allahabad High Court', shortName: 'Allahabad HC', tier: 2, kind: 'high_court', state: 'UP', seat: 'Prayagraj', aliases: ['high court of judicature at allahabad'] },
  { name: 'Allahabad High Court, Lucknow Bench', tier: 2, kind: 'high_court', state: 'UP', seat: 'Lucknow', isBench: true, parent: 'Allahabad High Court', aliases: ['lucknow bench'] },
  { name: 'Andhra Pradesh High Court', shortName: 'AP HC', tier: 2, kind: 'high_court', state: 'AP', seat: 'Amaravati' },
  { name: 'Bombay High Court', shortName: 'Bombay HC', tier: 2, kind: 'high_court', state: 'MH', seat: 'Mumbai', aliases: ['high court of bombay', 'mumbai high court'] },
  { name: 'Bombay High Court, Nagpur Bench', tier: 2, kind: 'high_court', state: 'MH', seat: 'Nagpur', isBench: true, parent: 'Bombay High Court' },
  { name: 'Bombay High Court, Aurangabad Bench', tier: 2, kind: 'high_court', state: 'MH', seat: 'Aurangabad', isBench: true, parent: 'Bombay High Court' },
  { name: 'Bombay High Court at Goa', tier: 2, kind: 'high_court', state: 'GA', seat: 'Panaji', isBench: true, parent: 'Bombay High Court', aliases: ['goa bench'] },
  { name: 'Calcutta High Court', shortName: 'Calcutta HC', tier: 2, kind: 'high_court', state: 'WB', seat: 'Kolkata', aliases: ['high court at calcutta', 'kolkata high court'] },
  { name: 'Calcutta High Court, Circuit Bench at Jalpaiguri', tier: 2, kind: 'high_court', state: 'WB', seat: 'Jalpaiguri', isBench: true, parent: 'Calcutta High Court' },
  { name: 'Chhattisgarh High Court', shortName: 'Chhattisgarh HC', tier: 2, kind: 'high_court', state: 'CT', seat: 'Bilaspur' },
  { name: 'Delhi High Court', shortName: 'Delhi HC', tier: 2, kind: 'high_court', state: 'DL', seat: 'New Delhi', aliases: ['high court of delhi'] },
  { name: 'Gauhati High Court', shortName: 'Gauhati HC', tier: 2, kind: 'high_court', state: 'AS', seat: 'Guwahati', aliases: ['guwahati high court'] },
  { name: 'Gujarat High Court', shortName: 'Gujarat HC', tier: 2, kind: 'high_court', state: 'GJ', seat: 'Ahmedabad' },
  { name: 'Himachal Pradesh High Court', shortName: 'HP HC', tier: 2, kind: 'high_court', state: 'HP', seat: 'Shimla' },
  { name: 'High Court of Jammu & Kashmir and Ladakh', shortName: 'J&K and Ladakh HC', tier: 2, kind: 'high_court', state: 'JK', seat: 'Srinagar', aliases: ['jammu kashmir high court', 'j&k high court'] },
  { name: 'Jharkhand High Court', shortName: 'Jharkhand HC', tier: 2, kind: 'high_court', state: 'JH', seat: 'Ranchi' },
  { name: 'Karnataka High Court', shortName: 'Karnataka HC', tier: 2, kind: 'high_court', state: 'KA', seat: 'Bengaluru', aliases: ['high court of karnataka', 'bangalore high court'] },
  { name: 'Karnataka High Court, Dharwad Bench', tier: 2, kind: 'high_court', state: 'KA', seat: 'Dharwad', isBench: true, parent: 'Karnataka High Court' },
  { name: 'Karnataka High Court, Kalaburagi Bench', tier: 2, kind: 'high_court', state: 'KA', seat: 'Kalaburagi', isBench: true, parent: 'Karnataka High Court' },
  { name: 'Kerala High Court', shortName: 'Kerala HC', tier: 2, kind: 'high_court', state: 'KL', seat: 'Ernakulam' },
  { name: 'Madhya Pradesh High Court', shortName: 'MP HC', tier: 2, kind: 'high_court', state: 'MP', seat: 'Jabalpur', aliases: ['jabalpur high court', 'high court of madhya pradesh'] },
  { name: 'Madhya Pradesh High Court, Indore Bench', tier: 2, kind: 'high_court', state: 'MP', seat: 'Indore', isBench: true, parent: 'Madhya Pradesh High Court', aliases: ['indore bench'] },
  { name: 'Madhya Pradesh High Court, Gwalior Bench', tier: 2, kind: 'high_court', state: 'MP', seat: 'Gwalior', isBench: true, parent: 'Madhya Pradesh High Court', aliases: ['gwalior bench'] },
  { name: 'Madras High Court', shortName: 'Madras HC', tier: 2, kind: 'high_court', state: 'TN', seat: 'Chennai', aliases: ['high court of madras', 'chennai high court'] },
  { name: 'Madras High Court, Madurai Bench', tier: 2, kind: 'high_court', state: 'TN', seat: 'Madurai', isBench: true, parent: 'Madras High Court' },
  { name: 'Manipur High Court', shortName: 'Manipur HC', tier: 2, kind: 'high_court', state: 'MN', seat: 'Imphal' },
  { name: 'Meghalaya High Court', shortName: 'Meghalaya HC', tier: 2, kind: 'high_court', state: 'ML', seat: 'Shillong' },
  { name: 'Orissa High Court', shortName: 'Orissa HC', tier: 2, kind: 'high_court', state: 'OR', seat: 'Cuttack', aliases: ['odisha high court'] },
  { name: 'Patna High Court', shortName: 'Patna HC', tier: 2, kind: 'high_court', state: 'BR', seat: 'Patna' },
  { name: 'Punjab and Haryana High Court', shortName: 'P&H HC', tier: 2, kind: 'high_court', state: 'CH', seat: 'Chandigarh', aliases: ['punjab haryana high court'] },
  { name: 'Rajasthan High Court', shortName: 'Rajasthan HC', tier: 2, kind: 'high_court', state: 'RJ', seat: 'Jodhpur' },
  { name: 'Rajasthan High Court, Jaipur Bench', tier: 2, kind: 'high_court', state: 'RJ', seat: 'Jaipur', isBench: true, parent: 'Rajasthan High Court' },
  { name: 'Sikkim High Court', shortName: 'Sikkim HC', tier: 2, kind: 'high_court', state: 'SK', seat: 'Gangtok' },
  { name: 'Telangana High Court', shortName: 'Telangana HC', tier: 2, kind: 'high_court', state: 'TG', seat: 'Hyderabad' },
  { name: 'Tripura High Court', shortName: 'Tripura HC', tier: 2, kind: 'high_court', state: 'TR', seat: 'Agartala' },
  { name: 'Uttarakhand High Court', shortName: 'Uttarakhand HC', tier: 2, kind: 'high_court', state: 'UK', seat: 'Nainital' },

  // District judiciary — the Delhi complexes, because the ingested Bar Council
  // of Delhi records reference chambers in exactly these buildings.
  { name: 'Tis Hazari District Courts', tier: 3, kind: 'district_court', state: 'DL', seat: 'Tis Hazari', aliases: ['tis hazari courts', 'tis hazari'] },
  { name: 'Patiala House District Courts', tier: 3, kind: 'district_court', state: 'DL', seat: 'Patiala House', aliases: ['patiala house courts'] },
  { name: 'Saket District Courts', tier: 3, kind: 'district_court', state: 'DL', seat: 'Saket', aliases: ['saket court complex', 'saket courts'] },
  { name: 'Karkardooma District Courts', tier: 3, kind: 'district_court', state: 'DL', seat: 'Karkardooma', aliases: ['karkardooma courts'] },
  { name: 'Rohini District Courts', tier: 3, kind: 'district_court', state: 'DL', seat: 'Rohini', aliases: ['rohini courts'] },
  { name: 'Dwarka District Courts', tier: 3, kind: 'district_court', state: 'DL', seat: 'Dwarka', aliases: ['dwarka courts'] },

  // Tribunals — the ones that matter for this platform's labour/PF/ESI wedge
  // and for corporate work.
  { name: 'National Company Law Tribunal', shortName: 'NCLT', tier: 4, kind: 'tribunal', state: 'DL', seat: 'New Delhi', aliases: ['nclt'] },
  { name: 'National Company Law Appellate Tribunal', shortName: 'NCLAT', tier: 4, kind: 'tribunal', state: 'DL', seat: 'New Delhi', aliases: ['nclat'] },
  { name: 'Central Government Industrial Tribunal', shortName: 'CGIT', tier: 4, kind: 'tribunal', aliases: ['cgit', 'industrial tribunal', 'labour court'] },
  { name: 'Employees Provident Fund Appellate Authority', shortName: 'EPF Appellate', tier: 4, kind: 'tribunal', aliases: ['pf appellate tribunal', 'epfat'] },
  { name: 'Central Administrative Tribunal', shortName: 'CAT', tier: 4, kind: 'tribunal', aliases: ['cat', 'administrative tribunal'] },
  { name: 'Income Tax Appellate Tribunal', shortName: 'ITAT', tier: 4, kind: 'tribunal', aliases: ['itat'] },
  { name: 'Customs, Excise and Service Tax Appellate Tribunal', shortName: 'CESTAT', tier: 4, kind: 'tribunal', aliases: ['cestat'] },
  { name: 'National Green Tribunal', shortName: 'NGT', tier: 4, kind: 'tribunal', state: 'DL', seat: 'New Delhi', aliases: ['ngt', 'green tribunal'] },
  { name: 'Debts Recovery Tribunal', shortName: 'DRT', tier: 4, kind: 'tribunal', aliases: ['drt'] },
  { name: 'Telecom Disputes Settlement and Appellate Tribunal', shortName: 'TDSAT', tier: 4, kind: 'tribunal', state: 'DL', seat: 'New Delhi', aliases: ['tdsat'] },
  { name: 'Armed Forces Tribunal', shortName: 'AFT', tier: 4, kind: 'tribunal', aliases: ['aft'] },

  // Consumer commissions.
  { name: 'National Consumer Disputes Redressal Commission', shortName: 'NCDRC', tier: 5, kind: 'consumer_commission', state: 'DL', seat: 'New Delhi', aliases: ['ncdrc', 'national consumer commission'] },
  { name: 'State Consumer Disputes Redressal Commission', shortName: 'State Consumer Commission', tier: 5, kind: 'consumer_commission', aliases: ['state consumer commission', 'scdrc'] },
  { name: 'District Consumer Disputes Redressal Commission', shortName: 'District Consumer Commission', tier: 5, kind: 'consumer_commission', aliases: ['district consumer forum', 'consumer court'] },

  // Arbitral institutions.
  { name: 'Delhi International Arbitration Centre', shortName: 'DIAC', tier: 7, kind: 'arbitral_institution', state: 'DL', seat: 'New Delhi', aliases: ['diac'] },
  { name: 'Mumbai Centre for International Arbitration', shortName: 'MCIA', tier: 7, kind: 'arbitral_institution', state: 'MH', seat: 'Mumbai', aliases: ['mcia'] },
  { name: 'India International Arbitration Centre', shortName: 'IIAC', tier: 7, kind: 'arbitral_institution', state: 'DL', seat: 'New Delhi', aliases: ['iiac'] },
];

export const COURT_TIER_LABELS: Record<number, string> = {
  1: 'Supreme Court', 2: 'High Court', 3: 'District Court',
  4: 'Tribunal', 5: 'Consumer Commission', 6: 'Special Court', 7: 'Arbitral Institution',
};
