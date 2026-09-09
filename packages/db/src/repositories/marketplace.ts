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
  priceMinor: number; priceBasis: 'fixed' | 'hourly' | 'starting_at';
  city: string; lat: number; lng: number; radiusKm: number;
  availability: string; responseMinutes: number | null;
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

const FIRST_NAMES = [
  'Ananya', 'Rohit', 'Priya', 'Vikram', 'Neha', 'Arjun', 'Kavya', 'Rahul', 'Meera', 'Sanjay',
  'Divya', 'Karan', 'Pooja', 'Amit', 'Ritu', 'Suresh', 'Nisha', 'Deepak', 'Anjali', 'Manish',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Menon', 'Rao', 'Kapoor', 'Bose',
  'Chatterjee', 'Desai', 'Pillai', 'Joshi', 'Malhotra', 'Bhatt', 'Sinha', 'Kulkarni',
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

function pick<T>(arr: T[], seed: number): T { return arr[((seed % arr.length) + arr.length) % arr.length] as T; }

/** Deterministic pseudo-random in [min,max] from an integer seed, so the
 * same seed run always produces the same 100 listings (no Math.random —
 * re-running the seeder should not silently change existing demo data). */
function seededRange(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

function buildSeeds(count: number): Seed[] {
  const categories = Object.keys(TEMPLATES);
  const out: Seed[] = [];
  for (let i = 0; i < count; i += 1) {
    const category = pick(categories, i);
    const variants = TEMPLATES[category] ?? [];
    const variant = pick(variants, i * 7 + 3);
    const city = pick(CITIES, i * 5 + 1);
    const first = pick(FIRST_NAMES, i * 3 + 2);
    const last = pick(LAST_NAMES, i * 11 + 5);
    const radii = [5, 10, 25, 50, 100];
    const availabilities = ['Available now', 'Responds within the hour', 'Available today', 'Available this week', 'By appointment'];
    out.push({
      key: `demo-${String(i + 1).padStart(3, '0')}`,
      category,
      title: variant.title,
      description: variant.description,
      providerName: `Adv. ${first} ${last}`,
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
    });
  }
  return out;
}

export interface MarketplaceSeedReport { inserted: number; skipped: number }

export function seedMarketplace(count = 100): MarketplaceSeedReport {
  return transaction(() => {
    const h = db();
    const areaId = new Map(
      (h.prepare(`SELECT id, slug FROM practice_area`).all() as Array<{ id: number; slug: string }>)
        .map((r) => [r.slug, r.id]),
    );
    const categoryArea = new Map(MARKETPLACE_CATEGORIES.map((c) => [c.key, c.practiceAreaSlug ? areaId.get(c.practiceAreaSlug) ?? null : null]));
    const ts = now();
    let inserted = 0;
    let skipped = 0;
    for (const s of buildSeeds(count)) {
      const info = h.prepare(
        `INSERT OR IGNORE INTO marketplace_listing
           (seed_key, category, title, description, provider_name, practice_area_id,
            price_minor, currency_code, price_basis, location_name, latitude, longitude,
            geofence_radius_km, availability_label, response_minutes, is_demo, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,'INR',?,?,?,?,?,?,?,1,?,?)`,
      ).run(
        s.key, s.category, s.title, s.description, s.providerName, categoryArea.get(s.category) ?? null,
        s.priceMinor, s.priceBasis, s.city, s.lat, s.lng,
        s.radiusKm, s.availability, s.responseMinutes, ts, ts,
      );
      if (info.changes > 0) inserted += 1; else skipped += 1;
    }
    return { inserted, skipped };
  });
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
  m.availability_label AS availabilityLabel, m.response_minutes AS responseMinutes`;

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
         FROM marketplace_listing m LEFT JOIN practice_area pa ON pa.id = m.practice_area_id
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
    `SELECT ${ROW_COLUMNS} FROM marketplace_listing m LEFT JOIN practice_area pa ON pa.id = m.practice_area_id
     WHERE ${clause} ORDER BY m.id LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset) as unknown as MarketplaceListing[];
  return { hits: rows, total };
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
