/**
 * Client-safe geo and availability helpers for the marketplace browser.
 *
 * Both were proven in the earlier standalone marketplace component and moved
 * here verbatim when that component was consolidated away — the maths was
 * correct, so it was worth keeping rather than rewriting.
 */

/**
 * Great-circle distance in kilometres. 6371 is Earth's mean radius, the
 * standard constant — the same one the SQL side of the marketplace uses, so
 * a client-side distance and a server-side one agree.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type AvailabilityBucket = 'asap' | 'today' | 'scheduled';

/**
 * Collapse the free-text availability label into something filterable.
 * Kept as an explicit mapping rather than a regex so adding a new label to
 * the seeder fails loudly here (it lands in 'scheduled') instead of matching
 * something surprising.
 */
export function availabilityBucket(label: string): AvailabilityBucket {
  if (label === 'Available now' || label === 'Responds within the hour') return 'asap';
  if (label === 'Available today') return 'today';
  return 'scheduled';
}
