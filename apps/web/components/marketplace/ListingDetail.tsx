'use client';

/**
 * The listing detail view: media on one side, everything a client needs to
 * decide on the other.
 *
 * The card deliberately carries almost nothing — price, who, two lines — so
 * that a grid of cards aligns. Everything the card dropped lands here: the
 * full pitch, the delivery terms, the provider's verification, the audio
 * explainer, the geofence, and the three actions.
 *
 * The actions hand off to the escrow drawer rather than doing the work
 * inline, so there is only ever one dialog open at a time.
 */
import { useEffect, useRef } from 'react';
import type { MarketplaceListingFull } from '@lexhall/db';
import { formatMinor, relativeDate, timeUntil } from '@/lib/format';
import {
  CalendarIcon, ChatIcon, CloseIcon, ClockIcon, LockIcon, MicIcon, PinIcon,
  ShieldCheckIcon, VerifiedIcon,
} from '@/components/Icons';
import { useModalDialog } from '@/lib/useModalDialog';
import { DELIVERY_META, PRICE_BASIS_LABEL, Stars } from './ServicePost';

export function ListingDetail({
  listing, categoryLabel, onClose, onAction,
}: {
  listing: MarketplaceListingFull;
  categoryLabel: string;
  onClose: () => void;
  onAction: (mode: 'message' | 'book' | 'buy', listing: MarketplaceListingFull) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalDialog(panelRef, onClose);

  // Focus lands on Close rather than the first CTA: opening a dialog with a
  // purchase button already focused invites an accidental Enter.
  useEffect(() => { closeRef.current?.focus(); }, []);

  const delivery = DELIVERY_META[listing.deliveryMode]
    ?? (DELIVERY_META.chambers as NonNullable<(typeof DELIVERY_META)[string]>);
  const DeliveryIcon = delivery.icon;
  const expiry = timeUntil(listing.expiresAt);
  const badges = (listing.providerBadges ?? '').split(',').filter(Boolean);

  return (
    <div
      className="lst-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="lst-panel"
        role="dialog"
        aria-modal="true"
        aria-label={listing.title}
        ref={panelRef}
      >
        <button
          type="button"
          className="lst-close"
          onClick={onClose}
          aria-label="Close listing"
          ref={closeRef}
        >
          <CloseIcon size={16} />
        </button>

        <div className="lst-media">
          {listing.bannerPath ? (
            <img src={listing.bannerPath} alt={listing.bannerAlt ?? ''} />
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
              No image for this listing
            </span>
          )}
          {listing.bannerAlt && (
            <div className="lst-alt">
              <span className="lst-alt-label">Image description</span>
              <p>{listing.bannerAlt}</p>
            </div>
          )}
        </div>

        <div className="lst-info">
          <div className="lst-info-scroll">
            <div className="row wrap gap-2">
              <span className="chip chip-primary">{categoryLabel}</span>
              {expiry && (
                <span className={`chip ${expiry.urgent ? 'chip-warn' : 'chip-outline'}`}>
                  <ClockIcon size={12} /> {expiry.label}
                </span>
              )}
              {!expiry && <span className="chip chip-outline">No expiry</span>}
            </div>

            <div className="stack gap-2">
              <h2 className="t-title" style={{ margin: 0 }}>{listing.title}</h2>
              <span className="lst-price">{formatMinor(listing.priceMinor, listing.currencyCode)}</span>
              <span className="t-caption">
                {PRICE_BASIS_LABEL[listing.priceBasis] ?? listing.priceBasis}
              </span>
              <span className="t-caption row gap-1">
                <PinIcon size={13} />
                {listing.locationName}
                {typeof listing.distanceKm === 'number' && ` · ${listing.distanceKm.toFixed(1)} km away`}
              </span>
              {listing.reviewCount > 0 && (
                <span className="row gap-1 t-caption">
                  <Stars ratingX10={listing.ratingX10} />
                  <strong>{(listing.ratingX10 / 10).toFixed(1)}</strong>
                  <span>from {listing.reviewCount} review{listing.reviewCount === 1 ? '' : 's'}</span>
                </span>
              )}
            </div>

            <dl className="lst-specs">
              <div className="lst-spec-row">
                <dt>How it reaches you</dt>
                <dd className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                  <DeliveryIcon size={13} /> {delivery.label}
                </dd>
              </div>
              <div className="lst-spec-row">
                <dt>Travels up to</dt>
                <dd>{listing.geofenceRadiusKm} km</dd>
              </div>
              <div className="lst-spec-row">
                <dt>Availability</dt>
                <dd>{listing.availabilityLabel}</dd>
              </div>
              {listing.responseMinutes != null && (
                <div className="lst-spec-row">
                  <dt>Typical reply</dt>
                  <dd>
                    {listing.responseMinutes < 60
                      ? `${listing.responseMinutes} minutes`
                      : `${Math.round(listing.responseMinutes / 60)} hours`}
                  </dd>
                </div>
              )}
              {badges.includes('bar') && (
                <div className="lst-spec-row">
                  <dt>Bar Council</dt>
                  <dd className="row gap-1" style={{ justifyContent: 'flex-end', color: 'var(--secondary)' }}>
                    <ShieldCheckIcon size={13} /> Verified
                  </dd>
                </div>
              )}
              {listing.postedAt && (
                <div className="lst-spec-row">
                  <dt>Posted</dt>
                  <dd>{relativeDate(listing.postedAt)}</dd>
                </div>
              )}
            </dl>

            <div className="lst-provider">
              <span className="lst-provider-avatar">
                {listing.providerAvatar ? <img src={listing.providerAvatar} alt="" /> : null}
              </span>
              <span className="stack" style={{ minWidth: 0 }}>
                <span className="row gap-1">
                  <strong style={{ fontSize: '0.9375rem' }}>{listing.providerName}</strong>
                  {badges.includes('bar') && (
                    <span className="adv-verified"><VerifiedIcon size={14} /></span>
                  )}
                </span>
                {listing.providerHandle && (
                  <span className="adv-handle">@{listing.providerHandle}</span>
                )}
              </span>
            </div>

            {listing.podcastTitle && (
              <div className="lst-podcast">
                <span className="lst-podcast-play" aria-hidden="true"><MicIcon size={16} /></span>
                <span className="stack" style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '0.8125rem' }}>{listing.podcastTitle}</strong>
                  <span className="t-caption">
                    Audio explainer{listing.podcastMinutes ? ` · ${listing.podcastMinutes} min` : ''}
                  </span>
                </span>
              </div>
            )}

            <div className="stack gap-2">
              <h3 className="t-title-sm" style={{ margin: 0 }}>What this covers</h3>
              <p className="t-body-sm" style={{ margin: 0 }}>{listing.description}</p>
            </div>
          </div>

          <div className="lst-info-foot">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => onAction('buy', listing)}
            >
              <LockIcon size={14} /> Buy with escrow protection
            </button>
            <div className="lst-cta-row">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onAction('message', listing)}
              >
                <ChatIcon size={13} /> Message
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onAction('book', listing)}
              >
                <CalendarIcon size={13} /> Book
              </button>
            </div>
            <span className="t-caption">No lawyer–client relationship is created by asking.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
