'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Route-level error boundary. One broken component must not take the site down
 * (spec §20), and a raw stack trace must never reach a visitor (spec §19).
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In production this is where the error goes to the observability pipeline.
    console.error('route error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="container section stack gap-5" style={{ maxWidth: 620 }}>
      <div className="stack gap-2">
        <p className="t-label-mono ink-variant">Something went wrong</p>
        <h1 className="t-headline-lg">We could not load this page</h1>
        <p className="t-body ink-variant">
          The problem has been logged. Nothing you submitted has been lost or changed.
        </p>
      </div>
      {error.digest && <p className="mono t-caption">Reference: {error.digest}</p>}
      <div className="row wrap gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/search" className="btn btn-secondary">Back to search</Link>
        <Link href="/" className="btn btn-ghost">Home</Link>
      </div>
    </div>
  );
}
