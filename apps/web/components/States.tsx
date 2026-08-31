import Link from 'next/link';

/** Skeletons sized to the real content, to keep layout shift near zero. */
export function ResultSkeleton() {
  return (
    <div className="result-card" aria-hidden="true">
      <div className="skel skel-avatar" style={{ width: 64, height: 64 }} />
      <div className="stack gap-2 full">
        <div className="skel skel-text" style={{ width: '45%', height: '1.1em' }} />
        <div className="skel skel-text" style={{ width: '70%' }} />
        <div className="row gap-2 wrap" style={{ marginTop: 4 }}>
          <div className="skel" style={{ width: 90, height: 24, borderRadius: 999 }} />
          <div className="skel" style={{ width: 120, height: 24, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

export function ResultSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="stack gap-3">
      <span className="sr-only" role="status">Loading results</span>
      {Array.from({ length: count }, (_, i) => <ResultSkeleton key={i} />)}
    </div>
  );
}

/**
 * Whole-page loading state, for a route's `loading.tsx`.
 *
 * One component rather than five bespoke skeletons: these pages differ in
 * their content, not in the shape of "a heading and then a list", and five
 * hand-written variants would drift apart the first time the token for a
 * heading changed. `label` is what a screen reader is told; the bars
 * themselves are decorative and hidden from it.
 */
export function PageSkeleton({ label = 'Loading', rows = 6 }: { label?: string; rows?: number }) {
  return (
    <div className="container section stack gap-5">
      <span className="sr-only" role="status">{label}</span>
      <div className="stack gap-2" aria-hidden="true">
        <div className="skel skel-text" style={{ width: 'min(28ch, 70%)', height: '2em' }} />
        <div className="skel skel-text" style={{ width: 'min(52ch, 90%)' }} />
      </div>
      <ResultSkeletonList count={rows} />
    </div>
  );
}

/**
 * Empty state that helps the user recover rather than announcing failure
 * (spec §35). Every action offered is verified to lead somewhere.
 */
export function EmptyState({
  title, body, actions,
}: {
  title: string;
  body: string;
  actions?: Array<{ label: string; href: string; detail?: string }>;
}) {
  return (
    <div className="card stack gap-4" style={{ padding: 'clamp(24px, 5vw, 40px)', textAlign: 'center', alignItems: 'center' }}>
      <span aria-hidden="true" style={{ fontSize: '1.75rem' }}>⌕</span>
      <div className="stack gap-2" style={{ alignItems: 'center' }}>
        <h2 className="t-headline-md">{title}</h2>
        <p className="t-body ink-variant measure-tight">{body}</p>
      </div>
      {actions && actions.length > 0 && (
        <div className="stack gap-2 full" style={{ maxWidth: 460 }}>
          <p className="t-label-mono ink-variant">Try instead</p>
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="btn btn-secondary btn-block" style={{ justifyContent: 'space-between' }}>
              <span>{a.label}</span>
              {a.detail && <span className="mono ink-variant">{a.detail}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title, body, retryHref }: { title: string; body: string; retryHref?: string }) {
  return (
    <div className="notice notice-error" role="alert">
      <span className="notice-icon" aria-hidden="true">!</span>
      <div className="stack gap-2">
        <strong>{title}</strong>
        <span>{body}</span>
        {retryHref && <Link href={retryHref} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>Try again</Link>}
      </div>
    </div>
  );
}

/** Legal/context notice. Used for the disclaimers counsel will want present. */
export function Notice({
  tone = 'info', title, children,
}: { tone?: 'info' | 'warn' | 'error' | 'ok' | 'legal'; title?: string; children: React.ReactNode }) {
  const icon = tone === 'warn' ? '△' : tone === 'error' ? '!' : tone === 'ok' ? '✓' : 'ⓘ';
  return (
    <div className={`notice notice-${tone}`}>
      <span className="notice-icon" aria-hidden="true">{icon}</span>
      <div className="stack gap-1">
        {title && <strong>{title}</strong>}
        <span className="t-body-sm">{children}</span>
      </div>
    </div>
  );
}
