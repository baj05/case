import Link from 'next/link';
import type { Metadata } from 'next';
import { SearchInput } from '@/components/SearchInput';
import { Notice } from '@/components/States';
import { VERIFICATION_LEVELS } from '@lexhall/core';
import { getCorpus, databaseReady } from '@/lib/data';
import { formatNumber } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'For advocates and firms',
  description: 'Find and claim your profile, confirm your details, and choose whether you accept consultation requests. Free, with no paid ranking.',
};

export default function ForProfessionalsPage() {
  const corpus = databaseReady() ? getCorpus() : null;

  return (
    <div className="container section-tight stack gap-8" style={{ maxWidth: 900 }}>
      <div className="stack gap-3">
        <p className="t-label-mono ink-variant">For advocates and firms</p>
        <h1 className="t-display-lg" style={{ maxWidth: '22ch' }}>
          Find your profile and <span className="hl">make it yours</span>.
        </h1>
        <p className="t-body-lg ink-variant measure">
          {corpus ? `${formatNumber(corpus.professionals)} profiles` : 'Profiles'} were compiled from
          official Bar Council registers. If one of them is you, claiming it puts you in control of
          what it says.
        </p>
      </div>

      <div className="stack gap-2">
        <label className="label" htmlFor="find-me">Search for your name</label>
        <SearchInput placeholder="Your name, or your Bar Council" />
      </div>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What claiming gives you</h2>
        <div className="grid-auto">
          {[
            ['Confirm the facts', 'Correct anything the register got wrong or that has changed.'],
            ['State your practice areas', 'The register does not record specialisation and we refuse to guess it. Until you state it, your profile shows none.'],
            ['List your courts', 'Add the courts and tribunals you actually appear before.'],
            ['Control consultation requests', 'Off by default. Turn it on only if you want enquiries.'],
            ['Set your own fees', 'We do not process consultation payments and take no share of your fees.'],
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
        We do not sell placement, we do not offer to improve your ranking for a fee, and we do not
        publish reviews of you — the review system is switched off pending a professional-conduct
        review. Ranking is professional relevance only, and it is published in full.
        {' '}<Link href="/how-it-works" style={{ textDecoration: 'underline' }}>See the weighting</Link>.
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
  );
}
