import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="container section-tight stack gap-6" style={{ maxWidth: 460 }}>
      <div className="stack gap-2">
        <h1 className="t-headline-lg">Sign in</h1>
        <p className="t-body ink-variant">
          For professionals managing their profile, and for anyone who has booked a consultation and
          wants to leave a review.
        </p>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
