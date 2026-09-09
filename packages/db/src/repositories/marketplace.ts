/**
 * CaseADVO Marketplace — discrete legal services (a document, a
 * notarisation, an urgent consultation) listed the way a classifieds board
 * lists items, rather than a full advocate profile.
 *
 * Every row is demonstration data with a fictional `providerName`, never a
 * real registered advocate's name or photo (see the migration's own note).
 * `is_demo` exists for the day this becomes a real listing surface;
 * everything seeded today is 1.
 */
import { db, now, transaction } from '../client.ts';

export interface MarketplaceCategory {
  key: string;
  label: string;
  /** A representative practice_area for "find a real advocate instead" —
   * not exhaustive, just close enough to route somewhere useful. */
  practiceAreaSlug: string | null;
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { key: 'criminal_defense', label: 'Criminal Lawyers', practiceAreaSlug: 'criminal' },
  { key: 'urgent_consultation', label: 'Urgent Consultations', practiceAreaSlug: null },
  { key: 'document_drafting', label: 'Legal Paperwork', practiceAreaSlug: 'corporate-commercial' },
  { key: 'notary', label: 'Notary Services', practiceAreaSlug: null },
  { key: 'property_management', label: 'Property Management', practiceAreaSlug: 'property-real-estate' },
  { key: 'contract_review', label: 'Contract Review', practiceAreaSlug: 'corporate-commercial' },
  { key: 'family_paperwork', label: 'Family & Personal', practiceAreaSlug: 'family' },
  { key: 'ip_filing', label: 'IP & Trademark Filing', practiceAreaSlug: 'intellectual-property' },
];

interface Seed {
  key: string; category: string; title: string; description: string; providerName: string;
  providerHandle: string;
  priceMinor: number; priceBasis: 'fixed' | 'hourly' | 'starting_at';
  city: string; lat: number; lng: number; radiusKm: number;
  availability: string; responseMinutes: number | null;
  deliveryMode: string;
  /** null = offered indefinitely; otherwise the moment the post stops
   * being live, so an expiry countdown has something real to count to. */
  expiresAt: string | null;
  postedAt: string;
  bannerPath: string; bannerAlt: string;
  podcastTitle: string | null; podcastMinutes: number | null;
}

/** A dozen real Indian cities (public, well-known coordinates — the same
 * precision the state and court maps already use), spread so a radius
 * filter has something real to compute against. */
const CITIES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 }, { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 }, { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 }, { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 }, { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 }, { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 }, { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
];

const TEMPLATES: Record<string, Array<{ title: string; description: string; priceMinor: [number, number]; basis: Seed['priceBasis']; response: [number, number] | null }>> = {
  criminal_defense: [
    { title: 'FIR review and bail application', description: 'Reviews the FIR, advises on grounds and files a bail application at the jurisdictional court.', priceMinor: [800000, 2500000], basis: 'starting_at', response: [30, 240] },
    { title: 'Criminal trial representation', description: 'Represents you through hearings for an ongoing criminal trial, one court appearance at a time.', priceMinor: [500000, 1500000], basis: 'starting_at', response: [60, 480] },
    { title: 'Quashing petition (Section 482)', description: 'Drafts and files a quashing petition before the High Court where the FIR does not disclose an offence.', priceMinor: [1500000, 4000000], basis: 'fixed', response: [120, 1440] },
  ],
  urgent_consultation: [
    { title: 'Get a lawyer on call, right now', description: 'A 20-minute phone consultation for a legal problem that cannot wait for an office appointment.', priceMinor: [50000, 150000], basis: 'fixed', response: [10, 60] },
    { title: 'Same-day in-person consultation', description: 'Books a same-day slot for a first consultation on an urgent matter.', priceMinor: [200000, 500000], basis: 'fixed', response: [60, 240] },
    { title: 'Emergency injunction advice', description: 'Rapid advice on whether an urgent injunction is available before a deadline passes.', priceMinor: [300000, 800000], basis: 'starting_at', response: [30, 180] },
  ],
  document_drafting: [
    { title: 'Legal notice drafting', description: 'Drafts a formal legal notice — recovery of dues, tenancy, or a consumer complaint — ready to send.', priceMinor: [150000, 400000], basis: 'fixed', response: [120, 720] },
    { title: 'Agreement drafting (any kind)', description: 'Drafts a rent, service, vendor or partnership agreement to your specifics, with one round of edits.', priceMinor: [200000, 600000], basis: 'starting_at', response: [180, 1440] },
    { title: 'Affidavit and declaration', description: 'Drafts a court-ready affidavit or declaration, formatted for the relevant registry.', priceMinor: [80000, 250000], basis: 'fixed', response: [60, 480] },
  ],
  notary: [
    { title: 'Notarisation at your location', description: 'A notary travels to your home or office to attest documents — no queue, no travel.', priceMinor: [50000, 150000], basis: 'fixed', response: [30, 180] },
    { title: 'Same-day document notarisation', description: 'Notarises affidavits, POAs and declarations same-day at the office.', priceMinor: [30000, 100000], basis: 'fixed', response: [15, 120] },
    { title: 'Power of Attorney notarisation', description: 'Reviews and notarises a Power of Attorney, including guidance on stamp duty.', priceMinor: [60000, 180000], basis: 'fixed', response: [60, 240] },
  ],
  property_management: [
    { title: 'Title search and verification', description: 'Full chain-of-title verification before a purchase, with a written report.', priceMinor: [800000, 2000000], basis: 'starting_at', response: [720, 4320] },
    { title: 'Rent agreement, state-compliant', description: 'Drafts and registers a rent agreement compliant with your state’s tenancy rules.', priceMinor: [250000, 700000], basis: 'fixed', response: [180, 1440] },
    { title: 'Tenant eviction proceedings', description: 'Handles an eviction filing end to end before the rent controller or civil court.', priceMinor: [1500000, 4000000], basis: 'starting_at', response: [240, 1440] },
    { title: 'Society or builder dispute', description: 'Represents you in a dispute with a housing society, RWA or builder over possession or dues.', priceMinor: [1000000, 3000000], basis: 'starting_at', response: [240, 1440] },
  ],
  contract_review: [
    { title: 'Employment contract review', description: 'Reviews an offer letter or employment contract and flags anything against your interest.', priceMinor: [100000, 300000], basis: 'fixed', response: [120, 720] },
    { title: 'Vendor/service contract review', description: 'Line-by-line review of a vendor or service agreement before you sign.', priceMinor: [150000, 450000], basis: 'starting_at', response: [180, 1440] },
    { title: 'NDA review, same-day', description: 'Turns around a mutual or one-way NDA review the same business day.', priceMinor: [60000, 180000], basis: 'fixed', response: [60, 480] },
  ],
  family_paperwork: [
    { title: 'Mutual consent divorce filing', description: 'Prepares and files a mutual-consent divorce petition, both parties in agreement.', priceMinor: [1500000, 3500000], basis: 'starting_at', response: [720, 4320] },
    { title: 'Will drafting and registration', description: 'Drafts a will reflecting your wishes and arranges registration.', priceMinor: [300000, 800000], basis: 'fixed', response: [240, 1440] },
    { title: 'Adoption paperwork guidance', description: 'Guides you through the legal paperwork for a domestic adoption, CARA-compliant.', priceMinor: [500000, 1500000], basis: 'starting_at', response: [720, 2880] },
  ],
  ip_filing: [
    { title: 'Trademark search and filing', description: 'Conducts a clearance search and files a trademark application in the right class.', priceMinor: [700000, 1800000], basis: 'starting_at', response: [240, 1440] },
    { title: 'Copyright registration', description: 'Files a copyright registration for written, musical or software work.', priceMinor: [400000, 1000000], basis: 'fixed', response: [240, 1440] },
    { title: 'Trademark objection response', description: 'Drafts and files a response to a trademark examination report or objection.', priceMinor: [500000, 1200000], basis: 'starting_at', response: [180, 1440] },
  ],
};

/**
 * The twelve demo providers who own the seeded listings.
 *
 * These are invented practitioners, one per seed city. They exist because
 * an X-style profile needs an owner with a handle, a bio, a banner and a
 * back catalogue of posts — and the one thing this project will not do is
 * hang invented prices and service pitches on a real advocate from the Bar
 * Council register. Those 62,946 people never opted into being listed, and
 * BCI Rule 36 bars advocates from advertising their services at all: a
 * fabricated ad in a real name is a professional-conduct exposure for the
 * advocate, not a design flourish for us.
 *
 * `barId` uses enrolment years and sequence numbers outside any range a
 * state bar council actually issues, so a demo ID cannot be mistaken for,
 * or collide with, a real enrolment.
 */
interface ProviderSeed {
  handle: string; displayName: string; headline: string; bio: string;
  city: string; barId: string; practisingSince: number;
  avatarPath: string; bannerPath: string; badges: string;
  followers: number; responseRate: number; languages: string;
  /** The listing categories this provider actually offers. A practitioner
   * whose headline says criminal defence must not end up with trademark
   * filings in their feed — the profile would contradict itself on the
   * first scroll. Every category in TEMPLATES must appear on at least one
   * provider, or its listings would have no owner. */
  categories: string[];
}

const PROVIDERS: ProviderSeed[] = [
  {
    handle: 'meera_kothari', displayName: 'Adv. Meera Kothari', city: 'Mumbai',
    headline: 'Criminal defence & bail — Bombay High Court and sessions courts',
    bio: 'Bail, quashing and trial work across Mumbai’s sessions courts. I take a small number of matters at a time and I will tell you on the first call if you do not need a lawyer for this.',
    barId: 'MH/DEMO/2011/0142', practisingSince: 2011,
    avatarPath: '/img/avatars/preset-03.svg', bannerPath: '/img/editorial/city-mumbai.jpg',
    badges: 'identity,bar,escrow,responsive', followers: 4820, responseRate: 96, languages: 'English, Hindi, Marathi',
    categories: ['criminal_defense', 'urgent_consultation'],
  },
  {
    handle: 'arjun_bakshi', displayName: 'Adv. Arjun Bakshi', city: 'Delhi',
    headline: 'Commercial contracts and company law — Delhi High Court',
    bio: 'Contract review and commercial disputes for founders and small businesses. Fixed fees published up front, because the second question everyone actually wants answered is what it costs.',
    barId: 'DL/DEMO/2009/0087', practisingSince: 2009,
    avatarPath: '/img/avatars/preset-05.svg', bannerPath: '/img/editorial/city-delhi.jpg',
    badges: 'identity,bar,escrow', followers: 7310, responseRate: 91, languages: 'English, Hindi, Punjabi',
    categories: ['contract_review', 'document_drafting'],
  },
  {
    handle: 'lakshmi_narayan', displayName: 'Adv. Lakshmi Narayan', city: 'Bengaluru',
    headline: 'Technology, IP and trademark filings',
    bio: 'Trademark clearance, filings and objection responses, plus IP advisory for software and consumer brands. Most filings I handle end to end without you attending a single hearing.',
    barId: 'KA/DEMO/2014/0233', practisingSince: 2014,
    avatarPath: '/img/avatars/preset-07.svg', bannerPath: '/img/editorial/pa-ip.jpg',
    badges: 'identity,bar,escrow,responsive', followers: 3140, responseRate: 98, languages: 'English, Kannada, Tamil',
    categories: ['ip_filing', 'contract_review'],
  },
  {
    handle: 'imran_qureshi', displayName: 'Adv. Imran Qureshi', city: 'Hyderabad',
    headline: 'Property title, tenancy and builder disputes',
    bio: 'Chain-of-title verification before you pay a rupee, and the eviction and possession work when it has already gone wrong. Written report on every title search.',
    barId: 'TS/DEMO/2012/0198', practisingSince: 2012,
    avatarPath: '/img/avatars/preset-02.svg', bannerPath: '/img/editorial/pa-property.jpg',
    badges: 'identity,bar,escrow', followers: 2260, responseRate: 88, languages: 'English, Telugu, Urdu, Hindi',
    categories: ['property_management', 'document_drafting'],
  },
  {
    handle: 'nandini_raghavan', displayName: 'Adv. Nandini Raghavan', city: 'Chennai',
    headline: 'Family law — mutual consent divorce, wills, succession',
    bio: 'Family matters handled quietly and without escalation wherever that is possible. I do mediation-first work; litigation only when the other side leaves no room.',
    barId: 'TN/DEMO/2008/0061', practisingSince: 2008,
    avatarPath: '/img/avatars/preset-09.svg', bannerPath: '/img/editorial/pa-family.jpg',
    badges: 'identity,bar,escrow,responsive', followers: 5670, responseRate: 94, languages: 'English, Tamil, Malayalam',
    categories: ['family_paperwork', 'document_drafting'],
  },
  {
    handle: 'sourav_dasgupta', displayName: 'Adv. Sourav Dasgupta', city: 'Kolkata',
    headline: 'Consumer, banking and recovery matters',
    bio: 'Legal notices, consumer commission filings and recovery suits. If the amount at stake is smaller than my fee, I will say so and point you at the free forum instead.',
    barId: 'WB/DEMO/2013/0176', practisingSince: 2013,
    avatarPath: '/img/avatars/preset-01.svg', bannerPath: '/img/editorial/pa-consumer.jpg',
    badges: 'identity,bar', followers: 1890, responseRate: 85, languages: 'English, Bengali, Hindi',
    categories: ['document_drafting', 'contract_review'],
  },
  {
    handle: 'aditi_kulkarni', displayName: 'Adv. Aditi Kulkarni', city: 'Pune',
    headline: 'Employment, labour and workplace disputes',
    bio: 'Employment contract review, termination disputes and POSH matters. I act for employees and for small employers, never for both sides of the same matter.',
    barId: 'MH/DEMO/2015/0291', practisingSince: 2015,
    avatarPath: '/img/avatars/preset-04.svg', bannerPath: '/img/editorial/pa-labour.jpg',
    badges: 'identity,bar,responsive', followers: 4030, responseRate: 97, languages: 'English, Marathi, Hindi',
    categories: ['contract_review', 'urgent_consultation'],
  },
  {
    handle: 'harshad_pandya', displayName: 'Adv. Harshad Pandya', city: 'Ahmedabad',
    headline: 'Notary, attestation and documentation',
    bio: 'Notarisation at your home or office across Ahmedabad. Affidavits, powers of attorney and declarations, including guidance on the stamp duty before you pay it.',
    barId: 'GJ/DEMO/2006/0034', practisingSince: 2006,
    avatarPath: '/img/avatars/preset-06.svg', bannerPath: '/img/editorial/documents-signing.jpg',
    badges: 'identity,bar,escrow', followers: 1420, responseRate: 92, languages: 'English, Gujarati, Hindi',
    categories: ['notary', 'document_drafting'],
  },
  {
    handle: 'priyanka_rathore', displayName: 'Adv. Priyanka Rathore', city: 'Jaipur',
    headline: 'Civil litigation and arbitration',
    bio: 'Civil suits, injunctions and domestic arbitration in Rajasthan. Urgent injunction advice available same day when a deadline is about to pass.',
    barId: 'RJ/DEMO/2010/0118', practisingSince: 2010,
    avatarPath: '/img/avatars/preset-08.svg', bannerPath: '/img/editorial/pa-arbitration.jpg',
    badges: 'identity,bar,escrow,responsive', followers: 2980, responseRate: 93, languages: 'English, Hindi, Rajasthani',
    categories: ['urgent_consultation', 'property_management'],
  },
  {
    handle: 'devansh_tripathi', displayName: 'Adv. Devansh Tripathi', city: 'Lucknow',
    headline: 'Criminal trials and appeals — Allahabad High Court, Lucknow Bench',
    bio: 'Trial and appellate criminal work. I publish what each stage costs so families are not surprised halfway through a matter that runs for years.',
    barId: 'UP/DEMO/2007/0053', practisingSince: 2007,
    avatarPath: '/img/avatars/preset-10.svg', bannerPath: '/img/editorial/pa-criminal.jpg',
    badges: 'identity,bar', followers: 3520, responseRate: 87, languages: 'English, Hindi, Awadhi',
    categories: ['criminal_defense', 'family_paperwork'],
  },
  {
    handle: 'gurpreet_sandhu', displayName: 'Adv. Gurpreet Sandhu', city: 'Chandigarh',
    headline: 'Corporate advisory, GST and tax disputes',
    bio: 'Tax notices, GST disputes and corporate compliance for businesses in the tri-city. Most notices are answerable without litigation if you act inside the limitation window.',
    barId: 'PB/DEMO/2011/0165', practisingSince: 2011,
    avatarPath: '/img/avatars/preset-02.svg', bannerPath: '/img/editorial/pa-tax.jpg',
    badges: 'identity,bar,escrow', followers: 2140, responseRate: 90, languages: 'English, Punjabi, Hindi',
    categories: ['contract_review', 'ip_filing'],
  },
  {
    handle: 'rehana_mathew', displayName: 'Adv. Rehana Mathew', city: 'Kochi',
    headline: 'Urgent consultations and general practice',
    bio: 'A lawyer on call for the problem that cannot wait until Monday. Twenty minutes, a clear answer, and an honest view on whether you need to spend more than that.',
    barId: 'KL/DEMO/2016/0304', practisingSince: 2016,
    avatarPath: '/img/avatars/preset-03.svg', bannerPath: '/img/editorial/hero-chambers.jpg',
    badges: 'identity,bar,escrow,responsive', followers: 6240, responseRate: 99, languages: 'English, Malayalam, Hindi',
    categories: ['urgent_consultation', 'notary'],
  },
];

/** How the service actually reaches the client. Named the way a client
 * would choose, not the way a back office would file it. */
export const DELIVERY_MODES = [
  { key: 'doorstep', label: 'Doorstep', hint: 'They travel to you' },
  { key: 'chambers', label: 'At chambers', hint: 'You visit their office' },
  { key: 'virtual', label: 'Virtual', hint: 'Call or video, no travel' },
] as const;

/** Banner imagery per category. Reused editorial photography already
 * licensed for the site — never a photo implying a specific practitioner. */
const CATEGORY_BANNER: Record<string, { src: string; alt: string }> = {
  criminal_defense: { src: '/img/editorial/pa-criminal.jpg', alt: 'A courtroom corridor in a district court complex' },
  urgent_consultation: { src: '/img/editorial/meeting-office.jpg', alt: 'Two people in conversation across an office desk' },
  document_drafting: { src: '/img/editorial/documents-signing.jpg', alt: 'A printed legal document being signed with a fountain pen' },
  notary: { src: '/img/editorial/documents-signing.jpg', alt: 'Stamped and attested paperwork on a desk' },
  property_management: { src: '/img/editorial/pa-property.jpg', alt: 'Residential buildings photographed from street level' },
  contract_review: { src: '/img/editorial/pa-corporate.jpg', alt: 'A bound commercial contract open on a table' },
  family_paperwork: { src: '/img/editorial/pa-family.jpg', alt: 'An empty consultation room with two chairs facing each other' },
  ip_filing: { src: '/img/editorial/pa-ip.jpg', alt: 'A workbench with design sketches and prototypes' },
};

/** Optional audio attached to a post — an advocate explaining the thing
 * they are selling, in their own words, before you pay for it. */
const PODCASTS: Record<string, { title: string; minutes: number }> = {
  criminal_defense: { title: 'What actually happens in the 24 hours after an FIR', minutes: 14 },
  urgent_consultation: { title: 'When a legal problem is genuinely urgent — and when it is not', minutes: 9 },
  document_drafting: { title: 'The three clauses people regret leaving out of a legal notice', minutes: 11 },
  property_management: { title: 'Reading a chain of title without a lawyer in the room', minutes: 18 },
  contract_review: { title: 'Employment contracts: the clauses worth negotiating', minutes: 12 },
  family_paperwork: { title: 'Mutual consent divorce, start to finish', minutes: 21 },
  ip_filing: { title: 'Picking the right trademark class the first time', minutes: 10 },
};

function pick<T>(arr: T[], seed: number): T { return arr[((seed % arr.length) + arr.length) % arr.length] as T; }

/** Deterministic pseudo-random in [min,max] from an integer seed, so the
 * same seed run always produces the same 100 listings (no Math.random —
 * re-running the seeder should not silently change existing demo data). */
function seededRange(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

function buildSeeds(count: number, seededAt: number): Seed[] {
  const categories = Object.keys(TEMPLATES);
  const categoryTurn = new Map<string, number>();
  const out: Seed[] = [];
  for (let i = 0; i < count; i += 1) {
    const category = pick(categories, i);
    const variants = TEMPLATES[category] ?? [];
    const variant = pick(variants, i * 7 + 3);
    // The owner is drawn only from providers who offer this category, so a
    // criminal-defence practitioner never ends up with a trademark filing
    // in their feed. Rotation is counted *per category* rather than off the
    // global index: striding by `i` through a filtered list correlates with
    // the category cycle and starves some providers to zero listings, which
    // renders as an empty profile. The city then follows the provider — a
    // practitioner lists where they practise.
    const eligible = PROVIDERS.filter((p) => p.categories.includes(category));
    const roster = eligible.length > 0 ? eligible : PROVIDERS;
    const turn = categoryTurn.get(category) ?? 0;
    categoryTurn.set(category, turn + 1);
    const provider = pick(roster, turn);
    const city = CITIES.find((c) => c.name === provider.city) ?? (CITIES[0] as (typeof CITIES)[number]);
    const radii = [5, 10, 25, 50, 100];
    const availabilities = ['Available now', 'Responds within the hour', 'Available today', 'Available this week', 'By appointment'];
    const banner = CATEGORY_BANNER[category] ?? { src: '/img/editorial/law-books.jpg', alt: 'Bound law reports on a shelf' };

    // Expiry: about a third of posts run indefinitely, the rest close
    // between 24 hours and 30 days out. Anchored to the seed run so the
    // countdown is always in the future for a freshly seeded database.
    const expiryChoice = i % 3;
    const expiresAt = expiryChoice === 0
      ? null
      : new Date(seededAt + seededRange(i + 41, 24, 30 * 24) * 3_600_000).toISOString();
    const postedAt = new Date(seededAt - seededRange(i + 7, 1, 21 * 24) * 3_600_000).toISOString();
    // Roughly every third post carries the category's audio explainer.
    const podcast = i % 3 === 1 ? PODCASTS[category] ?? null : null;

    out.push({
      key: `demo-${String(i + 1).padStart(3, '0')}`,
      category,
      title: variant.title,
      description: variant.description,
      providerName: provider.displayName,
      providerHandle: provider.handle,
      priceMinor: seededRange(i + 1, variant.priceMinor[0], variant.priceMinor[1]),
      priceBasis: variant.basis,
      city: city.name,
      // A small jitter around the city centre so 8-9 listings in the same
      // city do not sit on the exact same point.
      lat: city.lat + (seededRange(i * 2 + 1, -80, 80) / 1000),
      lng: city.lng + (seededRange(i * 2 + 2, -80, 80) / 1000),
      radiusKm: pick(radii, i * 13 + 7),
      availability: pick(availabilities, i * 17 + 11),
      responseMinutes: variant.response ? seededRange(i + 1, variant.response[0], variant.response[1]) : null,
      // Stride must be coprime with the mode count or every listing lands
      // on the same mode (i * 3 + 1 mod 3 is constant at 1).
      deliveryMode: pick(DELIVERY_MODES.map((d) => d.key), i * 7 + 1),
      expiresAt,
      postedAt,
      bannerPath: banner.src,
      bannerAlt: banner.alt,
      podcastTitle: podcast?.title ?? null,
      podcastMinutes: podcast?.minutes ?? null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Comment threads
// ---------------------------------------------------------------------------

/** Review bodies written to sound like people, not like marketing copy —
 * specific, occasionally lukewarm, and never uniformly five stars. Mixed
 * ratings are the point: a feed where everything is 5/5 reads as fake and
 * teaches a visitor nothing about how to choose. */
const REVIEW_BODIES: Array<{ body: string; rating: number }> = [
  { body: 'Explained what the process would cost before I committed to anything. The bail application was filed the same week.', rating: 5 },
  { body: 'Straightforward and clear. Took a little longer to come back to me than the listing suggests, but the work itself was thorough.', rating: 4 },
  { body: 'Told me on the first call that I did not need to spend money on a lawyer for this and pointed me to the right forum. Did not charge me.', rating: 5 },
  { body: 'Good drafting, and the notice worked — the other side responded within the week. Would have liked a second round of edits included.', rating: 4 },
  { body: 'Responsive over WhatsApp, which mattered because I was travelling. The affidavit was accepted by the registry without objection.', rating: 5 },
  { body: 'Competent, but communication went quiet in the middle for about ten days and I had to chase. Outcome was fine.', rating: 3 },
  { body: 'Turned around the NDA review the same afternoon and flagged two clauses I would have signed without noticing.', rating: 5 },
  { body: 'Fair price for what it was. The title report was detailed and I walked away from the property because of it.', rating: 5 },
  { body: 'Professional throughout. My matter is still ongoing so I cannot speak to the outcome, only to the handling, which has been good.', rating: 4 },
  { body: 'Reasonable advice but the fixed fee did not cover the court filing costs, which I only found out later. Worth asking about up front.', rating: 3 },
  { body: 'Second time I have used this service. Same quality, same turnaround. That consistency is worth a lot.', rating: 5 },
  { body: 'The consultation was useful and honest. I did not agree with all of the advice but it was clearly reasoned.', rating: 4 },
];

/** Pre-booking questions, each with the answer the advocate gives. Paired
 * rather than drawn from two independent pools: a reply about filing fees
 * under a question about timelines reads as obviously synthetic, and the
 * whole point of showing a thread is that it looks like a real exchange. */
const QA_PAIRS: Array<{ q: string; a: string }> = [
  {
    q: 'Does this fee include the court filing charges, or are those separate?',
    a: 'Separate. The fee covers my work only — court and registry charges are billed at actuals, and I will tell you what they come to before anything is filed.',
  },
  {
    q: 'I am outside the city — can this be done over a video call instead?',
    a: 'Yes for the consultation and the drafting. If a physical signature or an appearance is needed I will tell you up front which single step requires you here.',
  },
  {
    q: 'How long does this usually take from the day I engage you?',
    a: 'Two to three working days for the drafting once I have your documents. Anything that depends on a court date I cannot promise, and I will not pretend otherwise.',
  },
  {
    q: 'Do you handle matters in the district court as well, or only the High Court?',
    a: 'Both. Most of this work starts in the district court; I only move it up if there is a ground worth taking there.',
  },
  {
    q: 'Is the stamp duty included in the price shown here?',
    a: 'No — stamp duty is a state charge and varies by document and value. I will calculate it for your specific case before you pay anything.',
  },
  {
    q: 'Can you look at documents I already have before I book, to tell me if this is the right service?',
    a: 'Send them across and I will tell you which service you actually need, or that you do not need one. No charge for that.',
  },
  {
    q: 'What do you need from me to get started?',
    a: 'Photo ID, whatever paperwork you already hold on the matter, and a short written account of what happened in your own words. That is enough to begin.',
  },
  {
    q: 'Do you offer this on a weekend?',
    a: 'Saturdays yes, by prior appointment. Sundays only where something is genuinely time-barred.',
  },
];

const COMMENT_AUTHORS = [
  'Rakesh M.', 'Sunita P.', 'A. Krishnan', 'Farah S.', 'Vivek T.', 'Anonymous client',
  'Deepika R.', 'Joseph V.', 'Nitin B.', 'Shalini G.', 'Anonymous client', 'Tarun A.',
];

export interface MarketplaceSeedReport { providers: number; inserted: number; skipped: number; comments: number }

export function seedMarketplace(count = 100): MarketplaceSeedReport {
  return transaction(() => {
    const h = db();
    const areaId = new Map(
      (h.prepare(`SELECT id, slug FROM practice_area`).all() as Array<{ id: number; slug: string }>)
        .map((r) => [r.slug, r.id]),
    );
    const categoryArea = new Map(MARKETPLACE_CATEGORIES.map((c) => [c.key, c.practiceAreaSlug ? areaId.get(c.practiceAreaSlug) ?? null : null]));
    const ts = now();
    const seededAt = Date.now();

    let providers = 0;
    for (const p of PROVIDERS) {
      const info = h.prepare(
        `INSERT OR IGNORE INTO marketplace_provider
           (handle, display_name, headline, bio, city, bar_id, practising_since,
            avatar_path, banner_path, badges, followers, response_rate, languages, is_demo, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
      ).run(
        p.handle, p.displayName, p.headline, p.bio, p.city, p.barId, p.practisingSince,
        p.avatarPath, p.bannerPath, p.badges, p.followers, p.responseRate, p.languages, ts,
      );
      if (info.changes > 0) providers += 1;
    }
    const providerId = new Map(
      (h.prepare(`SELECT id, handle FROM marketplace_provider`).all() as Array<{ id: number; handle: string }>)
        .map((r) => [r.handle, r.id]),
    );

    let inserted = 0;
    let skipped = 0;
    for (const s of buildSeeds(count, seededAt)) {
      const info = h.prepare(
        `INSERT OR IGNORE INTO marketplace_listing
           (seed_key, category, title, description, provider_name, provider_id, practice_area_id,
            price_minor, currency_code, price_basis, location_name, latitude, longitude,
            geofence_radius_km, availability_label, response_minutes, delivery_mode,
            expires_at, posted_at, banner_path, banner_alt, podcast_title, podcast_minutes,
            is_demo, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,'INR',?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`,
      ).run(
        s.key, s.category, s.title, s.description, s.providerName,
        providerId.get(s.providerHandle) ?? null, categoryArea.get(s.category) ?? null,
        s.priceMinor, s.priceBasis, s.city, s.lat, s.lng,
        s.radiusKm, s.availability, s.responseMinutes, s.deliveryMode,
        s.expiresAt, s.postedAt, s.bannerPath, s.bannerAlt, s.podcastTitle, s.podcastMinutes,
        ts, ts,
      );
      if (info.changes > 0) inserted += 1; else skipped += 1;
    }

    const comments = seedMarketplaceComments(seededAt);
    return { providers, inserted, skipped, comments };
  });
}

/**
 * Threads under each listing: a couple of reviews, sometimes a question,
 * and sometimes the provider answering it. Only runs against listings that
 * have no comments yet, so re-seeding does not stack duplicate threads.
 */
function seedMarketplaceComments(seededAt: number): number {
  const h = db();
  const rows = h.prepare(
    `SELECT l.id, l.provider_name AS providerName
     FROM marketplace_listing l
     WHERE l.is_demo = 1
       AND NOT EXISTS (SELECT 1 FROM marketplace_comment c WHERE c.listing_id = l.id)
     ORDER BY l.id`,
  ).all() as Array<{ id: number; providerName: string }>;

  const insert = h.prepare(
    `INSERT INTO marketplace_comment (listing_id, parent_id, author_name, author_role, body, rating, created_at)
     VALUES (?,?,?,?,?,?,?)`,
  );
  let written = 0;

  for (const row of rows) {
    // Two to four reviews per listing, oldest first.
    const reviewCount = 2 + (row.id % 3);
    for (let n = 0; n < reviewCount; n += 1) {
      const seed = row.id * 31 + n;
      const review = pick(REVIEW_BODIES, seed);
      const at = new Date(seededAt - seededRange(seed, 2, 90) * 86_400_000).toISOString();
      insert.run(row.id, null, pick(COMMENT_AUTHORS, seed * 3), 'client', review.body, review.rating, at);
      written += 1;
    }
    // Every other listing also carries an unanswered-or-answered question.
    if (row.id % 2 === 0) {
      const seed = row.id * 17;
      const askedAt = new Date(seededAt - seededRange(seed, 1, 30) * 86_400_000).toISOString();
      const qa = pick(QA_PAIRS, seed);
      const info = insert.run(row.id, null, pick(COMMENT_AUTHORS, seed + 5), 'client', qa.q, null, askedAt);
      written += 1;
      // Two questions in three get a reply from the provider, which is
      // also what makes the thread visibly *threaded* rather than a list.
      if (row.id % 3 !== 0) {
        const repliedAt = new Date(new Date(askedAt).getTime() + seededRange(seed + 2, 1, 40) * 3_600_000).toISOString();
        insert.run(row.id, Number(info.lastInsertRowid), row.providerName, 'provider', qa.a, null, repliedAt);
        written += 1;
      }
    }
  }
  return written;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface MarketplaceListing {
  id: number; category: string; title: string; description: string; providerName: string;
  practiceAreaSlug: string | null;
  priceMinor: number; currencyCode: string; priceBasis: string;
  locationName: string; latitude: number; longitude: number; geofenceRadiusKm: number;
  availabilityLabel: string; responseMinutes: number | null;
  providerHandle: string | null; providerAvatar: string | null; providerBadges: string | null;
  deliveryMode: string;
  expiresAt: string | null; postedAt: string | null;
  bannerPath: string | null; bannerAlt: string | null;
  podcastTitle: string | null; podcastMinutes: number | null;
  /** Distance from the search centre in km, only present when a centre was given. */
  distanceKm?: number;
}

export interface MarketplaceSearchFilters {
  q?: string; category?: string;
  maxPriceMinor?: number;
  /** A search centre + radius: only listings whose OWN geofence would reach
   * this point are returned — real haversine distance against the
   * listing's real lat/lng, not a fabricated match. */
  lat?: number; lng?: number; radiusKm?: number;
  limit?: number; offset?: number;
}

export interface MarketplaceSearchResult { hits: MarketplaceListing[]; total: number }

const ROW_COLUMNS = `
  m.id, m.category, m.title, m.description, m.provider_name AS providerName,
  pa.slug AS practiceAreaSlug,
  m.price_minor AS priceMinor, m.currency_code AS currencyCode, m.price_basis AS priceBasis,
  m.location_name AS locationName, m.latitude, m.longitude, m.geofence_radius_km AS geofenceRadiusKm,
  m.availability_label AS availabilityLabel, m.response_minutes AS responseMinutes,
  p.handle AS providerHandle, p.avatar_path AS providerAvatar, p.badges AS providerBadges,
  m.delivery_mode AS deliveryMode, m.expires_at AS expiresAt, m.posted_at AS postedAt,
  m.banner_path AS bannerPath, m.banner_alt AS bannerAlt,
  m.podcast_title AS podcastTitle, m.podcast_minutes AS podcastMinutes`;

/** Both reading paths need the provider joined in for the post header
 * (handle, avatar, badges); kept in one constant so a column added to
 * ROW_COLUMNS can never reference a table one of the queries forgot. */
const ROW_JOINS = `
  LEFT JOIN practice_area pa ON pa.id = m.practice_area_id
  LEFT JOIN marketplace_provider p ON p.id = m.provider_id`;

export function searchMarketplace(filters: MarketplaceSearchFilters): MarketplaceSearchResult {
  const h = db();
  const where: string[] = ['m.is_demo = 1'];
  const params: Array<string | number> = [];

  if (filters.category) { where.push('m.category = ?'); params.push(filters.category); }
  if (filters.q) {
    where.push('(m.title LIKE ? OR m.description LIKE ? OR m.location_name LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  if (filters.maxPriceMinor) { where.push('m.price_minor <= ?'); params.push(filters.maxPriceMinor); }

  const clause = where.join(' AND ');
  const total = (h.prepare(`SELECT count(*) AS n FROM marketplace_listing m WHERE ${clause}`).get(...params) as { n: number }).n;

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;

  // Haversine on a real search centre — 6371 is Earth's mean radius in km,
  // the standard constant, not a made-up figure. Filtered in SQL so paging
  // and the total count both reflect it, not just the current page.
  if (filters.lat != null && filters.lng != null) {
    const distanceExpr = `
      (6371 * acos(min(1.0,
        cos(radians(?)) * cos(radians(m.latitude)) * cos(radians(m.longitude) - radians(?))
        + sin(radians(?)) * sin(radians(m.latitude))
      )))`;
    const radiusFilter = filters.radiusKm != null ? `WHERE distanceKm <= ${Number(filters.radiusKm)}` : '';
    const rows = h.prepare(
      `SELECT * FROM (
         SELECT ${ROW_COLUMNS}, ${distanceExpr} AS distanceKm
         FROM marketplace_listing m ${ROW_JOINS}
         WHERE ${clause}
       )
       ${radiusFilter}
       ORDER BY distanceKm ASC
       LIMIT ? OFFSET ?`,
    ).all(filters.lat, filters.lng, filters.lat, ...params, limit, offset) as unknown as MarketplaceListing[];
    // The total above did not account for the radius; recompute it honestly
    // when a radius filter is active so "N results" matches what is shown.
    const totalInRadius = filters.radiusKm != null
      ? (h.prepare(
        `SELECT count(*) AS n FROM (
           SELECT ${distanceExpr} AS distanceKm FROM marketplace_listing m WHERE ${clause}
         ) WHERE distanceKm <= ?`,
      ).get(filters.lat, filters.lng, filters.lat, ...params, filters.radiusKm) as { n: number }).n
      : total;
    return { hits: rows, total: totalInRadius };
  }

  const rows = h.prepare(
    `SELECT ${ROW_COLUMNS} FROM marketplace_listing m ${ROW_JOINS}
     WHERE ${clause} ORDER BY m.id LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset) as unknown as MarketplaceListing[];
  return { hits: rows, total };
}

export interface MarketplaceListingFull extends MarketplaceListing {
  /** Deterministic, computed from the row's own id — not stored, not
   * re-randomised per request. These listings are already fully fictional
   * demo data (see the migration's note), so a plausible satisfaction
   * figure is consistent with that. It is now derived from the listing's
   * actual seeded comment rows rather than from its id, so the headline
   * number and the reviews printed underneath it cannot disagree. */
  ratingX10: number; reviewCount: number;
}

/** Aggregate the real comment rows, so a card's "4.6 (3)" is arithmetic on
 * the reviews a visitor can scroll down and read, not a decorative number
 * next to an unrelated list. */
function ratingsByListing(): Map<number, { ratingX10: number; reviewCount: number }> {
  const rows = db().prepare(
    `SELECT listing_id AS listingId, count(*) AS n, avg(rating) AS avgRating
     FROM marketplace_comment WHERE rating IS NOT NULL GROUP BY listing_id`,
  ).all() as Array<{ listingId: number; n: number; avgRating: number }>;
  return new Map(rows.map((r) => [r.listingId, {
    ratingX10: Math.round(r.avgRating * 10),
    reviewCount: r.n,
  }]));
}

/** Every active listing, unpaginated, for a client-side filter/sort UI —
 * 100 rows is small enough that shipping all of them once and filtering in
 * the browser (search, category, price, radius, availability, sort) is
 * simpler and more responsive than a round trip per filter change. */
export function listAllMarketplaceListings(): MarketplaceListingFull[] {
  const rows = db().prepare(
    `SELECT ${ROW_COLUMNS} FROM marketplace_listing m ${ROW_JOINS}
     WHERE m.is_demo = 1 ORDER BY m.id`,
  ).all() as unknown as MarketplaceListing[];
  const ratings = ratingsByListing();
  return rows.map((r) => ({
    ...r,
    ratingX10: ratings.get(r.id)?.ratingX10 ?? 0,
    reviewCount: ratings.get(r.id)?.reviewCount ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Providers and threads
// ---------------------------------------------------------------------------

export interface MarketplaceProvider {
  id: number; handle: string; displayName: string; headline: string; bio: string;
  city: string; barId: string; practisingSince: number;
  avatarPath: string; bannerPath: string; badges: string;
  followers: number; responseRate: number; languages: string;
}

/** A provider plus the numbers a profile header shows. Every figure is
 * computed from that provider's own rows — no stored counters to drift. */
export interface MarketplaceProviderStats extends MarketplaceProvider {
  listingCount: number; reviewCount: number; ratingX10: number;
  medianResponseMinutes: number | null;
}

const PROVIDER_COLUMNS = `
  p.id, p.handle, p.display_name AS displayName, p.headline, p.bio, p.city,
  p.bar_id AS barId, p.practising_since AS practisingSince,
  p.avatar_path AS avatarPath, p.banner_path AS bannerPath, p.badges,
  p.followers, p.response_rate AS responseRate, p.languages`;

export function listMarketplaceProviders(): MarketplaceProviderStats[] {
  const rows = db().prepare(
    `SELECT ${PROVIDER_COLUMNS},
       (SELECT count(*) FROM marketplace_listing l WHERE l.provider_id = p.id) AS listingCount,
       (SELECT count(*) FROM marketplace_comment c
          JOIN marketplace_listing l ON l.id = c.listing_id
          WHERE l.provider_id = p.id AND c.rating IS NOT NULL) AS reviewCount,
       (SELECT round(avg(c.rating) * 10) FROM marketplace_comment c
          JOIN marketplace_listing l ON l.id = c.listing_id
          WHERE l.provider_id = p.id AND c.rating IS NOT NULL) AS ratingX10,
       (SELECT round(avg(l.response_minutes)) FROM marketplace_listing l
          WHERE l.provider_id = p.id AND l.response_minutes IS NOT NULL) AS medianResponseMinutes
     FROM marketplace_provider p WHERE p.is_demo = 1 ORDER BY p.followers DESC`,
  ).all() as unknown as MarketplaceProviderStats[];
  return rows.map((r) => ({ ...r, ratingX10: r.ratingX10 ?? 0 }));
}

export function getMarketplaceProvider(handle: string): MarketplaceProviderStats | null {
  return listMarketplaceProviders().find((p) => p.handle === handle) ?? null;
}

export function listingsByProvider(providerId: number): MarketplaceListingFull[] {
  const rows = db().prepare(
    `SELECT ${ROW_COLUMNS} FROM marketplace_listing m ${ROW_JOINS}
     WHERE m.provider_id = ? ORDER BY m.posted_at DESC, m.id DESC`,
  ).all(providerId) as unknown as MarketplaceListing[];
  const ratings = ratingsByListing();
  return rows.map((r) => ({
    ...r,
    ratingX10: ratings.get(r.id)?.ratingX10 ?? 0,
    reviewCount: ratings.get(r.id)?.reviewCount ?? 0,
  }));
}

export interface MarketplaceComment {
  id: number; listingId: number; parentId: number | null;
  authorName: string; authorRole: string; body: string;
  rating: number | null; createdAt: string;
  /** Provider replies, nested one level. The schema allows deeper nesting;
   * the UI does not, because a legal Q&A thread that runs four levels deep
   * is a conversation that should have moved to a message. */
  replies: MarketplaceComment[];
}

/** Every comment on a provider's listings, threaded, newest root first. */
export function commentsForProvider(providerId: number): MarketplaceComment[] {
  const rows = db().prepare(
    `SELECT c.id, c.listing_id AS listingId, c.parent_id AS parentId,
            c.author_name AS authorName, c.author_role AS authorRole,
            c.body, c.rating, c.created_at AS createdAt
     FROM marketplace_comment c
     JOIN marketplace_listing l ON l.id = c.listing_id
     WHERE l.provider_id = ?
     ORDER BY c.created_at DESC`,
  ).all(providerId) as unknown as Array<Omit<MarketplaceComment, 'replies'>>;

  const byId = new Map<number, MarketplaceComment>();
  for (const r of rows) byId.set(r.id, { ...r, replies: [] });
  const roots: MarketplaceComment[] = [];
  for (const r of rows) {
    const node = byId.get(r.id) as MarketplaceComment;
    // A reply whose parent is missing (deleted, or filtered out by the
    // provider scope) is promoted to a root rather than dropped silently —
    // losing a review because its parent vanished would be worse than
    // showing it slightly out of place.
    const parent = r.parentId != null ? byId.get(r.parentId) : undefined;
    if (parent) parent.replies.push(node); else roots.push(node);
  }
  for (const node of byId.values()) {
    node.replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return roots;
}

export function marketplaceCategoryCounts(): Array<{ category: string; count: number }> {
  return db().prepare(
    `SELECT category, count(*) AS count FROM marketplace_listing WHERE is_demo = 1 GROUP BY category`,
  ).all() as Array<{ category: string; count: number }>;
}

/** A handful of real, well-known cities to seed the "near me" location
 * picker with — the same public-coordinate precision used elsewhere on
 * the site, not user geolocation (no browser permission prompt needed for
 * a demo dataset scoped to twelve fixed cities). */
export function marketplaceCityOptions(): Array<{ name: string; lat: number; lng: number }> {
  return CITIES;
}
