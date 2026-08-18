import Link from 'next/link';
import { SearchInput } from '@/components/SearchInput';

export default function NotFound() {
  return (
    <div className="container section stack gap-6" style={{ maxWidth: 680, textAlign: 'center', alignItems: 'center' }}>
      <p className="t-label-mono ink-variant">404</p>
      <h1 className="t-headline-lg">We could not find that page</h1>
      <p className="t-body ink-variant measure-tight">
        The link may be out of date, or a profile may have been withdrawn at the professional&apos;s
        request. Searching is usually the fastest way back.
      </p>
      <div className="full" style={{ maxWidth: 560 }}><SearchInput /></div>
      <div className="row wrap gap-2" style={{ justifyContent: 'center' }}>
        <Link href="/" className="btn btn-secondary">Home</Link>
        <Link href="/practice-areas" className="btn btn-ghost">Browse practice areas</Link>
        <Link href="/bar-councils" className="btn btn-ghost">Browse Bar Councils</Link>
      </div>
    </div>
  );
}
