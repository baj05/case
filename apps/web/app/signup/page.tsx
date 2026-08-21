import type { Metadata } from 'next';
import { SignupForm } from '@/components/SignupForm';

export const metadata: Metadata = { title: 'Create an account', robots: { index: false, follow: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 460 }}>
      <div className="stack gap-2">
        <h1 className="t-headline-lg">Create an account</h1>
        <p className="t-body ink-variant">
          Needed to claim a professional profile, or to leave a review of a consultation you have had.
        </p>
      </div>
      <SignupForm next={next} />
    </div>
  );
}
