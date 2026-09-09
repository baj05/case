'use client';

/**
 * The marketplace hub that lives inside the For-advocates section.
 *
 * Two modes: browse every service across all providers, or open one
 * provider's profile and read their feed. The provider rail switches
 * between them, and the composer is the advocate's own side of the same
 * surface — what they see when they want to post something.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  MarketplaceComment, MarketplaceListingFull, MarketplaceProviderStats,
} from '@lexhall/db';
import { formatMinor } from '@/lib/format';
import {
  CloseIcon, LockIcon, PlusIcon, SearchIcon, ShieldCheckIcon, VerifiedIcon,
} from '@/components/Icons';
import { ServicePost } from './ServicePost';
import { ProviderProfile } from './ProviderProfile';
import { Composer, type ComposerDraft } from './Composer';
import { useModalDialog } from '@/lib/useModalDialog';

type Intent = 'message' | 'book' | 'buy';

const INTENT_COPY: Record<Intent, { title: string; cta: string }> = {
  message: { title: 'Message the advocate', cta: 'Send message' },
  book: { title: 'Book this service', cta: 'Request booking' },
  buy: { title: 'Buy with escrow protection', cta: 'Pay into escrow' },
};

const RADII = [5, 10, 25, 50, 100];

export function MarketplaceHub({
  providers, listings, listingsByProvider, commentsByProvider, categories,
}: {
  providers: MarketplaceProviderStats[];
  listings: MarketplaceListingFull[];
  listingsByProvider: Record<string, MarketplaceListingFull[]>;
  commentsByProvider: Record<string, MarketplaceComment[]>;
  categories: Array<{ key: string; label: string }>;
}) {
  const [handle, setHandle] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [radius, setRadius] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [posted, setPosted] = useState<ComposerDraft | null>(null);
  const [intent, setIntent] = useState<{ mode: Intent; listing: MarketplaceListingFull } | null>(null);

  const provider = handle ? providers.find((p) => p.handle === handle) ?? null : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (category && l.category !== category) return false;
      // The radius filter asks "would this provider travel to me?", so it
      // reads the listing's own geofence rather than a distance we do not
      // have without the visitor's location.
      if (radius != null && l.geofenceRadiusKm < radius) return false;
      if (!q) return true;
      return l.title.toLowerCase().includes(q)
        || l.description.toLowerCase().includes(q)
        || l.providerName.toLowerCase().includes(q)
        || l.locationName.toLowerCase().includes(q);
    });
  }, [listings, query, category, radius]);

  const openIntent = (mode: Intent) => (listing: MarketplaceListingFull) => setIntent({ mode, listing });

  return (
    <div className="stack gap-5">
      {/* --- provider rail ------------------------------------------------ */}
      <div className="stack gap-2">
        <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h3 className="t-headline-sm" style={{ margin: 0 }}>Advocates listing right now</h3>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setComposerOpen(true)}>
            <PlusIcon size={14} /> Post a service
          </button>
        </div>
        <div className="row gap-2" style={{ overflowX: 'auto', paddingBottom: 6 }}>
          <button
            type="button"
            className="chip chip-button"
            aria-pressed={handle === null}
            onClick={() => setHandle(null)}
            style={{ flex: 'none' }}
          >
            All services ({listings.length})
          </button>
          {providers.map((p) => (
            <button
              key={p.handle}
              type="button"
              className="chip chip-button"
              aria-pressed={handle === p.handle}
              onClick={() => setHandle(p.handle)}
              style={{ flex: 'none' }}
            >
              {p.badges.includes('bar') && <VerifiedIcon size={12} />}
              {' '}@{p.handle}
            </button>
          ))}
        </div>
      </div>

      {provider ? (
        <ProviderProfile
          provider={provider}
          listings={listingsByProvider[provider.handle] ?? []}
          comments={commentsByProvider[provider.handle] ?? []}
          onDiscuss={openIntent('message')}
          onBook={openIntent('book')}
          onBuy={openIntent('buy')}
        />
      ) : (
        <div className="stack gap-4">
          {/* --- filters -------------------------------------------------- */}
          <div className="card stack gap-3" style={{ padding: 16 }}>
            <div className="search-bar">
              <SearchIcon size={16} />
              <input
                className="input"
                style={{ border: 0, background: 'transparent' }}
                placeholder="Search services, advocates or cities"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search services"
              />
              {query && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQuery('')} aria-label="Clear search">
                  <CloseIcon size={14} />
                </button>
              )}
            </div>

            <div className="row wrap gap-2">
              <button
                type="button"
                className="chip chip-button"
                aria-pressed={category === ''}
                onClick={() => setCategory('')}
              >
                All categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className="chip chip-button"
                  aria-pressed={category === c.key}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="row wrap gap-2" style={{ alignItems: 'center' }}>
              <span className="t-caption">Travels at least</span>
              <button
                type="button"
                className="chip chip-button"
                aria-pressed={radius === null}
                onClick={() => setRadius(null)}
              >
                Any distance
              </button>
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="chip chip-button"
                  aria-pressed={radius === r}
                  onClick={() => setRadius(r)}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          <p className="t-caption" role="status">
            {filtered.length === listings.length
              ? `${listings.length} services`
              : `${filtered.length} of ${listings.length} services`}
          </p>

          {filtered.length === 0 ? (
            <div className="card stack gap-2" style={{ padding: 28, textAlign: 'center' }}>
              <strong>Nothing matches those filters.</strong>
              <span className="t-body-sm ink-variant">
                Try a wider distance, or clear the category.
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'center' }}
                onClick={() => { setQuery(''); setCategory(''); setRadius(null); }}
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="svc-grid">
              {filtered.map((l) => (
                <ServicePost
                  key={l.id}
                  listing={l}
                  onDiscuss={openIntent('message')}
                  onBook={openIntent('book')}
                  onBuy={openIntent('buy')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {composerOpen && (
        <Composer
          categories={categories}
          onClose={() => setComposerOpen(false)}
          onPublish={(draft) => { setPosted(draft); setComposerOpen(false); }}
        />
      )}

      {posted && (
        <div className="card stack gap-2" style={{ padding: 18, borderColor: 'var(--secondary)' }}>
          <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
            <strong className="row gap-2"><ShieldCheckIcon size={16} /> Your draft is ready</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPosted(null)} aria-label="Dismiss draft">
              <CloseIcon size={14} />
            </button>
          </div>
          <p className="t-body-sm" style={{ margin: 0 }}>{posted.pitch}</p>
          <span className="t-caption">
            {formatMinor(Number(posted.priceRupees) * 100)} · {posted.delivery} · {posted.radiusKm} km ·
            {' '}{posted.duration === 'permanent' ? 'no expiry' : `expires in ${posted.duration}`}
          </span>
          <p className="t-caption" style={{ margin: 0 }}>
            Publishing to the live marketplace opens once your Bar Council enrolment is verified.
            {' '}<Link href="/for-professionals#verification" style={{ textDecoration: 'underline' }}>
              How verification works
            </Link>.
          </p>
        </div>
      )}

      {intent && <IntentDrawer intent={intent.mode} listing={intent.listing} onClose={() => setIntent(null)} />}
    </div>
  );
}

/**
 * What happens after Message / Book / Buy. The escrow flow is spelled out
 * end to end because that is the part a client most needs to understand
 * before parting with money — and the last panel says plainly that card
 * processing is not switched on yet, since that is the one moment where a
 * visitor could actually lose money by believing otherwise.
 */
function IntentDrawer({
  intent, listing, onClose,
}: { intent: Intent; listing: MarketplaceListingFull; onClose: () => void }) {
  const copy = INTENT_COPY[intent];
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog(dialogRef, onClose);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The primary action is disabled, so focus goes to the close button —
  // opening a dialog without moving focus into it leaves a keyboard user
  // stranded on the page behind.
  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <div className="composer-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="composer" role="dialog" aria-modal="true" aria-label={copy.title} ref={dialogRef}>
        <header className="composer-head">
          <strong>{copy.title}</strong>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" ref={closeRef}>
            <CloseIcon size={16} />
          </button>
        </header>
        <div className="composer-body">
          <div className="stack gap-1">
            <strong>{listing.title}</strong>
            <span className="t-caption">{listing.providerName} · {listing.locationName}</span>
          </div>

          {intent === 'buy' ? (
            <>
              <div className="row wrap gap-2" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="t-body">Amount held in escrow</span>
                <strong className="t-headline-sm">{formatMinor(listing.priceMinor, listing.currencyCode)}</strong>
              </div>
              <div className="escrow-steps">
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">You pay in</strong>
                  <span className="t-caption">The money goes to a holding account, not to the advocate.</span>
                </div>
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">Work is delivered</strong>
                  <span className="t-caption">The advocate does the work and marks it complete.</span>
                </div>
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">You confirm</strong>
                  <span className="t-caption">You have 72 hours to accept or raise a dispute.</span>
                </div>
                <div className="escrow-step stack gap-1">
                  <strong className="t-body-sm">Funds release</strong>
                  <span className="t-caption">Only then does the advocate get paid.</span>
                </div>
              </div>
            </>
          ) : (
            <p className="t-body-sm ink-variant" style={{ margin: 0 }}>
              {intent === 'book'
                ? 'The advocate confirms a slot before anything is charged. You can cancel free of charge until they confirm.'
                : 'Ask anything you need to know before booking — what it covers, what it excludes, what you need to bring.'}
            </p>
          )}

          <div className="card stack gap-1" style={{ padding: 14, background: 'var(--surface-low)' }}>
            <strong className="row gap-2 t-body-sm"><LockIcon size={14} /> Not yet processing payments</strong>
            <span className="t-caption">
              This flow is complete but card and UPI processing is not switched on, so no money moves
              and nothing is charged. Arrange fees directly with the advocate for now.
            </span>
          </div>
        </div>
        <footer className="composer-foot">
          <span className="t-caption">No lawyer–client relationship is created by asking.</span>
          <button type="button" className="btn btn-primary" disabled>{copy.cta}</button>
        </footer>
      </div>
    </div>
  );
}
