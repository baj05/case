'use client';

/**
 * One service offer as a classifieds card: fixed-ratio media carrying the
 * price, a compact identity strip, clamped copy, and a footer pinned to the
 * bottom edge.
 *
 * The whole card opens the detail view. Height is a constant rather than a
 * consequence — media first, one-line title, two-line pitch, `margin-top:auto`
 * footer — because the previous text-first card grew a podcast block on a
 * third of the rows and every grid row bottom came out ragged.
 *
 * Every listing is seeded demonstration data owned by a fictional provider.
 * The card never carries a real registered advocate's name — see the
 * marketplace repository's own note on why.
 */
import { useState } from 'react';
import type { MarketplaceListingFull } from '@lexhall/db';
import { formatMinor, timeUntil } from '@/lib/format';
import {
  BriefcaseIcon, ClockIcon, DocumentIcon, GlobeIcon, HomeIcon, PinIcon, StarIcon, VerifiedIcon,
} from '@/components/Icons';

export const DELIVERY_META: Record<string, { label: string; hint: string; icon: typeof HomeIcon }> = {
  doorstep: { label: 'Doorstep', hint: 'They travel to you', icon: HomeIcon },
  chambers: { label: 'At chambers', hint: 'You visit their office', icon: BriefcaseIcon },
  virtual: { label: 'Virtual', hint: 'Call or video, no travel', icon: GlobeIcon },
};

export const PRICE_BASIS_LABEL: Record<string, string> = {
  fixed: 'Fixed fee',
  hourly: 'Per hour',
  starting_at: 'Starting at',
};

export function Stars({ ratingX10 }: { ratingX10: number }) {
  const full = Math.round(ratingX10 / 10);
  return (
    <span className="stars" aria-label={`${(ratingX10 / 10).toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} data-off={n > full ? 'true' : undefined}>
          <StarIcon size={12} fill="currentColor" />
        </span>
      ))}
    </span>
  );
}

export function ServicePost({
  listing, categoryLabel, onOpen,
}: {
  listing: MarketplaceListingFull;
  categoryLabel: string;
  onOpen: (listing: MarketplaceListingFull) => void;
}) {
  const [bannerFailed, setBannerFailed] = useState(false);
  const delivery = DELIVERY_META[listing.deliveryMode]
    ?? (DELIVERY_META.chambers as NonNullable<(typeof DELIVERY_META)[string]>);
  const DeliveryIcon = delivery.icon;
  const expiry = timeUntil(listing.expiresAt);
  const badges = (listing.providerBadges ?? '').split(',').filter(Boolean);
  const showBanner = Boolean(listing.bannerPath) && !bannerFailed;

  return (
    <article className="svc-post">
      {/* One hit target, one tab stop, stretched over the card by CSS. The
          rest of the card stays non-interactive so nothing nests inside it. */}
      <button
        type="button"
        className="svc-open"
        aria-label={`View details: ${listing.title} by ${listing.providerName}`}
        onClick={() => onOpen(listing)}
      />

      <div className="svc-media">
        {showBanner ? (
          /* Plain <img>: editorial photography served from /public at a fixed
             ratio, where next/image's optimiser buys nothing. onError falls
             back to the placeholder rather than a broken-image glyph. */
          <img
            src={listing.bannerPath ?? ''}
            alt={listing.bannerAlt ?? ''}
            loading="lazy"
            onError={() => setBannerFailed(true)}
          />
        ) : (
          <span className="svc-media-fallback" aria-hidden="true">
            <DocumentIcon size={30} />
          </span>
        )}

        {expiry && (
          <span className="svc-expiry" data-urgent={expiry.urgent ? 'true' : undefined}>
            <ClockIcon size={11} />
            {expiry.label}
          </span>
        )}
        {showBanner && listing.bannerAlt && <span className="svc-alt-badge">ALT</span>}

        <span className="svc-price-tag">
          <strong>{formatMinor(listing.priceMinor, listing.currencyCode)}</strong>
          <span>{PRICE_BASIS_LABEL[listing.priceBasis] ?? listing.priceBasis}</span>
        </span>
      </div>

      <div className="svc-body">
        <div className="svc-who">
          <span className="svc-who-avatar">
            {listing.providerAvatar ? <img src={listing.providerAvatar} alt="" /> : null}
          </span>
          <span className="svc-who-text">
            <span className="svc-who-name">
              <span className="truncate">{listing.providerName}</span>
              {badges.includes('bar') && (
                <span className="adv-verified" title="Bar Council enrolment checked">
                  <VerifiedIcon size={12} />
                </span>
              )}
            </span>
            {listing.providerHandle && (
              <span className="svc-who-handle truncate">@{listing.providerHandle}</span>
            )}
          </span>
        </div>

        <h3 className="svc-title truncate">{listing.title}</h3>
        <p className="svc-pitch clamp-2">{listing.description}</p>

        {listing.reviewCount > 0 && (
          <span className="row gap-1" style={{ fontSize: '0.75rem' }}>
            <Stars ratingX10={listing.ratingX10} />
            <span style={{ fontWeight: 700 }}>{(listing.ratingX10 / 10).toFixed(1)}</span>
            <span className="ink-variant">({listing.reviewCount})</span>
          </span>
        )}

        <div className="svc-chips">
          <span className="chip chip-outline">{categoryLabel}</span>
          <span className="chip" title={delivery.hint}>
            <DeliveryIcon size={11} />
            {' '}{delivery.label}
          </span>
        </div>
      </div>

      <footer className="svc-foot">
        <span className="svc-foot-where truncate">
          <PinIcon size={12} />
          {typeof listing.distanceKm === 'number'
            ? `${listing.distanceKm.toFixed(1)} km away`
            : listing.locationName}
        </span>
        <span className="svc-foot-more">
          View details <span aria-hidden="true">›</span>
        </span>
      </footer>
    </article>
  );
}
