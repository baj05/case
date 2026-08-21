/**
 * State-specific official resources.
 *
 * This file exists because the single most dangerous thing a legal resource
 * library can do is present a national answer to a state question. Tenancy
 * registration, stamp duty, the distribution company that bills you, the
 * regulator that supervises it, the RERA authority that hears your builder
 * complaint and the legal services authority that gives you a lawyer are all
 * state-level. A user in Noida who is shown Maharashtra's rules has been
 * misled, however good the document is.
 *
 * `confirmed` records whether the URL answered from our network at authoring
 * time. Entries marked false are seeded but held at REVIEW_REQUIRED — the
 * library does not publish a link nobody could open.
 */

import type { ResourceCatalogSeed } from './resource-catalog.ts';

// ---------------------------------------------------------------------------
// Legal services authorities — one per state and union territory.
//
// The state authorities run on a common government platform, so their form
// pages are at a predictable address. That regularity is also what makes the
// harvester in packages/ingestion able to read the actual form list from each.
// ---------------------------------------------------------------------------

interface SlsaSeed {
  state: string;          // jurisdiction code
  name: string;           // authority name
  host: string;           // subdomain
  path: string;           // forms page path, or '/' where there is none
  confirmed: boolean;
}

const SLSA: SlsaSeed[] = [
  { state: 'IN-AP', name: 'Andhra Pradesh State Legal Services Authority', host: 'andhrapradesh', path: '/download-forms/', confirmed: true },
  { state: 'IN-AR', name: 'Arunachal Pradesh State Legal Services Authority', host: 'arunachalpradesh', path: '/download-forms/', confirmed: true },
  { state: 'IN-AS', name: 'Assam State Legal Services Authority', host: 'assam', path: '/download-forms/', confirmed: true },
  { state: 'IN-BR', name: 'Bihar State Legal Services Authority', host: 'bihar', path: '/', confirmed: false },
  { state: 'IN-CH', name: 'Chandigarh State Legal Services Authority', host: 'chandigarh', path: '/download-forms/', confirmed: true },
  { state: 'IN-CT', name: 'Chhattisgarh State Legal Services Authority', host: 'chhattisgarh', path: '/download-forms/', confirmed: true },
  { state: 'IN-DL', name: 'Delhi State Legal Services Authority', host: 'delhi', path: '/download-forms/', confirmed: true },
  { state: 'IN-GA', name: 'Goa State Legal Services Authority', host: 'goa', path: '/download-forms/', confirmed: true },
  { state: 'IN-GJ', name: 'Gujarat State Legal Services Authority', host: 'gujarat', path: '/en/download-forms/', confirmed: true },
  { state: 'IN-HP', name: 'Himachal Pradesh State Legal Services Authority', host: 'himachalpradesh', path: '/', confirmed: true },
  { state: 'IN-HR', name: 'Haryana State Legal Services Authority', host: 'haryana', path: '/download-forms/', confirmed: true },
  { state: 'IN-JH', name: 'Jharkhand State Legal Services Authority', host: 'jharkhand', path: '/', confirmed: false },
  { state: 'IN-JK', name: 'Jammu and Kashmir Legal Services Authority', host: 'jammukashmir', path: '/', confirmed: true },
  { state: 'IN-KA', name: 'Karnataka State Legal Services Authority', host: 'karnataka', path: '/', confirmed: true },
  { state: 'IN-KL', name: 'Kerala State Legal Services Authority', host: 'kerala', path: '/download-forms/', confirmed: true },
  { state: 'IN-LA', name: 'Ladakh Legal Services Authority', host: 'ladakh', path: '/download-forms/', confirmed: true },
  { state: 'IN-MH', name: 'Maharashtra State Legal Services Authority', host: 'maharashtra', path: '/download-forms/', confirmed: true },
  { state: 'IN-ML', name: 'Meghalaya State Legal Services Authority', host: 'meghalaya', path: '/download-forms/', confirmed: true },
  { state: 'IN-MN', name: 'Manipur State Legal Services Authority', host: 'manipur', path: '/download-forms/', confirmed: true },
  { state: 'IN-MP', name: 'Madhya Pradesh State Legal Services Authority', host: 'madhyapradesh', path: '/download-forms/', confirmed: true },
  { state: 'IN-MZ', name: 'Mizoram State Legal Services Authority', host: 'mizoram', path: '/', confirmed: true },
  { state: 'IN-NL', name: 'Nagaland State Legal Services Authority', host: 'nagaland', path: '/download-forms/', confirmed: true },
  { state: 'IN-OR', name: 'Odisha State Legal Services Authority', host: 'odisha', path: '/', confirmed: false },
  { state: 'IN-PB', name: 'Punjab State Legal Services Authority', host: 'punjab', path: '/download-forms/', confirmed: true },
  { state: 'IN-PY', name: 'Puducherry State Legal Services Authority', host: 'puducherry', path: '/download-forms/', confirmed: true },
  { state: 'IN-RJ', name: 'Rajasthan State Legal Services Authority', host: 'rajasthan', path: '/download-forms/', confirmed: true },
  { state: 'IN-SK', name: 'Sikkim State Legal Services Authority', host: 'sikkim', path: '/download-forms-sikkim-slsa/', confirmed: true },
  { state: 'IN-TG', name: 'Telangana State Legal Services Authority', host: 'telangana', path: '/download-forms/', confirmed: true },
  { state: 'IN-TN', name: 'Tamil Nadu State Legal Services Authority', host: 'tamilnadu', path: '/download-forms/', confirmed: true },
  { state: 'IN-TR', name: 'Tripura State Legal Services Authority', host: 'tripura', path: '/download-forms/', confirmed: true },
  { state: 'IN-UK', name: 'Uttarakhand State Legal Services Authority', host: 'uttarakhand', path: '/download-forms/', confirmed: true },
  { state: 'IN-UP', name: 'Uttar Pradesh State Legal Services Authority', host: 'uttarpradesh', path: '/download-forms/', confirmed: true },
  { state: 'IN-WB', name: 'West Bengal State Legal Services Authority', host: 'westbengal', path: '/download-forms/', confirmed: true },
  { state: 'IN-AN', name: 'Andaman and Nicobar State Legal Services Authority', host: 'andamanandnicobar', path: '/', confirmed: false },
];

/** The harvest targets the ingestion pipeline reads form lists from. */
export const SLSA_HARVEST_TARGETS = SLSA.map((s) => ({
  stateCode: s.state,
  authority: s.name,
  url: `https://${s.host}.nalsa.gov.in${s.path}`,
  formsUrl: `https://${s.host}.nalsa.gov.in/download-forms/`,
  host: s.host,
}));

const SLSA_RESOURCES: ResourceCatalogSeed[] = SLSA.map((s) => ({
  slug: `legal-aid-forms-${s.host}`,
  title: `${s.name} — legal aid forms and applications`,
  description:
    `The forms published by the ${s.name} itself: the application for legal services, and depending on the state, `
    + 'the Vakalatnama, affidavit of means, mediation application, Lok Adalat form and victim-compensation application.',
  type: s.path === '/' ? 'RESOURCE_LINK' : 'OFFICIAL_FORM',
  officialStatus: 'OFFICIAL',
  category: 'RC_LEGAL_AID',
  subcategory: 'State authorities',
  source: 'NALSA',
  authority: s.name,
  url: `https://${s.host}.nalsa.gov.in${s.path}`,
  landingUrl: `https://${s.host}.nalsa.gov.in/`,
  docFormat: 'html',
  trustLevel: 3,
  matter: 'A_LEGAL_AID',
  forum: 'F_SLSA',
  panIndia: false,
  stateCode: s.state,
  confirmed: s.confirmed,
  keywords: [
    'legal aid form', 'free lawyer application', s.name.toLowerCase(),
    'slsa', 'vakalatnama', 'affidavit of income', 'lok adalat form',
  ],
  notes: [
    'Apply to the legal services institution attached to the court where your matter is or would be — the District Authority for a district court, the State Authority for the High Court.',
    'Each state publishes its own set. Where a form you need is not listed, the District Legal Services Authority will provide it over the counter at no charge.',
    s.path === '/'
      ? 'This authority does not publish a separate forms page at a stable address; start at its home page.'
      : 'The forms on this page are the authority’s own current versions.',
  ],
}));

// ---------------------------------------------------------------------------
// Distribution companies. "My electricity bill is wrong" has a different answer
// in every state, and showing the wrong utility is worse than showing none.
// ---------------------------------------------------------------------------

interface DiscomSeed {
  state: string; name: string; short: string; url: string; area: string; confirmed: boolean;
}

const DISCOMS: DiscomSeed[] = [
  { state: 'IN-DL', name: 'BSES Rajdhani Power Limited and BSES Yamuna Power Limited', short: 'BSES Delhi', url: 'https://www.bsesdelhi.com/', area: 'South, west, central and east Delhi', confirmed: true },
  { state: 'IN-DL', name: 'Tata Power Delhi Distribution Limited', short: 'Tata Power-DDL', url: 'https://www.tatapower-ddl.com/', area: 'North and north-west Delhi', confirmed: true },
  { state: 'IN-MH', name: 'Maharashtra State Electricity Distribution Company Limited', short: 'MSEDCL (Mahavitaran)', url: 'https://www.mahadiscom.in/', area: 'Maharashtra outside the Mumbai licence areas', confirmed: true },
  { state: 'IN-UP', name: 'Uttar Pradesh Power Corporation Limited', short: 'UPPCL', url: 'https://www.uppcl.org/', area: 'Uttar Pradesh, through its distribution companies', confirmed: true },
  { state: 'IN-UP', name: 'Dakshinanchal Vidyut Vitran Nigam Limited', short: 'DVVNL', url: 'https://dvvnl.org/', area: 'Agra and the southern zone of Uttar Pradesh', confirmed: true },
  { state: 'IN-KA', name: 'Bangalore Electricity Supply Company Limited', short: 'BESCOM', url: 'https://bescom.karnataka.gov.in/', area: 'Bengaluru and eight surrounding districts', confirmed: true },
  { state: 'IN-WB', name: 'West Bengal State Electricity Distribution Company Limited', short: 'WBSEDCL', url: 'https://www.wbsedcl.in/', area: 'West Bengal outside the Kolkata licence area', confirmed: true },
  { state: 'IN-PB', name: 'Punjab State Power Corporation Limited', short: 'PSPCL', url: 'https://www.pspcl.in/', area: 'Punjab', confirmed: true },
  { state: 'IN-HR', name: 'Dakshin Haryana Bijli Vitran Nigam', short: 'DHBVN', url: 'https://www.dhbvn.org.in/', area: 'Southern Haryana, including Gurugram and Faridabad', confirmed: true },
  { state: 'IN-RJ', name: 'Jaipur Vidyut Vitran Nigam Limited', short: 'JVVNL', url: 'https://jvvnl.in/', area: 'Jaipur and the surrounding districts', confirmed: true },
];

const DISCOM_RESOURCES: ResourceCatalogSeed[] = DISCOMS.flatMap((d) => [
  {
    slug: `electricity-complaint-${d.short.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    title: `${d.short} — billing complaints, meters and new connections`,
    description:
      `The distribution licensee for ${d.area}. Its own consumer portal is where a billing dispute, meter complaint, `
      + 'new connection application or disconnection grievance is registered first.',
    type: 'RESOURCE_LINK' as const,
    officialStatus: 'OFFICIAL' as const,
    category: 'RC_ELECTRICITY',
    subcategory: 'Billing disputes',
    source: 'DISCOM',
    authority: d.name,
    url: d.url,
    docFormat: 'portal' as const,
    trustLevel: 2 as const,
    matter: 'E_BILL_EXCESS',
    forum: 'F_DISCOM_GRIEVANCE',
    panIndia: false,
    stateCode: d.state,
    confirmed: d.confirmed,
    keywords: [
      'electricity bill complaint', 'excess bill', 'meter complaint', 'new connection',
      d.short.toLowerCase(), 'bijli bill', 'power bill wrong',
    ],
    notes: [
      'Register the complaint with the licensee first and keep the complaint number. Every later forum will ask for it.',
      'If the licensee does not resolve it, the next step is the Consumer Grievance Redressal Forum constituted by this licensee, and after that the Electricity Ombudsman for the state.',
      'Pay the undisputed portion of the bill while the dispute runs. Non-payment invites disconnection on a separate ground and weakens an otherwise good case.',
    ],
  },
]);

// ---------------------------------------------------------------------------
// State electricity regulatory commissions and the ombudsman route.
// ---------------------------------------------------------------------------

interface SercSeed { state: string; name: string; short: string; url: string; confirmed: boolean }

const SERCS: SercSeed[] = [
  { state: 'IN-DL', name: 'Delhi Electricity Regulatory Commission', short: 'DERC', url: 'https://www.derc.gov.in/', confirmed: true },
  { state: 'IN-UP', name: 'Uttar Pradesh Electricity Regulatory Commission', short: 'UPERC', url: 'https://www.uperc.org/', confirmed: true },
  { state: 'IN-MH', name: 'Maharashtra Electricity Regulatory Commission', short: 'MERC', url: 'https://merc.gov.in/', confirmed: true },
];

const SERC_RESOURCES: ResourceCatalogSeed[] = SERCS.map((s) => ({
  slug: `electricity-regulator-${s.short.toLowerCase()}`,
  title: `${s.name} — regulations, tariff orders and the grievance framework`,
  description:
    `The regulator for ${s.name.replace(' Electricity Regulatory Commission', '')}: tariff orders, the supply code, `
    + 'the consumer grievance redressal regulations and the Electricity Ombudsman constituted under them.',
  type: 'REGULATION' as const,
  officialStatus: 'OFFICIAL' as const,
  category: 'RC_ELECTRICITY',
  subcategory: 'Regulators & ombudsmen',
  source: 'SERC',
  authority: s.name,
  url: s.url,
  docFormat: 'html' as const,
  trustLevel: 2 as const,
  matter: 'E_TARIFF',
  forum: 'F_ELEC_SERC',
  panIndia: false,
  stateCode: s.state,
  confirmed: s.confirmed,
  keywords: ['electricity regulation', 'tariff order', s.short.toLowerCase(), 'supply code', 'electricity ombudsman'],
  notes: [
    'The supply code and the consumer grievance regulations made by this Commission are what actually fix the timelines your licensee must meet.',
    'The Electricity Ombudsman for this state is appointed by this Commission; its address and procedure are published here.',
    'A tariff you think is wrongly applied is a question of the tariff order — read the applicable category definition before arguing it.',
  ],
}));

// ---------------------------------------------------------------------------
// RERA authorities. Builder delay, refund and possession complaints go here,
// and only the authority for the state where the project is registered.
// ---------------------------------------------------------------------------

interface ReraSeed { state: string; name: string; url: string; confirmed: boolean }

const RERAS: ReraSeed[] = [
  { state: 'IN-MH', name: 'Maharashtra Real Estate Regulatory Authority (MahaRERA)', url: 'https://maharera.maharashtra.gov.in/', confirmed: true },
  { state: 'IN-KA', name: 'Karnataka Real Estate Regulatory Authority', url: 'https://rera.karnataka.gov.in/', confirmed: true },
  { state: 'IN-TG', name: 'Telangana Real Estate Regulatory Authority', url: 'https://rera.telangana.gov.in/', confirmed: true },
  { state: 'IN-RJ', name: 'Rajasthan Real Estate Regulatory Authority', url: 'https://rera.rajasthan.gov.in/', confirmed: true },
  { state: 'IN-HR', name: 'Haryana Real Estate Regulatory Authority', url: 'https://haryanarera.gov.in/', confirmed: true },
  { state: 'IN-HP', name: 'Himachal Pradesh Real Estate Regulatory Authority', url: 'https://www.hprera.in/', confirmed: true },
  { state: 'IN-UP', name: 'Uttar Pradesh Real Estate Regulatory Authority', url: 'https://up-rera.in/', confirmed: true },
  { state: 'IN-GJ', name: 'Gujarat Real Estate Regulatory Authority', url: 'https://gujrera.gujarat.gov.in/', confirmed: true },
  { state: 'IN-MP', name: 'Madhya Pradesh Real Estate Regulatory Authority', url: 'https://rera.mp.gov.in/', confirmed: true },
  { state: 'IN-PB', name: 'Punjab Real Estate Regulatory Authority', url: 'https://rera.punjab.gov.in/', confirmed: true },
  { state: 'IN-OR', name: 'Odisha Real Estate Regulatory Authority', url: 'https://rera.odisha.gov.in/', confirmed: true },
  { state: 'IN-BR', name: 'Bihar Real Estate Regulatory Authority', url: 'https://rera.bihar.gov.in/', confirmed: true },
  { state: 'IN-CT', name: 'Chhattisgarh Real Estate Regulatory Authority', url: 'https://rera.cgstate.gov.in/', confirmed: true },
  { state: 'IN-UK', name: 'Uttarakhand Real Estate Regulatory Authority', url: 'https://ukrera.uk.gov.in/', confirmed: true },
  { state: 'IN-GA', name: 'Goa Real Estate Regulatory Authority', url: 'https://rera.goa.gov.in/', confirmed: true },
  { state: 'IN-AS', name: 'Assam Real Estate Regulatory Authority', url: 'https://rera.assam.gov.in/', confirmed: true },
  { state: 'IN-AP', name: 'Andhra Pradesh Real Estate Regulatory Authority', url: 'https://rera.ap.gov.in/', confirmed: true },
  // Not confirmed reachable from this network at authoring time (2026-08-21).
  { state: 'IN-WB', name: 'West Bengal Housing Industry Regulatory Authority (WBHIRA)', url: 'https://wbhira.in/', confirmed: false },
  { state: 'IN-TN', name: 'Tamil Nadu Real Estate Regulatory Authority', url: 'https://tnrera.in/', confirmed: false },
  { state: 'IN-JH', name: 'Jharkhand Real Estate Regulatory Authority', url: 'https://rera.jharkhand.gov.in/', confirmed: false },
  { state: 'IN-CH', name: 'Chandigarh Real Estate Regulatory Authority', url: 'https://rera.chd.gov.in/', confirmed: false },
  { state: 'IN-DL', name: 'Delhi Real Estate Regulatory Authority', url: 'https://rera.delhi.gov.in/', confirmed: false },
  { state: 'IN-JK', name: 'Jammu and Kashmir Real Estate Regulatory Authority', url: 'https://jkrera.jk.gov.in/', confirmed: false },
  // Domain resolves but returned HTTP 503 (server error) at authoring time —
  // held rather than treated as confirmed on a server error response.
  { state: 'IN-KL', name: 'Kerala Real Estate Regulatory Authority', url: 'https://rera.kerala.gov.in/', confirmed: false },
];

const RERA_RESOURCES: ResourceCatalogSeed[] = RERAS.map((r) => ({
  slug: `rera-${r.state.toLowerCase().replace('in-', '')}`,
  title: `${r.name} — project register and complaints`,
  description:
    'Search the registration of a project or agent, read the authority’s orders, and file a complaint about delay, '
    + 'a changed plan, a refund or a defect in a registered project.',
  type: 'RESOURCE_LINK' as const,
  officialStatus: 'OFFICIAL' as const,
  category: 'RC_PROPERTY',
  subcategory: 'Builders & RERA',
  source: 'RERA',
  authority: r.name,
  url: r.url,
  docFormat: 'portal' as const,
  trustLevel: 2 as const,
  matter: 'RE_POSSESSION_DELAY',
  forum: 'F_RERA',
  panIndia: false,
  stateCode: r.state,
  confirmed: r.confirmed,
  keywords: ['rera', 'builder delay', 'possession delay', 'project registration', 'refund from builder', 'rera complaint'],
  notes: [
    'Check the project’s registration before you pay anything. The register shows the sanctioned plan, the promised completion date and the quarterly progress the promoter itself filed.',
    'A complaint here is cheaper and faster than a civil suit, and the authority can order interest, compensation or refund.',
    'Only projects required to be registered fall within the authority’s jurisdiction — very small projects and completed buildings may not.',
  ],
}));

// ---------------------------------------------------------------------------
// State Registration and Stamps departments (IGR) — where a sale deed, gift
// deed or a tenancy agreement above the registrable term is actually
// registered, and where e-stamp duty is paid. This is the gap a user hits
// immediately after drafting any of the property templates: the document
// is worthless until it is stamped and, for most instruments, registered.
//
// Every url below was fetched directly from this environment on 2026-08-21 and
// returned HTTP 200 unless noted. Two — Delhi Revenue and Karnataka Kaveri —
// did not connect from this network even with a browser user agent; they are
// well-known, real state portals, so they are seeded but held `confirmed:
// false` rather than dropped, consistent with how the rest of this file
// handles a source that could not be reached at authoring time.
// ---------------------------------------------------------------------------

interface RegistrationSeed {
  state: string;
  name: string;
  url: string;
  onNgdrs: boolean;
  confirmed: boolean;
}

const REGISTRATION_DEPARTMENTS: RegistrationSeed[] = [
  { state: 'IN-MH', name: 'Department of Registration and Stamps, Maharashtra (IGR Maharashtra)', url: 'https://igrmaharashtra.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-UP', name: 'Stamp and Registration Department, Uttar Pradesh (IGRSUP)', url: 'https://igrsup.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-JH', name: 'Registration Department, Jharkhand (Jharnibandhan)', url: 'https://jharnibandhan.gov.in/', onNgdrs: true, confirmed: true },
  { state: 'IN-OR', name: 'Inspector General of Registration, Odisha', url: 'https://www.igrodisha.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-DL', name: 'Revenue Department, Government of Delhi', url: 'https://revenue.delhi.gov.in/', onNgdrs: false, confirmed: false },
  { state: 'IN-KA', name: 'Department of Stamps and Registration, Karnataka (Kaveri Online Services)', url: 'https://kaverionline.karnataka.gov.in/', onNgdrs: false, confirmed: false },
  { state: 'IN-TN', name: 'Registration Department, Tamil Nadu (TNREGINET)', url: 'https://tnreginet.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-TG', name: 'Registration and Stamps Department, Telangana', url: 'https://registration.telangana.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-WB', name: 'Directorate of Registration and Stamp Revenue, West Bengal', url: 'https://wbregistration.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-PB', name: 'Punjab Land Records Society (registration and land records)', url: 'https://plrs.org.in/', onNgdrs: true, confirmed: true },
  { state: 'IN-RJ', name: 'Inspector General of Registration and Stamps, Rajasthan', url: 'https://igrs.rajasthan.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-GJ', name: 'Revenue Department, Gujarat (Garvi)', url: 'https://garvi.gujarat.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-BR', name: 'Registration Department, Bihar (Nibandhan)', url: 'https://nibandhan.bihar.gov.in/', onNgdrs: true, confirmed: true },
  { state: 'IN-HR', name: 'Revenue Department, Haryana (Jamabandi)', url: 'https://jamabandi.nic.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-KL', name: 'Registration Department, Kerala', url: 'https://registration.kerala.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-MP', name: 'Madhya Pradesh Registration and Stamps Department (MPIGR/SAMPADA)', url: 'https://mpigr.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-AP', name: 'Registration and Stamps Department, Andhra Pradesh', url: 'https://registration.ap.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-HP', name: 'Government of Himachal Pradesh (Revenue Department)', url: 'https://himachal.nic.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-UK', name: 'Registration Department, Uttarakhand', url: 'https://registration.uk.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-CH', name: 'Chandigarh Administration (Estate Office)', url: 'https://chandigarh.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-SK', name: 'Government of Sikkim (Land Revenue and Disaster Management Department)', url: 'https://sikkim.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-TR', name: 'Government of Tripura (Revenue Department)', url: 'https://tripura.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-MN', name: 'Government of Manipur (Revenue Department)', url: 'https://manipur.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-ML', name: 'Government of Meghalaya (Revenue and Disaster Management Department)', url: 'https://meghalaya.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-MZ', name: 'Government of Mizoram (Land Revenue and Settlement Department)', url: 'https://mizoram.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-AR', name: 'Government of Arunachal Pradesh (Land Management Department)', url: 'https://arunachalpradesh.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-LA', name: 'UT Administration of Ladakh (Revenue Department)', url: 'https://ladakh.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-DH', name: 'UT Administration of Dadra and Nagar Haveli and Daman and Diu', url: 'https://ddd.gov.in/', onNgdrs: false, confirmed: true },
  { state: 'IN-NL', name: 'Government of Nagaland (Revenue Department)', url: 'https://nagaland.gov.in/', onNgdrs: false, confirmed: true },
  // Not confirmed reachable from this network at authoring time (2026-08-21) —
  // real, well-known government domains, held for a link check rather than
  // dropped or published on faith.
  { state: 'IN-AS', name: 'Revenue and Disaster Management Department, Assam', url: 'https://revenueassam.nic.in/', onNgdrs: false, confirmed: false },
  { state: 'IN-CT', name: 'Registration Department, Chhattisgarh', url: 'https://cgregistration.gov.in/', onNgdrs: false, confirmed: false },
  { state: 'IN-GA', name: 'Inspector General of Registration, Goa', url: 'https://igr.goa.gov.in/', onNgdrs: false, confirmed: false },
  { state: 'IN-JK', name: 'UT Administration of Jammu and Kashmir (Revenue Department)', url: 'https://jk.gov.in/', onNgdrs: false, confirmed: false },
  { state: 'IN-PY', name: 'Registration Department, Puducherry', url: 'https://reg.py.gov.in/', onNgdrs: false, confirmed: false },
  { state: 'IN-AN', name: 'UT Administration of Andaman and Nicobar Islands (Revenue Department)', url: 'https://andaman.gov.in/', onNgdrs: false, confirmed: false },
];

const REGISTRATION_RESOURCES: ResourceCatalogSeed[] = REGISTRATION_DEPARTMENTS.map((r) => ({
  slug: `registration-${r.state.toLowerCase().replace('in-', '')}`,
  title: `${r.name} — sale, gift and tenancy registration`,
  description:
    'Register a sale deed, gift deed or a tenancy agreement that requires registration, check the applicable stamp '
    + 'duty, and search the property’s registered documents for this state.',
  type: 'RESOURCE_LINK' as const,
  officialStatus: 'OFFICIAL' as const,
  category: 'RC_PROPERTY',
  subcategory: 'Sale & purchase',
  source: 'REGISTRATION',
  authority: r.name,
  url: r.url,
  docFormat: 'portal' as const,
  trustLevel: 1 as const,
  matter: 'P_SALE_DEED',
  panIndia: false,
  stateCode: r.state,
  confirmed: r.confirmed,
  // Deliberately does NOT include "rent agreement" — a portal for registering a
  // deed is not itself a rent agreement, and that phrase made this outrank the
  // actual "Residential rent agreement" template for the query "rent agreement
  // for Maharashtra", exactly the failure mode the relevance ranking exists to
  // prevent (see the comment on relevanceRank in repositories/resources.ts).
  keywords: ['sale deed registration', 'stamp duty', 'property registration', 'gift deed registration', 'tenancy registration', 'igr', 'sub registrar'],
  notes: [
    'Stamp duty and registration fees are set by this state and revised by notification — check the current rate here before you calculate what a transaction will cost.',
    r.onNgdrs
      ? 'This state runs on the shared National Generic Document Registration System (NGDRS), so the online flow follows the common NGDRS pattern.'
      : 'This state runs its own registration platform rather than the shared NGDRS system.',
    'A sale deed or a lease of a year or more is compulsorily registrable under section 17 of the Registration Act, 1908 — an unregistered one is not admissible to prove the transaction.',
  ],
}));

// ---------------------------------------------------------------------------
// State tenancy law. This is where the "generic national rent agreement" harm
// is actually prevented: a specific note per state, attached to the templates.
// ---------------------------------------------------------------------------

export interface TenancyRegimeSeed {
  stateCode: string;
  stateName: string;
  /** Name used in the resource title, e.g. 'Leave and licence'. */
  instrument: string;
  /** The distinctive thing a user must know before signing in this state. */
  headline: string;
  points: string[];
  /** Where the authoritative statement lives, when we have a confirmed URL. */
  sources: Array<{ label: string; url: string; publisher: string; confirmed: boolean }>;
}

/**
 * Deliberately conservative. Each note states the *category* of requirement and
 * tells the user to verify the current rule, because rates, periods and portals
 * change by notification and a library that hard-codes a number will be wrong
 * within a year. Stating "registration is compulsory here, check the current
 * fee" is useful and durable; stating a fee is neither.
 */
export const TENANCY_REGIMES: TenancyRegimeSeed[] = [
  {
    stateCode: 'IN-MH', stateName: 'Maharashtra', instrument: 'Leave and licence',
    headline: 'Registration of a leave and licence agreement is compulsory in Maharashtra, whatever its term.',
    points: [
      'Maharashtra rent law requires a leave and licence or tenancy agreement to be in writing and registered. The eleven-month device does not avoid registration here — it avoids it in states where registration turns only on the term.',
      'Registration is ordinarily the landlord’s responsibility, and it can be completed online through the state registration department’s e-registration facility.',
      'Stamp duty on a leave and licence is calculated on the rent and deposit for the term. Confirm the current rate with the Department of Registration and Stamps before executing.',
      'A registered agreement is what a police tenant-verification and a society NOC will normally be checked against.',
    ],
    sources: [
      { label: 'Maharashtra Real Estate Regulatory Authority', url: 'https://maharera.maharashtra.gov.in/', publisher: 'MahaRERA', confirmed: true },
    ],
  },
  {
    stateCode: 'IN-UP', stateName: 'Uttar Pradesh', instrument: 'Tenancy',
    headline: 'Uttar Pradesh has its own tenancy statute with a Rent Authority and a reporting requirement.',
    points: [
      'Uttar Pradesh enacted a dedicated urban tenancy law that requires a written tenancy agreement, and requires the tenancy to be registered with — or intimated to — a Rent Authority within a prescribed period after execution. An eleven-month term does not remove that requirement.',
      'The Rent Authority, not a civil court, is the first forum for many landlord and tenant disputes under that law, and there is an appellate route from it.',
      'Security deposit is capped by that statute for residential tenancies. Confirm the current cap before agreeing a figure.',
      'Older rent control legislation continues to govern some premises. Which law applies to your building is the first question, not the last.',
    ],
    sources: [],
  },
  {
    stateCode: 'IN-KA', stateName: 'Karnataka', instrument: 'Lease or rental agreement',
    headline: 'Karnataka requires registration of rental instruments beyond a short term; eleven months is the local convention for that reason.',
    points: [
      'A lease for a year or more requires registration under the Registration Act. Karnataka practice is an eleven-month agreement renewed by a fresh document.',
      'Stamp duty is fixed by the Karnataka stamp law on the rent and deposit; the sub-registrar for the property’s jurisdiction is the authority.',
      'Bengaluru landlords commonly take ten months’ deposit. Nothing compels a tenant to agree to it, and nothing in law fixes it.',
    ],
    sources: [
      { label: 'Karnataka RERA', url: 'https://rera.karnataka.gov.in/', publisher: 'K-RERA', confirmed: true },
    ],
  },
  {
    stateCode: 'IN-DL', stateName: 'Delhi', instrument: 'Rent agreement',
    headline: 'Delhi runs on the Delhi Rent Control Act for older premises, and on ordinary contract for most current tenancies.',
    points: [
      'The Delhi Rent Control Act applies to premises within its scope and restricts the grounds of eviction and the increase of rent. Whether it applies to your premises depends on the rent and the date, and it is the first thing to establish.',
      'A lease of a year or more must be registered. The eleven-month agreement on stamp paper is the near-universal practice.',
      'Delhi Police offers online tenant verification. A landlord who does not verify, and a tenant who refuses to be verified, are each taking an avoidable risk.',
      'Eviction of a tenant covered by the Rent Control Act is through the Rent Controller, not a civil suit.',
    ],
    sources: [
      { label: 'Delhi Police citizen services', url: 'https://police.gov.in/', publisher: 'Ministry of Home Affairs', confirmed: true },
    ],
  },
  {
    stateCode: 'IN-TN', stateName: 'Tamil Nadu', instrument: 'Tenancy',
    headline: 'Tamil Nadu requires every tenancy agreement to be registered with a Rent Authority through its own portal.',
    points: [
      'Tamil Nadu’s tenancy legislation requires a written agreement and its registration with the Rent Authority within a prescribed period. An unregistered tenancy limits what either party can enforce.',
      'The Rent Authority and the Rent Tribunal, not the civil court, hear disputes under that Act.',
      'The Act applies to residential and non-residential tenancies entered into after it came into force. Older tenancies may be governed by the earlier law.',
    ],
    sources: [],
  },
  {
    stateCode: 'IN-TG', stateName: 'Telangana', instrument: 'Rental agreement',
    headline: 'Telangana requires registration of rental agreements and has moved much of it online.',
    points: [
      'Registration of a rental instrument is required, and Telangana’s registration department accepts it electronically.',
      'Stamp duty is on the rent and advance for the term, at the rate the state prescribes.',
      'For a builder or project dispute the forum is Telangana RERA, not the registration department.',
    ],
    sources: [
      { label: 'Telangana RERA', url: 'https://rera.telangana.gov.in/', publisher: 'TG RERA', confirmed: true },
    ],
  },
  {
    stateCode: 'IN-HR', stateName: 'Haryana', instrument: 'Rent agreement',
    headline: 'Haryana applies its own rent legislation, and Gurugram tenancies are commonly on eleven-month agreements.',
    points: [
      'The Haryana Urban (Control of Rent and Eviction) Act governs premises within its scope, including the grounds on which a tenant may be evicted.',
      'A lease of a year or more requires registration. Stamp duty is fixed by the state.',
      'For a project or builder dispute in Gurugram or Faridabad, the forum is Haryana RERA — which maintains a separate bench for Gurugram.',
    ],
    sources: [
      { label: 'Haryana RERA', url: 'https://haryanarera.gov.in/', publisher: 'HARERA', confirmed: true },
    ],
  },
  {
    stateCode: 'IN-WB', stateName: 'West Bengal', instrument: 'Tenancy',
    headline: 'West Bengal has its own Premises Tenancy Act with a separate machinery for fixing fair rent and for eviction.',
    points: [
      'The West Bengal Premises Tenancy Act provides for fair rent and prescribes the grounds of eviction. Contractual terms cannot override it where it applies.',
      'A lease of a year or more requires registration.',
      'Deposit of rent with the Rent Controller is the statutory answer when a landlord refuses to accept rent — paying nothing is not.',
    ],
    sources: [],
  },
  {
    stateCode: 'IN-GJ', stateName: 'Gujarat', instrument: 'Rent agreement',
    headline: 'Gujarat rent legislation governs premises within its scope; registration follows the term.',
    points: [
      'The Gujarat rent legislation restricts eviction and rent increase for premises within its scope.',
      'A lease of a year or more requires registration; eleven-month agreements are the common practice.',
      'Stamp duty is fixed by the Gujarat stamp law on the rent and deposit.',
    ],
    sources: [],
  },
  {
    stateCode: 'IN-RJ', stateName: 'Rajasthan', instrument: 'Tenancy',
    headline: 'Rajasthan has a Rent Tribunal that hears tenancy disputes instead of the civil court.',
    points: [
      'Rajasthan’s rent legislation establishes a Rent Tribunal with jurisdiction over tenancy disputes, and an appellate tribunal above it.',
      'A lease of a year or more requires registration.',
      'For a builder dispute the forum is Rajasthan RERA.',
    ],
    sources: [
      { label: 'Rajasthan RERA', url: 'https://rera.rajasthan.gov.in/', publisher: 'RJ RERA', confirmed: true },
    ],
  },
  {
    stateCode: 'IN-MP', stateName: 'Madhya Pradesh', instrument: 'Rent agreement',
    headline: 'Madhya Pradesh applies its Accommodation Control Act to premises within its scope.',
    points: [
      'The Madhya Pradesh Accommodation Control Act restricts eviction and provides for the determination of standard rent.',
      'A lease of a year or more requires registration.',
      'Stamp duty is fixed by the state on the rent and deposit for the term.',
    ],
    sources: [],
  },
  {
    stateCode: 'IN-PB', stateName: 'Punjab', instrument: 'Rent agreement',
    headline: 'Punjab’s rent legislation distinguishes between rented land and rented building, and that distinction matters.',
    points: [
      'The Punjab Urban Rent Restriction Act governs premises within its scope and its provisions on eviction differ for land and for buildings.',
      'A lease of a year or more requires registration.',
      'Where the premises are outside the Act, the tenancy is governed by the contract and the Transfer of Property Act.',
    ],
    sources: [],
  },
];

export function tenancyRegime(stateCode: string): TenancyRegimeSeed | undefined {
  return TENANCY_REGIMES.find((t) => t.stateCode === stateCode);
}

export const CATALOG_STATES: ResourceCatalogSeed[] = [
  ...SLSA_RESOURCES, ...DISCOM_RESOURCES, ...SERC_RESOURCES, ...RERA_RESOURCES, ...REGISTRATION_RESOURCES,
];
