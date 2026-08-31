import 'server-only';
import { listOrgsForUser } from '@lexhall/db';
import type { AuthUser } from '@lexhall/db';
import { can } from './org';

export interface BookingOwnership {
  client_user_id: number | null;
  organisation_id: number | null;
}

/**
 * Does this session own the booking — either directly, or through an
 * organisation whose bookings they can manage?
 *
 * Shared by the booking page (deciding whether to show the confidential
 * brief and meeting address without asking) and cancelBooking (deciding
 * whether an email match is even needed). Kept in one place because the
 * booking page previously had NO authorization check at all: the reference
 * alone — 6 characters from a 32-symbol alphabet, about 30 bits — was
 * treated as sufficient to read anyone's matter description and meeting
 * address. That is enumerable by an unauthenticated scraper with no rate
 * limit in front of it; a session or org check closes it for the common
 * case, and the page itself still offers an email-confirmation fallback
 * for the no-account booking flow this platform deliberately supports.
 */
export function sessionOwnsBooking(booking: BookingOwnership, user: AuthUser | null): boolean {
  if (!user) return false;
  if (booking.client_user_id !== null && booking.client_user_id === user.id) return true;
  if (booking.organisation_id !== null) {
    return listOrgsForUser(user.id).some(
      (m) => m.organisationId === booking.organisation_id && can(m.role, 'booking.manage'),
    );
  }
  return false;
}
