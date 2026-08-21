import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How the Legal Trust & Experience score works',
  description: 'How ratings, verification, anonymity and moderation work in the review system.',
};

export default function TrustReviewsPage() {
  return (
    <div className="container section-tight stack gap-8" style={{ maxWidth: 760 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Trust centre</p>
        <h1 className="t-headline-lg">How Legal Trust &amp; Experience works</h1>
        <p className="t-body ink-variant">
          Your experience score combines ratings from completed interactions across communication,
          responsiveness, professionalism, process clarity and overall satisfaction. It measures the
          experience of working with a professional or organisation — not the legal merits or outcome
          of a case, and not a claim about anyone&apos;s legal ability.
        </p>
      </div>

      <section className="stack gap-3">
        <h2 className="t-headline-md">What the score measures, and what it does not</h2>
        <p className="t-body ink-variant">
          A lawyer should not receive a lower score simply because a legally difficult case was lost, or
          a higher one because a case was won. Every rating dimension here — communication,
          responsiveness, professionalism, process clarity, appointment/booking experience — is about the
          experience of the interaction, deliberately separated from any judgement of legal skill or
          case outcome. We do not publish a "win rate" or a "legal skill" score, and we never will
          without a defensible, disclosed methodology for one — which does not currently exist here.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Review types</h2>
        <div className="grid-auto">
          <div className="card stack gap-1" style={{ padding: 16 }}>
            <strong>Verified experience</strong>
            <p className="t-body-sm ink-variant">
              Tied to a real, completed interaction on this platform — a completed booking, a completed
              consultation, or (for organisations) an account whose email domain matches the
              organisation&apos;s own verified domain. Never granted just because an email address is
              confirmed.
            </p>
          </div>
          <div className="card stack gap-1" style={{ padding: 16 }}>
            <strong>Unverified experience</strong>
            <p className="t-body-sm ink-variant">
              The reviewer has an account but the platform has no record of the specific interaction
              described. Shown honestly as unverified, not hidden and not pretended to be verified.
            </p>
          </div>
          <div className="card stack gap-1" style={{ padding: 16 }}>
            <strong>Attributed / pseudonymous / anonymous</strong>
            <p className="t-body-sm ink-variant">
              A reviewer chooses how they appear publicly — full name, first name and last initial, or
              anonymous. Your identity is always retained internally for accountability, fraud
              prevention and lawful requests, even when displayed anonymously — we do not promise
              absolute anonymity.
            </p>
          </div>
          <div className="card stack gap-1" style={{ padding: 16 }}>
            <strong>Lawyer-to-lawyer / corporate</strong>
            <p className="t-body-sm ink-variant">
              A lawyer can review a collaboration or referral; a corporate legal team can review a
              service engagement. These use their own rating dimensions (referral handling, commercial
              understanding, project management) rather than the client-consultation set.
            </p>
          </div>
        </div>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Why some profiles show no score</h2>
        <ul className="t-body ink-variant stack gap-2">
          <li><strong>No experiences yet</strong> — nothing published. Never shown as "0.0 ★", which reads as a poor rating rather than an absence of data.</li>
          <li><strong>New profile</strong> (1–4 experiences) — too few for a reliable average. The raw count is shown; no numeric score is.</li>
          <li><strong>Early feedback</strong> (5–9 experiences) — an overall score and recommendation percentage appear, but the dimension breakdown, star distribution and "what people mention" themes stay withheld until there's more data.</li>
          <li><strong>Established</strong> (10+ experiences) — the full breakdown appears: dimension scores, star distribution, satisfaction distribution and recurring themes drawn only from real published review text.</li>
        </ul>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Moderation and fraud checks</h2>
        <p className="t-body ink-variant">
          Every review passes through moderation before publishing. An internal, non-public risk signal
          looks at submission velocity, duplicate text, unusually short reviews and unverified
          interactions — reviews scoring high risk go to a human moderator rather than publishing
          automatically. Separately, a pattern filter checks for phone numbers, email addresses, money
          figures and case-number-like text, and routes any match to human review before publication —
          screening for accidental disclosure of confidential or privileged matter detail, not proof
          that a review is otherwise accurate.
        </p>
        <p className="t-body ink-variant">
          Reviews are never removed, hidden or edited by the professional or organisation being
          reviewed, and payment or subscription status has no path to change a rating, remove a
          negative review, or grant verified status. A professional may respond publicly to a review;
          they cannot edit or delete it, and their response cannot identify an anonymous reviewer.
        </p>
      </section>

      <section className="stack gap-3">
        <h2 className="t-headline-md">Reporting a review</h2>
        <p className="t-body ink-variant">
          Anyone can report a review as fake, spam, harassing, a privacy violation, or naming the wrong
          professional. A report sends a published review back into human moderation — it does not
          remove it automatically, and it does not tell the reviewed professional who reported it.
        </p>
      </section>

      <p className="t-caption">
        See also <Link href="/how-it-works#reviews" style={{ textDecoration: 'underline' }}>how it works</Link>.
      </p>
    </div>
  );
}
