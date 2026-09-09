'use client';

/**
 * One service offer, rendered as a clean social-post card: a tight
 * avatar/name/handle/time header, body copy that just flows, edge-to-edge
 * rounded media, and a minimal icon-led action row along the bottom —
 * no boxed sub-sections, no shadow doing the work a hairline border
 * already does.
 *
 * Every listing is seeded demonstration data owned by a fictional provider.
 * The card never carries a real registered advocate's name — see the
 * marketplace repository's own note on why.
 */
import { useState } from 'react';
import type { MarketplaceListingFull } from '@lexhall/db';
import { formatMinor, shortAge, timeUntil } from '@/lib/format';
import {
  ChatIcon, ClockIcon, GlobeIcon, HomeIcon, LockIcon, MicIcon,
  PinIcon, StarIcon, BriefcaseIcon, VerifiedIcon, CalendarIcon,
} from '@/components/Icons';

const DELIVERY_META: Record<string, { label: string; hint: string; icon: typeof HomeIcon }> = {
  doorstep: { label: 'Doorstep', hint: 'They travel to you', icon: HomeIcon },
  chambers: { label: 'At chambers', hint: 'You visit their office', icon: BriefcaseIcon },
  virtual: { label: 'Virtual', hint: 'Call or video, no travel', icon: GlobeIcon },
};

const PRICE_BASIS_LABEL: Record<string, string> = {
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
  listing, onDiscuss, onBook, onBuy,
}: {
  listing: MarketplaceListingFull;
  onDiscuss: (listing: MarketplaceListingFull) => void;
  onBook: (listing: MarketplaceListingFull) => void;
  onBuy: (listing: MarketplaceListingFull) => void;
}) {
  const [bannerFailed, setBannerFailed] = useState(false);
  const delivery = DELIVERY_META[listing.deliveryMode] ?? DELIVERY_META.chambers as NonNullable<typeof DELIVERY_META[string]>;
  const DeliveryIcon = delivery.icon;
  const expiry = timeUntil(listing.expiresAt);
  const age = shortAge(listing.postedAt);
  const badges = (listing.providerBadges ?? '').split(',').filter(Boolean);

  return (
    <article className="svc-post">
      <header className="svc-head">
        <div className="svc-head-avatar">
          {listing.providerAvatar
            ? <img src={listing.providerAvatar} alt="" />
            : null}
        </div>
        <div className="svc-head-info">
          <div className="svc-name-row">
            <strong>{listing.providerName}</strong>
            {badges.includes('bar') && (
              <span className="adv-verified" title="Bar Council enrolment checked">
                <VerifiedIcon size={15} />
              </span>
            )}
            {listing.providerHandle && <span className="svc-handle">@{listing.providerHandle}</span>}
            {age && (
              <>
                <span className="svc-dot" aria-hidden="true">·</span>
                <span className="svc-time" aria-label={`Posted ${age} ago`}>{age}</span>
              </>
            )}
          </div>
          <div className="svc-meta-line">
            <PinIcon size={12} />
            <span>
              {listing.locationName}
              {typeof listing.distanceKm === 'number' && ` · ${listing.distanceKm.toFixed(1)} km away`}
            </span>
          </div>
        </div>
        <div className="svc-price-tag">
          <strong>{formatMinor(listing.priceMinor, listing.currencyCode)}</strong>
          <span>{PRICE_BASIS_LABEL[listing.priceBasis] ?? listing.priceBasis}</span>
        </div>
      </header>

      <div className="svc-body">
        <h3 className="svc-title">{listing.title}</h3>
        <p className="svc-pitch ink-variant">{listing.description}</p>
        {listing.reviewCount > 0 && (
          <div className="svc-rating-row">
            <Stars ratingX10={listing.ratingX10} />
            <span>{(listing.ratingX10 / 10).toFixed(1)}</span>
            <span className="ink-variant">({listing.reviewCount})</span>
          </div>
        )}
      </div>

      {listing.bannerPath && !bannerFailed && (
        <div className="svc-banner">
          {/* Plain <img>: these are decorative editorial photographs served
              from /public at a fixed aspect ratio, and next/image's
              optimiser buys nothing here. onError degrades to no banner
              rather than a broken-image icon. */}
          <img
            src={listing.bannerPath}
            alt={listing.bannerAlt ?? ''}
            loading="lazy"
            onError={() => setBannerFailed(true)}
          />
          {listing.bannerAlt && <span className="svc-alt-badge">ALT</span>}
        </div>
      )}

      {listing.podcastTitle && (
        <div className="svc-podcast">
          <span className="svc-podcast-play" aria-hidden="true"><MicIcon size={16} /></span>
          <span className="stack" style={{ minWidth: 0 }}>
            <strong style={{ fontSize: '0.8125rem' }}>{listing.podcastTitle}</strong>
            <span className="t-caption">
              Audio explainer{listing.podcastMinutes ? ` · ${listing.podcastMinutes} min` : ''}
            </span>
          </span>
        </div>
      )}

      <div className="svc-chips">
        <span className="chip" title={delivery.hint}>
          <DeliveryIcon size={11} />
          {' '}{delivery.label}
        </span>
        <span className="chip chip-outline">Serves {listing.geofenceRadiusKm} km</span>
        <span className="chip chip-outline">{listing.availabilityLabel}</span>
        {listing.responseMinutes != null && (
          <span className="chip chip-outline">
            ~{listing.responseMinutes < 60
              ? `${listing.responseMinutes} min`
              : `${Math.round(listing.responseMinutes / 60)} hr`} reply
          </span>
        )}
        {expiry && (
          <span className="chip svc-expiry" data-urgent={expiry.urgent ? 'true' : undefined}>
            <ClockIcon size={11} />
            {expiry.label}
          </span>
        )}
      </div>

      <div className="svc-actions-row">
        <button type="button" className="svc-action-btn" onClick={() => onDiscuss(listing)}>
          <ChatIcon size={15} /> Message
        </button>
        <button type="button" className="svc-action-btn" data-tone="book" onClick={() => onBook(listing)}>
          <CalendarIcon size={15} /> Book
        </button>
        <button type="button" className="svc-action-btn" data-tone="buy" onClick={() => onBuy(listing)}>
          <LockIcon size={13} /> Buy
        </button>
      </div>
    </article>
  );
}
