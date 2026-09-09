import Link from 'next/link';
import type { Metadata } from 'next';
import { SearchInput } from '@/components/SearchInput';
import { Notice } from '@/components/States';
import { VERIFICATION_LEVELS } from '@lexhall/core';
import {
  getCorpus, databaseReady, getMarketplaceProviders, getProviderListings,
  getProviderComments, MARKETPLACE_CATEGORIES,
} from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { MarketplaceHub } from '@/components/marketplace/MarketplaceHub';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'For advocates and firms — your one stop legal marketplace',
  description:
    'Claim your profile, then list the work itself: a bail application, a rent agreement, a same-day '
    + 'notarisation. Priced, geofenced, and booked in one place. Free, with no paid ranking.',
};

export default function ForProfessionalsPage() {
  const ready = databaseReady();
  const corpus = ready ? getCorpus() : null;

  // Providers and their feeds are fetched here rather than inside the client
  // component: `@lexhall/db` pulls in node:sqlite, which cannot be bundled
  // for the browser.
  const providers = ready ? getMarketplaceProviders() : [];
  const listingsByProvider = Object.fromEntries(
    providers.map((p) => [p.handle, getProviderListings(p.id)]),
  );
  const commentsByProvider = Object.fromEntries(
    providers.map((p) => [p.handle, getProviderComments(p.id)]),
  );
  const allListings = Object.values(listingsByProvider).flat();

  return (
    <div className="container section-tight stack gap-8">
      <div className="stack gap-8" style={{ maxWidth: 900, width: '100%' }}>
        <div className="stack gap-3">
          <p className="t-label-mono ink-variant">For advocates and firms</p>
          <h1 className="t-display-lg" style={{ maxWidth: '20ch' }}>
            Your one stop <span className="hl">legal marketplace</span>.
          </h1>
          <p className="t-body-lg ink-variant measure">
            Claim your profile, then list the work itself — a bail application, a rent agreement, a
            same-day notarisation — priced, geofenced and bookable. Go get a little extra.
          </p>
          <p className="t-body ink-variant measure">
            {corpus ? `${formatNumber(corpus.professionals)} profiles` : 'Profiles'} were compiled from
            official Bar Council registers and public case records. If one of them is you, claiming it
            puts you in control of what it says.
          </p>
        </div>

        <div className="stack gap-2">
          <label className="label" htmlFor="find-me">Search for your name</label>
          <SearchInput placeholder="Your name, or your Bar Council" />
        </div>
      </div>

      <section className="stack gap-4" id="marketplace">
        <div className="stack gap-2" style={{ maxWidth: 900 }}>
          <h2 className="t-headline-lg" style={{ margin: 0 }}>The marketplace</h2>
          <p className="t-body ink-variant measure">
            Clients rarely search for an advocate. They search for the thing they need done. Every
            service below is one advocate&rsquo;s own offer, in their own words, with the price, the
            distance they will travel and how long the offer stands attached to it.
          </p>
        </div>
        {providers.length > 0 ? (
          <MarketplaceHub
            providers={providers}
            listings={allListings}
            listingsByProvider={listingsByProvider}
            commentsByProvider={commentsByProvider}
            categories={MARKETPLACE_CATEGORIES}
          />
        ) : (
          <Notice tone="warn">
            No marketplace listings yet. Run <code className="mono">node packages/db/scripts/seed-marketplace.ts</code>.
          </Notice>
        )}
      </section>

      <div className="stack gap-8" style={{ maxWidth: 900, width: '100%' }}>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What claiming gives you</h2>
        <div className="grid-auto">
          {[
            ['Confirm the facts', 'Correct anything the register got wrong or that has changed.'],
            ['State your practice areas', 'The register does not record specialisation and we refuse to guess it. Until you state it, your profile shows none.'],
            ['List your courts', 'Add the courts and tribunals you actually appear before.'],
            ['Control consultation requests', 'Off by default. Turn it on only if you want enquiries.'],
            ['Set your own fees', 'You publish the price. We do not set it, negotiate it, or take a cut of it.'],
            ['List the work, not just yourself', 'Post a single priced service — a notice drafted, a bail application — with the distance you will travel and how long the offer stands.'],
            ['Keep it accurate', 'Update it whenever you like, with a record of what changed.'],
          ].map(([title, body]) => (
            <div key={title} className="card stack gap-2" style={{ padding: 18 }}>
              <strong>{title}</strong>
              <span className="t-body-sm ink-variant">{body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap-3" id="verification">
        <h2 className="t-headline-md">How verification works</h2>
        <ol className="stack gap-2">
          {VERIFICATION_LEVELS.map((lvl) => (
            <li key={lvl.level} className="card row wrap gap-3" style={{ padding: 14, justifyContent: 'space-between' }}>
              <div className="stack gap-1" style={{ minWidth: 0, flex: '1 1 280px' }}>
                <strong>{lvl.label}</strong>
                <span className="t-caption">{lvl.checked}</span>
              </div>
              <span className="mono t-caption">Level {lvl.level}</span>
            </li>
          ))}
        </ol>
      </section>

      <Notice tone="legal" title="What we will never do">
        We do not sell placement and we do not offer to improve your ranking for a fee. Ranking is
        professional relevance only, and it is published in full.
        {' '}<Link href="/how-it-works" style={{ textDecoration: 'underline' }}>See the weighting</Link>.
      </Notice>

      <Notice tone="warn" title="About the marketplace above">
        Every advocate in the marketplace is a fictional demonstration profile, and so is every
        price, review and enrolment number attached to them. None of it is drawn from the Bar
        Council register — real advocates are listed with the register&rsquo;s own facts and nothing
        invented on top. Payments are not being processed yet, so nothing above charges anyone.
      </Notice>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Would you rather not be listed?</h2>
        <p className="t-body measure">
          That is a legitimate choice and you do not have to justify it. Ask us to remove your listing
          and we withhold it from public pages immediately while we verify the request.
        </p>
        <div className="row wrap gap-2">
          <Link href="/legal/data-request" className="btn btn-secondary">Request removal or correction</Link>
          <Link href="/dashboard" className="btn btn-ghost">Professional dashboard</Link>
        </div>
      </section>
      </div>
    </div>
  );
}
