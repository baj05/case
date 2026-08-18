import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'About our crawler',
  description: 'What LexhallBot does, which paths it requests, how to rate-limit it, and how to have it stop.',
};

export default function BotPage() {
  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 760 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">For site operators</p>
        <h1 className="t-headline-lg">About our crawler</h1>
      </div>

      <p className="t-body">
        We operate a crawler that reads public professional registers so that advocates and firms can be
        found by the people who need them. If it is causing you a problem, we would rather you tell us
        than block us silently — though blocking us will work.
      </p>

      <div className="card stack gap-3" style={{ padding: 20 }}>
        <h2 className="t-title">Identification</h2>
        <dl className="stack gap-2">
          <div className="stack gap-1">
            <dt className="t-label-mono ink-variant">User-Agent</dt>
            <dd className="mono" style={{ wordBreak: 'break-all' }}>LexhallBot/0.1 (+/bot; {BRAND.supportEmail})</dd>
          </div>
          <div className="stack gap-1">
            <dt className="t-label-mono ink-variant">Requests</dt>
            <dd className="t-body-sm">One at a time per host, minimum two seconds apart, exponential backoff on error.</dd>
          </div>
          <div className="stack gap-1">
            <dt className="t-label-mono ink-variant">robots.txt</dt>
            <dd className="t-body-sm">Fetched and obeyed before any request, including Crawl-delay.</dd>
          </div>
        </dl>
      </div>

      <div className="card stack gap-3" style={{ padding: 20 }}>
        <h2 className="t-title">To slow us down or stop us</h2>
        <p className="t-body-sm">Add this to your robots.txt and we will comply on the next run:</p>
        <pre className="mono scroll-x" style={{ background: 'var(--surface-low)', padding: 14, borderRadius: 'var(--r)', margin: 0 }}>
{`User-agent: LexhallBot
Crawl-delay: 10
Disallow: /path-you-want-left-alone`}
        </pre>
        <p className="t-body-sm">
          Or email <a href={`mailto:${BRAND.supportEmail}`} style={{ textDecoration: 'underline' }}>{BRAND.supportEmail}</a> and
          we will disable the source.
        </p>
      </div>

      <p className="t-body">
        If you are an individual rather than a site operator and you want your own listing corrected or
        removed, use the <Link href="/legal/data-request" style={{ textDecoration: 'underline' }}>data request form</Link> instead.
      </p>
    </div>
  );
}
