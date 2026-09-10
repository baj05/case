'use client';

/**
 * An advocate's marketplace profile: banner, overlapping avatar, handle,
 * verification badges, the numbers that matter to someone deciding whether
 * to hire, and tabs over what they have posted.
 *
 * Every provider here is invented. Real advocates compiled from Bar Council
 * registers are never given a marketplace profile with invented prices
 * attached: they did not opt in, and BCI Rule 36 bars advocates from
 * advertising their services — a fabricated listing in a real name creates
 * a professional-conduct exposure for that advocate.
 */
import { useMemo, useState } from 'react';
import type { MarketplaceComment, MarketplaceListingFull, MarketplaceProviderStats } from '@lexhall/db';
import { formatNumber, relativeDate } from '@/lib/format';
import { ClockIcon, GavelIcon, MicIcon, PinIcon, VerifiedIcon } from '@/components/Icons';
import { ServicePost, Stars } from './ServicePost';

const BADGE_LABEL: Record<string, { label: string; hint: string }> = {
  identity: { label: 'Identity checked', hint: 'Government photo ID matched to the name on this profile' },
  bar: { label: 'Bar Council verified', hint: 'Enrolment number confirmed against the state bar council roll' },
  escrow: { label: 'Escrow enabled', hint: 'Accepts payments held in escrow until the work is delivered' },
  responsive: { label: 'Fast responder', hint: 'Replies to most enquiries within an hour' },
};

type Tab = 'services' | 'podcasts' | 'reviews' | 'about';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'services', label: 'Services' },
  { key: 'podcasts', label: 'Podcasts' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'about', label: 'About' },
];

function initials(name: string): string {
  return name.replace(/^Adv\.\s*/, '').split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function Comment({ comment, depth = 0 }: { comment: MarketplaceComment; depth?: number }) {
  const isProvider = comment.authorRole === 'provider';
  return (
    <div className="thread-item" style={depth > 0 ? { borderTop: 0, paddingTop: 0 } : undefined}>
      <span className="thread-avatar" aria-hidden="true">{initials(comment.authorName)}</span>
      <div className="stack gap-1" style={{ minWidth: 0, flex: 1 }}>
        <div className="row wrap gap-2" style={{ alignItems: 'center' }}>
          <strong style={{ fontSize: '0.875rem' }}>{comment.authorName}</strong>
          {isProvider && (
            <span className="thread-reply-badge"><VerifiedIcon size={12} /> ADVOCATE</span>
          )}
          {comment.rating != null && <Stars ratingX10={comment.rating * 10} />}
          <span className="t-caption">{relativeDate(comment.createdAt)}</span>
        </div>
        <p className="t-body-sm" style={{ margin: 0 }}>{comment.body}</p>
        {comment.replies.length > 0 && (
          <div className="thread-replies">
            {comment.replies.map((r) => <Comment key={r.id} comment={r} depth={depth + 1} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProviderProfile({
  provider, listings, comments, categoryLabel, onOpen,
}: {
  provider: MarketplaceProviderStats;
  listings: MarketplaceListingFull[];
  comments: MarketplaceComment[];
  categoryLabel: (key: string) => string;
  onOpen: (l: MarketplaceListingFull) => void;
}) {
  const [tab, setTab] = useState<Tab>('services');
  const badges = provider.badges.split(',').filter(Boolean);

  const podcasts = useMemo(
    () => listings.filter((l) => l.podcastTitle),
    [listings],
  );
  // Only rows carrying a rating are reviews; the rest are pre-booking
  // questions, which belong in the Services tab next to what was asked
  // about, not in a list labelled Reviews.
  const reviews = useMemo(
    () => comments.filter((c) => c.rating != null),
    [comments],
  );
  const questions = useMemo(
    () => comments.filter((c) => c.rating == null),
    [comments],
  );

  return (
    <div className="stack gap-4">
      <section className="adv-profile">
        <div className="adv-banner">
          <img src={provider.bannerPath} alt="" />
        </div>

        <div className="adv-identity stack gap-3">
          <div className="adv-avatar-row">
            <div className="adv-avatar">
              <img src={provider.avatarPath} alt="" />
            </div>
            <div className="row wrap gap-2">
              <button type="button" className="btn btn-secondary btn-sm">Follow</button>
              <button type="button" className="btn btn-primary btn-sm">Message</button>
            </div>
          </div>

          <div className="stack gap-1">
            <div className="adv-name-row">
              <h2 className="t-headline-md" style={{ margin: 0 }}>{provider.displayName}</h2>
              {badges.includes('bar') && (
                <span className="adv-verified" title={BADGE_LABEL.bar?.hint}>
                  <VerifiedIcon size={19} />
                </span>
              )}
            </div>
            <span className="adv-handle">@{provider.handle}</span>
            <p className="t-body" style={{ margin: '6px 0 0' }}>{provider.headline}</p>
          </div>

          <p className="t-body-sm ink-variant measure" style={{ margin: 0 }}>{provider.bio}</p>

          <div className="row wrap gap-3 t-caption">
            <span className="row gap-1"><PinIcon size={13} /> {provider.city}</span>
            <span className="row gap-1"><GavelIcon size={13} /> {provider.barId}</span>
            <span className="row gap-1">
              <ClockIcon size={13} /> Practising since {provider.practisingSince}
            </span>
            <span>{provider.languages}</span>
          </div>

          <div className="row wrap gap-2">
            {badges.map((b) => {
              const meta = BADGE_LABEL[b];
              if (!meta) return null;
              return (
                <span key={b} className="chip" title={meta.hint}>
                  <VerifiedIcon size={12} /> {meta.label}
                </span>
              );
            })}
          </div>

          <div className="adv-stats">
            <span className="adv-stat">
              <strong>{formatNumber(provider.listingCount)}</strong><span>services</span>
            </span>
            <span className="adv-stat">
              <strong>{formatNumber(provider.followers)}</strong><span>followers</span>
            </span>
            <span className="adv-stat">
              <strong>{provider.ratingX10 > 0 ? (provider.ratingX10 / 10).toFixed(1) : '—'}</strong>
              <span>from {formatNumber(provider.reviewCount)} reviews</span>
            </span>
            <span className="adv-stat">
              <strong>{provider.responseRate}%</strong><span>response rate</span>
            </span>
          </div>
        </div>

        <div className="adv-tabs" role="tablist" aria-label="Profile sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              className="adv-tab"
              aria-selected={tab === t.key}
              aria-controls={`adv-panel-${t.key}`}
              id={`adv-tab-${t.key}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'services' && ` (${listings.length})`}
              {t.key === 'podcasts' && ` (${podcasts.length})`}
              {t.key === 'reviews' && ` (${reviews.length})`}
            </button>
          ))}
        </div>
      </section>

      <div
        role="tabpanel"
        id={`adv-panel-${tab}`}
        aria-labelledby={`adv-tab-${tab}`}
        tabIndex={-1}
      >
        {tab === 'services' && (
          listings.length === 0
            ? <p className="t-body ink-variant">No services posted yet.</p>
            : (
              <div className="svc-grid">
                {listings.map((l) => (
                  <ServicePost
                    key={l.id}
                    listing={l}
                    categoryLabel={categoryLabel(l.category)}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            )
        )}

        {tab === 'podcasts' && (
          podcasts.length === 0
            ? <p className="t-body ink-variant">No audio explainers yet.</p>
            : (
              <div className="stack gap-2">
                {podcasts.map((l) => (
                  <div key={l.id} className="card row wrap gap-3" style={{ padding: 16, justifyContent: 'space-between' }}>
                    <span className="row gap-3" style={{ minWidth: 0, flex: '1 1 320px' }}>
                      <span className="svc-podcast-play" aria-hidden="true"><MicIcon size={17} /></span>
                      <span className="stack" style={{ minWidth: 0 }}>
                        <strong>{l.podcastTitle}</strong>
                        <span className="t-caption">
                          {l.podcastMinutes} min · attached to “{l.title}”
                        </span>
                      </span>
                    </span>
                    <button type="button" className="btn btn-secondary btn-sm">Play</button>
                  </div>
                ))}
              </div>
            )
        )}

        {tab === 'reviews' && (
          reviews.length === 0
            ? <p className="t-body ink-variant">No reviews yet.</p>
            : (
              <div className="card thread" style={{ padding: '4px 18px 18px' }}>
                {reviews.map((c) => <Comment key={c.id} comment={c} />)}
              </div>
            )
        )}

        {tab === 'about' && (
          <div className="stack gap-4">
            <section className="card stack gap-2" style={{ padding: 20 }}>
              <h3 className="t-headline-sm" style={{ margin: 0 }}>About</h3>
              <p className="t-body measure" style={{ margin: 0 }}>{provider.bio}</p>
              <dl className="stack gap-2" style={{ margin: '8px 0 0' }}>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                  <dt className="t-caption">Enrolment</dt><dd className="mono t-caption" style={{ margin: 0 }}>{provider.barId}</dd>
                </div>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                  <dt className="t-caption">Practising since</dt>
                  <dd className="t-caption" style={{ margin: 0 }}>
                    {provider.practisingSince} · {new Date().getFullYear() - provider.practisingSince} years
                  </dd>
                </div>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                  <dt className="t-caption">Languages</dt><dd className="t-caption" style={{ margin: 0 }}>{provider.languages}</dd>
                </div>
                <div className="row wrap gap-2" style={{ justifyContent: 'space-between' }}>
                  <dt className="t-caption">Typical reply</dt>
                  <dd className="t-caption" style={{ margin: 0 }}>
                    {provider.medianResponseMinutes != null
                      ? provider.medianResponseMinutes < 60
                        ? `${provider.medianResponseMinutes} minutes`
                        : `${Math.round(provider.medianResponseMinutes / 60)} hours`
                      : 'Not recorded'}
                  </dd>
                </div>
              </dl>
            </section>

            {questions.length > 0 && (
              <section className="card stack gap-2" style={{ padding: '18px 20px' }}>
                <h3 className="t-headline-sm" style={{ margin: 0 }}>Questions people asked before booking</h3>
                <div className="thread">
                  {questions.map((c) => <Comment key={c.id} comment={c} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
