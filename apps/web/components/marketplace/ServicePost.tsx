'use client';

/**
 * One service offer, rendered as a post rather than a table row: who is
 * offering it, in their own words, with what it costs and how it reaches
 * you attached to the same card.
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
  PinIcon, StarIcon, BriefcaseIcon, VerifiedIcon,
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
        <div className="stack" style={{ minWidth: 0, flex: 1 }}>
          <div className="row gap-1" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.9375rem' }}>{listing.providerName}</strong>
            {badges.includes('bar') && (
              <span className="adv-verified" title="Bar Council enrolment checked">
                <VerifiedIcon size={14} />
              </span>
            )}
            {listing.providerHandle && <span className="adv-handle">@{listing.providerHandle}</span>}
            {age && <span className="t-caption" aria-label={`Posted ${age} ago`}>· {age}</span>}
          </div>
          <span className="t-caption row gap-1" style={{ alignItems: 'center' }}>
            <PinIcon size={12} />
            {listing.locationName}
            {typeof listing.distanceKm === 'number' && ` · ${listing.distanceKm.toFixed(1)} km away`}
          </span>
        </div>
        {expiry && (
          <span className="chip svc-expiry" data-urgent={expiry.urgent ? 'true' : undefined}>
            <ClockIcon size={12} />
            {expiry.label}
          </span>
        )}
      </header>

      <div className="svc-body stack gap-2">
        <h3 className="t-body" style={{ fontWeight: 700, margin: 0 }}>{listing.title}</h3>
        <p className="svc-pitch ink-variant">{listing.description}</p>
        {listing.reviewCount > 0 && (
          <span className="row gap-1 t-caption" style={{ alignItems: 'center' }}>
            <Stars ratingX10={listing.ratingX10} />
            {(listing.ratingX10 / 10).toFixed(1)}
            <span className="ink-variant">({listing.reviewCount})</span>
          </span>
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
          <DeliveryIcon size={12} />
          {' '}{delivery.label}
        </span>
        <span className="chip chip-outline">Serves {listing.geofenceRadiusKm} km</span>
        <span className="chip chip-outline">{listing.availabilityLabel}</span>
        {listing.responseMinutes != null && (
          <span className="chip chip-outline">
            Replies in ~{listing.responseMinutes < 60
              ? `${listing.responseMinutes} min`
              : `${Math.round(listing.responseMinutes / 60)} hr`}
          </span>
        )}
      </div>

      <footer className="svc-foot">
        <span className="svc-price">
          <strong>{formatMinor(listing.priceMinor, listing.currencyCode)}</strong>
          <span>{PRICE_BASIS_LABEL[listing.priceBasis] ?? listing.priceBasis}</span>
        </span>
        <span className="svc-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDiscuss(listing)}>
            <ChatIcon size={13} /> Message
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onBook(listing)}>
            Book
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onBuy(listing)}>
            <LockIcon size={13} /> Buy
          </button>
        </span>
      </footer>
    </article>
  );
}
